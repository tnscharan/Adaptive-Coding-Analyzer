from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime
import logging
from typing import Dict, Any, List

from app.core import database
from app.models import domain as models
from app.models import schemas
from app.services.analysis_service import CodeIntelligence

router = APIRouter(tags=["analytics"])
logger = logging.getLogger(__name__)

@router.post("/analysis/submit")
def submit_code(submission: schemas.CodeSubmission, db: Session = Depends(database.get_db)):
    logger.info(f"Submitting code for AST review. Session: {submission.session_id}")
    
    session_rec = db.query(models.CodingSession).filter(models.CodingSession.id == submission.session_id).first()
    if not session_rec:
        raise HTTPException(status_code=404, detail="Session not found.")
        
    # Retrieve dynamic typing stats from session events
    events = session_rec.events
    wpm_events = [e.payload_json.get("wpm", 0) for e in events if e.event_type == "typing" and e.payload_json and isinstance(e.payload_json, dict)]
    avg_wpm = sum(wpm_events) / len(wpm_events) if wpm_events else 0.0
    pauses = sum(1 for e in events if e.event_type == "pause")
    backspaces = sum(1 for e in events if e.event_type == "backspace")
    
    behavioral_stats = {
        "avg_wpm": avg_wpm,
        "pauses": pauses,
        "backspaces": backspaces
    }

    analysis = CodeIntelligence.analyze_code(
        submission.code,
        submission.language,
        submission.workspace_files,
        submission.filename,
        behavioral_stats
    )
    
    # Save the analysis run as an execution with empty output/exit_code to record historical progress
    new_execution = models.CodeExecution(
        session_id=submission.session_id,
        language=submission.language,
        source_code=submission.code,
        output=None,
        exit_code=None,
        execution_time=0.0,
        timestamp=datetime.datetime.utcnow(),
        complexity_score=analysis.get("complexity_score", 1.0),
        maintainability_index=analysis.get("maintainability_index", 100.0),
        ast_metrics=analysis.get("ast_metrics"),
        scores=analysis.get("scores")
    )
    
    try:
        db.add(new_execution)
        db.commit()
        logger.info(f"Analysis saved to execution history. ID: {new_execution.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving analysis submission: {e}")
        
    return analysis

def update_and_get_profile(user_id: int, db: Session) -> models.AnalyticsProfile:
    # Fetch all user sessions
    user_sessions = db.query(models.CodingSession).filter(models.CodingSession.user_id == user_id).all()
    session_ids = [s.id for s in user_sessions]
    
    # Fetch all executions for this user
    executions = db.query(models.CodeExecution).filter(
        models.CodeExecution.session_id.in_(session_ids)
    ).all()
    
    run_executions = [e for e in executions if e.output is not None or e.exit_code is not None]
    
    # Calculate success rate from runs
    if run_executions:
        total_runs = len(run_executions)
        successful_runs = sum(1 for e in run_executions if e.exit_code == 0)
        success_rate = successful_runs / total_runs
    else:
        success_rate = 0.8
        
    # Calculate complexity and maintainability from any available executions
    valid_complexities = [e.complexity_score for e in executions if e.complexity_score is not None]
    avg_complexity = sum(valid_complexities) / len(valid_complexities) if valid_complexities else 2.0
    
    valid_mi = [e.maintainability_index for e in executions if e.maintainability_index is not None]
    avg_maintainability = sum(valid_mi) / len(valid_mi) if valid_mi else 85.0
    
    # Classifier rules
    # Beginner: low maintainability OR high complexity OR poor success rate
    if avg_maintainability < 60.0 or avg_complexity > 7.0 or success_rate < 0.5:
        level = "Beginner"
        intelligence_score = round(30.0 + (success_rate * 20.0) + (avg_maintainability * 0.2))
        confidence_level = round(30.0 + (success_rate * 30.0))
        readiness_score = round(40.0 + (success_rate * 10.0))
    # Advanced: high maintainability AND low complexity AND high success rate
    elif avg_maintainability >= 80.0 and avg_complexity <= 3.0 and success_rate >= 0.8:
        level = "Advanced"
        intelligence_score = round(75.0 + ((100.0 - avg_complexity * 5.0) * 0.1) + (avg_maintainability * 0.15))
        confidence_level = round(70.0 + (success_rate * 25.0))
        readiness_score = round(80.0 + (success_rate * 15.0))
    # Intermediate: else
    else:
        level = "Intermediate"
        intelligence_score = round(55.0 + (success_rate * 20.0) + (avg_maintainability * 0.1))
        confidence_level = round(50.0 + (success_rate * 30.0))
        readiness_score = round(60.0 + (success_rate * 15.0))

    intelligence_score = min(100.0, max(0.0, intelligence_score))
    confidence_level = min(100.0, max(0.0, confidence_level))
    readiness_score = min(100.0, max(0.0, readiness_score))

    # Strengths / Weaknesses
    strengths = []
    weaknesses = []
    
    if success_rate >= 0.8:
        strengths.append("High compile-and-run success rate.")
    else:
        weaknesses.append("High execution error rate; check compiler warnings.")
        
    if avg_maintainability >= 75.0:
        strengths.append("Consistently produces clean, self-documenting logic.")
    else:
        weaknesses.append("Low readability scores; add comments and format structures.")
        
    if avg_complexity <= 4.0:
        strengths.append("Maintains shallow nesting and simple function structures.")
    else:
        weaknesses.append("High structural complexity; extract large functions.")

    if not strengths:
        strengths.append("Keeps basic structure correct.")
    if not weaknesses:
        weaknesses.append("No critical system warnings detected.")

    profile = db.query(models.AnalyticsProfile).filter(models.AnalyticsProfile.user_id == user_id).first()
    if not profile:
        profile = models.AnalyticsProfile(user_id=user_id)
        db.add(profile)
        
    profile.profile_level = level
    profile.intelligence_score = float(intelligence_score)
    profile.confidence_level = float(confidence_level)
    profile.readiness_score = float(readiness_score)
    profile.weaknesses = weaknesses
    profile.strengths = strengths
    profile.complexity_score = float(avg_complexity)
    profile.success_rate = float(success_rate)
    profile.maintainability_index = float(avg_maintainability)
    profile.last_updated = datetime.datetime.utcnow()
    
    try:
        db.commit()
        db.refresh(profile)
    except Exception as e:
        db.rollback()
        logger.error(f"Error saving profile: {e}")
        
    return profile

@router.post("/predict/readiness")
def predict_readiness(payload: dict, db: Session = Depends(database.get_db)):
    user_id = payload.get("user_id", 1)
    logger.info(f"Calculating cognitive readiness profile for user: {user_id}")
    profile = update_and_get_profile(user_id, db)
    return {
        "recommended_level": profile.profile_level,
        "intelligence_score": profile.intelligence_score,
        "confidence_level": profile.confidence_level,
        "readiness_score": profile.readiness_score,
        "strengths": profile.strengths,
        "weaknesses": profile.weaknesses
    }

@router.get("/analytics/dashboard/{user_id}", response_model=schemas.DashboardResponse)
def get_dashboard(user_id: int, db: Session = Depends(database.get_db)):
    logger.info(f"Loading dashboard metrics for user: {user_id}")
    
    # 1. Sessions count
    sessions = db.query(models.CodingSession).filter(models.CodingSession.user_id == user_id).all()
    total_sessions = len(sessions)
    session_ids = [s.id for s in sessions]
    
    # 2. Executions count & stats
    executions = db.query(models.CodeExecution).filter(
        models.CodeExecution.session_id.in_(session_ids)
    ).all()
    
    executions_count = len([e for e in executions if e.output is not None])
    
    successful_runs = sum(1 for e in executions if e.exit_code == 0 and e.output is not None)
    success_rate = round((successful_runs / executions_count * 100) if executions_count else 80.0, 1)
    
    # 3. Most used language
    lang_counts = {}
    for s in sessions:
        lang_counts[s.language] = lang_counts.get(s.language, 0) + 1
    most_used_language = max(lang_counts, key=lang_counts.get) if lang_counts else "python"
    
    # 4. Average complexity & maintainability
    valid_complexities = [e.complexity_score for e in executions if e.complexity_score is not None]
    average_complexity = round(sum(valid_complexities) / len(valid_complexities) if valid_complexities else 2.0, 1)
    
    valid_mi = [e.maintainability_index for e in executions if e.maintainability_index is not None]
    avg_mi = sum(valid_mi) / len(valid_mi) if valid_mi else 85.0
    
    # 5. Fetch/Update profile dynamically
    profile = update_and_get_profile(user_id, db)
        
    profile_level = profile.profile_level
    intelligence_score = profile.intelligence_score
    confidence_level = profile.confidence_level
    readiness_score = profile.readiness_score
    
    # 6. Recent Sessions scores history (Max 20)
    recent_executions = db.query(models.CodeExecution).filter(
        models.CodeExecution.session_id.in_(session_ids),
        models.CodeExecution.scores.isnot(None)
    ).order_by(models.CodeExecution.timestamp.asc()).all()[-20:]
    
    recent_sessions_data = []
    for r in recent_executions:
        date_str = r.timestamp.strftime("%a %H:%M")
        score = r.scores.get("overall", 50.0) if r.scores else 50.0
        recent_sessions_data.append({
            "name": date_str,
            "score": round(score)
        })
        
    # 7. Radar categories averages
    avg_radar = {"efficiency": 0.0, "readability": 0.0, "maintainability": 0.0, "security": 0.0, "optimization": 0.0}
    valid_scores = [e.scores for e in executions if e.scores is not None]
    
    if valid_scores:
        for s_dict in valid_scores:
            for k in avg_radar.keys():
                avg_radar[k] += s_dict.get(k, 70.0)
        for k in avg_radar.keys():
            avg_radar[k] = round(avg_radar[k] / len(valid_scores), 1)
    else:
        # Default radar layout
        avg_radar = {"efficiency": 75.0, "readability": 80.0, "maintainability": avg_mi, "security": 95.0, "optimization": 82.0}

    # Trend calculation from last 20 sessions
    # Compare average of last 10 executions vs preceding 10 executions
    trend = "Stable"
    if len(recent_executions) >= 6:
        midpoint = len(recent_executions) // 2
        first_half = recent_executions[:midpoint]
        second_half = recent_executions[midpoint:]
        
        avg_first = sum(fh.scores.get("overall", 50.0) for fh in first_half if fh.scores) / len(first_half)
        avg_second = sum(sh.scores.get("overall", 50.0) for sh in second_half if sh.scores) / len(second_half)
        
        diff = avg_second - avg_first
        if diff > 3.0:
            trend = "Improving"
        elif diff < -3.0:
            trend = "Declining"
            
    logger.info(f"Dashboard generated for user: {user_id}. Trend: {trend}")

    return {
        "total_sessions": total_sessions,
        "executions_count": executions_count,
        "success_rate": success_rate,
        "most_used_language": most_used_language,
        "average_complexity": average_complexity,
        "profile_level": profile_level,
        "intelligence_score": intelligence_score,
        "confidence_level": confidence_level,
        "readiness_score": readiness_score,
        "recent_sessions": recent_sessions_data,
        "weakness_radar": {
            "Efficiency": avg_radar["efficiency"],
            "Readability": avg_radar["readability"],
            "Maintainability": avg_radar["maintainability"],
            "Security": avg_radar["security"],
            "Optimization": avg_radar["optimization"]
        }
    }

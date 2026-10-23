from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime
import logging

from app.core import database
from app.models import domain as models
from app.models import schemas

router = APIRouter(prefix="/sessions", tags=["sessions"])
logger = logging.getLogger(__name__)

@router.post("/start", response_model=schemas.SessionResponse)
def start_session(session_data: schemas.SessionCreate, db: Session = Depends(database.get_db)):
    logger.info(f"Starting new coding session for language: {session_data.language}")
    
    # Ensure default user exists (ID=1)
    demo_user = db.query(models.User).filter(models.User.id == 1).first()
    if not demo_user:
        logger.info("Demo user not found. Creating default Demo User (ID=1)")
        demo_user = models.User(id=1, name="Demo User", email="demo@example.com")
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
        
    new_session = models.CodingSession(
        user_id=1,  # Default demo user
        language=session_data.language,
        started_at=datetime.datetime.utcnow()
    )
    try:
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        logger.info(f"Session started successfully. ID: {new_session.id}")
        return new_session
    except Exception as e:
        db.rollback()
        logger.error(f"Error starting session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while starting session."
        )

@router.post("/end/{session_id}", response_model=schemas.SessionResponse)
def end_session(session_id: int, db: Session = Depends(database.get_db)):
    logger.info(f"Request to end session: {session_id}")
    session_rec = db.query(models.CodingSession).filter(models.CodingSession.id == session_id).first()
    if not session_rec:
        logger.warning(f"Session ID {session_id} not found.")
        raise HTTPException(status_code=404, detail="Session not found.")
        
    if session_rec.ended_at:
        logger.info(f"Session {session_id} already ended.")
        return session_rec

    ended_at = datetime.datetime.utcnow()
    duration = (ended_at - session_rec.started_at).total_seconds()
    
    session_rec.ended_at = ended_at
    session_rec.duration_seconds = max(0, int(duration))
    
    try:
        db.commit()
        db.refresh(session_rec)
        logger.info(f"Session {session_id} ended. Duration: {session_rec.duration_seconds} seconds.")
        return session_rec
    except Exception as e:
        db.rollback()
        logger.error(f"Error ending session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Database error while ending session.")

@router.post("/events/track")
def track_event(event: schemas.EventCreate, db: Session = Depends(database.get_db)):
    # Validate event type
    valid_event_types = {"typing", "pause", "backspace", "execute", "analysis", "save"}
    if event.event_type not in valid_event_types:
        logger.warning(f"Rejected malformed event type: {event.event_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid event_type '{event.event_type}'. Must be one of {valid_event_types}"
        )

    # Check if session exists
    session_exists = db.query(models.CodingSession).filter(models.CodingSession.id == event.session_id).first()
    if not session_exists:
        logger.warning(f"Event logged to non-existent session ID: {event.session_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID {event.session_id} not found."
        )

    new_event = models.BehavioralEvent(
        session_id=event.session_id,
        event_type=event.event_type,
        payload_json=event.payload_json,
        timestamp=datetime.datetime.utcnow()
    )
    
    try:
        db.add(new_event)
        db.commit()
        return {"success": True, "message": "Event logged successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error logging event: {e}")
        raise HTTPException(status_code=500, detail="Database error while tracking event.")

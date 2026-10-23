from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.orm import Session
import json
import logging
import time
import datetime

from app.core import database
from app.models import domain as models
from app.models import schemas
from app.services.execution_service import ExecutionManager
from app.services.analysis_service import CodeIntelligence

router = APIRouter(prefix="/execution", tags=["execution"])
logger = logging.getLogger(__name__)

execution_manager = ExecutionManager()

@router.websocket("/ws/execute")
async def websocket_execute(websocket: WebSocket, db: Session = Depends(database.get_db)):
    await websocket.accept()
    logger.info("WebSocket connection accepted for code execution.")
    try:
        while True:
            data = await websocket.receive_text()
            request = json.loads(data)
            code = request.get("code", "")
            language = request.get("language", "python")
            session_id = request.get("session_id")
            
            if not session_id:
                await websocket.send_json({"type": "error", "content": "Missing session_id in payload."})
                continue
                
            # Verify session exists
            session_rec = db.query(models.CodingSession).filter(models.CodingSession.id == session_id).first()
            if not session_rec:
                await websocket.send_json({"type": "error", "content": f"Session with ID {session_id} not found."})
                continue

            await websocket.send_json({"type": "status", "content": f"Preparing secure container sandbox for {language}..."})
            
            outputs = []
            exit_code = 0
            start_time = time.time()
            
            async for output in execution_manager.execute_code_stream(code, language):
                await websocket.send_json(output)
                
                if output["type"] in ["stdout", "stderr", "error", "system"]:
                    outputs.append(output)
                if output["type"] == "system" and "exit code" in output["content"]:
                    try:
                        # Extract exit code e.g. "Execution finished with exit code 0"
                        exit_code = int(output["content"].split("exit code")[-1].strip())
                    except:
                        exit_code = 0

            execution_time = round(time.time() - start_time, 3)
            
            # Aggregate stdout/stderr
            combined_output = "".join([o["content"] for o in outputs if o["type"] == "stdout"])
            stderr_output = "".join([o["content"] for o in outputs if o["type"] in ["stderr", "error"]])
            full_logs = combined_output + ("\n" + stderr_output if stderr_output else "")

            # Perform immediate AST analysis on code submission
            analysis = CodeIntelligence.analyze_code(code, language)

            # Persist execution run to the database
            new_execution = models.CodeExecution(
                session_id=session_id,
                language=language,
                source_code=code,
                output=full_logs,
                exit_code=exit_code,
                execution_time=execution_time,
                timestamp=datetime.datetime.utcnow(),
                complexity_score=analysis.get("complexity_score", 1.0),
                maintainability_index=analysis.get("maintainability_index", 100.0),
                ast_metrics=analysis.get("ast_metrics"),
                scores=analysis.get("scores")
            )
            
            try:
                db.add(new_execution)
                db.commit()
                logger.info(f"Execution saved. ID: {new_execution.id}, Session: {session_id}, Exit Code: {exit_code}")
            except Exception as e:
                db.rollback()
                logger.error(f"Error persisting code execution: {e}")
                
            await websocket.send_json({"type": "status", "content": "Ready"})
            
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected.")
    except Exception as e:
        logger.error(f"WebSocket execution exception: {e}")
        try:
            await websocket.send_json({"type": "error", "content": f"WebSocket server error: {str(e)}"})
        except:
            pass

@router.post("/execute", response_model=schemas.ExecutionResponse)
async def execute_code(submission: schemas.CodeSubmission, db: Session = Depends(database.get_db)):
    logger.info(f"HTTP execution request for session: {submission.session_id}")
    
    session_rec = db.query(models.CodingSession).filter(models.CodingSession.id == submission.session_id).first()
    if not session_rec:
        raise HTTPException(status_code=404, detail="Session not found.")

    outputs = []
    exit_code = 0
    start_time = time.time()
    
    async for output in execution_manager.execute_code_stream(submission.code, submission.language):
        if output["type"] in ["stdout", "stderr", "error", "system"]:
            outputs.append(output)
        if output["type"] == "system" and "exit code" in output["content"]:
            try:
                exit_code = int(output["content"].split("exit code")[-1].strip())
            except:
                exit_code = 0

    execution_time = round(time.time() - start_time, 3)
    
    combined_output = "".join([o["content"] for o in outputs if o["type"] == "stdout"])
    stderr_output = "".join([o["content"] for o in outputs if o["type"] in ["stderr", "error"]])
    full_logs = combined_output + ("\n" + stderr_output if stderr_output else "")

    analysis = CodeIntelligence.analyze_code(submission.code, submission.language)

    new_execution = models.CodeExecution(
        session_id=submission.session_id,
        language=submission.language,
        source_code=submission.code,
        output=full_logs,
        exit_code=exit_code,
        execution_time=execution_time,
        timestamp=datetime.datetime.utcnow(),
        complexity_score=analysis.get("complexity_score", 1.0),
        maintainability_index=analysis.get("maintainability_index", 100.0),
        ast_metrics=analysis.get("ast_metrics"),
        scores=analysis.get("scores")
    )
    
    try:
        db.add(new_execution)
        db.commit()
        db.refresh(new_execution)
        return new_execution
    except Exception as e:
        db.rollback()
        logger.error(f"Error persisting code execution: {e}")
        raise HTTPException(status_code=500, detail="Database failure saving execution.")

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class SessionCreate(BaseModel):
    language: str

class SessionResponse(BaseModel):
    id: int
    user_id: int
    language: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class EventCreate(BaseModel):
    session_id: int
    event_type: str = Field(..., description="typing, pause, backspace, execute, analysis, save")
    payload_json: Dict[str, Any] = Field(default_factory=dict)

class WorkspaceFileSubmission(BaseModel):
    name: str
    code: str
    language: str

class CodeSubmission(BaseModel):
    session_id: int
    code: str
    language: str = "python"
    filename: Optional[str] = None
    workspace_files: Optional[List[WorkspaceFileSubmission]] = None

class ExecutionResponse(BaseModel):
    id: int
    session_id: int
    language: str
    source_code: str
    output: Optional[str] = None
    exit_code: Optional[int] = None
    execution_time: Optional[float] = None
    timestamp: datetime
    complexity_score: Optional[float] = None
    maintainability_index: Optional[float] = None
    ast_metrics: Optional[Dict[str, Any]] = None
    scores: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

class ProfileResponse(BaseModel):
    id: int
    user_id: int
    profile_level: str
    intelligence_score: float
    confidence_level: float
    readiness_score: float
    weaknesses: List[str]
    strengths: List[str]
    complexity_score: float
    success_rate: float
    maintainability_index: float
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)

class DashboardResponse(BaseModel):
    total_sessions: int
    executions_count: int
    success_rate: float
    most_used_language: str
    average_complexity: float
    profile_level: str
    intelligence_score: float
    confidence_level: float
    recent_sessions: List[Dict[str, Any]]
    weakness_radar: Dict[str, float]
    readiness_score: float

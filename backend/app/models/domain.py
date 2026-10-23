from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from app.core.database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sessions = relationship("CodingSession", back_populates="user")
    profiles = relationship("AnalyticsProfile", back_populates="user")

class CodingSession(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    language = Column(String)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    ended_at = Column(DateTime)
    duration_seconds = Column(Integer)
    
    user = relationship("User", back_populates="sessions")
    events = relationship("BehavioralEvent", back_populates="session")
    executions = relationship("CodeExecution", back_populates="session")

class BehavioralEvent(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    event_type = Column(String)  # typing, pause, backspace, execute, analysis, save
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    payload_json = Column(JSON)  # metadata of the event

    session = relationship("CodingSession", back_populates="events")

class CodeExecution(Base):
    __tablename__ = "executions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    language = Column(String)
    source_code = Column(Text)
    output = Column(Text)
    exit_code = Column(Integer)
    execution_time = Column(Float)  # duration in seconds
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    # AST and code intelligence metrics embedded inside executions
    complexity_score = Column(Float)
    maintainability_index = Column(Float)
    ast_metrics = Column(JSON)
    scores = Column(JSON)

    session = relationship("CodingSession", back_populates="executions")

class AnalyticsProfile(Base):
    __tablename__ = "analytics_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    profile_level = Column(String)  # Beginner, Intermediate, Advanced
    intelligence_score = Column(Float)
    confidence_level = Column(Float)
    readiness_score = Column(Float)
    weaknesses = Column(JSON)
    strengths = Column(JSON)
    complexity_score = Column(Float)
    success_rate = Column(Float)
    maintainability_index = Column(Float)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="profiles")

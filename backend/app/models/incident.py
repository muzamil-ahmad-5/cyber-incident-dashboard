from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    incident_id = Column(String(32), unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=utc_now, index=True)
    
    category = Column(String(64), nullable=False, index=True)
    severity = Column(String(32), nullable=False, index=True)
    description = Column(Text, nullable=False)
    affected_asset = Column(String(128), nullable=False, index=True)
    potential_impact = Column(String(64), nullable=False, default="Medium")
    status = Column(String(32), nullable=False, default="Open", index=True)
    
    assigned_analyst = Column(String(64), nullable=True, default="Unassigned")
    investigation_notes = Column(Text, nullable=True, default="")
    
    # Explainable Risk Algorithm outputs
    risk_score = Column(Float, nullable=False, default=0.0, index=True)
    risk_priority = Column(String(32), nullable=False, default="MEDIUM", index=True)
    risk_factors = Column(Text, nullable=True, default="{}")
    recommended_actions = Column(Text, nullable=True, default="")
    
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

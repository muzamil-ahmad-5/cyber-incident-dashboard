from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class MLClassificationRecord(Base):
    __tablename__ = "ml_classifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    record_id = Column(String(32), unique=True, index=True, nullable=False)
    submitted_text = Column(Text, nullable=False)
    
    # Model classification output
    predicted_category = Column(String(64), nullable=False, index=True)
    confidence_score = Column(Float, nullable=False, default=0.0)
    
    # Curated rule-based prevention recommendations
    prevention_guidance = Column(Text, nullable=False)
    
    # Strict separation between model prediction and human analyst review
    review_status = Column(String(32), nullable=False, default="New", index=True)
    # Allowed review statuses: "New", "Under Investigation", "Resolved", "False Positive"
    
    analyst_confirmed_status = Column(String(32), nullable=False, default="Unconfirmed", index=True)
    # Allowed confirmed statuses: "Unconfirmed", "Confirmed Incident", "Benign Activity", "Inconclusive"
    
    analyst_notes = Column(Text, nullable=True, default="")
    reviewer = Column(String(64), nullable=True, default="Analyst")
    
    created_at = Column(DateTime, nullable=False, default=utc_now, index=True)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

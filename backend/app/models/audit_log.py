from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

def generate_event_id():
    return f"AUD-{uuid.uuid4().hex[:8].upper()}"

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(String(32), unique=True, index=True, default=generate_event_id, nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)
    actor = Column(String(64), nullable=False, default="system", index=True)
    action = Column(String(64), nullable=False, index=True)
    incident_id = Column(String(32), nullable=True, index=True)
    outcome = Column(String(32), nullable=False, default="SUCCESS")  # SUCCESS, FAILURE, WARNING
    details = Column(Text, nullable=True, default="")

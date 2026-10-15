from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class AuditLogCreate(BaseModel):
    actor: str = "system"
    action: str
    incident_id: Optional[str] = None
    outcome: str = "SUCCESS"
    details: Optional[str] = ""

class AuditLogResponse(BaseModel):
    id: int
    event_id: str
    timestamp: datetime
    actor: str
    action: str
    incident_id: Optional[str] = None
    outcome: str
    details: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class PaginatedAuditLogs(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: list[AuditLogResponse]

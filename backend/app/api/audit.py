import math
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.api.deps import get_db, get_optional_user
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import PaginatedAuditLogs, AuditLogResponse

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("", response_model=PaginatedAuditLogs)
def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by action, actor, event ID or incident ID"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    outcome: Optional[str] = Query(None, description="Filter by outcome"),
    incident_id: Optional[str] = Query(None, description="Filter strictly by incident ID"),
    db: Session = Depends(get_db)
):
    """
    Retrieve persistent audit event records for SOC compliance and investigation oversight.
    """
    query = db.query(AuditLog)

    if incident_id and incident_id.strip():
        query = query.filter(AuditLog.incident_id == incident_id.strip())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AuditLog.event_id.ilike(term),
                AuditLog.action.ilike(term),
                AuditLog.actor.ilike(term),
                AuditLog.incident_id.ilike(term),
                AuditLog.details.ilike(term)
            )
        )

    if action and action != "All":
        query = query.filter(AuditLog.action == action)
    if outcome and outcome != "All":
        query = query.filter(AuditLog.outcome == outcome)

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    offset = (page - 1) * page_size
    items = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "items": items
    }

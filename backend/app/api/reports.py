import io
import csv
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.api.deps import get_db, get_optional_user
from app.models.incident import Incident
from app.models.user import User
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/reports", tags=["Reports"])

def sanitize_csv_cell(value: any) -> str:
    """
    Prevent CSV / Spreadsheet Formula Injection (CWE-1236).
    Neutralizes leading '=', '+', '-', '@', '\t', or '\r' by prepending a single quote.
    """
    if value is None:
        return ""
    text = str(value)
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{text}"
    return text

@router.get("/export/csv")
def export_incidents_csv(
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Export filtered security incident records to CSV with Spreadsheet Formula Injection sanitization.
    """
    actor = user.username if user else "analyst"
    query = db.query(Incident)

    if category and category != "All":
        query = query.filter(Incident.category == category)
    if severity and severity != "All":
        query = query.filter(Incident.severity == severity.capitalize())
    if status_filter and status_filter != "All":
        query = query.filter(Incident.status == status_filter.capitalize())
    if priority and priority != "All":
        query = query.filter(Incident.risk_priority == priority.upper())
    if from_date:
        query = query.filter(Incident.timestamp >= from_date)
    if to_date:
        query = query.filter(Incident.timestamp <= to_date)

    incidents = query.order_by(Incident.timestamp.desc()).all()

    # Create CSV in-memory stream
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Write CSV Header
    writer.writerow([
        "Incident ID",
        "Timestamp (UTC)",
        "Category",
        "Severity",
        "Calculated Priority",
        "Risk Score (0-100)",
        "Status",
        "Affected Simulated Asset",
        "Potential Impact",
        "Assigned Analyst",
        "Description",
        "Resolved At (UTC)"
    ])

    # Write sanitized rows
    for inc in incidents:
        writer.writerow([
            sanitize_csv_cell(inc.incident_id),
            sanitize_csv_cell(inc.timestamp.strftime("%Y-%m-%d %H:%M:%S") if inc.timestamp else ""),
            sanitize_csv_cell(inc.category),
            sanitize_csv_cell(inc.severity),
            sanitize_csv_cell(inc.risk_priority),
            sanitize_csv_cell(inc.risk_score),
            sanitize_csv_cell(inc.status),
            sanitize_csv_cell(inc.affected_asset),
            sanitize_csv_cell(inc.potential_impact),
            sanitize_csv_cell(inc.assigned_analyst),
            sanitize_csv_cell(inc.description),
            sanitize_csv_cell(inc.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if inc.resolved_at else "N/A")
        ])

    csv_data = output.getvalue()
    timestamp_tag = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"security_incidents_export_{timestamp_tag}.csv"

    record_audit_event(
        db=db,
        action="REPORT_EXPORT",
        actor=actor,
        outcome="SUCCESS",
        details=f"Exported {len(incidents)} incidents to CSV filename '{filename}'."
    )

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Content-Type-Options": "nosniff"
        }
    )

@router.get("/unresolved-high-priority")
def get_unresolved_high_priority_report(
    db: Session = Depends(get_db)
):
    """
    Structured report of all unresolved incidents deemed CRITICAL or HIGH risk priority.
    """
    unresolved = db.query(Incident).filter(
        ~Incident.status.in_(["Resolved", "Closed"]),
        Incident.risk_priority.in_(["CRITICAL", "HIGH"])
    ).order_by(Incident.risk_score.desc()).all()

    report_items = []
    now = datetime.now(timezone.utc)
    for inc in unresolved:
        hours_open = 0.0
        if inc.timestamp:
            ts = inc.timestamp.replace(tzinfo=timezone.utc) if inc.timestamp.tzinfo is None else inc.timestamp
            hours_open = max(0.0, round((now - ts).total_seconds() / 3600.0, 1))

        report_items.append({
            "incident_id": inc.incident_id,
            "timestamp": inc.timestamp.isoformat() if inc.timestamp else None,
            "category": inc.category,
            "severity": inc.severity,
            "risk_priority": inc.risk_priority,
            "risk_score": inc.risk_score,
            "status": inc.status,
            "affected_asset": inc.affected_asset,
            "assigned_analyst": inc.assigned_analyst,
            "hours_open": hours_open,
            "description": inc.description
        })

    return {
        "generated_at": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "total_unresolved_urgent_incidents": len(report_items),
        "items": report_items
    }

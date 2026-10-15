import json
import math
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.api.deps import get_db, get_optional_user, require_admin
from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import (
    IncidentCreate,
    IncidentUpdate,
    IncidentResponse,
    PaginatedIncidents,
    StatusUpdate,
    NoteUpdate,
    VALID_STATUSES
)
from app.services.risk_engine import calculate_risk_score
from app.services.playbooks import get_recommended_actions
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/incidents", tags=["Incidents"])

# Allowed status transitions dictionary
ALLOWED_STATUS_TRANSITIONS: dict[str, list[str]] = {
    "Open": ["Investigating", "Contained", "Resolved", "Closed"],
    "Investigating": ["Open", "Contained", "Resolved", "Closed"],
    "Contained": ["Investigating", "Resolved", "Closed"],
    "Resolved": ["Closed", "Investigating"],  # Re-opening allowed with notes
    "Closed": ["Investigating"],            # Re-opening archived ticket
}

@router.get("", response_model=PaginatedIncidents)
def list_incidents(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(15, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search keyword in ID, description, or asset"),
    category: Optional[str] = Query(None, description="Filter by category"),
    severity: Optional[str] = Query(None, description="Filter by severity"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    priority: Optional[str] = Query(None, description="Filter by risk priority tier"),
    from_date: Optional[datetime] = Query(None, description="Filter incidents starting from this date"),
    to_date: Optional[datetime] = Query(None, description="Filter incidents up to this date"),
    sort_by: str = Query("timestamp", description="Sort column: timestamp, risk_score, severity, incident_id, status"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$", description="Sort order: asc or desc"),
    db: Session = Depends(get_db)
):
    """
    Retrieve paginated security incident records with comprehensive multi-criteria filtering and sorting.
    """
    query = db.query(Incident)

    # 1. Text Search
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Incident.incident_id.ilike(term),
                Incident.description.ilike(term),
                Incident.affected_asset.ilike(term),
                Incident.assigned_analyst.ilike(term)
            )
        )

    # 2. Filters
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

    # 3. Total Matching Count
    total = query.count()

    # 4. Sorting
    sort_attr = getattr(Incident, sort_by, Incident.timestamp)
    if sort_dir.lower() == "asc":
        query = query.order_by(asc(sort_attr))
    else:
        query = query.order_by(desc(sort_attr))

    # 5. Pagination
    total_pages = max(1, math.ceil(total / page_size))
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "items": items
    }

@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    incident_in: IncidentCreate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Create a new synthetic incident record with automated risk scoring and defensive playbooks.
    """
    actor = user.username if user else "analyst"

    # Generate incident ID if not explicitly provided
    if not incident_in.incident_id:
        count = db.query(Incident).count() + 1
        year = datetime.now(timezone.utc).year
        incident_id = f"INC-{year}-{count:04d}"
    else:
        incident_id = incident_in.incident_id
        # Check uniqueness
        if db.query(Incident).filter(Incident.incident_id == incident_id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incident ID '{incident_id}' already exists."
            )

    detection_time = incident_in.timestamp or datetime.now(timezone.utc)
    current_status = (incident_in.status or "Open").capitalize()

    # Compute risk priority and explainable factor breakdown
    risk_data = calculate_risk_score(
        severity=incident_in.severity,
        potential_impact=incident_in.potential_impact,
        status=current_status,
        incident_timestamp=detection_time,
        affected_asset=incident_in.affected_asset
    )

    # Generate category-tailored defensive playbooks
    playbook_actions = get_recommended_actions(incident_in.category)

    new_incident = Incident(
        incident_id=incident_id,
        timestamp=detection_time,
        category=incident_in.category,
        severity=incident_in.severity.capitalize(),
        description=incident_in.description,
        affected_asset=incident_in.affected_asset,
        potential_impact=incident_in.potential_impact.capitalize(),
        status=current_status,
        assigned_analyst=incident_in.assigned_analyst or actor,
        investigation_notes=incident_in.investigation_notes or f"[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}] Incident logged by {actor}.",
        risk_score=risk_data["score"],
        risk_priority=risk_data["priority"],
        risk_factors=json.dumps(risk_data["breakdown"]),
        recommended_actions=playbook_actions,
        resolved_at=datetime.now(timezone.utc) if current_status in ["Resolved", "Closed"] else None
    )

    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)

    # Persistent audit logging
    record_audit_event(
        db=db,
        action="INCIDENT_CREATE",
        actor=actor,
        incident_id=new_incident.incident_id,
        outcome="SUCCESS",
        details=f"Synthetic incident created ({new_incident.severity} / {new_incident.category}) with initial risk score {new_incident.risk_score}."
    )

    return new_incident

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident_details(
    incident_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve full incident details including risk explanation and defensive response actions."""
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' was not found."
        )
    return incident

@router.put("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: str,
    incident_update: IncidentUpdate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Update permitted fields of an existing incident and automatically recalculate risk scores.
    """
    actor = user.username if user else "analyst"
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    # Track modified fields for audit trail
    changes = []
    update_data = incident_update.model_dump(exclude_unset=True)

    for field, val in update_data.items():
        if val is not None:
            old_val = getattr(incident, field)
            if old_val != val:
                changes.append(f"{field}: '{old_val}' -> '{val}'")
                setattr(incident, field, val)

    # If category changed, update defensive playbook
    if "category" in update_data:
        incident.recommended_actions = get_recommended_actions(incident.category)

    # Recalculate Risk Prioritization Score
    risk_data = calculate_risk_score(
        severity=incident.severity,
        potential_impact=incident.potential_impact,
        status=incident.status,
        incident_timestamp=incident.timestamp,
        resolved_at=incident.resolved_at,
        affected_asset=incident.affected_asset
    )
    incident.risk_score = risk_data["score"]
    incident.risk_priority = risk_data["priority"]
    incident.risk_factors = json.dumps(risk_data["breakdown"])
    incident.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(incident)

    record_audit_event(
        db=db,
        action="INCIDENT_UPDATE",
        actor=actor,
        incident_id=incident.incident_id,
        outcome="SUCCESS",
        details="; ".join(changes) if changes else "No fields altered."
    )

    return incident

@router.patch("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(
    incident_id: str,
    status_update: StatusUpdate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """
    Execute a validated status transition following strict SOC lifecycle policies.
    """
    actor = user.username if user else "analyst"
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    old_status = incident.status
    new_status = status_update.status

    if old_status == new_status:
        return incident

    # Validate lifecycle transition rule
    allowed_transitions = ALLOWED_STATUS_TRANSITIONS.get(old_status, [])
    if new_status not in allowed_transitions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from '{old_status}' to '{new_status}'. Allowed transitions: {', '.join(allowed_transitions)}"
        )

    incident.status = new_status
    now_utc = datetime.now(timezone.utc)
    timestamp_str = now_utc.strftime("%Y-%m-%d %H:%M:%S UTC")

    # Update resolution timestamp
    if new_status in ["Resolved", "Closed"]:
        incident.resolved_at = now_utc
    elif old_status in ["Resolved", "Closed"] and new_status not in ["Resolved", "Closed"]:
        # Re-opened ticket
        incident.resolved_at = None

    # Append status log into investigation notes
    note_text = f"\n[{timestamp_str}] [STATUS CHANGE] {old_status} -> {new_status} by {actor}."
    if status_update.note and status_update.note.strip():
        note_text += f" Reason: {status_update.note.strip()}"
    incident.investigation_notes = (incident.investigation_notes or "") + note_text

    # Recalculate Risk Prioritization Score
    risk_data = calculate_risk_score(
        severity=incident.severity,
        potential_impact=incident.potential_impact,
        status=incident.status,
        incident_timestamp=incident.timestamp,
        resolved_at=incident.resolved_at,
        affected_asset=incident.affected_asset
    )
    incident.risk_score = risk_data["score"]
    incident.risk_priority = risk_data["priority"]
    incident.risk_factors = json.dumps(risk_data["breakdown"])
    incident.updated_at = now_utc

    db.commit()
    db.refresh(incident)

    record_audit_event(
        db=db,
        action="STATUS_CHANGE",
        actor=actor,
        incident_id=incident.incident_id,
        outcome="SUCCESS",
        details=f"Status transitioned from {old_status} to {new_status}. New risk score: {incident.risk_score}."
    )

    return incident

@router.post("/{incident_id}/notes", response_model=IncidentResponse)
def add_investigation_note(
    incident_id: str,
    note_in: NoteUpdate,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user)
):
    """Append a timestamped investigation note and analyst findings entry."""
    actor = user.username if user else "analyst"
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    entry = f"\n[{timestamp_str}] [{actor}]: {note_in.note.strip()}"
    incident.investigation_notes = (incident.investigation_notes or "") + entry
    incident.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(incident)

    record_audit_event(
        db=db,
        action="NOTE_ADDED",
        actor=actor,
        incident_id=incident.incident_id,
        outcome="SUCCESS",
        details=f"Analyst note appended ({len(note_in.note)} chars)."
    )

    return incident

@router.delete("/{incident_id}", status_code=status.HTTP_200_OK)
def delete_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Remove an incident from the database (Requires Administrator authentication).
    """
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found."
        )

    db.delete(incident)
    db.commit()

    record_audit_event(
        db=db,
        action="INCIDENT_DELETE",
        actor=admin.username,
        incident_id=incident_id,
        outcome="WARNING",
        details=f"Admin {admin.username} deleted incident record {incident_id}."
    )

    return {"message": f"Incident '{incident_id}' deleted successfully.", "incident_id": incident_id}

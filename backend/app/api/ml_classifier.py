import math
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.api.deps import get_db, get_optional_user, require_admin
from app.models.ml_classification import MLClassificationRecord
from app.models.user import User
from app.schemas.ml_classification import (
    MLClassifyRequest,
    MLStatusUpdateRequest,
    MLClassificationResponse,
    PaginatedMLRecords,
    MLMetricsResponse,
    MLSampleRecord,
    VALID_REVIEW_STATUSES,
    VALID_CONFIRMED_STATUSES,
)
from app.services.ml_service import ml_service, MODEL_SAFETY_DISCLAIMER
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/ml", tags=["ML Text Classifier"])


def generate_ml_record_id(db: Session) -> str:
    """Generate sequential, human-readable ML record identifier, e.g. ML-2026-0001."""
    year = datetime.now(timezone.utc).year
    latest = (
        db.query(MLClassificationRecord)
        .filter(MLClassificationRecord.record_id.like(f"ML-{year}-%"))
        .order_by(MLClassificationRecord.id.desc())
        .first()
    )
    if latest and latest.record_id:
        try:
            num = int(latest.record_id.split("-")[-1]) + 1
        except Exception:
            num = db.query(MLClassificationRecord).count() + 1
    else:
        num = 1
    return f"ML-{year}-{num:04d}"


@router.post("/classify", response_model=MLClassificationResponse, status_code=status.HTTP_201_CREATED)
def classify_text_endpoint(
    payload: MLClassifyRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Submits a cybersecurity text snippet to the trained text classifier.
    Stores the submitted record, prediction, confidence score, prevention guidance,
    and initial status ('New', 'Unconfirmed') in the SQLite database.
    """
    try:
        classification = ml_service.classify_text(payload.text)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification inference failed: {str(e)}",
        )

    reviewer_name = (
        payload.reviewer
        or (current_user.full_name if current_user else "SOC Analyst")
    )

    record_id = generate_ml_record_id(db)

    record = MLClassificationRecord(
        record_id=record_id,
        submitted_text=payload.text.strip(),
        predicted_category=classification["predicted_category"],
        confidence_score=classification["confidence_score"],
        prevention_guidance=classification["prevention_guidance"],
        review_status="New",
        analyst_confirmed_status="Unconfirmed",
        analyst_notes=payload.analyst_notes or "",
        reviewer=reviewer_name,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Forensic audit log
    actor_name = current_user.username if current_user else "analyst"
    record_audit_event(
        db=db,
        action="ML_CLASSIFICATION_CREATED",
        actor=actor_name,
        details=f"Classified text as category '{record.predicted_category}' [Record ID: {record_id}]",
    )

    return record


@router.get("/records", response_model=PaginatedMLRecords)
def list_classification_records(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(15, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search keyword in text, notes, or record ID"),
    category: Optional[str] = Query(None, description="Filter by predicted category"),
    review_status: Optional[str] = Query(None, description="Filter by review progress"),
    confirmed_status: Optional[str] = Query(None, description="Filter by human confirmed status"),
    sort_by: str = Query("created_at", description="Sort attribute: created_at, predicted_category, confidence_score, review_status"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$", description="Sort direction"),
    db: Session = Depends(get_db),
):
    """
    Retrieve paginated classification records with filtering by review status,
    analyst-confirmed status, category, and text search.
    """
    query = db.query(MLClassificationRecord)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                MLClassificationRecord.record_id.ilike(term),
                MLClassificationRecord.submitted_text.ilike(term),
                MLClassificationRecord.analyst_notes.ilike(term),
                MLClassificationRecord.reviewer.ilike(term),
            )
        )

    if category and category != "All":
        query = query.filter(MLClassificationRecord.predicted_category == category.lower())

    if review_status and review_status != "All":
        query = query.filter(MLClassificationRecord.review_status == review_status)

    if confirmed_status and confirmed_status != "All":
        query = query.filter(MLClassificationRecord.analyst_confirmed_status == confirmed_status)

    total = query.count()
    sort_attr = getattr(MLClassificationRecord, sort_by, MLClassificationRecord.created_at)
    if sort_dir.lower() == "asc":
        query = query.order_by(asc(sort_attr))
    else:
        query = query.order_by(desc(sort_attr))

    total_pages = max(1, math.ceil(total / page_size))
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "items": items,
    }


@router.get("/records/{record_id}", response_model=MLClassificationResponse)
def get_classification_record(
    record_id: str,
    db: Session = Depends(get_db),
):
    """Fetch details of an individual ML classification record by ID."""
    record = (
        db.query(MLClassificationRecord)
        .filter(
            or_(
                MLClassificationRecord.record_id == record_id,
                MLClassificationRecord.id == int(record_id) if record_id.isdigit() else False,
            )
        )
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classification record '{record_id}' not found.",
        )
    return record


@router.patch("/records/{record_id}", response_model=MLClassificationResponse)
def update_classification_status(
    record_id: str,
    payload: MLStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Updates the review status and/or analyst-confirmed status of a classification record.
    Ensures strict separation between ML predictions and analyst findings.
    """
    record = (
        db.query(MLClassificationRecord)
        .filter(
            or_(
                MLClassificationRecord.record_id == record_id,
                MLClassificationRecord.id == int(record_id) if record_id.isdigit() else False,
            )
        )
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classification record '{record_id}' not found.",
        )

    if payload.review_status:
        if payload.review_status not in VALID_REVIEW_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid review_status '{payload.review_status}'. Allowed: {VALID_REVIEW_STATUSES}",
            )
        record.review_status = payload.review_status

    if payload.analyst_confirmed_status:
        if payload.analyst_confirmed_status not in VALID_CONFIRMED_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid analyst_confirmed_status '{payload.analyst_confirmed_status}'. Allowed: {VALID_CONFIRMED_STATUSES}",
            )
        record.analyst_confirmed_status = payload.analyst_confirmed_status

    if payload.analyst_notes is not None:
        record.analyst_notes = payload.analyst_notes

    if payload.reviewer:
        record.reviewer = payload.reviewer
    elif current_user:
        record.reviewer = current_user.full_name

    db.commit()
    db.refresh(record)

    actor_name = current_user.username if current_user else "analyst"
    record_audit_event(
        db=db,
        action="ML_CLASSIFICATION_STATUS_UPDATED",
        actor=actor_name,
        details=(
            f"Updated record {record.record_id}: Review Status='{record.review_status}', "
            f"Confirmed Status='{record.analyst_confirmed_status}'"
        ),
    )

    return record


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_classification_record(
    record_id: str,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    """Permanently delete an ML classification record (SOC Admin only)."""
    record = (
        db.query(MLClassificationRecord)
        .filter(
            or_(
                MLClassificationRecord.record_id == record_id,
                MLClassificationRecord.id == int(record_id) if record_id.isdigit() else False,
            )
        )
        .first()
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Classification record '{record_id}' not found.",
        )

    db.delete(record)
    db.commit()

    record_audit_event(
        db=db,
        action="ML_CLASSIFICATION_DELETED",
        actor=current_admin.username if current_admin else "admin",
        details=f"Deleted ML record {record_id}",
    )
    return None


@router.get("/metrics", response_model=MLMetricsResponse)
def get_model_metrics():
    """
    Returns the baseline model training and evaluation metrics,
    including classification report, accuracy, and critical limitations.
    """
    return ml_service.get_metrics()


@router.get("/samples", response_model=list[MLSampleRecord])
def get_sample_records():
    """Returns safe sample records from the dataset for testing and demonstration."""
    return ml_service.get_safe_samples()

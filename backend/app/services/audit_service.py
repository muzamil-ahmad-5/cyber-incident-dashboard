from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog

def record_audit_event(
    db: Session,
    action: str,
    actor: str = "system",
    incident_id: str | None = None,
    outcome: str = "SUCCESS",
    details: str = ""
) -> AuditLog:
    """Safely log an audit event to the persistent database."""
    try:
        log_entry = AuditLog(
            actor=actor,
            action=action,
            incident_id=incident_id,
            outcome=outcome,
            details=details[:1000] if details else ""
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        return log_entry
    except Exception as e:
        db.rollback()
        # Fallback print to prevent disrupting primary workflow while noting the failure
        print(f"[AUDIT_ERROR] Failed to record audit log: {e}")
        return None

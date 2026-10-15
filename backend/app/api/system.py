from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api.deps import get_db
from app.models.incident import Incident
from app.models.audit_log import AuditLog
from app.models.user import User

router = APIRouter(prefix="/system", tags=["System"])

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """System health check and database connection verification."""
    try:
        # Check SQLite connectivity
        db.execute(text("SELECT 1"))
        incident_count = db.query(Incident).count()
        audit_count = db.query(AuditLog).count()
        user_count = db.query(User).count()
        
        return {
            "status": "healthy",
            "database": "connected",
            "stats": {
                "incidents": incident_count,
                "audit_logs": audit_count,
                "users": user_count
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database check failed: {str(e)}")

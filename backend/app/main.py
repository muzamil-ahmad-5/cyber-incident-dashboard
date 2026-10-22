from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.incident import Incident
from app.models.audit_log import AuditLog
from app.models.ml_classification import MLClassificationRecord
from app.api.auth import router as auth_router
from app.api.incidents import router as incidents_router
from app.api.analytics import router as analytics_router
from app.api.reports import router as reports_router
from app.api.audit import router as audit_router
from app.api.system import router as system_router
from app.api.ml_classifier import router as ml_classifier_router
from app.api.llm_solutions import router as llm_solutions_router

def init_db():
    """Create database tables and bootstrap initial admin user if not present."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            default_admin = User(
                username="admin",
                hashed_password=hash_password("soc_admin_password123"),
                full_name="SOC Chief Administrator",
                role="admin",
                is_active=True
            )
            db.add(default_admin)
            
            # Also create standard analyst account for demonstration
            analyst_user = User(
                username="analyst",
                hashed_password=hash_password("soc_analyst_password123"),
                full_name="Lead Incident Responder",
                role="analyst",
                is_active=True
            )
            db.add(analyst_user)
            db.commit()
            print("[INIT] Initial SOC admin ('admin') and analyst ('analyst') accounts seeded.")
    except Exception as e:
        print(f"[INIT_ERROR] Database initialization warning: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and ensure tables/admin exist
    init_db()
    yield
    # Shutdown logic if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="Centralized Security Operations Center (SOC) Incident Monitoring, Risk Prioritization & Analytics API.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers under /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(incidents_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(system_router, prefix="/api")
app.include_router(ml_classifier_router, prefix="/api")
app.include_router(llm_solutions_router, prefix="/api")

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "status": "operational",
        "documentation": "/docs",
        "disclaimer": "Academic Project - Synthetic Incidents Only"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Ensure internal database errors don't leak raw stack traces to clients."""
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please contact the SOC system administrator."}
    )

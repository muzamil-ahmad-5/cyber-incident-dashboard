import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Base directory for the backend
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Security Incident Dashboard"
    PROJECT_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # SQLite persistent database path
    DATABASE_URL: str = f"sqlite:///{DATA_DIR / 'incident_dashboard.db'}"
    
    # Security & JWT configuration
    # In production, this would be injected via environment variables
    SECRET_KEY: str = os.getenv("SECRET_KEY", "academic-soc-super-secret-key-change-in-prod-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours
    
    # CORS Configuration
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()

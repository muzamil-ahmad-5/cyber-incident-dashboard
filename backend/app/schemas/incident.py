from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator, ConfigDict

VALID_CATEGORIES = [
    "Suspicious Login",
    "Phishing Alert",
    "Malware Alert",
    "Unauthorized Access",
    "Brute-Force Attempt",
    "Suspicious Network Activity",
    "Data Exfiltration Alert",
    "Privilege Escalation",
    "Policy Violation",
    "Other"
]

VALID_SEVERITIES = ["Critical", "High", "Medium", "Low"]
VALID_STATUSES = ["Open", "Investigating", "Contained", "Resolved", "Closed"]

class IncidentBase(BaseModel):
    category: str = Field(..., description="Synthetic incident category")
    severity: str = Field(..., description="Severity level: Critical, High, Medium, Low")
    description: str = Field(..., min_length=5, description="Incident details")
    affected_asset: str = Field(..., min_length=2, description="Simulated affected host or resource")
    potential_impact: str = Field(default="Medium", description="Estimated business or asset impact")
    assigned_analyst: Optional[str] = Field(default="Unassigned", description="Assigned SOC analyst")
    investigation_notes: Optional[str] = Field(default="", description="Analyst work log and evidence notes")

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in VALID_CATEGORIES:
            raise ValueError(f"Category '{v}' is invalid. Must be one of: {', '.join(VALID_CATEGORIES)}")
        return v

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        clean = v.capitalize()
        if clean not in VALID_SEVERITIES:
            raise ValueError(f"Severity '{v}' is invalid. Must be one of: {', '.join(VALID_SEVERITIES)}")
        return clean

class IncidentCreate(IncidentBase):
    incident_id: Optional[str] = Field(default=None, description="Optional custom ID, otherwise auto-generated")
    status: Optional[str] = Field(default="Open", description="Initial status")
    timestamp: Optional[datetime] = Field(default=None, description="Detection timestamp (defaults to current time)")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> str:
        if v is None:
            return "Open"
        clean = v.capitalize()
        if clean not in VALID_STATUSES:
            raise ValueError(f"Status '{v}' is invalid. Must be one of: {', '.join(VALID_STATUSES)}")
        return clean

class IncidentUpdate(BaseModel):
    category: Optional[str] = None
    severity: Optional[str] = None
    description: Optional[str] = None
    affected_asset: Optional[str] = None
    potential_impact: Optional[str] = None
    assigned_analyst: Optional[str] = None
    investigation_notes: Optional[str] = None
    status: Optional[str] = None

    @field_validator("category")
    @classmethod
    def validate_cat(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_CATEGORIES:
            raise ValueError(f"Category must be one of: {', '.join(VALID_CATEGORIES)}")
        return v

    @field_validator("severity")
    @classmethod
    def validate_sev(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.capitalize()
            if clean not in VALID_SEVERITIES:
                raise ValueError(f"Severity must be one of: {', '.join(VALID_SEVERITIES)}")
            return clean
        return v

    @field_validator("status")
    @classmethod
    def validate_stat(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            clean = v.capitalize()
            if clean not in VALID_STATUSES:
                raise ValueError(f"Status must be one of: {', '.join(VALID_STATUSES)}")
            return clean
        return v

class StatusUpdate(BaseModel):
    status: str = Field(..., description="Target status")
    note: Optional[str] = Field(default="", description="Reason or context for status transition")

    @field_validator("status")
    @classmethod
    def validate_target_status(cls, v: str) -> str:
        clean = v.capitalize()
        if clean not in VALID_STATUSES:
            raise ValueError(f"Target status must be one of: {', '.join(VALID_STATUSES)}")
        return clean

class NoteUpdate(BaseModel):
    note: str = Field(..., min_length=1, description="New investigation note entry to append or record")

class IncidentResponse(IncidentBase):
    id: int
    incident_id: str
    timestamp: datetime
    status: str
    risk_score: float
    risk_priority: str
    risk_factors: Optional[str] = None
    recommended_actions: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginatedIncidents(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: list[IncidentResponse]

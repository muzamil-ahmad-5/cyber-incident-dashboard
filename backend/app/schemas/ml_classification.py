from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

VALID_REVIEW_STATUSES = ["New", "Under Investigation", "Resolved", "False Positive"]
VALID_CONFIRMED_STATUSES = ["Unconfirmed", "Confirmed Incident", "Benign Activity", "Inconclusive"]

class MLClassifyRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=10000, description="Raw cybersecurity text, alert description, or threat log to classify")
    analyst_notes: Optional[str] = Field(None, max_length=5000, description="Initial analyst observations or triage context")
    reviewer: Optional[str] = Field("SOC Analyst", max_length=64, description="Name or identifier of the submitting analyst")

class MLStatusUpdateRequest(BaseModel):
    review_status: Optional[str] = Field(None, description="Review progress: New, Under Investigation, Resolved, False Positive")
    analyst_confirmed_status: Optional[str] = Field(None, description="Human analyst verification: Unconfirmed, Confirmed Incident, Benign Activity, Inconclusive")
    analyst_notes: Optional[str] = Field(None, max_length=5000, description="Updated investigative findings")
    reviewer: Optional[str] = Field(None, max_length=64, description="Analyst conducting review")

class MLClassificationResponse(BaseModel):
    id: int
    record_id: str
    submitted_text: str
    predicted_category: str
    confidence_score: float
    prevention_guidance: str
    review_status: str
    analyst_confirmed_status: str
    analyst_notes: Optional[str] = ""
    reviewer: Optional[str] = "SOC Analyst"
    model_disclaimer: str = (
        "CRITICAL DATA LIMITATION: Entity category text classification only. "
        "This model does not detect attacks or verify benign vs malicious intent. "
        "Analyst confirmation required before defensive action."
    )
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginatedMLRecords(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[MLClassificationResponse]

class MLSampleRecord(BaseModel):
    label: str
    category: str
    text: str
    context: str

class MLMetricsResponse(BaseModel):
    task: str
    warning: str
    dataset_rows_original: Optional[int] = None
    unique_text_rows_used: Optional[int] = None
    number_of_classes: Optional[int] = None
    classes: List[str] = []
    train_rows: Optional[int] = None
    test_rows: Optional[int] = None
    accuracy: float = 0.0
    classification_report: Optional[Dict[str, Any]] = None
    confusion_matrix_labels: Optional[List[str]] = None
    confusion_matrix: Optional[List[List[int]]] = None

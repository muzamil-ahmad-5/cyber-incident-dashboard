from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

class LLMSolutionRequest(BaseModel):
    model_provider: Optional[str] = Field(
        default="auto",
        description="LLM provider: 'grok', 'gpt', 'builtin', or 'auto'"
    )
    custom_api_key: Optional[str] = Field(
        default=None,
        description="Optional user-provided API key for Grok (xAI) or GPT (OpenAI)"
    )
    focus_area: Optional[str] = Field(
        default="all",
        description="Remediation focus: 'all', 'containment', 'eradication', or 'hardening'"
    )

class LLMSolutionResponse(BaseModel):
    incident_id: str
    category: str
    severity: str
    risk_score: float
    risk_priority: str
    affected_asset: str
    provider_used: str
    model_name: str
    is_live_api: bool
    detection_summary: Dict[str, Any]
    solution_protocol: Dict[str, Any]
    dataset_grounded_solution: Dict[str, Any]
    full_markdown: str
    generated_at: str

class ApplySolutionRequest(BaseModel):
    solution_markdown: str
    analyst_name: Optional[str] = Field(default="SOC Analyst")
    mark_contained: Optional[bool] = Field(default=False)

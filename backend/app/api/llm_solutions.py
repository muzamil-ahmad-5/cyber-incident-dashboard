import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_optional_user
from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import IncidentResponse
from app.schemas.llm_solution import (
    LLMSolutionRequest,
    LLMSolutionResponse,
    ApplySolutionRequest,
)
from app.services.llm_solution_service import llm_solution_service
from app.services.risk_engine import calculate_risk_score
from app.services.audit_service import record_audit_event

router = APIRouter(prefix="/solutions", tags=["AI LLM Solutions"])

@router.post("/incident/{incident_id}", response_model=LLMSolutionResponse)
async def generate_incident_ai_solution(
    incident_id: str,
    req: LLMSolutionRequest = LLMSolutionRequest(),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    """
    Generate an intelligent, step-by-step mitigation method and solution using Grok, GPT, or Built-in CyberLLM.
    """
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )

    incident_dict = {
        "incident_id": incident.incident_id,
        "category": incident.category,
        "severity": incident.severity,
        "risk_score": incident.risk_score,
        "risk_priority": incident.risk_priority,
        "affected_asset": incident.affected_asset,
        "description": incident.description,
    }

    solution_data = await llm_solution_service.generate_solution(
        incident_data=incident_dict,
        model_provider=req.model_provider or "auto",
        custom_api_key=req.custom_api_key,
    )

    actor = user.username if user else "analyst"
    record_audit_event(
        db=db,
        action="AI_SOLUTION_GENERATED",
        actor=actor,
        incident_id=incident.incident_id,
        outcome="SUCCESS",
        details=f"Generated AI mitigation solution via {solution_data['provider_used']}.",
    )

    return solution_data

@router.post("/incident/{incident_id}/apply", response_model=IncidentResponse)
def apply_ai_solution_to_incident(
    incident_id: str,
    req: ApplySolutionRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_optional_user),
):
    """
    Append generated AI solution checklist into the incident's investigation work log,
    and optionally transition status to 'Contained'.
    """
    actor = user.username if user else req.analyst_name or "analyst"
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident '{incident_id}' not found.",
        )

    now_utc = datetime.now(timezone.utc)
    ts_str = now_utc.strftime("%Y-%m-%d %H:%M:%S UTC")

    # Format applied solution entry
    snippet = req.solution_markdown.strip()
    if len(snippet) > 1200:
        # Keep crisp summary in work log
        snippet = snippet[:1200] + "\n... [Full AI playbook archived in case file]"

    log_entry = (
        f"\n\n[{ts_str}] [AI DEFENSIVE SOLUTION APPLIED] by {actor}:\n"
        f"{snippet}"
    )

    incident.investigation_notes = (incident.investigation_notes or "") + log_entry

    # Optionally mark contained if currently open or investigating
    old_status = incident.status
    if req.mark_contained and incident.status in ["Open", "Investigating"]:
        incident.status = "Contained"
        # Recalculate Risk Score
        risk_data = calculate_risk_score(
            severity=incident.severity,
            potential_impact=incident.potential_impact,
            status=incident.status,
            incident_timestamp=incident.timestamp,
            resolved_at=incident.resolved_at,
            affected_asset=incident.affected_asset,
        )
        incident.risk_score = risk_data["score"]
        incident.risk_priority = risk_data["priority"]
        incident.risk_factors = json.dumps(risk_data["breakdown"])

    incident.updated_at = now_utc
    db.commit()
    db.refresh(incident)

    record_audit_event(
        db=db,
        action="AI_SOLUTION_APPLIED",
        actor=actor,
        incident_id=incident.incident_id,
        outcome="SUCCESS",
        details=f"Applied AI solution. Status: {old_status} -> {incident.status}. New Risk Score: {incident.risk_score}.",
    )

    return incident

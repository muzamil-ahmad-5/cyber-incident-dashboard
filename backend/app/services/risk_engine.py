"""
Explainable Heuristic Risk Prioritization Engine for SOC Incident Management.

Notice: This algorithm is a deterministic heuristic scoring model designed for
educational demonstration and prioritization ranking in an academic SOC context.
It does not claim to predict real-world zero-day exploitability or live attack success.
"""

from datetime import datetime, timezone
from typing import Any, Optional

# Severity Base Weight (Max: 40 points)
SEVERITY_WEIGHTS: dict[str, float] = {
    "Critical": 40.0,
    "High": 25.0,
    "Medium": 15.0,
    "Low": 5.0,
}

# Potential Impact Weight (Max: 25 points)
IMPACT_WEIGHTS: dict[str, float] = {
    "Critical": 25.0,
    "High": 25.0,
    "Medium": 15.0,
    "Low": 5.0,
}

# Investigation Status Multiplier
STATUS_MULTIPLIERS: dict[str, float] = {
    "Open": 1.0,           # Active unmitigated risk
    "Investigating": 0.85, # Triage underway
    "Contained": 0.40,     # Threat blast-radius bounded
    "Resolved": 0.10,      # Remediation complete, awaiting verification
    "Closed": 0.05,        # Formally archived
}

# Asset Criticality Keywords (adds up to 5 points within impact cap)
CRITICAL_ASSET_KEYWORDS = ["prod", "auth", "db", "vault", "payment", "core", "gateway", "k8s"]

def calculate_risk_score(
    severity: str,
    potential_impact: str,
    status: str,
    incident_timestamp: Optional[datetime] = None,
    resolved_at: Optional[datetime] = None,
    affected_asset: str = "",
    reference_time: Optional[datetime] = None
) -> dict[str, Any]:
    """
    Computes an explainable, deterministic risk score on a 0–100 scale.
    
    Formula:
        Raw Score = (Base Severity Score + Potential Impact Score + Aging Factor) * Status Multiplier
        Clamped to [0.0, 100.0]
    
    Returns:
        dict containing:
            - score (float)
            - priority (str: CRITICAL, HIGH, MEDIUM, LOW)
            - explanation (str: human-readable transparent breakdown)
            - breakdown (dict: individual factor points)
    """
    # 1. Base Severity Factor
    clean_severity = (severity or "Medium").capitalize()
    base_score = SEVERITY_WEIGHTS.get(clean_severity, 15.0)

    # 2. Potential Impact Factor & Asset Bonus
    clean_impact = (potential_impact or "Medium").capitalize()
    impact_score = IMPACT_WEIGHTS.get(clean_impact, 15.0)
    
    asset_bonus = 0.0
    asset_lower = (affected_asset or "").lower()
    if any(keyword in asset_lower for keyword in CRITICAL_ASSET_KEYWORDS):
        asset_bonus = 5.0
    # Cap combined impact score at 25.0
    final_impact_score = min(25.0, impact_score + asset_bonus)

    # 3. Time Aging Factor (0 to 20 points, +0.25 pts per hour open, maxes at 80 hours)
    aging_score = 0.0
    hours_unresolved = 0.0
    
    if status not in ["Resolved", "Closed"] and incident_timestamp is not None:
        now = reference_time or datetime.now(timezone.utc)
        # Ensure timezone-aware comparison
        if incident_timestamp.tzinfo is None:
            ts = incident_timestamp.replace(tzinfo=timezone.utc)
        else:
            ts = incident_timestamp
            
        elapsed_seconds = max(0.0, (now - ts).total_seconds())
        hours_unresolved = round(elapsed_seconds / 3600.0, 1)
        aging_score = min(20.0, round(hours_unresolved * 0.25, 1))

    # 4. Status Mitigation Multiplier
    clean_status = (status or "Open").capitalize()
    multiplier = STATUS_MULTIPLIERS.get(clean_status, 1.0)

    # Calculate raw and clamped score
    subtotal = base_score + final_impact_score + aging_score
    raw_score = subtotal * multiplier
    final_score = round(max(0.0, min(100.0, raw_score)), 1)

    # Determine Priority Tier
    if final_score >= 80.0:
        priority = "CRITICAL"
    elif final_score >= 60.0:
        priority = "HIGH"
    elif final_score >= 35.0:
        priority = "MEDIUM"
    else:
        priority = "LOW"

    # Generate Human-Readable Explanation for SOC Analysts & Viva Defense
    explanation = (
        f"Heuristic Risk Score: {final_score}/100 [Tier: {priority}]. "
        f"Base severity '{clean_severity}' contributes {base_score:.1f} pts. "
        f"Potential impact '{clean_impact}' (including simulated asset weighting) adds {final_impact_score:.1f} pts. "
        f"Incident age ({hours_unresolved:.1f}h unresolved) adds {aging_score:.1f} aging points. "
        f"Status '{clean_status}' applies mitigation multiplier {multiplier:.2f} "
        f"(subtotal {subtotal:.1f} × {multiplier:.2f} = {raw_score:.1f})."
    )

    breakdown = {
        "base_severity": clean_severity,
        "base_severity_score": base_score,
        "potential_impact": clean_impact,
        "impact_score": final_impact_score,
        "asset_bonus_applied": asset_bonus > 0,
        "hours_unresolved": hours_unresolved,
        "aging_score": aging_score,
        "status": clean_status,
        "status_multiplier": multiplier,
        "subtotal": subtotal,
        "raw_score": raw_score,
        "final_score": final_score,
        "priority_tier": priority
    }

    return {
        "score": final_score,
        "priority": priority,
        "explanation": explanation,
        "breakdown": breakdown
    }

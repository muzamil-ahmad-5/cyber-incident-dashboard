from typing import Optional
from pydantic import BaseModel

class SummaryStats(BaseModel):
    total_incidents: int
    critical_incidents: int
    high_incidents: int
    medium_incidents: int
    low_incidents: int
    open_incidents: int
    investigating_incidents: int
    contained_incidents: int
    resolved_incidents: int
    closed_incidents: int
    avg_risk_score: float
    unresolved_high_priority_count: int
    mttr_hours: Optional[float] = None

class CategoryCount(BaseModel):
    category: str
    count: int
    percentage: float

class SeverityCount(BaseModel):
    severity: str
    count: int
    percentage: float

class PriorityCount(BaseModel):
    priority: str
    count: int
    percentage: float

class TrendPoint(BaseModel):
    date: str
    count: int
    critical_count: int
    high_count: int

class AssetImpact(BaseModel):
    asset: str
    incident_count: int
    max_severity: str
    avg_risk_score: float

class AgingBucket(BaseModel):
    range: str
    count: int

class AnalyticsDashboard(BaseModel):
    summary: SummaryStats
    category_distribution: list[CategoryCount]
    severity_distribution: list[SeverityCount]
    priority_distribution: list[PriorityCount]
    trend_over_time: list[TrendPoint]
    top_affected_assets: list[AssetImpact]
    aging_distribution: list[AgingBucket]

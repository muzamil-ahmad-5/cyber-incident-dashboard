from datetime import datetime, timezone, timedelta
from typing import Optional
import pandas as pd
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.incident import Incident
from app.schemas.analytics import (
    AnalyticsDashboard,
    SummaryStats,
    CategoryCount,
    SeverityCount,
    PriorityCount,
    TrendPoint,
    AssetImpact,
    AgingBucket
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard", response_model=AnalyticsDashboard)
def get_dashboard_analytics(
    category: Optional[str] = Query(None, description="Optional category filter"),
    severity: Optional[str] = Query(None, description="Optional severity filter"),
    from_date: Optional[datetime] = Query(None, description="Start date filter"),
    to_date: Optional[datetime] = Query(None, description="End date filter"),
    db: Session = Depends(get_db)
):
    """
    Calculate comprehensive SOC analytical metrics dynamically using Pandas and database queries.
    Safely handles empty datasets without error.
    """
    query = db.query(Incident)

    if category and category != "All":
        query = query.filter(Incident.category == category)
    if severity and severity != "All":
        query = query.filter(Incident.severity == severity.capitalize())
    if from_date:
        query = query.filter(Incident.timestamp >= from_date)
    if to_date:
        query = query.filter(Incident.timestamp <= to_date)

    incidents = query.all()

    # Handle completely empty dataset gracefully
    if not incidents:
        return AnalyticsDashboard(
            summary=SummaryStats(
                total_incidents=0,
                critical_incidents=0,
                high_incidents=0,
                medium_incidents=0,
                low_incidents=0,
                open_incidents=0,
                investigating_incidents=0,
                contained_incidents=0,
                resolved_incidents=0,
                closed_incidents=0,
                avg_risk_score=0.0,
                unresolved_high_priority_count=0
            ),
            category_distribution=[],
            severity_distribution=[],
            priority_distribution=[],
            trend_over_time=[],
            top_affected_assets=[],
            aging_distribution=[
                AgingBucket(range="< 24 Hours", count=0),
                AgingBucket(range="24 - 48 Hours", count=0),
                AgingBucket(range="48 - 72 Hours", count=0),
                AgingBucket(range="> 72 Hours", count=0),
            ]
        )

    # Convert records to Pandas DataFrame for vector calculations
    data = [
        {
            "id": inc.id,
            "incident_id": inc.incident_id,
            "timestamp": inc.timestamp,
            "category": inc.category,
            "severity": inc.severity,
            "status": inc.status,
            "risk_score": inc.risk_score,
            "risk_priority": inc.risk_priority,
            "affected_asset": inc.affected_asset,
        }
        for inc in incidents
    ]
    df = pd.DataFrame(data)

    total_count = len(df)

    # Summary Metrics
    critical_cnt = int((df["severity"] == "Critical").sum())
    high_cnt = int((df["severity"] == "High").sum())
    medium_cnt = int((df["severity"] == "Medium").sum())
    low_cnt = int((df["severity"] == "Low").sum())

    open_cnt = int((df["status"] == "Open").sum())
    investigating_cnt = int((df["status"] == "Investigating").sum())
    contained_cnt = int((df["status"] == "Contained").sum())
    resolved_cnt = int((df["status"] == "Resolved").sum())
    closed_cnt = int((df["status"] == "Closed").sum())

    avg_score = round(float(df["risk_score"].mean()), 1)

    # Unresolved High Priority: Status not in [Resolved, Closed] and risk_priority in [CRITICAL, HIGH]
    unresolved_mask = (~df["status"].isin(["Resolved", "Closed"])) & (df["risk_priority"].isin(["CRITICAL", "HIGH"]))
    unresolved_high_pri_count = int(unresolved_mask.sum())

    # Mean Time to Resolution (MTTR) calculation from actual database timestamps
    resolved_deltas = [
        (inc.resolved_at - inc.timestamp).total_seconds() / 3600.0
        for inc in incidents
        if inc.status in ["Resolved", "Closed"] and inc.resolved_at and inc.timestamp and inc.resolved_at >= inc.timestamp
    ]
    mttr_val = round(float(sum(resolved_deltas) / len(resolved_deltas)), 1) if resolved_deltas else None

    summary = SummaryStats(
        total_incidents=total_count,
        critical_incidents=critical_cnt,
        high_incidents=high_cnt,
        medium_incidents=medium_cnt,
        low_incidents=low_cnt,
        open_incidents=open_cnt,
        investigating_incidents=investigating_cnt,
        contained_incidents=contained_cnt,
        resolved_incidents=resolved_cnt,
        closed_incidents=closed_cnt,
        avg_risk_score=avg_score,
        unresolved_high_priority_count=unresolved_high_pri_count,
        mttr_hours=mttr_val
    )

    # 1. Category Distribution
    cat_counts = df["category"].value_counts()
    category_distribution = [
        CategoryCount(
            category=cat,
            count=int(cnt),
            percentage=round((cnt / total_count) * 100, 1)
        )
        for cat, cnt in cat_counts.items()
    ]

    # 2. Severity Distribution
    sev_counts = df["severity"].value_counts()
    severity_order = ["Critical", "High", "Medium", "Low"]
    severity_distribution = [
        SeverityCount(
            severity=sev,
            count=int(sev_counts.get(sev, 0)),
            percentage=round((sev_counts.get(sev, 0) / total_count) * 100, 1) if total_count > 0 else 0.0
        )
        for sev in severity_order
        if sev_counts.get(sev, 0) > 0 or total_count > 0
    ]

    # 3. Priority Distribution
    pri_counts = df["risk_priority"].value_counts()
    priority_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    priority_distribution = [
        PriorityCount(
            priority=pri,
            count=int(pri_counts.get(pri, 0)),
            percentage=round((pri_counts.get(pri, 0) / total_count) * 100, 1) if total_count > 0 else 0.0
        )
        for pri in priority_order
    ]

    # 4. Trend Over Time (grouped by day)
    df["date_str"] = pd.to_datetime(df["timestamp"]).dt.strftime("%Y-%m-%d")
    trend_grouped = df.groupby("date_str")
    trend_over_time = []
    for date_str, group in sorted(trend_grouped):
        c_cnt = int((group["severity"] == "Critical").sum())
        h_cnt = int((group["severity"] == "High").sum())
        trend_over_time.append(
            TrendPoint(
                date=date_str,
                count=len(group),
                critical_count=c_cnt,
                high_count=h_cnt
            )
        )

    # 5. Top Affected Simulated Assets
    asset_grouped = df.groupby("affected_asset")
    asset_list = []
    severity_rank = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
    for asset_name, group in asset_grouped:
        max_sev = max(group["severity"], key=lambda s: severity_rank.get(s, 0))
        asset_list.append(
            AssetImpact(
                asset=asset_name,
                incident_count=len(group),
                max_severity=max_sev,
                avg_risk_score=round(float(group["risk_score"].mean()), 1)
            )
        )
    # Sort by incident count descending and take top 7
    top_affected_assets = sorted(asset_list, key=lambda a: a.incident_count, reverse=True)[:7]

    # 6. Open Incident Aging Buckets
    now = datetime.now(timezone.utc)
    open_df = df[~df["status"].isin(["Resolved", "Closed"])].copy()
    
    bucket_counts = {"< 24 Hours": 0, "24 - 48 Hours": 0, "48 - 72 Hours": 0, "> 72 Hours": 0}
    if not open_df.empty:
        open_df["hours_open"] = (now - pd.to_datetime(open_df["timestamp"], utc=True)).dt.total_seconds() / 3600.0
        bucket_counts["< 24 Hours"] = int((open_df["hours_open"] < 24).sum())
        bucket_counts["24 - 48 Hours"] = int(((open_df["hours_open"] >= 24) & (open_df["hours_open"] < 48)).sum())
        bucket_counts["48 - 72 Hours"] = int(((open_df["hours_open"] >= 48) & (open_df["hours_open"] < 72)).sum())
        bucket_counts["> 72 Hours"] = int((open_df["hours_open"] >= 72).sum())

    aging_distribution = [
        AgingBucket(range=k, count=v) for k, v in bucket_counts.items()
    ]

    return AnalyticsDashboard(
        summary=summary,
        category_distribution=category_distribution,
        severity_distribution=severity_distribution,
        priority_distribution=priority_distribution,
        trend_over_time=trend_over_time,
        top_affected_assets=top_affected_assets,
        aging_distribution=aging_distribution
    )

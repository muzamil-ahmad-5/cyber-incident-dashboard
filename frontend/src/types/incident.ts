export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type IncidentStatus = 'Open' | 'Investigating' | 'Contained' | 'Resolved' | 'Closed';
export type RiskPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Incident {
  id: number;
  incident_id: string;
  timestamp: string;
  category: string;
  severity: SeverityLevel;
  description: string;
  affected_asset: string;
  potential_impact: string;
  status: IncidentStatus;
  assigned_analyst: string;
  investigation_notes: string;
  risk_score: number;
  risk_priority: RiskPriority;
  risk_factors: string; // JSON string
  recommended_actions: string;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedIncidents {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: Incident[];
}

export interface SummaryStats {
  total_incidents: number;
  critical_incidents: number;
  high_incidents: number;
  medium_incidents: number;
  low_incidents: number;
  open_incidents: number;
  investigating_incidents: number;
  contained_incidents: number;
  resolved_incidents: number;
  closed_incidents: number;
  avg_risk_score: number;
  unresolved_high_priority_count: number;
  mttr_hours?: number | null;
}

export interface CategoryCount {
  category: string;
  count: number;
  percentage: number;
}

export interface SeverityCount {
  severity: string;
  count: number;
  percentage: number;
}

export interface PriorityCount {
  priority: string;
  count: number;
  percentage: number;
}

export interface TrendPoint {
  date: string;
  count: number;
  critical_count: number;
  high_count: number;
}

export interface AssetImpact {
  asset: string;
  incident_count: number;
  max_severity: string;
  avg_risk_score: number;
}

export interface AgingBucket {
  range: string;
  count: number;
}

export interface AnalyticsDashboard {
  summary: SummaryStats;
  category_distribution: CategoryCount[];
  severity_distribution: SeverityCount[];
  priority_distribution: PriorityCount[];
  trend_over_time: TrendPoint[];
  top_affected_assets: AssetImpact[];
  aging_distribution: AgingBucket[];
}

export interface AuditLog {
  id: number;
  event_id: string;
  timestamp: string;
  actor: string;
  action: string;
  incident_id?: string | null;
  outcome: string;
  details?: string | null;
}

export interface PaginatedAuditLogs {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: AuditLog[];
}

export interface User {
  id: number;
  username: string;
  full_name?: string | null;
  role: 'admin' | 'analyst';
  is_active: boolean;
}

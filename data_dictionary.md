# Synthetic Incident Dataset: Data Dictionary

> **ACADEMIC INTEGRITY & SYNTHETIC DATA NOTICE**:
> All records in this dataset are purely synthetic. No actual organizational networks, live production infrastructure, real employee credentials, or genuine personal identifiable information (PII) are contained in this database. The assets and indicators represent educational simulations designed for academic evaluation.

## 1. Incidents Table (`incidents`)

| Field Name | Type | Constraints | Description | Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto-increment | Internal unique primary key | `1` |
| `incident_id` | String(32) | Unique, Indexed, Non-null | Unique human-readable ticket ID (`INC-YYYY-XXXX`) | `INC-2026-0042` |
| `timestamp` | DateTime | Indexed, Non-null | Detection timestamp (UTC) | `2026-09-28 14:22:10` |
| `category` | String(64) | Indexed, Enum, Non-null | Categorized alert classification (10 valid categories) | `Suspicious Login` |
| `severity` | String(32) | Indexed, Enum, Non-null | Baseline triage severity: `Critical`, `High`, `Medium`, `Low` | `High` |
| `description` | Text | Non-null | Detailed summary of simulated telemetry observations | `Unusual login detected from foreign test subnet` |
| `affected_asset` | String(128) | Indexed, Non-null | Simulated internal hostname or system resource | `srv-auth-01.corp.internal` |
| `potential_impact` | String(64) | Enum, Non-null | Anticipated business/asset blast radius | `High` |
| `status` | String(32) | Indexed, Enum, Non-null | Incident lifecycle state (`Open`, `Investigating`, `Contained`, `Resolved`, `Closed`) | `Investigating` |
| `assigned_analyst` | String(64) | Nullable | Assigned responder or queue handle | `analyst_sarah` |
| `investigation_notes`| Text | Nullable | Timestamped work log of analyst actions and findings | `[2026-09-28 14:30:00 UTC] Triage initiated...` |
| `risk_score` | Float | Indexed, Range 0.0-100.0 | Calculated deterministic heuristic priority score | `76.5` |
| `risk_priority` | String(32) | Indexed, Enum | Algorithm tier: `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` | `HIGH` |
| `risk_factors` | Text | Nullable, JSON | Mathematical breakdown of contributing scoring factors | `{"base_severity_score": 25.0, ...}` |
| `recommended_actions`| Text | Nullable | Category-specific defensive response playbooks | `1. Review authentication event details...` |
| `resolved_at` | DateTime | Nullable | Timestamp when incident reached Resolved/Closed status | `2026-09-29 10:15:00` |
| `created_at` | DateTime | Non-null | Ingestion creation timestamp | `2026-09-28 14:22:10` |
| `updated_at` | DateTime | Non-null | Last modification timestamp | `2026-09-28 15:00:00` |

## 2. Valid Enums & Controlled Vocabularies

### Categories (10 Types)
1. `Suspicious Login`
2. `Phishing Alert`
3. `Malware Alert`
4. `Unauthorized Access`
5. `Brute-Force Attempt`
6. `Suspicious Network Activity`
7. `Data Exfiltration Alert`
8. `Privilege Escalation`
9. `Policy Violation`
10. `Other`

### Severity Levels
- `Critical` (Base weight: 40 pts)
- `High` (Base weight: 25 pts)
- `Medium` (Base weight: 15 pts)
- `Low` (Base weight: 5 pts)

### Incident Lifecycle Statuses
- `Open` (Unmitigated alert, mitigation multiplier = 1.0)
- `Investigating` (Triage active, mitigation multiplier = 0.85)
- `Contained` (Threat blast-radius bounded, mitigation multiplier = 0.40)
- `Resolved` (Remediation verified, mitigation multiplier = 0.10)
- `Closed` (Ticket formally archived, mitigation multiplier = 0.05)

## 3. Audit Logs Table (`audit_logs`)

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `event_id` | String(32) | Unique audit event identifier (`AUD-XXXXXXXX`) |
| `timestamp` | DateTime | Audit event generation time in UTC |
| `actor` | String(64) | Authenticated username or `system` |
| `action` | String(64) | Audit action code (e.g., `INCIDENT_CREATE`, `STATUS_CHANGE`) |
| `incident_id` | String(32) | Associated ticket identifier if applicable |
| `outcome` | String(32) | Result classification: `SUCCESS`, `FAILURE`, `WARNING` |
| `details` | Text | Sanitized contextual summary of changes or reasons |

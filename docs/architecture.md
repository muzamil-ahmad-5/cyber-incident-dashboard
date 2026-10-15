# Security Operations Center (SOC) Architecture & Data Flow

## 1. System Overview

The **Security Incident Dashboard** is an academic Security Operations Center (SOC) incident monitoring, investigation, and risk prioritization platform. The system is designed to simulate how modern enterprise defense teams ingest, triage, prioritize, investigate, and remediate cybersecurity events while mitigating alert fatigue.

```
+-------------------------------------------------------------------------+
|                              USER INTERFACE                             |
|               React 19 + TypeScript + Vite + Tailwind CSS               |
|                                                                         |
|  [ Overview ]  [ Incidents ]  [ Investigation ]  [ Threat Analytics ]   |
|         [ Reports & Exports ]  [ Audit Trail ]  [ System Settings ]     |
+-------------------------------------------------------------------------+
                                    |
                    RESTful API (JSON / HTTP / JWT)
                                    v
+-------------------------------------------------------------------------+
|                             FASTAPI BACKEND                             |
|                                                                         |
|  +--------------------+   +---------------------+   +----------------+  |
|  | Authentication &   |   | Explainable Risk    |   | Defensive      |  |
|  | RBAC Middleware    |   | Scoring Engine      |   | Playbooks      |  |
|  +--------------------+   +---------------------+   +----------------+  |
|  | CSV Export &       |   | Audit Logging       |   | Pandas Metrics |  |
|  | CWE-1236 Defense   |   | Service             |   | Aggregator     |  |
|  +--------------------+   +---------------------+   +----------------+  |
+-------------------------------------------------------------------------+
                                    |
                             SQLAlchemy ORM
                                    v
+-------------------------------------------------------------------------+
|                           PERSISTENT STORAGE                            |
|             SQLite Database: `data/incident_dashboard.db`               |
|                                                                         |
|      - `incidents` Table (250 synthetic incidents)                      |
|      - `audit_logs` Table (Immutable forensic trail)                    |
|      - `users` Table (Salted Bcrypt password hashes)                    |
+-------------------------------------------------------------------------+
```

## 2. Component Architecture

### Frontend (Client-Side)
- **Framework**: React 19 with TypeScript, bundled by Vite 8.
- **Styling**: Tailwind CSS v4 configured with dark SOC charcoal and navy theme, accessible severity color contrast indicators, and custom responsive scrollbars.
- **Routing**: `react-router-dom` v7 providing single-page application navigation across 7 operational modules.
- **Visual Analytics**: Interactive SVG vector charts (severity donut charts, horizontal category bars, temporal incident velocity curves, and aging distribution bars).
- **Security**: Local token storage, auto-injected Bearer tokens, zero plaintext credential exposure.

### Backend (Server-Side)
- **Framework**: Python 3.14 with FastAPI.
- **Validation**: Pydantic v2 schemas enforcing strict validation rules on incident categories, severities, and lifecycle status transitions.
- **Data Analysis**: Pandas v2 for vector aggregation, calculating incident aging buckets, top impacted assets, and daily detection trends.
- **ORM & Database**: SQLAlchemy 2.0 with persistent SQLite local database engine.
- **Security Controls**:
  - Passwords hashed using salted `bcrypt`.
  - Authentication tokens signed using HMAC-SHA256 (`pyjwt`).
  - Role-Based Access Control (RBAC) separating `analyst` and `admin` permissions.
  - CSV exports sanitized against Spreadsheet Formula Injection (CWE-1236).
  - Sanitized global exception handling preventing internal stack trace leaks.

## 3. Data Flow Lifecycle

1. **Ingestion & Seeding**:
   - Synthetic incidents are deterministically generated via `scripts/generate_synthetic_data.py` (fixed random seed = 42).
   - Ingestion calculates initial risk scores, generates defensive playbooks, and commits to the `incidents` table.
2. **Monitoring & Triage**:
   - Analysts view real-time statistics via `/api/analytics/dashboard` (calculated dynamically from actual database records).
   - Filter criteria (severity, category, status, date) query database indices.
3. **Investigation & Action**:
   - Analysts inspect incident breakdown via `/api/incidents/{incident_id}`.
   - Status changes (Open → Investigating → Contained → Resolved) require documented validation rules and dynamically update risk priority scores and resolution timestamps.
   - Notes can be appended with analyst username stamps.
4. **Audit Logging**:
   - Every incident creation, status transition, analyst note, login, and report export is written to the immutable `audit_logs` table.

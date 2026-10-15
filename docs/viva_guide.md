# University Examination & Viva Defense Master Guide

This guide is prepared to help you understand every architectural decision and confidently defend your **Security Incident Dashboard** during university report submissions and individual viva voce examinations.

---

## Part 1: Milestone Report Summaries

### Report 1: Project Proposal Alignment
- **Problem Statement**: Modern enterprise organizations suffer from severe "alert fatigue"—receiving thousands of security telemetry notifications daily. Standard Security Information and Event Management (SIEM) tools often order alerts solely by arrival timestamp, causing critical zero-day compromises to be buried beneath routine policy warnings.
- **Objectives**: Build a centralized, reproducible, locally runnable Security Operations Center (SOC) dashboard that monitors synthetic incidents, applies a deterministic explainable risk-scoring algorithm, tracks investigation lifecycles, and exports compliance reports.
- **Scope**: Synthetic security incidents (250 records), deterministic heuristic prioritization, persistent SQLite database, RESTful API, responsive dark-mode SOC web interface.
- **Technologies**: Python (FastAPI, SQLAlchemy, Pandas, Pytest) + React 19 (TypeScript, Vite, Tailwind CSS).

---

### Report 2: Data and Architecture Design
- **Dataset Design**: Deterministically generated using Python's `random.seed(42)`. Contains 250 records spanning 10 alert categories, 4 severity tiers, 17 fictional enterprise assets, and 5 lifecycle states.
- **Database Schema**: Relational SQLite schema with `incidents` (storing ticket metadata, JSON factor breakdown, and playbooks), `audit_logs` (tracking forensic actions), and `users` (storing salted bcrypt password hashes).
- **API Design**: Standardized RESTful endpoints following OpenAPI 3.0 conventions with `/api/auth`, `/api/incidents`, `/api/analytics`, `/api/reports`, `/api/audit-logs`, and `/api/system`.
- **Heuristic Risk Model**: Formula combining Base Severity, Asset Impact, Aging Penalties, and Status Mitigation Multipliers clamped to $[0.0, 100.0]$.

---

### Report 3: Implementation Progress & Quality Assurance
- **Implemented Modules**: Complete frontend, backend, database persistence, automated test suite, and report generator.
- **Testing Results**: 8/8 Pytest backend tests passing (password security, JWT tokens, boundary calculations, CSV sanitization, lifecycle rules, database aggregations).
- **Compilation Check**: Frontend compiled via `tsc -b && vite build` with zero TypeScript errors.

---

### Final Report & Academic AI Tool Usage Disclosure
- **Security Analysis**:
  - Sensitive data protection: Passwords hashed via Bcrypt (salt rounds = 12).
  - Injection Defense: CSV Formula Injection sanitized (CWE-1236) by neutralizing `=`, `+`, `-`, `@` characters.
  - Principle of Least Privilege: Role-Based Access Control (RBAC) separating `analyst` from `admin` capabilities.
- **Academic AI Disclosure**: Generative AI was utilized as a pair-programming assistant for architecture drafting, code structuring, test development, and documentation formatting. All algorithms, database schemas, and source code have been independently verified, tested, and understood by the student.

---

## Part 2: Top 10 Viva Questions & Model Answers

### Q1: Why did you use a deterministic heuristic risk formula rather than Machine Learning?
**Answer**:
> *"In a critical SOC environment, alert prioritization decisions must be transparent, predictable, and auditable. Machine learning models—especially deep neural networks—act as 'black boxes' that can produce unpredictable false negatives and require massive historical labeled datasets that are rarely available in academic labs. Our deterministic formula provides mathematical explainability: an examiner or auditor can verify the exact points assigned for severity, asset sensitivity, and aging, ensuring complete accountability."*

### Q2: What is the difference between "Severity" and "Risk Priority"?
**Answer**:
> *"Severity is a static attribute reflecting the potential danger of an alert signature in isolation (e.g., 'Critical' malware). Risk Priority is dynamic and contextual: it incorporates whether the affected host is a mission-critical domain controller or a non-essential test printer, how many hours the ticket has remained unaddressed, and whether an analyst has already contained the threat. Therefore, a High-severity alert that has been contained may have a lower priority score than an uncontained High-severity alert open for three days."*

### Q3: How do you prevent Spreadsheet Formula Injection in your CSV exports?
**Answer**:
> *"When incident descriptions or asset names submitted by untrusted sources are exported to CSV, a malicious user could submit a payload starting with `=CMD|' /C calc'!A0` or `=SUM(...)`. When opened in Microsoft Excel or LibreOffice, the spreadsheet software executes the formula (CWE-1236). We implemented defensive sanitization in `app/api/reports.py` using `sanitize_csv_cell()`: any cell beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` is automatically prepended with a single quote (`'`), forcing the spreadsheet application to treat the entry as plain inert text."*

### Q4: How is password storage secured in your backend?
**Answer**:
> *"Passwords are never stored in plaintext. We utilize the industry-standard `bcrypt` cryptographic hashing library. Each password receives a unique, cryptographically random salt and is hashed using the Blowfish cipher with a configurable work factor. This protects user credentials against precomputed rainbow table attacks and dictionary lookups."*

### Q5: How are incident statistics in the dashboard computed?
**Answer**:
> *"They are never hardcoded. When the frontend requests `/api/analytics/dashboard`, our FastAPI backend queries the SQLite `incidents` table and uses Pandas to compute vector aggregations (counts by category, severity distribution percentages, temporal detection frequency, and open aging buckets). The dashboard reflects the live database state at all times."*

### Q6: What happens if an analyst tries to skip lifecycle steps?
**Answer**:
> *"We enforce strict lifecycle status transition rules in `app/api/incidents.py`. For example, an incident cannot jump directly from 'Contained' back to 'Open' without documented triage; it can only transition to 'Investigating', 'Resolved', or 'Closed'. If an unauthorized transition is attempted, the API rejects the request with an HTTP 400 Bad Request explaining the allowed transitions."*

### Q7: Why is audit logging critical for cybersecurity compliance?
**Answer**:
> *"Under standards like ISO 27001, SOC 2, and NIST SP 800-61, incident management platforms must maintain non-repudiation. Our `audit_logs` table persistently records who performed every creation, update, status transition, deletion, login, and report export, including timestamps, actor IDs, and outcomes, providing a tamper-evident audit trail."*

### Q8: How did you ensure test coverage?
**Answer**:
> *"We built an automated test suite in `backend/tests/test_backend.py` using Pytest and an in-memory SQLite database. We tested password verification, JWT tokens, boundary calculations for the risk engine, CSV injection sanitization, incident CRUD operations, invalid status transitions, and analytics aggregation. All 8 test suites pass successfully."*

### Q9: Why is SQLite suitable for this project?
**Answer**:
> *"SQLite provides persistent, zero-configuration local database storage in a single self-contained file (`data/incident_dashboard.db`). Because it is embedded directly into the application process without requiring an external database server daemon, the project is 100% reproducible on any Windows laptop without paid cloud services or complex database server setup."*

### Q10: What are the known limitations of this academic project?
**Answer**:
> *"1. Data Scope: The 250 incidents are synthetic educational models; they do not hook into live network interfaces or sniff actual packet traffic.
2. Distributed Scalability: SQLite is optimized for local single-file concurrency; enterprise multi-region SOCs would deploy PostgreSQL or Elasticsearch for high-ingestion distributed logging.
3. Automated Containment: The playbooks provide advisory defensive recommendations rather than executing automated network isolation scripts to maintain safety in an academic environment."*

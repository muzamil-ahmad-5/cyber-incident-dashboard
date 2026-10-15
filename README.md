# Security Incident Dashboard (SOC Sentinel)

An Academic Security Operations Center (SOC) Incident Monitoring, Risk Prioritization, and Investigation Platform.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_19_TypeScript-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite_Persistent-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Pytest](https://img.shields.io/badge/Tests-8%2F8_Passed-success)](https://docs.pytest.org/)

---

## 1. Project Overview

The **Security Incident Dashboard** is a centralized, full-stack cybersecurity monitoring and investigation web application built for an Information Security university term project.

### Key Objectives
* **Monitor simulated security alerts**: Real-time triage across 10 security alert categories.
* **Explainable Risk Prioritization Engine**: Transparent, deterministic heuristic algorithm ($0–100$ scale) that mathematically accounts for severity, potential impact, critical asset weighting, unmitigated aging penalties, and containment status.
* **Defensive Response Playbooks**: Category-tailored containment and forensic recommendations for academic laboratory investigation.
* **Strict Incident Lifecycle Controls**: Documented status transitions (`Open` → `Investigating` → `Contained` → `Resolved` → `Closed`) preventing unauthorized state jumps.
* **SOC Analytics & Vector Visualizations**: Dynamic SVG charts (severity donuts, category horizontal bars, temporal ingestion curves, aging buckets, top impacted assets).
* **Forensic Audit Logging**: Persistent, tamper-evident audit records tracking user actions, logins, status changes, and exports.
* **Secure Reporting**: CSV export protected against Spreadsheet Formula Injection (CWE-1236) and executive priority reports.

> **ACADEMIC DISCLAIMER**:
> All incident records, indicators of compromise, and asset hostnames in this repository are **purely synthetic**. They are deterministically generated for educational evaluation and do not represent actual attacks or live network sensors.

---

## 2. Technology Stack

### Backend
* **Python 3.14 / 3.11+**
* **FastAPI**: Asynchronous high-performance REST API.
* **SQLAlchemy 2.0**: Object-Relational Mapping (ORM) and persistent database engine.
* **Pydantic v2**: Strict incoming payload validation and schema modeling.
* **Pandas**: Vector data analytics and aggregation.
* **Bcrypt & PyJWT**: Salted password hashing and signed JWT session tokens.
* **Pytest & HTTPX**: Automated test suite.

### Frontend
* **React 19 & TypeScript**
* **Vite 8**: Ultra-fast development server and production bundler.
* **Tailwind CSS v4**: Modern SOC dark charcoal & navy styling with accessible contrast ratios.
* **React Router v7**: Declarative client-side routing.
* **Lucide React**: Crisp cybersecurity vector icons.

### Database
* **SQLite 3**: Zero-configuration, persistent local file database (`data/incident_dashboard.db`).

---

## 3. Project Directory Structure

```text
security-incident-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/             # API routers (auth, incidents, analytics, reports, audit, system)
│   │   ├── core/            # Configuration, database connection, bcrypt/JWT security
│   │   ├── models/          # SQLAlchemy models (Incident, AuditLog, User)
│   │   ├── schemas/         # Pydantic v2 validation models
│   │   ├── services/        # Explainable risk engine, defensive playbooks, audit logging
│   │   └── main.py          # FastAPI application entry point
│   ├── tests/               # Automated Pytest suite (8 unit & integration tests)
│   ├── pytest.ini           # Pytest configuration
│   ├── requirements.txt     # Python backend dependencies
│   └── venv/                # Dedicated Python virtual environment
├── frontend/
│   ├── src/
│   │   ├── components/      # Badges, StatCards, Navbar, Sidebar, Modals, SVG Charts
│   │   ├── pages/           # Overview, Incidents, Investigation, Analytics, Reports, AuditLogs, Settings
│   │   ├── services/        # API client and AuthProvider context
│   │   ├── types/           # TypeScript interfaces
│   │   ├── App.tsx          # Router configuration
│   │   ├── index.css        # Tailwind v4 styles & SOC color palettes
│   │   └── main.tsx         # React root entry
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── data/
│   ├── incident_dashboard.db    # Persistent SQLite database
│   └── synthetic_incidents.csv  # Exported reproducible synthetic dataset
├── scripts/
│   └── generate_synthetic_data.py # Reproducible dataset generator (seed = 42)
├── docs/
│   ├── architecture.md      # System architecture and data flow diagram
│   ├── data_dictionary.md   # Field descriptions and controlled vocabularies
│   ├── risk_algorithm.md    # Detailed mathematical breakdown of risk scoring
│   ├── testing.md           # Automated test reports and actual execution logs
│   └── viva_guide.md        # University viva Q&A and project milestone guide
├── .env.example
├── .gitignore
└── README.md
```

---

## 4. Quick Start & Demonstration Instructions

### Prerequisites
* Windows 10/11 (or macOS / Linux)
* Python 3.11+ installed (Verified on Python 3.14)
* Node.js v18+ and npm installed (Verified on Node v26)

---

### Step 1: Backend Setup & Startup (PowerShell)

Open Windows PowerShell in the project directory:

```powershell
# Navigate to backend directory
cd backend

# If virtual environment is not yet created:
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r requirements.txt

# Return to root and generate 250 synthetic incidents (Seed 42)
cd ..
.\backend\venv\Scripts\python.exe .\scripts\generate_synthetic_data.py

# Launch FastAPI backend server
cd backend
.\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend is now live at:
* **API Base URL**: `http://127.0.0.1:8000`
* **Interactive Swagger UI**: `http://127.0.0.1:8000/docs`
* **Alternative Redoc**: `http://127.0.0.1:8000/redoc`

---

### Step 2: Frontend Setup & Startup (Second PowerShell Window)

Open a **new** PowerShell window in the project directory:

```powershell
# Navigate to frontend directory
cd frontend

# Install frontend dependencies (if not already installed)
npm install

# Start the Vite development server
npm run dev
```

Open your browser to:
* **Web Application (Laptop / Desktop)**: `http://localhost:5173`
* **Web Application (Mobile Phone on same Wi-Fi)**: `http://10.60.14.133:5173`
* **Interactive Swagger API Docs**: `http://127.0.0.1:8000/docs`

---

## 5. Pre-Configured Test Accounts (Demonstration Ready)

The database automatically bootstraps these demonstration credentials on first launch:

| Account Type | Username | Password | Role Permissions |
| :--- | :--- | :--- | :--- |
| **SOC Administrator** | `admin` | `soc_admin_password123` | Full access: Delete incidents, export reports, view audit trail |
| **SOC Analyst** | `analyst` | `soc_analyst_password123` | Operational access: Triage alerts, update status, add investigation notes |

*Tip: You can instantly toggle between Analyst and Administrator directly from the top navigation bar dropdown.*

---

## 6. Running Automated Tests

To execute the Pytest automated test suite:

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest -v
```

Expected result:
```text
tests/test_backend.py::test_password_hashing PASSED                      [ 12%]
tests/test_backend.py::test_jwt_token_generation_and_decoding PASSED     [ 25%]
tests/test_backend.py::test_risk_prioritization_engine_boundaries PASSED [ 37%]
tests/test_backend.py::test_csv_injection_sanitization PASSED            [ 50%]
tests/test_backend.py::test_incident_creation_and_listing PASSED         [ 62%]
tests/test_backend.py::test_incident_invalid_status_transition PASSED    [ 75%]
tests/test_backend.py::test_analytics_endpoint PASSED                    [ 87%]
tests/test_backend.py::test_audit_logging PASSED                         [100%]
======================== 8 passed in 12.32s ========================
```

To verify the frontend TypeScript build:
```powershell
cd frontend
npm run build
```

---

## 7. Explainable Risk Prioritization Formula

The scoring algorithm calculates an explainable heuristic score on a $0–100$ scale:

$$R_{\text{raw}} = \Big( \text{Base Severity} + \text{Potential Impact} + \text{Aging Penalty} \Big) \times \text{Status Multiplier}$$

$$\text{Final Risk Score} = \max\Big(0.0, \min\big(100.0, \text{round}(R_{\text{raw}}, 1)\big)\Big)$$

1. **Base Severity**:
   - `Critical` = 40.0 pts
   - `High` = 25.0 pts
   - `Medium` = 15.0 pts
   - `Low` = 5.0 pts
2. **Impact & Asset Weight**:
   - `Critical` / `High` = 25.0 pts; `Medium` = 15.0 pts; `Low` = 5.0 pts
   - Fictional hostnames containing `prod`, `auth`, `db`, `vault`, `gateway` receive a +5.0 bonus (capped at 25.0 pts).
3. **Aging Factor**:
   - $+0.25$ pts per hour unresolved; capped at $20.0$ pts (maxes at 80 hours).
4. **Status Multiplier**:
   - `Open` = 1.00; `Investigating` = 0.85; `Contained` = 0.40; `Resolved` = 0.10; `Closed` = 0.05.

---

## 8. Security Controls Implemented

1. **Bcrypt Password Security**: Passwords salted and hashed; no plaintext storage.
2. **CWE-1236 Defense**: Prevents Spreadsheet Formula Injection during CSV export by escaping dangerous characters (`=`, `+`, `-`, `@`).
3. **Tamper-Evident Audit Logging**: All incident creation, status changes, logins, and exports logged to SQLite.
4. **Role-Based Authorization**: Administrative operations verified server-side.
5. **No Stack Trace Leakage**: Global exception handlers sanitize server error responses.

---

- [Architecture & Data Flow](file:///c:/Users/Muzamil/Desktop/Information%20security%20project/security-incident-dashboard/docs/architecture.md)
- [Data Dictionary & Controlled Vocabularies](file:///c:/Users/Muzamil/Desktop/Information%20security%20project/security-incident-dashboard/docs/data_dictionary.md)
- [Risk Engine Heuristics Specification](file:///c:/Users/Muzamil/Desktop/Information%20security%20project/security-incident-dashboard/docs/risk_algorithm.md)
- [Automated Testing & Results Record](file:///c:/Users/Muzamil/Desktop/Information%20security%20project/security-incident-dashboard/docs/testing.md)
- [University Viva Examination Defense Guide](file:///c:/Users/Muzamil/Desktop/Information%20security%20project/security-incident-dashboard/docs/viva_guide.md)

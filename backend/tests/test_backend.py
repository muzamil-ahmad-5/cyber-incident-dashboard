import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.services.risk_engine import calculate_risk_score
from app.services.playbooks import get_recommended_actions
from app.models.incident import Incident
from app.models.user import User
from app.models.audit_log import AuditLog
from app.api.reports import sanitize_csv_cell

# In-memory SQLite for testing
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Create test admin user
    test_admin = User(
        username="admin_test",
        hashed_password=hash_password("admin_pass_123"),
        full_name="Test Admin",
        role="admin",
        is_active=True
    )
    session.add(test_admin)
    session.commit()
    
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def test_password_hashing():
    raw_pass = "SecurePass2026!"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_generation_and_decoding():
    data = {"sub": "analyst_bob", "role": "analyst"}
    token = create_access_token(data)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "analyst_bob"
    assert decoded["role"] == "analyst"

def test_risk_prioritization_engine_boundaries():
    now = datetime.now(timezone.utc)
    
    # Critical incident open for 100 hours
    old_timestamp = now - timedelta(hours=100)
    res_crit = calculate_risk_score(
        severity="Critical",
        potential_impact="Critical",
        status="Open",
        incident_timestamp=old_timestamp,
        affected_asset="srv-auth-prod.corp",
        reference_time=now
    )
    assert res_crit["priority"] == "CRITICAL"
    assert res_crit["score"] >= 80.0
    assert "Heuristic Risk Score" in res_crit["explanation"]
    assert res_crit["breakdown"]["base_severity_score"] == 40.0
    assert res_crit["breakdown"]["aging_score"] == 20.0  # Capped at 20.0
    
    # Low severity resolved incident
    res_low = calculate_risk_score(
        severity="Low",
        potential_impact="Low",
        status="Resolved",
        incident_timestamp=old_timestamp,
        affected_asset="test-printer",
        reference_time=now
    )
    assert res_low["priority"] == "LOW"
    assert res_low["score"] <= 15.0
    assert res_low["breakdown"]["status_multiplier"] == 0.10

def test_csv_injection_sanitization():
    # Should neutralize dangerous formula prefixes
    assert sanitize_csv_cell("=1+1") == "'=1+1"
    assert sanitize_csv_cell("+cmd|' /C calc'!A0") == "'+cmd|' /C calc'!A0"
    assert sanitize_csv_cell("-5+2") == "'-5+2"
    assert sanitize_csv_cell("@SUM(A1:A10)") == "'@SUM(A1:A10)"
    assert sanitize_csv_cell("Normal Incident Text") == "Normal Incident Text"

def test_incident_creation_and_listing(client):
    payload = {
        "category": "Suspicious Login",
        "severity": "High",
        "description": "Multiple failed logins followed by off-hours admin portal access",
        "affected_asset": "srv-auth-01.corp.internal",
        "potential_impact": "High",
        "assigned_analyst": "analyst_sarah"
    }
    # Create incident
    response = client.post("/api/incidents", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["incident_id"].startswith("INC-")
    assert data["category"] == "Suspicious Login"
    assert data["severity"] == "High"
    assert data["risk_priority"] in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
    assert "Review authentication event" in data["recommended_actions"]

    # List incidents
    list_res = client.get("/api/incidents")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert len(list_data["items"]) >= 1

def test_incident_invalid_status_transition(client):
    # Create an initial incident (Status: Open)
    create_res = client.post("/api/incidents", json={
        "category": "Malware Alert",
        "severity": "Critical",
        "description": "Simulated ransomware canary triggered",
        "affected_asset": "ws-finance-08",
        "potential_impact": "Critical"
    })
    inc_id = create_res.json()["incident_id"]

    # Valid transition: Open -> Investigating
    patch_res = client.patch(f"/api/incidents/{inc_id}/status", json={"status": "Investigating", "note": "Assigned to SOC tier 2"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "Investigating"

    # Valid transition: Investigating -> Contained
    patch_res2 = client.patch(f"/api/incidents/{inc_id}/status", json={"status": "Contained", "note": "Host isolated"})
    assert patch_res2.status_code == 200
    assert patch_res2.json()["status"] == "Contained"

    # Invalid transition: Contained cannot jump backwards directly to Open without investigation
    invalid_patch = client.patch(f"/api/incidents/{inc_id}/status", json={"status": "Open"})
    assert invalid_patch.status_code == 400
    assert "Invalid status transition" in invalid_patch.json()["detail"]

def test_analytics_endpoint(client):
    # Populate a test incident
    client.post("/api/incidents", json={
        "category": "Phishing Alert",
        "severity": "Medium",
        "description": "Suspicious email lure detected",
        "affected_asset": "mail-relay-edge.internal",
        "potential_impact": "Medium"
    })

    analytics_res = client.get("/api/analytics/dashboard")
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()
    assert analytics["summary"]["total_incidents"] >= 1
    assert len(analytics["category_distribution"]) >= 1
    assert len(analytics["severity_distribution"]) >= 1

def test_audit_logging(client):
    audit_res = client.get("/api/audit-logs")
    assert audit_res.status_code == 200
    audit_data = audit_res.json()
    assert audit_data["total"] >= 1
    # Check that an action exists
    actions = [item["action"] for item in audit_data["items"]]
    assert any("INCIDENT_CREATE" in a or "STATUS_CHANGE" in a for a in actions)

def test_llm_solution_generation(client):
    create_res = client.post("/api/incidents", json={
        "category": "Malware Alert",
        "severity": "Critical",
        "description": "Gh0stRat trojan executable payload detected on prod-auth-vault-01",
        "affected_asset": "prod-auth-vault-01",
        "potential_impact": "Critical"
    })
    inc_id = create_res.json()["incident_id"]

    sol_res = client.post(f"/api/solutions/incident/{inc_id}", json={"model_provider": "auto"})
    assert sol_res.status_code == 200
    sol_data = sol_res.json()
    assert sol_data["incident_id"] == inc_id
    assert "solution_protocol" in sol_data
    assert len(sol_data["solution_protocol"]["phase_1_containment"]) >= 1
    assert "dataset_grounded_solution" in sol_data
    assert "detection_summary" in sol_data

def test_apply_ai_solution(client):
    create_res = client.post("/api/incidents", json={
        "category": "Brute-Force Attempt",
        "severity": "High",
        "description": "Credential stuffing flood against gateway",
        "affected_asset": "auth-gateway-01",
        "potential_impact": "High"
    })
    inc_id = create_res.json()["incident_id"]

    apply_res = client.post(f"/api/solutions/incident/{inc_id}/apply", json={
        "solution_markdown": "Applied rate-limiting and blocked source IP subnet.",
        "analyst_name": "Senior SOC Analyst",
        "mark_contained": True
    })
    assert apply_res.status_code == 200
    updated = apply_res.json()
    assert updated["status"] == "Contained"
    assert "AI DEFENSIVE SOLUTION APPLIED" in updated["investigation_notes"]

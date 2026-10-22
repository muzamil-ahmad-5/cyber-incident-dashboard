import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base
from app.api.deps import get_db
from app.core.security import hash_password
from app.models.user import User
from app.models.ml_classification import MLClassificationRecord
from sqlalchemy.pool import StaticPool
from app.services.ml_service import ml_service, FALLBACK_PREVENTION_GUIDANCE

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    # Create test admin user
    test_admin = User(
        username="admin",
        hashed_password=hash_password("soc_admin_password123"),
        full_name="Chief Admin",
        role="admin",
        is_active=True,
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


def test_ml_service_prediction():
    """Verify that the ML service loads and classifies text correctly."""
    result = ml_service.classify_text("Observed Gh0stRat malware infection with C2 beaconing")
    assert "predicted_category" in result
    assert isinstance(result["predicted_category"], str)
    assert result["predicted_category"] != ""
    assert "confidence_score" in result
    assert 0.0 <= result["confidence_score"] <= 1.0
    assert "prevention_guidance" in result
    assert "Immediate Containment" in result["prevention_guidance"]
    assert "CRITICAL DATA LIMITATION" in result["model_disclaimer"]


def test_ml_service_fallback_guidance():
    """Verify that an unknown category falls back to manual investigation guidance."""
    fallback = FALLBACK_PREVENTION_GUIDANCE
    assert "manual investigation required" in fallback["title"].lower()
    assert len(fallback["prevention_steps"]) >= 3


def test_classify_endpoint_creates_record(client):
    """Test POST /api/ml/classify creates an SQLite record with 'New' and 'Unconfirmed' statuses."""
    payload = {
        "text": "The CVE-2022-22965 vulnerability allows remote code execution (RCE) in Spring Framework.",
        "analyst_notes": "Received external threat feed alert on perimeter Spring application.",
        "reviewer": "Analyst Alice",
    }
    response = client.post("/api/ml/classify", json=payload)
    assert response.status_code == 201
    data = response.json()

    assert data["record_id"].startswith("ML-")
    assert data["predicted_category"] in ["vulnerability", "attack-pattern", "malware", "tools"]
    assert data["review_status"] == "New"
    assert data["analyst_confirmed_status"] == "Unconfirmed"
    assert data["reviewer"] == "Analyst Alice"
    assert "CRITICAL DATA LIMITATION" in data["model_disclaimer"]


def test_list_classification_records(client):
    """Test GET /api/ml/records lists submitted records with pagination."""
    # Create two records
    client.post("/api/ml/classify", json={"text": "First malware payload detected in %TEMP% directory."})
    client.post("/api/ml/classify", json={"text": "Second credential dumping attempt using Mimikatz utility."})

    res = client.get("/api/ml/records?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["page"] == 1


def test_update_classification_status_and_confirmed_state(client):
    """Test PATCH /api/ml/records/{id} strictly separates review_status from analyst_confirmed_status."""
    create_res = client.post(
        "/api/ml/classify",
        json={"text": "Suspicious PowerShell downloading payload from remote IP address."},
    )
    rec_id = create_res.json()["record_id"]

    # Analyst confirms incident
    update_payload = {
        "review_status": "Under Investigation",
        "analyst_confirmed_status": "Confirmed Incident",
        "analyst_notes": "Triage verified beaconing traffic matches known adversary infrastructure.",
        "reviewer": "Senior Investigator Bob",
    }
    patch_res = client.patch(f"/api/ml/records/{rec_id}", json=update_payload)
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["review_status"] == "Under Investigation"
    assert updated["analyst_confirmed_status"] == "Confirmed Incident"
    assert updated["reviewer"] == "Senior Investigator Bob"

    # Mark as False Positive
    fp_res = client.patch(
        f"/api/ml/records/{rec_id}",
        json={"review_status": "False Positive", "analyst_confirmed_status": "Benign Activity"},
    )
    assert fp_res.status_code == 200
    assert fp_res.json()["review_status"] == "False Positive"
    assert fp_res.json()["analyst_confirmed_status"] == "Benign Activity"


def test_invalid_status_rejection(client):
    """Test that invalid review or confirmed statuses are rejected with 400."""
    create_res = client.post("/api/ml/classify", json={"text": "Test sample text for invalid status."})
    rec_id = create_res.json()["record_id"]

    res1 = client.patch(f"/api/ml/records/{rec_id}", json={"review_status": "InvalidStatus"})
    assert res1.status_code == 400

    res2 = client.patch(f"/api/ml/records/{rec_id}", json={"analyst_confirmed_status": "HackedNow"})
    assert res2.status_code == 400


def test_metrics_endpoint(client):
    """Test GET /api/ml/metrics returns evaluation metrics."""
    res = client.get("/api/ml/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "accuracy" in data
    assert "task" in data
    assert "classes" in data
    assert len(data["classes"]) > 0


def test_samples_endpoint(client):
    """Test GET /api/ml/samples returns curated test samples."""
    res = client.get("/api/ml/samples")
    assert res.status_code == 200
    samples = res.json()
    assert len(samples) >= 5
    assert all("text" in s and "category" in s for s in samples)

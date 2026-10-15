"""
Synthetic Incident Dataset Generator for Security Incident Dashboard.

Generates a reproducible dataset of synthetic security incidents using a fixed random seed.
Populates both the SQLite database and exports to CSV.
All data is purely synthetic for educational demonstration and contains no real personal info,
actual organizational logs, or active network indicators.
"""

import os
import sys
import random
import json
import csv
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add backend directory to sys.path so we can import models and services
CURRENT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = CURRENT_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
DATA_DIR = PROJECT_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import engine, Base, SessionLocal
from app.models.incident import Incident
from app.models.audit_log import AuditLog
from app.models.user import User
from app.services.risk_engine import calculate_risk_score
from app.services.playbooks import get_recommended_actions
from app.core.security import hash_password

CATEGORIES = [
    "Suspicious Login",
    "Phishing Alert",
    "Malware Alert",
    "Unauthorized Access",
    "Brute-Force Attempt",
    "Suspicious Network Activity",
    "Data Exfiltration Alert",
    "Privilege Escalation",
    "Policy Violation",
    "Other"
]

SEVERITIES = ["Critical", "High", "Medium", "Low"]
SEVERITY_WEIGHTS = [0.15, 0.30, 0.40, 0.15]  # Realistic SOC distribution

STATUSES = ["Open", "Investigating", "Contained", "Resolved", "Closed"]
STATUS_WEIGHTS = [0.25, 0.25, 0.15, 0.25, 0.10]

POTENTIAL_IMPACTS = ["Critical", "High", "Medium", "Low"]
IMPACT_WEIGHTS = [0.15, 0.35, 0.35, 0.15]

ANALYSTS = [
    "analyst_sarah",
    "analyst_marcus",
    "analyst_elena",
    "analyst_tariq",
    "analyst_chen",
    "Unassigned"
]

SYNTHETIC_ASSETS = [
    "srv-auth-01.corp.internal",
    "srv-auth-02.corp.internal",
    "db-prod-cluster.internal",
    "db-replica-01.internal",
    "k8s-ingress-prod.corp",
    "gw-vpn-frankfurt.internal",
    "gw-vpn-uswest.internal",
    "ws-finance-08.corp",
    "ws-finance-14.corp",
    "ws-hr-desktop-03.corp",
    "ws-dev-laptop-22.corp",
    "dc-core-01.ad.internal",
    "dc-backup-02.ad.internal",
    "mail-relay-edge.internal",
    "payment-vault-prod.internal",
    "app-api-gateway-01.internal",
    "nas-backup-storage.internal"
]

CATEGORY_DESCRIPTIONS = {
    "Suspicious Login": [
        "Unusual authentication detected from foreign IP subnet for privileged service account.",
        "Simultaneous logon session initiated from two geographically distant locations within 5 minutes.",
        "Off-hours privileged portal authentication without active change management ticket.",
        "Authentication request originating from known test TOR exit relay."
    ],
    "Phishing Alert": [
        "Reported synthetic email masquerading as IT helpdesk password expiration notice.",
        "Synthetic spear-phishing lure targeting finance department with weaponized invoice attachment.",
        "Simulated credential harvesting landing page link detected in employee inbox.",
        "High volume of suspicious simulated emails bypassing perimeter spam heuristic filter."
    ],
    "Malware Alert": [
        "Simulated endpoint heuristic detected unsigned executable spawning cmd.exe in temp directory.",
        "Synthetic ransomware canary file modification alert triggered on test shared directory.",
        "Endpoint detection noted anomalous code injection into spoolsv.exe process memory.",
        "Simulated trojan beaconing pattern observed from test workstation."
    ],
    "Unauthorized Access": [
        "Failed access attempt on confidential payroll directory by unauthorized service principal.",
        "Direct SQL query executed on production customer table bypassing API application layer.",
        "Unapproved modification to sensitive LDAP group membership detected in test lab.",
        "File permission tampering detected on core system configuration repository."
    ],
    "Brute-Force Attempt": [
        "Over 450 failed SSH authentication attempts within 60 seconds against gateway server.",
        "Distributed credential stuffing burst observed against web SSO authentication endpoint.",
        "Kerberos pre-authentication failure spike detected targeting service accounts.",
        "Repetitive RDP connection failures from external testing address pool."
    ],
    "Suspicious Network Activity": [
        "Unusual outbound high-frequency DNS tunneling traffic detected over UDP port 53.",
        "Anomalous outbound encrypted connection established to unclassified external IP.",
        "Internal lateral port scanning sweep (TCP 445, 135) observed from test host.",
        "High-volume ICMP packet flood detected on internal subnet gateway."
    ],
    "Data Exfiltration Alert": [
        "Anomalous 14.5 GB outbound HTTPS transfer initiated to unknown test cloud storage bucket.",
        "Encrypted multi-part archive file staged in staging folder and uploaded off-hours.",
        "Simulated database dump file transferred through web proxy without authorization.",
        "Bulk export of simulated customer records detected during non-operational hours."
    ],
    "Privilege Escalation": [
        "Local user account successfully executed sudo su with known simulated vulnerability token.",
        "Creation of hidden local administrator account detected via test audit script.",
        "Privileged token impersonation detected on domain member workstation.",
        "Simulated unquoted service path exploit triggered by test process."
    ],
    "Policy Violation": [
        "Unauthorized peer-to-peer sharing software detected running on enterprise workstation.",
        "Unencrypted USB mass storage device connected to sensitive workstation.",
        "Test web server software installed without security baseline compliance approval.",
        "Storage of test plaintext credential document identified on public file share."
    ],
    "Other": [
        "Unexpected baseline system metric anomaly detected on central telemetry sensor.",
        "Corrupted security event log channel detected on auxiliary monitoring agent.",
        "Time synchronization drift exceeding threshold between domain controllers.",
        "Hardware watchdog timeout detected on primary lab switch interface."
    ]
}

def generate_dataset(num_records: int = 250, seed: int = 42):
    """Generates synthetic security incident records and saves to SQLite and CSV."""
    random.seed(seed)
    print(f"[DATASET] Generating {num_records} synthetic incident records (Random Seed = {seed})...")

    # Recreate tables safely
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing incident and audit records to maintain clean reproducibility
    db.query(Incident).delete()
    db.query(AuditLog).delete()
    db.commit()

    now = datetime.now(timezone.utc)
    incidents_data = []

    for i in range(1, num_records + 1):
        incident_id = f"INC-2026-{i:04d}"
        
        # Stagger timestamps across past 45 days
        days_ago = random.uniform(0.1, 45.0)
        timestamp = now - timedelta(days=days_ago)
        
        category = random.choices(CATEGORIES)[0]
        severity = random.choices(SEVERITIES, weights=SEVERITY_WEIGHTS)[0]
        potential_impact = random.choices(POTENTIAL_IMPACTS, weights=IMPACT_WEIGHTS)[0]
        status = random.choices(STATUSES, weights=STATUS_WEIGHTS)[0]
        
        asset = random.choice(SYNTHETIC_ASSETS)
        analyst = random.choice(ANALYSTS) if status != "Open" else random.choice(["Unassigned", "analyst_sarah", "analyst_marcus"])
        description = random.choice(CATEGORY_DESCRIPTIONS[category])

        # Resolution timestamp
        resolved_at = None
        if status in ["Resolved", "Closed"]:
            resolution_delay = random.uniform(2.0, min(72.0, days_ago * 24.0))
            resolved_at = timestamp + timedelta(hours=resolution_delay)
            if resolved_at > now:
                resolved_at = now

        # Explainable Risk Engine computation
        risk_result = calculate_risk_score(
            severity=severity,
            potential_impact=potential_impact,
            status=status,
            incident_timestamp=timestamp,
            resolved_at=resolved_at,
            affected_asset=asset,
            reference_time=now
        )

        playbook = get_recommended_actions(category)

        # Build investigation notes history
        notes_lines = [
            f"[{timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}] Synthetic incident logged and ingested into SOC queue."
        ]
        if status != "Open":
            notes_lines.append(
                f"[{(timestamp + timedelta(hours=0.5)).strftime('%Y-%m-%d %H:%M:%S UTC')}] Triage initiated by {analyst}. Preliminary risk score evaluated at {risk_result['score']}."
            )
        if status in ["Contained", "Resolved", "Closed"]:
            notes_lines.append(
                f"[{(timestamp + timedelta(hours=2.0)).strftime('%Y-%m-%d %H:%M:%S UTC')}] Containment strategy executed on simulated asset '{asset}'."
            )
        if status in ["Resolved", "Closed"]:
            notes_lines.append(
                f"[{resolved_at.strftime('%Y-%m-%d %H:%M:%S UTC')}] Remediation verified. Ticket marked as {status}."
            )

        investigation_notes = "\n".join(notes_lines)

        incident_record = Incident(
            incident_id=incident_id,
            timestamp=timestamp,
            category=category,
            severity=severity,
            description=description,
            affected_asset=asset,
            potential_impact=potential_impact,
            status=status,
            assigned_analyst=analyst,
            investigation_notes=investigation_notes,
            risk_score=risk_result["score"],
            risk_priority=risk_result["priority"],
            risk_factors=json.dumps(risk_result["breakdown"]),
            recommended_actions=playbook,
            resolved_at=resolved_at,
            created_at=timestamp,
            updated_at=now
        )

        db.add(incident_record)
        incidents_data.append({
            "incident_id": incident_id,
            "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
            "category": category,
            "severity": severity,
            "potential_impact": potential_impact,
            "risk_score": risk_result["score"],
            "risk_priority": risk_result["priority"],
            "status": status,
            "affected_asset": asset,
            "assigned_analyst": analyst,
            "description": description,
            "resolved_at": resolved_at.strftime("%Y-%m-%d %H:%M:%S") if resolved_at else "N/A"
        })

    # Record initial audit event for data generation
    audit_init = AuditLog(
        actor="system_seeder",
        action="DATASET_SEED",
        outcome="SUCCESS",
        details=f"Generated {num_records} synthetic incidents (seed={seed})."
    )
    db.add(audit_init)

    db.commit()
    print(f"[DATASET] Successfully inserted {num_records} incidents into SQLite database.")

    # Export to CSV
    csv_file_path = DATA_DIR / "synthetic_incidents.csv"
    with open(csv_file_path, "w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "incident_id",
            "timestamp",
            "category",
            "severity",
            "potential_impact",
            "risk_score",
            "risk_priority",
            "status",
            "affected_asset",
            "assigned_analyst",
            "description",
            "resolved_at"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(incidents_data)

    print(f"[DATASET] Successfully exported dataset to {csv_file_path}")
    db.close()

if __name__ == "__main__":
    generate_dataset()

from pathlib import Path
import json
import logging
from typing import Optional, Dict, Any, List
import numpy as np

logger = logging.getLogger(__name__)

# Search paths for the trained model artifact
MODEL_CANDIDATE_PATHS = [
    Path(__file__).resolve().parent.parent.parent / "security_incident_model_bundle" / "artifacts" / "cybersecurity_text_classifier.joblib",
    Path(__file__).resolve().parent.parent.parent.parent / "security_incident_model_bundle" / "artifacts" / "cybersecurity_text_classifier.joblib",
    Path("security_incident_model_bundle/artifacts/cybersecurity_text_classifier.joblib"),
    Path("artifacts/cybersecurity_text_classifier.joblib"),
]

METRICS_CANDIDATE_PATHS = [
    Path(__file__).resolve().parent.parent.parent / "security_incident_model_bundle" / "artifacts" / "evaluation_metrics.json",
    Path(__file__).resolve().parent.parent.parent.parent / "security_incident_model_bundle" / "artifacts" / "evaluation_metrics.json",
    Path("security_incident_model_bundle/artifacts/evaluation_metrics.json"),
    Path("artifacts/evaluation_metrics.json"),
]

# Curated Rule-Based Prevention Guidance Knowledge Base
CURATED_PREVENTION_KNOWLEDGE_BASE: Dict[str, Dict[str, Any]] = {
    "malware": {
        "title": "Malware Entity Triage & Prevention Protocol",
        "description": "Indicators of malicious payloads, trojans, backdoors, or ransomware variants.",
        "prevention_steps": [
            "Isolate the suspect host from the local network segment immediately to restrict lateral infection spread.",
            "Acquire forensic memory image and process execution timeline using endpoint telemetry (EDR/Sysmon).",
            "Calculate cryptographic hashes (SHA-256) of suspect executables and query threat intelligence repositories (VirusTotal/CISA).",
            "Perform comprehensive antimalware scan and verify signature definition currency across the endpoint fleet.",
            "Review persistence mechanisms: inspect Windows Registry Run keys, Scheduled Tasks, and startup services."
        ],
        "hardening_recommendations": "Deploy Application Whitelisting / AppLocker, enforce script execution restrictions (PowerShell Constrained Language Mode), and conduct regular offline immutable backups."
    },
    "threat-actor": {
        "title": "Threat Actor Attribution & Threat Intelligence Protocol",
        "description": "References to Advanced Persistent Threat (APT) groups, state-sponsored actors, or cybercrime syndicates.",
        "prevention_steps": [
            "Cross-reference observed tactics, techniques, and procedures (TTPs) against the MITRE ATT&CK enterprise matrix.",
            "Audit perimeter authentication logs for geographic anomalies, credential stuffing, and unusual VPN/proxy sessions.",
            "Enforce mandatory password resets and invalidate active refresh tokens for accounts associated with targeted departments.",
            "Query SIEM logs across the last 90 days for known Indicators of Compromise (IoCs) linked to this actor profile.",
            "Notify SOC escalation leads and prepare threat briefing for higher-tier security review."
        ],
        "hardening_recommendations": "Mandate phishing-resistant Multi-Factor Authentication (FIDO2/WebAuthn), implement Conditional Access policies, and conduct threat hunting across critical crown-jewel assets."
    },
    "attack-pattern": {
        "title": "Attack Pattern & Exploitation TTP Mitigation",
        "description": "Observable adversary methodology, exploitation attempts, lateral movement, or denial of service.",
        "prevention_steps": [
            "Inspect web application firewall (WAF) and network intrusion prevention system (NIPS) logs for signature match patterns.",
            "Block originating source IP addresses and anomalous subnet ranges at the perimeter firewall boundary.",
            "Verify affected services for unpatched security vulnerabilities matching the observed exploitation behavior.",
            "Analyze host command-line logs for process injection, living-off-the-land binaries (LOLBins), and privilege escalation.",
            "Verify network segmentation rules between the DMZ, application tier, and core database clusters."
        ],
        "hardening_recommendations": "Implement rate limiting, deploy strict egress traffic filtering, enforce zero-trust network access (ZTNA), and run automated vulnerability scans."
    },
    "vulnerability": {
        "title": "Vulnerability Management & CVE Remediation",
        "description": "Reported software flaws, CVE references, buffer overflows, or remote code execution risks.",
        "prevention_steps": [
            "Cross-reference the CVE identifier with the National Vulnerability Database (NVD) and vendor security advisories.",
            "Query the asset inventory management system (CMDB) to identify all exposed instances running the vulnerable software version.",
            "Assess Common Vulnerability Scoring System (CVSS v3.1) metrics and exploit availability in the wild.",
            "Deploy official vendor patches or vendor-recommended configuration workarounds in staging and production.",
            "If immediate patching requires downtime, apply virtual patching rules in WAF/IPS to block known exploit payloads."
        ],
        "hardening_recommendations": "Maintain an automated software inventory with vulnerability scanners (e.g. OpenVAS/Tenable), enforce regular patch management cycles, and decommission obsolete software."
    },
    "tools": {
        "title": "Dual-Use & Offensive Security Tooling Protocol",
        "description": "References to post-exploitation frameworks, credential dumpers, or dual-use utilities (e.g., Cobalt Strike, Mimikatz).",
        "prevention_steps": [
            "Verify whether the identified tool was deployed as part of an authorized internal red team or penetration testing exercise.",
            "If unauthorized, immediately terminate associated parent and child process trees on the affected host.",
            "Examine endpoint execution logs for memory injection, named pipe creation, and LSASS access.",
            "Audit domain administrator and local admin account usage around the execution timeframe.",
            "Revoke active Kerberos tickets and reset administrative credentials on compromised host systems."
        ],
        "hardening_recommendations": "Enable Credential Guard in Windows 10/11, implement Attack Surface Reduction (ASR) rules, and monitor command-line auditing (Event ID 4688)."
    },
    "filepath": {
        "title": "Suspicious Filepath & Artifact Forensic Protocol",
        "description": "Directories frequently abused for staging payloads, scripts, or persistent backdoors.",
        "prevention_steps": [
            "Navigate to the specified filepath in a sandbox environment and acquire digital forensic image/copies.",
            "Verify file permissions, ownership, and creation/modification timestamps (MACE attributes).",
            "Inspect digital signatures and code-signing certificates on binaries located in this path.",
            "Check whether the directory resides in user-writable spaces (e.g., %TEMP%, %APPDATA%, C:\\Windows\\Temp).",
            "Configure endpoint detection rules to alert on binary execution from this directory path."
        ],
        "hardening_recommendations": "Block executable launches from writable user directories (%TEMP%, %APPDATA%) using AppLocker / Software Restriction Policies."
    },
    "hash": {
        "title": "Cryptographic Hash IOC Verification Protocol",
        "description": "Cryptographic fingerprint (MD5, SHA-1, SHA-256) of suspect binaries or artifacts.",
        "prevention_steps": [
            "Query threat intelligence feeds (VirusTotal, AlienVault OTX, MISP) for malware family attribution and detection coverage.",
            "Search endpoint fleet using EDR or PowerShell sweep to detect any other hosts containing matching hash values.",
            "Blacklist the hash value on endpoint protection agents to prevent future execution across the domain.",
            "Add the cryptographic hash to the perimeter gateway and email attachment security filter blocklist.",
            "Archive the binary sample securely in the forensic evidence repository for detailed reverse engineering."
        ],
        "hardening_recommendations": "Enable cloud-delivered endpoint protection for real-time hash lookups and configure automated EDR blocking for malicious hash telemetry."
    },
    "identity": {
        "title": "Identity & Compromised Account Containment",
        "description": "References to targeted users, executives, administrative accounts, or compromised identities.",
        "prevention_steps": [
            "Perform immediate password reset and invalidate all active browser sessions, OAuth tokens, and refresh cookies.",
            "Audit multi-factor authentication (MFA) server logs for push-notification fatigue or abnormal OTP attempts.",
            "Review Azure AD / Active Directory sign-in logs for impossible travel, unfamiliar user agents, and IP anomalies.",
            "Check mailbox forwarding rules, delegated permissions, and OAuth app authorizations associated with this user.",
            "Contact the account holder via an out-of-band communication channel (phone/in-person) to confirm legitimate activity."
        ],
        "hardening_recommendations": "Enforce number-matching MFA, implement Just-In-Time (JIT) privileged access management, and configure risk-based conditional access policies."
    },
    "infrastucture": {
        "title": "C2 Infrastructure & Network Beaconing Mitigation",
        "description": "Indicators of command-and-control servers, beaconing nodes, or adversary hosting infrastructure.",
        "prevention_steps": [
            "Block outbound network communication to the suspect IP addresses and hostnames at edge firewalls and proxies.",
            "Inspect internal DNS query logs to identify all internal endpoints resolving the suspicious domain.",
            "Analyze NetFlow/IPFIX logs to determine data exfiltration volumes and connection frequency.",
            "Sinkhole malicious internal DNS queries to capture infected hosts attempting C2 beaconing.",
            "Submit abuse reports to domain registrars and hosting providers for malicious infrastructure takedown."
        ],
        "hardening_recommendations": "Deploy DNS-layer security (Cisco Umbrella / Quad9 / Pi-hole with threat feeds), implement strict outbound egress filtering, and deny outbound traffic on non-standard ports."
    },
    "location": {
        "title": "Geographic Threat Intelligence & Anomaly Review",
        "description": "Geographical indicators of threat source origins, targeted regions, or foreign adversary hosting.",
        "prevention_steps": [
            "Review Geo-IP logs to determine if the connection aligns with the organization's normal business operations.",
            "Examine whether traffic originates from known VPN exit nodes, Tor relays, or commercial hosting providers.",
            "Correlate geographic indicators with recent threat intelligence alerts targeting your specific industry sector.",
            "Apply geofencing or conditional access rules to restrict access from high-risk geographic territories.",
            "Ensure remote workers access corporate assets exclusively through authorized, corporate-managed VPN tunnels."
        ],
        "hardening_recommendations": "Enable Geo-blocking for authentication endpoints where international business is not expected, and enforce device health compliance prior to connection."
    },
    "time": {
        "title": "Temporal Analysis & Timestamp Forensics",
        "description": "Temporal references, attack schedules, out-of-hours activity, or campaign timelines.",
        "prevention_steps": [
            "Reconstruct an exact chronological timeline of security events across all correlated data sources.",
            "Verify Network Time Protocol (NTP) synchronization across domain controllers, servers, and firewall appliances.",
            "Investigate whether observed activity occurred outside normal operational hours or during holiday maintenance windows.",
            "Check for scheduled task triggers or automated cron jobs executed at specific recurring time intervals.",
            "Document the dwell time (time between initial intrusion and detection) to evaluate detection effectiveness."
        ],
        "hardening_recommendations": "Configure automated SIEM alerts for high-privilege activities occurring outside standard operating hours (e.g. 23:00 - 05:00)."
    },
    "software": {
        "title": "Software Asset Hygiene & Supply Chain Review",
        "description": "Affected software applications, frameworks, server components, or dependencies.",
        "prevention_steps": [
            "Audit installed versions across all workstations and production servers using inventory management tools.",
            "Review software publisher digital signatures and verify software supply chain integrity.",
            "Decommission end-of-life or unsupported software components (e.g. legacy Flash, outdated Java runtimes).",
            "Apply the latest vendor cumulative updates and security hotfixes.",
            "Monitor vendor security advisories and CVE announcements for emerging zero-day vulnerabilities."
        ],
        "hardening_recommendations": "Maintain an accurate Software Bill of Materials (SBOM), enforce standard operating environment (SOE) images, and prevent unprivileged users from installing software."
    },
    "campaign": {
        "title": "Campaign Analysis & Cross-Incident Correlation",
        "description": "Coordinated cyber operations, targeted phishing waves, or widespread espionage initiatives.",
        "prevention_steps": [
            "Correlate indicators across multiple recent incidents to determine if they are part of a coordinated campaign.",
            "Share anonymized threat intelligence with industry Information Sharing and Analysis Centers (ISACs).",
            "Deploy specialized detection rules (YARA, Sigma, Snort/Suricata) tailored to this specific threat campaign.",
            "Conduct proactive threat hunting across corporate mailboxes and endpoints for campaign-specific lure documents.",
            "Brief executive leadership and department heads on ongoing campaign vectors and heightened vigilance."
        ],
        "hardening_recommendations": "Participate in threat sharing communities, maintain continuous threat intelligence ingestion, and conduct regular tabletop incident response exercises."
    },
    "url": {
        "title": "Malicious URL & Phishing Link Neutralization",
        "description": "Suspect web links, phishing landing pages, credential harvesters, or drive-by download URLs.",
        "prevention_steps": [
            "Submit the suspect URL to automated sandbox analysis (Any.Run, URLhaus, Hybrid Analysis) using safe detonation tools.",
            "Block the URL, full domain, and associated IP addresses at the corporate secure web gateway (SWG) and DNS resolver.",
            "Search email security gateway logs to identify all recipients who received messages containing the URL.",
            "Inspect proxy logs to identify if any internal users clicked the URL or submitted web form credentials.",
            "If credentials were submitted on a phishing page, immediately reset the impacted user's credentials and revoke active sessions."
        ],
        "hardening_recommendations": "Implement link rewriting / time-of-click analysis in email security, deploy browser isolation for untrusted web links, and conduct regular phishing simulation training."
    }
}

FALLBACK_PREVENTION_GUIDANCE = {
    "title": "Manual Investigation Required (Unknown Category)",
    "description": "The classifier did not match a standardized category with pre-curated playbooks.",
    "prevention_steps": [
        "Manual investigation required by a Level 2/3 SOC Security Analyst.",
        "Perform deep packet inspection (DPI) and examine raw system audit logs for anomalous activity.",
        "Consult proprietary Threat Intelligence feeds and external open-source intelligence (OSINT).",
        "Engage incident response leads if Indicators of Compromise (IoCs) demonstrate active lateral movement.",
        "Document novel findings and author a new defensive playbook entry upon incident closure."
    ],
    "hardening_recommendations": "Escalate to Senior Incident Commander for structured forensic triage and root-cause analysis."
}

MODEL_SAFETY_DISCLAIMER = (
    "CRITICAL DATA LIMITATION: Entity category text classification only. "
    "This baseline model classifies cybersecurity terminology and text entities from labeled literature. "
    "It is NOT a verified benign-versus-malicious network attack detector and does NOT confirm real-world incidents. "
    "Predictions must NOT be used for automated destructive responses (e.g. blocking IPs, isolating devices, "
    "disabling accounts). Analyst review and confirmation are required."
)

SAFE_SAMPLE_RECORDS: List[Dict[str, str]] = [
    {
        "label": "Malware Entity Sample",
        "category": "malware",
        "text": "If the victim downloads and executes the installer downloaded from this page, the victim will be infected with a variant of Gh0stRat malware, previously also named Gh0stCringe or CineregRAT.",
        "context": "Text mentioning remote access trojans and malware variants."
    },
    {
        "label": "Vulnerability / CVE Sample",
        "category": "vulnerability",
        "text": "The CVE-2022-22965 vulnerability allows an attacker unauthenticated remote code execution (RCE), which Unit 42 has observed being exploited in the wild.",
        "context": "Text referencing critical remote code execution CVE flaw."
    },
    {
        "label": "Threat Actor Entity Sample",
        "category": "threat-actor",
        "text": "While analyzing the technical details of this malware, which includes two new espionage backdoors, we noticed striking similarities to other malware attributed to the threat actor known as APT37, also known as Reaper or Group 123.",
        "context": "Text identifying advanced persistent threat (APT) groups."
    },
    {
        "label": "Attack Pattern Sample",
        "category": "attack-pattern",
        "text": "A cybersquatting domain save-russia[.]today is launching DoS attacks on Ukrainian news sites using distributed traffic floods.",
        "context": "Text describing denial-of-service and adversary attack patterns."
    },
    {
        "label": "Offensive Tooling Sample",
        "category": "tools",
        "text": "Compromised email addresses were leveraged to send malicious Microsoft Excel documents with VBA macros delivering Cobalt Strike beacons.",
        "context": "Text mentioning post-exploitation tooling."
    },
    {
        "label": "Malicious URL Sample",
        "category": "url",
        "text": "Connection of Maikspy variants to 107[.]180[.]46[.]243 and hxxp://fakeomegle[.]com was observed during outbound beaconing.",
        "context": "Text containing suspicious C2 URLs and IP endpoints."
    }
]


class MLService:
    def __init__(self):
        self.model = None
        self.model_path = None
        self.metrics = None
        self._load_model()
        self._load_metrics()

    def _find_file(self, candidates: List[Path]) -> Optional[Path]:
        for path in candidates:
            if path.exists():
                return path
        return None

    def _load_model(self):
        found_path = self._find_file(MODEL_CANDIDATE_PATHS)
        if found_path:
            try:
                import joblib
                self.model = joblib.load(found_path)
                self.model_path = str(found_path)
                logger.info(f"Loaded trained cybersecurity text classifier from: {found_path}")
            except Exception as e:
                logger.error(f"Error loading trained model from {found_path}: {e}")
                self.model = None
        else:
            logger.warning("Trained model artifact not found. Please run train_model.py first.")

    def _load_metrics(self):
        found_metrics = self._find_file(METRICS_CANDIDATE_PATHS)
        if found_metrics:
            try:
                with open(found_metrics, "r", encoding="utf-8") as f:
                    self.metrics = json.load(f)
            except Exception as e:
                logger.error(f"Error reading evaluation metrics from {found_metrics}: {e}")
                self.metrics = None

    def is_model_loaded(self) -> bool:
        return self.model is not None

    def classify_text(self, text: str) -> Dict[str, Any]:
        """
        Classifies incoming cybersecurity text into an entity category.
        Returns predicted category, confidence score, curated prevention guidance,
        and mandatory safety disclaimers.
        """
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty.")

        clean_text = text.strip()

        # If model is not loaded, attempt lazy load
        if self.model is None:
            self._load_model()

        if self.model is None:
            raise RuntimeError(
                "The trained ML model is not loaded. Ensure that 'train_model.py' has been executed "
                "and 'cybersecurity_text_classifier.joblib' exists in 'security_incident_model_bundle/artifacts/'."
            )

        predicted_category = str(self.model.predict([clean_text])[0]).strip().lower()

        # Calculate a normalized confidence score based on LinearSVC decision function
        confidence_score = 0.85
        try:
            if hasattr(self.model, "decision_function"):
                decision_vals = self.model.decision_function([clean_text])
                if hasattr(decision_vals, "ndim") and decision_vals.ndim == 2:
                    # Softmax over decision function scores
                    exp_scores = np.exp(decision_vals[0] - np.max(decision_vals[0]))
                    probs = exp_scores / np.sum(exp_scores)
                    confidence_score = float(np.max(probs))
                elif hasattr(decision_vals, "ndim") and decision_vals.ndim == 1:
                    # Binary classification sigmoid
                    confidence_score = float(1 / (1 + np.exp(-abs(decision_vals[0]))))
        except Exception:
            confidence_score = 0.75

        # Fetch curated prevention guidance from the rule-based knowledge base
        guidance_data = CURATED_PREVENTION_KNOWLEDGE_BASE.get(
            predicted_category, FALLBACK_PREVENTION_GUIDANCE
        )

        formatted_steps = "\n".join(
            [f"{i+1}. {step}" for i, step in enumerate(guidance_data["prevention_steps"])]
        )
        full_guidance = (
            f"**{guidance_data['title']}**\n\n"
            f"{guidance_data['description']}\n\n"
            f"### Immediate Containment & Investigation Steps:\n"
            f"{formatted_steps}\n\n"
            f"### Hardening & Prevention Guidance:\n"
            f"{guidance_data.get('hardening_recommendations', 'Consult SOC policy.')}"
        )

        return {
            "predicted_category": predicted_category,
            "confidence_score": round(confidence_score, 4),
            "prevention_guidance": full_guidance,
            "prevention_details": guidance_data,
            "model_disclaimer": MODEL_SAFETY_DISCLAIMER,
            "is_entity_classification": True,
            "model_path": self.model_path,
        }

    def get_metrics(self) -> Dict[str, Any]:
        """Returns loaded evaluation metrics or defaults."""
        if not self.metrics:
            self._load_metrics()
        
        return self.metrics or {
            "task": "cybersecurity text entity-category classification",
            "warning": MODEL_SAFETY_DISCLAIMER,
            "status": "Model artifact not yet evaluated or loaded.",
            "accuracy": 0.0,
            "classes": []
        }

    def get_safe_samples(self) -> List[Dict[str, str]]:
        """Returns curated safe sample records for testing."""
        return SAFE_SAMPLE_RECORDS


# Singleton ML service instance
ml_service = MLService()

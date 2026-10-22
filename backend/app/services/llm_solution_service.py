import os
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List
import pandas as pd

logger = logging.getLogger(__name__)

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATASET_PATH = BASE_DIR / "security_incident_model_bundle" / "cybersecurity_entities.csv"

# Pre-indexed dataset solutions from cybersecurity_entities.csv
DATASET_SOLUTIONS_FALLBACK: Dict[str, Dict[str, str]] = {
    "malware": {
        "entity_class": "malware",
        "diagnosis": "System compromised by malicious executable payload, RAT backdoor (e.g., Gh0stRat, Maikspy, AnubisSpy) establishing command-and-control communications.",
        "solution": "1. Deploy endpoint EDR to isolate the affected host from the subnet. 2. Scan fleet for matching cryptographic hashes (SHA-256). 3. Inspect Windows Registry Run keys and scheduled tasks for persistence. 4. Enforce AppLocker / application whitelisting and conduct offline immutable backups."
    },
    "vulnerability": {
        "entity_class": "vulnerability",
        "diagnosis": "Host asset contains an unpatched vulnerability or Remote Code Execution flaw (e.g., CVE-2022-22965, CVE-2022-22954) actively targeted by external adversaries.",
        "solution": "1. Cross-reference CVE ID in National Vulnerability Database (NVD). 2. Apply vendor cumulative security patches or hotfixes immediately. 3. Deploy virtual patching rules in WAF/IPS to block exploit payloads. 4. Conduct vulnerability scanning to confirm remediation."
    },
    "threat-actor": {
        "entity_class": "threat-actor",
        "diagnosis": "Targeted intrusion attributed to advanced threat actors (e.g., APT37, Reaper, Group 123, Charming Kitten) utilizing multi-stage espionage backdoors.",
        "solution": "1. Correlate adversary TTPs against MITRE ATT&CK enterprise matrix. 2. Invalidate active refresh tokens and mandate password resets for targeted administrative accounts. 3. Query SIEM across the last 90 days for associated IoCs. 4. Enforce phishing-resistant FIDO2 MFA."
    },
    "attack-pattern": {
        "entity_class": "attack-pattern",
        "diagnosis": "Adversary exploiting denial-of-service, traffic flooding, or automated cybersquatting infrastructure targeting organizational web services.",
        "solution": "1. Enable DNS-layer and WAF rate-limiting to mitigate traffic floods. 2. Null-route malicious source IP subnets at upstream border routers. 3. Inspect application logs for process injection and living-off-the-land binaries. 4. Verify network segmentation between DMZ and database tier."
    },
    "tools": {
        "entity_class": "tools",
        "diagnosis": "Adversary employing dual-use offensive tooling or post-exploitation frameworks (e.g., Cobalt Strike, Mimikatz, Koadic) for credential extraction and lateral movement.",
        "solution": "1. Terminate suspicious parent and child process trees on the affected endpoint. 2. Examine memory injection and LSASS access events. 3. Audit Domain Administrator and local administrative usage. 4. Enable Credential Guard and ASR rules in Windows."
    },
    "identity": {
        "entity_class": "identity",
        "diagnosis": "Compromised administrative or executive account credentials used to bypass access controls or send malicious spear-phishing lures.",
        "solution": "1. Invalidate active browser sessions, OAuth tokens, and refresh cookies. 2. Audit MFA logs for push-notification fatigue or abnormal OTP attempts. 3. Inspect mailbox forwarding rules and delegated permissions. 4. Enforce number-matching MFA and conditional access."
    },
    "url": {
        "entity_class": "url",
        "diagnosis": "Outbound communication to malicious C2 server domain or credential harvesting phishing URL (e.g., biosnews[.]info, fakeomegle[.]com).",
        "solution": "1. Sinkhole internal DNS queries to the suspect domain. 2. Block the URL and hosting IP at the corporate secure web gateway. 3. Query proxy logs for internal users who clicked or submitted credentials. 4. Enforce automated browser isolation."
    }
}

# Detection methods by SOC category
DETECTION_METHODS_BY_CATEGORY: Dict[str, Dict[str, str]] = {
    "Suspicious Login": {
        "method_name": "Behavioral Authentication Anomaly & Impossible Travel Heuristic",
        "detection_vector": "SIEM Auth Engine flagged concurrent active sessions across disparate geographic IP ranges within an impossible 15-minute window or detected unusual user-agent signatures bypassing baseline MFA policies.",
        "telemetry_source": "Active Directory / Azure AD Sign-in Logs (Event ID 4624/4625), Okta Identity Cloud, VPN Gateway Radius Audit."
    },
    "Phishing Alert": {
        "method_name": "Secure Email Gateway (SEG) Machine Learning & DMARC Failure",
        "detection_vector": "Heuristic mail gateway detected spoofed sender domain, mismatched DKIM/SPF headers, or high-risk credential-harvesting hyperlinked attachments containing obfuscated script macros.",
        "telemetry_source": "Mail Transfer Agent (Postfix/Exchange), SEG Quarantine Logs, EDR Attachment Sandbox Detonation."
    },
    "Malware Alert": {
        "method_name": "Endpoint Detection & Response (EDR) Behavioral Heuristics",
        "detection_vector": "EDR agent alerted on unauthorized executable dropped into user temp space (%TEMP%) executing anomalous process injection into svchost.exe or attempting code-signing signature bypass.",
        "telemetry_source": "Sysmon Event ID 1 (Process Create), Event ID 7 (Image Loaded), CrowdStrike / Defender for Endpoint Behavioral Telemetry."
    },
    "Unauthorized Access": {
        "method_name": "Privileged Access Management (PAM) & Subnet ACL Breach Alert",
        "detection_vector": "Firewall and database audit monitors flagged lateral connection from an unprivileged workstation into an isolated production database or cryptographic key vault cluster.",
        "telemetry_source": "Core Firewall NetFlow, Database Audit Trail (pg_audit/SQL Profiler), IAM Role Assumption Logs."
    },
    "Brute-Force Attempt": {
        "method_name": "Authentication Threshold Rate-Limiting & Velocity Sensor",
        "detection_vector": "Authentication gateway logged over 25 consecutive failed login attempts within 60 seconds targeting administrative usernames (e.g., root, administrator, svc-core).",
        "telemetry_source": "WAF Rate-Limiting Engine, SSH Auth.log, Nginx Reverse Proxy Error Logs, Fail2ban Event Trigger."
    },
    "Suspicious Network Activity": {
        "method_name": "Network Intrusion Detection (NIDS) & C2 Beaconing Periodic Analysis",
        "detection_vector": "Zeek / Suricata sensor identified periodic outbound encrypted traffic bursts on non-standard port 8443 matching command-and-control beaconing jitter profiles.",
        "telemetry_source": "Zeek conn.log / dns.log, Suricata Alert Vector, Border Router NetFlow v9."
    },
    "Data Exfiltration Alert": {
        "method_name": "Data Loss Prevention (DLP) & Anomaly Volume Baseline",
        "detection_vector": "Egress proxy identified anomalous outbound data volume (>500 MB) of encrypted archive files uploaded to an unclassified foreign cloud storage endpoint.",
        "telemetry_source": "Corporate Proxy BlueCoat/Zscaler, Cloud Access Security Broker (CASB), Endpoint DLP Agent."
    },
    "Privilege Escalation": {
        "method_name": "Host Integrity & Process Token Privilege Monitoring",
        "detection_vector": "Sysmon telemetry caught unprivileged parent process launching high-integrity cmd.exe/PowerShell utilizing token manipulation or unquoted service path exploit.",
        "telemetry_source": "Windows Security Event ID 4688 (Process Creation with Token Elevation), Linux Auditd execve events."
    },
    "Policy Violation": {
        "method_name": "Cloud Security Posture Management (CSPM) Compliance Scanner",
        "detection_vector": "Automated security posture scan identified non-compliant open storage bucket permissions, unencrypted database storage volume, or unauthorized software installation.",
        "telemetry_source": "AWS Security Hub, Azure Policy Compliance, Endpoint Configuration Manager."
    },
    "Other": {
        "method_name": "Generalized SOC SIEM Multi-Factor Heuristic Match",
        "detection_vector": "Correlated multiple low-severity alerts occurring on the same asset within a sliding 60-minute window, crossing the threshold for automated security triage.",
        "telemetry_source": "Centralized SIEM Correlation Engine (Elastic / Splunk / Sentinel)."
    }
}

class LLMSolutionService:
    def __init__(self):
        self.dataset_cache: Dict[str, Dict[str, str]] = {}
        self._load_dataset_knowledge()

    def _load_dataset_knowledge(self):
        """Loads real diagnosis and solutions from cybersecurity_entities.csv."""
        try:
            if DATASET_PATH.exists():
                df = pd.read_csv(DATASET_PATH)
                if "label_1" in df.columns and "solutions" in df.columns:
                    for label, group in df.groupby("label_1"):
                        clean_label = str(label).strip().lower()
                        valid_rows = group.dropna(subset=["diagnosis", "solutions"])
                        if len(valid_rows) > 0:
                            row = valid_rows.iloc[0]
                            self.dataset_cache[clean_label] = {
                                "entity_class": clean_label,
                                "diagnosis": str(row["diagnosis"]).strip(),
                                "solution": str(row["solutions"]).strip(),
                            }
                logger.info(f"Loaded {len(self.dataset_cache)} entity solutions from cybersecurity_entities.csv")
        except Exception as e:
            logger.warning(f"Could not load dataset solutions from {DATASET_PATH}: {e}")

    def _get_dataset_correlation(self, category: str, description: str) -> Dict[str, str]:
        """Correlate the SOC category/description with the trained dataset entities."""
        text_lower = f"{category} {description}".lower()

        # Match to entity classes
        if any(w in text_lower for w in ["malware", "rat", "trojan", "ransomware", "backdoor", "payload"]):
            matched = "malware"
        elif any(w in text_lower for w in ["cve", "vulnerability", "exploit", "rce", "overflow", "patch"]):
            matched = "vulnerability"
        elif any(w in text_lower for w in ["apt", "threat-actor", "actor", "state-sponsored", "group 123", "reaper"]):
            matched = "threat-actor"
        elif any(w in text_lower for w in ["cobalt", "mimikatz", "tool", "framework", "koadic"]):
            matched = "tools"
        elif any(w in text_lower for w in ["login", "user", "credential", "account", "identity", "privilege"]):
            matched = "identity"
        elif any(w in text_lower for w in ["phishing", "domain", "url", "link", "c2", "beacon"]):
            matched = "url"
        else:
            matched = "attack-pattern"

        if matched in self.dataset_cache:
            return self.dataset_cache[matched]
        return DATASET_SOLUTIONS_FALLBACK.get(matched, DATASET_SOLUTIONS_FALLBACK["attack-pattern"])

    async def _call_live_grok(
        self,
        incident_data: Dict[str, Any],
        detection: Dict[str, str],
        dataset_corr: Dict[str, str],
        api_key: str
    ) -> Optional[str]:
        """Query xAI Grok API (OpenAI-compatible) for security remediation."""
        try:
            import httpx

            prompt = (
                f"You are Grok Cyber Defense AI, an expert Senior SOC Incident Commander.\n"
                f"Analyze this detected security incident and generate a comprehensive, highly actionable solution:\n\n"
                f"- Incident ID: {incident_data.get('incident_id')}\n"
                f"- Category: {incident_data.get('category')}\n"
                f"- Severity: {incident_data.get('severity')}\n"
                f"- Risk Score: {incident_data.get('risk_score')}/100 [{incident_data.get('risk_priority')}]\n"
                f"- Affected Asset: {incident_data.get('affected_asset')}\n"
                f"- Alert Description: {incident_data.get('description')}\n"
                f"- Detection Method: {detection['method_name']}\n"
                f"- Correlated Dataset Diagnosis: {dataset_corr['diagnosis']}\n\n"
                f"Generate a structured Markdown response with:\n"
                f"1. Executive Threat Diagnosis & Blast Radius\n"
                f"2. Detection Method Explanation (Technical Indicators)\n"
                f"3. Phase 1: Immediate Tactical Containment Steps\n"
                f"4. Phase 2: Root-Cause Eradication & Fixes\n"
                f"5. Phase 3: System Recovery & Verification\n"
                f"6. Phase 4: Long-Term Enterprise Hardening & Prevention\n"
                f"Keep instructions crisp, technical, and immediately actionable."
            )

            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://api.x.ai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "grok-2",
                        "messages": [
                            {"role": "system", "content": "You are Grok Cyber Defense Copilot for a high-priority enterprise SOC."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.2,
                        "max_tokens": 1200
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.warning(f"Grok API returned status {res.status_code}: {res.text}")
                    return None
        except Exception as e:
            logger.warning(f"Grok API call failed: {e}")
            return None

    async def _call_live_gpt(
        self,
        incident_data: Dict[str, Any],
        detection: Dict[str, str],
        dataset_corr: Dict[str, str],
        api_key: str
    ) -> Optional[str]:
        """Query OpenAI GPT-4o API for security remediation."""
        try:
            import httpx

            prompt = (
                f"You are OpenAI GPT-4o Cyber Security Copilot.\n"
                f"Analyze this detected security incident and generate a structured, production-grade mitigation playbook:\n\n"
                f"- Incident ID: {incident_data.get('incident_id')}\n"
                f"- Category: {incident_data.get('category')}\n"
                f"- Severity: {incident_data.get('severity')}\n"
                f"- Risk Score: {incident_data.get('risk_score')}/100 [{incident_data.get('risk_priority')}]\n"
                f"- Affected Asset: {incident_data.get('affected_asset')}\n"
                f"- Alert Description: {incident_data.get('description')}\n"
                f"- Detection Method: {detection['method_name']}\n\n"
                f"Provide:\n"
                f"1. Threat Overview & Impact Assessment\n"
                f"2. Detection Method Analysis\n"
                f"3. Phase 1: Containment\n"
                f"4. Phase 2: Eradication\n"
                f"5. Phase 3: Recovery\n"
                f"6. Phase 4: Hardening & Policy Prevention\n"
                f"Format cleanly in GitHub Markdown."
            )

            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "gpt-4o",
                        "messages": [
                            {"role": "system", "content": "You are an elite Tier 3 SOC Incident Responder and Threat Hunter."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.2,
                        "max_tokens": 1200
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.warning(f"GPT API returned status {res.status_code}: {res.text}")
                    return None
        except Exception as e:
            logger.warning(f"GPT API call failed: {e}")
            return None

    def _generate_builtin_solution(
        self,
        incident_data: Dict[str, Any],
        detection: Dict[str, str],
        dataset_corr: Dict[str, str],
        model_name: str = "SOC CyberLLM (Built-in Cognitive Engine)"
    ) -> Dict[str, Any]:
        """
        Built-in deterministic cognitive intelligence engine.
        Generates deeply realistic, academic-grade mitigation playbooks correlated with dataset diagnosis.
        """
        cat = incident_data.get("category", "Other")
        asset = incident_data.get("affected_asset", "unknown-host")
        risk = incident_data.get("risk_score", 50.0)
        priority = incident_data.get("risk_priority", "MEDIUM")
        sev = incident_data.get("severity", "Medium")
        desc = incident_data.get("description", "")
        inc_id = incident_data.get("incident_id", "INC-XXXX")

        # 4-Phase structured protocols tailored to category
        if cat == "Suspicious Login":
            phase_1 = [
                f"Immediately invalidate all active session tokens, OAuth refresh cookies, and Kerberos tickets for accounts on '{asset}'.",
                "Apply dynamic IP blacklist rule on boundary reverse proxy for originating anomalous source IP address.",
                "Force administrative credential expiration and prompt user for mandatory MFA challenge."
            ]
            phase_2 = [
                "Audit directory sign-in logs (Azure AD / Active Directory Event ID 4624) across the previous 72 hours for impossible travel anomalies.",
                "Inspect user mailbox forwarding rules and OAuth application consents granted around the session timestamp.",
                "Verify host integrity of the originating client if an internal VPN address was used."
            ]
            phase_3 = [
                "Issue a hardware-backed security key (FIDO2) or reset passphrase via an out-of-band verified phone call.",
                "Restore account access in a monitored containment group and review subsequent authentication attempts.",
                "Verify directory replication integrity across all domain controllers."
            ]
            phase_4 = [
                "Enforce conditional access policies mandating compliant corporate-managed endpoints.",
                "Enable number-matching MFA to protect against push-notification fatigue attacks.",
                "Implement geo-blocking policies restricting logins from unauthorized international regions."
            ]
        elif cat == "Phishing Alert":
            phase_1 = [
                "Purge reported phishing message across all enterprise mailboxes using Exchange PowerShell / Graph API message trace.",
                "Blacklist suspect sender domain and extracted lure URLs at the perimeter Secure Web Gateway (SWG) and DNS resolver.",
                f"Isolate reporting workstation '{asset}' if attachment detonation or credential submission occurred."
            ]
            phase_2 = [
                "Extract email headers (DKIM, SPF, DMARC) and identify all recipients who opened the message or clicked hyperlinks.",
                "Submit lure attachment/URL to isolated sandbox environment to extract secondary payload indicators of compromise (IoCs).",
                "Force credential resets for any user identified submitting credentials to the phishing landing page."
            ]
            phase_3 = [
                "Rescan affected endpoint fleet with updated EDR signature definitions.",
                "Re-enable mail delivery after updating perimeter mail filter rules with newly identified IOC hashes.",
                "Notify users whose mailboxes were targeted with a confirmation of message removal."
            ]
            phase_4 = [
                "Deploy automated DMARC enforcement (p=reject) across all company-owned domains.",
                "Implement time-of-click URL rewriting and browser isolation for all external hyperlinks.",
                "Schedule micro-training simulation on social engineering and deceptive link detection."
            ]
        elif cat == "Malware Alert":
            phase_1 = [
                f"Logically isolate '{asset}' from the local VLAN using EDR network quarantine (allow only SOC management traffic).",
                "Terminate malicious parent and child process trees identified in EDR telemetry.",
                "Block identified command-and-control (C2) destination IP addresses and domains at the perimeter firewall."
            ]
            phase_2 = [
                "Capture digital forensic memory dump and triage image using Volatility / FTK Imager before host reboot.",
                "Calculate cryptographic SHA-256 hashes of suspect binaries and cross-check VirusTotal and CISA feeds.",
                "Inspect persistence mechanisms: Windows Registry Run keys, Scheduled Tasks, WMI event subscriptions, and startup services."
            ]
            phase_3 = [
                "Perform verified reimaging of the affected host from a known-good immutable golden master image.",
                "Verify database and file backup integrity prior to host reconnection.",
                "Conduct a 48-hour continuous monitoring sweep on the restored asset."
            ]
            phase_4 = [
                "Enforce AppLocker / Software Restriction Policies blocking execution from user-writable directories (%TEMP%, %APPDATA%).",
                "Enable PowerShell Constrained Language Mode to limit fileless script execution.",
                "Maintain offline, immutable backups with strict access segregation."
            ]
        elif cat == "Unauthorized Access":
            phase_1 = [
                f"Revoke all active administrative and session tokens on '{asset}' immediately.",
                "Temporarily block unauthorized lateral subnet route at the core switch / internal firewall.",
                "Place affected database / storage volume into read-only audit mode to prevent tampering."
            ]
            phase_2 = [
                "Audit privileged access logs and query history to determine exact data accessed, read, or modified.",
                "Review recent RBAC changes, sudoers modifications, and Active Directory group membership alterations.",
                "Identify initial entry vector: credential stuffing, unpatched service exploit, or insider anomaly."
            ]
            phase_3 = [
                "Rotate all service account credentials and cryptographic API keys associated with the affected asset.",
                "Verify database record cryptographic hashes against historical audit snapshots.",
                "Restore network access under strict zero-trust just-in-time (JIT) access approval."
            ]
            phase_4 = [
                "Enforce Zero Trust Network Access (ZTNA) requiring micro-segmentation between all tiers.",
                "Implement Privileged Access Management (PAM) with ephemeral, session-monitored credentials.",
                "Audit principle of least privilege compliance across all administrative teams."
            ]
        elif cat == "Brute-Force Attempt":
            phase_1 = [
                "Apply immediate temporary border firewall drop rule on the originating malicious source IP subnet.",
                "Enable aggressive rate-limiting on the authentication portal (max 5 failed attempts per 5 minutes).",
                f"Enforce CAPTCHA challenge and exponential backoff on authentication routes leading to '{asset}'."
            ]
            phase_2 = [
                "Verify whether any login attempt succeeded following repeated failures by checking subsequent Event ID 4624.",
                "Inspect authentication logs for distributed credential stuffing patterns using multiple rotating proxies.",
                "Audit targeted account passphrases against breached credential databases (HaveIBeenPwned API)."
            ]
            phase_3 = [
                "Temporarily lock targeted accounts and require self-service or helpdesk MFA password reset.",
                "Review firewall drop metrics to confirm cessation of unauthorized authentication floods.",
                "Restore normal rate-limiting thresholds once threat traffic subsides."
            ]
            phase_4 = [
                "Transition authentication to passwordless authentication (FIDO2 / WebAuthn passkeys).",
                "Deploy Cloudflare / AWS WAF managed bot mitigation rules to challenge automated scanners.",
                "Deploy honeypot accounts to detect early reconnaissance scanning."
            ]
        else: # Generic high-grade SOC response
            phase_1 = [
                f"Establish tactical containment boundary on '{asset}' and restrict egress network traffic.",
                "Preserve volatile network connection states and system logs before power cycle or reboot.",
                "Notify Level 2 SOC Incident Commander and assign lead investigator."
            ]
            phase_2 = [
                "Perform root-cause analysis correlating SIEM audit logs with EDR process timelines.",
                "Identify exploit mechanism or configuration drift responsible for triggering the anomaly.",
                "Eradicate any identified persistence mechanisms or unauthorized configuration alterations."
            ]
            phase_3 = [
                "Validate asset configuration against hardened CIS Benchmarks baseline.",
                "Restore network connectivity under continuous telemetry monitoring.",
                "Confirm system health and service availability with asset owner."
            ]
            phase_4 = [
                "Author custom SIEM detection rule (Sigma / YARA) to identify similar recurrence.",
                "Update standard operating procedure (SOP) playbooks based on lessons learned.",
                "Conduct post-incident review meeting with SOC engineering leads."
            ]

        # Markdown representation
        full_md = (
            f"## 🛡️ AI Risk Solution & Mitigation Protocol\n\n"
            f"**Engine**: `{model_name}` | **Generated**: `{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}`\n"
            f"**Incident ID**: `{inc_id}` | **Risk Score**: `{risk}/100 [{priority}]` | **Asset**: `{asset}`\n\n"
            f"---\n\n"
            f"### 1. Executive Threat Diagnosis & Risk Vector\n"
            f"The incident was prioritized at **{priority}** risk ({risk}/100) due to base severity **{sev}** combined with "
            f"critical asset exposure on `{asset}`. The alert describes: *\"{desc}\"*.\n\n"
            f"### 2. Detection Method Analysis\n"
            f"- **Detection Vector**: {detection['method_name']}\n"
            f"- **Technical Analysis**: {detection['detection_vector']}\n"
            f"- **Telemetry Sensors**: {detection['telemetry_source']}\n\n"
            f"---\n\n"
            f"### 3. Step-by-Step Remediation & Solution Protocol\n\n"
            f"#### Phase 1: Tactical Containment Method\n"
            + "\n".join([f"- [ ] **1.{i+1}**: {step}" for i, step in enumerate(phase_1)]) + "\n\n"
            f"#### Phase 2: Root-Cause Eradication Method\n"
            + "\n".join([f"- [ ] **2.{i+1}**: {step}" for i, step in enumerate(phase_2)]) + "\n\n"
            f"#### Phase 3: System Recovery & Verification Method\n"
            + "\n".join([f"- [ ] **3.{i+1}**: {step}" for i, step in enumerate(phase_3)]) + "\n\n"
            f"#### Phase 4: Long-Term Enterprise Hardening & Policy Prevention\n"
            + "\n".join([f"- [ ] **4.{i+1}**: {step}" for i, step in enumerate(phase_4)]) + "\n\n"
            f"---\n\n"
            f"### 4. Grounded Dataset Correlation (`cybersecurity_entities.csv`)\n"
            f"- **Matched Entity Class**: `{dataset_corr.get('entity_class', 'attack-pattern')}`\n"
            f"- **Dataset Diagnosis**: {dataset_corr.get('diagnosis', 'Standard cyber security anomaly.')}\n"
            f"- **Dataset Research Solution**: {dataset_corr.get('solution', 'Apply standard defense-in-depth.')}\n"
        )

        return {
            "incident_id": inc_id,
            "category": cat,
            "severity": sev,
            "risk_score": risk,
            "risk_priority": priority,
            "affected_asset": asset,
            "provider_used": model_name,
            "model_name": model_name,
            "is_live_api": False,
            "detection_summary": detection,
            "solution_protocol": {
                "phase_1_containment": phase_1,
                "phase_2_eradication": phase_2,
                "phase_3_recovery": phase_3,
                "phase_4_hardening": phase_4
            },
            "dataset_grounded_solution": dataset_corr,
            "full_markdown": full_md,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

    async def generate_solution(
        self,
        incident_data: Dict[str, Any],
        model_provider: str = "auto",
        custom_api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Orchestrates solution generation.
        Supports:
        - Grok (xAI) if selected or if GROK_API_KEY is present
        - OpenAI (GPT) if selected or if OPENAI_API_KEY is present
        - Built-in SOC CyberLLM Engine (deterministic fallback with dataset correlation)
        """
        cat = incident_data.get("category", "Other")
        desc = incident_data.get("description", "")
        detection = DETECTION_METHODS_BY_CATEGORY.get(cat, DETECTION_METHODS_BY_CATEGORY["Other"])
        dataset_corr = self._get_dataset_correlation(cat, desc)

        clean_provider = (model_provider or "auto").strip().lower()

        # Check API keys
        grok_key = custom_api_key if clean_provider == "grok" else (custom_api_key or os.getenv("GROK_API_KEY"))
        openai_key = custom_api_key if clean_provider == "gpt" else (custom_api_key or os.getenv("OPENAI_API_KEY"))

        # 1. Try Grok
        if clean_provider in ["grok", "xai"] or (clean_provider == "auto" and grok_key):
            if grok_key:
                logger.info("Attempting live Grok API generation...")
                grok_result = await self._call_live_grok(incident_data, detection, dataset_corr, grok_key)
                if grok_result:
                    return {
                        "incident_id": incident_data.get("incident_id", "INC-XXXX"),
                        "category": cat,
                        "severity": incident_data.get("severity", "Medium"),
                        "risk_score": incident_data.get("risk_score", 50.0),
                        "risk_priority": incident_data.get("risk_priority", "MEDIUM"),
                        "affected_asset": incident_data.get("affected_asset", "unknown"),
                        "provider_used": "xAI Grok",
                        "model_name": "grok-2",
                        "is_live_api": True,
                        "detection_summary": detection,
                        "solution_protocol": {
                            "phase_1_containment": ["Refer to Grok detailed response below."],
                            "phase_2_eradication": ["Refer to Grok detailed response below."],
                            "phase_3_recovery": ["Refer to Grok detailed response below."],
                            "phase_4_hardening": ["Refer to Grok detailed response below."]
                        },
                        "dataset_grounded_solution": dataset_corr,
                        "full_markdown": grok_result,
                        "generated_at": datetime.now(timezone.utc).isoformat()
                    }

        # 2. Try OpenAI GPT
        if clean_provider in ["gpt", "openai"] or (clean_provider == "auto" and openai_key):
            if openai_key:
                logger.info("Attempting live OpenAI GPT-4o API generation...")
                gpt_result = await self._call_live_gpt(incident_data, detection, dataset_corr, openai_key)
                if gpt_result:
                    return {
                        "incident_id": incident_data.get("incident_id", "INC-XXXX"),
                        "category": cat,
                        "severity": incident_data.get("severity", "Medium"),
                        "risk_score": incident_data.get("risk_score", 50.0),
                        "risk_priority": incident_data.get("risk_priority", "MEDIUM"),
                        "affected_asset": incident_data.get("affected_asset", "unknown"),
                        "provider_used": "OpenAI GPT-4o",
                        "model_name": "gpt-4o",
                        "is_live_api": True,
                        "detection_summary": detection,
                        "solution_protocol": {
                            "phase_1_containment": ["Refer to GPT-4o detailed response below."],
                            "phase_2_eradication": ["Refer to GPT-4o detailed response below."],
                            "phase_3_recovery": ["Refer to GPT-4o detailed response below."],
                            "phase_4_hardening": ["Refer to GPT-4o detailed response below."]
                        },
                        "dataset_grounded_solution": dataset_corr,
                        "full_markdown": gpt_result,
                        "generated_at": datetime.now(timezone.utc).isoformat()
                    }

        # 3. Built-in SOC CyberLLM Engine (Zero configuration, 100% reliable)
        model_label = "SOC CyberLLM (Built-in Cognitive Engine)"
        if clean_provider in ["grok", "gpt"]:
            model_label = f"SOC CyberLLM (Fallback - Live {clean_provider.upper()} Key Not Set)"

        return self._generate_builtin_solution(incident_data, detection, dataset_corr, model_name=model_label)

# Singleton instance
llm_solution_service = LLMSolutionService()

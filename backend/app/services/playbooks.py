"""
Defensive Response Playbooks for Security Incidents.

Provides category-appropriate defensive recommendations and step-by-step
containment guidance for educational and academic lab review.
Destructive actions are NEVER executed automatically.
"""

PLAYBOOKS: dict[str, list[str]] = {
    "Suspicious Login": [
        "Review authentication event details (timestamp, simulated source IP, and user-agent string).",
        "Correlate with known employee travel or VPN sessions to verify authorization.",
        "Check for concurrent active sessions across disparate geographical regions.",
        "Recommend initiating a simulated temporary credential reset and prompting for MFA re-enrollment.",
        "Review directory audit logs for subsequent privilege modification attempts."
    ],
    "Phishing Alert": [
        "Quarantine the reported synthetic email message and preserve headers (DKIM, SPF, DMARC records).",
        "Extract simulated URLs and attachments safely into an isolated sandbox environment.",
        "Search simulated mail logs to determine if other internal mailboxes received identical lures.",
        "Add synthetic sender domain and malicious hostnames to lab test DNS sinkhole lists.",
        "Advise user security awareness refresher on recognizing social engineering indicators."
    ],
    "Malware Alert": [
        "Logically isolate the simulated affected test endpoint from the lab local network segment.",
        "Capture running process memory dumps and examine file hashes against threat intelligence databases.",
        "Inspect scheduled tasks, cron jobs, and autorun registry keys for persistence mechanisms.",
        "Verify backup integrity before initiating test system reimaging.",
        "Document indicators of compromise (hashes, synthetic C2 endpoints) in the case notes."
    ],
    "Unauthorized Access": [
        "Audit immediate file system and database access logs for data tampering or read operations.",
        "Revoke active session tokens and temporarily disable affected role permissions.",
        "Review recent RBAC changes and administrative group memberships.",
        "Ensure multi-factor authentication is strictly enforced on all administrative gateways.",
        "File an internal access anomaly report and review principle of least privilege compliance."
    ],
    "Brute-Force Attempt": [
        "Analyze connection rate and target accounts from the source IP address.",
        "Verify whether any login attempt succeeded following repeated failures.",
        "Apply rate-limiting and temporary IP jail rules on the border firewall/reverse proxy.",
        "Enforce exponential backoff and CAPTCHA challenge policies on the authentication portal.",
        "Alert account owners to ensure strong passphrase compliance."
    ],
    "Suspicious Network Activity": [
        "Inspect netflow and packet capture data for anomalous protocol usage or non-standard ports.",
        "Correlate outbound traffic spikes against internal simulated database or file server hosts.",
        "Check external destination IP reputations against threat intelligence feeds.",
        "Review firewall egress filtering rules to restrict unauthorized outbound tunneling.",
        "Monitor internal lateral movement using test network tap sensors."
    ],
    "Data Exfiltration Alert": [
        "Identify volume and sensitivity of transferred simulated data artifacts.",
        "Temporarily block outbound communication to the target external endpoint.",
        "Preserve web proxy, DLP, and DNS query logs for forensic chain of custody.",
        "Determine affected data classification tier (confidential, internal, public).",
        "Prepare incident response escalation brief for stakeholder notification."
    ],
    "Privilege Escalation": [
        "Audit process execution trees that spawned elevated shells or administrative privileges.",
        "Inspect sudoers / Local Administrator group modifications within the incident timeframe.",
        "Revoke compromised credential pairs immediately and initiate credential rotation.",
        "Scan local filesystem for unquoted service paths or misconfigured suid binaries.",
        "Verify integrity of core system binary files."
    ],
    "Policy Violation": [
        "Review the nature of the policy infringement (unauthorized software, unapproved storage).",
        "Interview user and confirm business justification or inadvertent configuration error.",
        "Remediate non-compliant configuration to align with baseline organizational policy.",
        "Document policy acknowledgment and archive ticket for compliance auditing."
    ],
    "Other": [
        "Perform initial triage to establish baseline severity and verify event authenticity.",
        "Gather relevant telemetry (system logs, network connections, authentication records).",
        "Formulate defensive containment plan based on identified attack vectors.",
        "Document timeline and findings in the case investigation notes."
    ]
}

def get_recommended_actions(category: str) -> str:
    """Return formatted defensive response recommendations for a given incident category."""
    actions = PLAYBOOKS.get(category, PLAYBOOKS["Other"])
    formatted = "\n".join([f"{i+1}. {act}" for i, act in enumerate(actions)])
    return formatted

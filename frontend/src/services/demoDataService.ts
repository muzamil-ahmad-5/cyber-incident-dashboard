import preloadedData from '../data/preloaded_data.json';
import cybersecurityMetrics from '../data/cybersecurity_metrics.json';
import cicids2017Metrics from '../data/cicids2017_metrics.json';
import actualTrainedDataset from '../data/actual_trained_dataset.json';
import {
  Incident,
  PaginatedIncidents,
  AnalyticsDashboard,
  AuditLog,
  PaginatedAuditLogs,
  SeverityLevel,
  IncidentStatus,
  RiskPriority,
} from '../types/incident';

export interface MLRecord {
  id: number;
  record_id: string;
  submitted_text: string;
  predicted_category: string;
  confidence_score: number;
  prevention_guidance: string;
  review_status: 'New' | 'Under Investigation' | 'Resolved' | 'False Positive';
  analyst_confirmed_status: 'Unconfirmed' | 'Confirmed Incident' | 'Benign Activity' | 'Inconclusive';
  analyst_notes: string;
  reviewer: string;
  model_disclaimer: string;
  created_at: string;
  updated_at: string;
}

export interface MLSampleRecord {
  label: string;
  category: string;
  text: string;
  context: string;
}

// Curated prevention protocols matching backend ml_service.py
const CURATED_PREVENTION_KNOWLEDGE_BASE: Record<string, {
  title: string;
  description: string;
  prevention_steps: string[];
  hardening_recommendations: string;
}> = {
  'malware': {
    title: 'Malware Entity Triage & Prevention Protocol',
    description: 'Indicators of malicious payloads, trojans, backdoors, or ransomware variants.',
    prevention_steps: [
      'Isolate the suspect host from the local network segment immediately to restrict lateral infection spread.',
      'Acquire forensic memory image and process execution timeline using endpoint telemetry (EDR/Sysmon).',
      'Calculate cryptographic hashes (SHA-256) of suspect executables and query threat intelligence repositories (VirusTotal/CISA).',
      'Perform comprehensive antimalware scan and verify signature definition currency across the endpoint fleet.',
      'Review persistence mechanisms: inspect Windows Registry Run keys, Scheduled Tasks, and startup services.',
    ],
    hardening_recommendations: 'Deploy Application Whitelisting / AppLocker, enforce script execution restrictions (PowerShell Constrained Language Mode), and conduct regular offline immutable backups.',
  },
  'threat-actor': {
    title: 'Threat Actor Attribution & Threat Intelligence Protocol',
    description: 'References to Advanced Persistent Threat (APT) groups, state-sponsored actors, or cybercrime syndicates.',
    prevention_steps: [
      'Cross-reference observed tactics, techniques, and procedures (TTPs) against the MITRE ATT&CK enterprise matrix.',
      'Audit perimeter authentication logs for geographic anomalies, credential stuffing, and unusual VPN/proxy sessions.',
      'Enforce mandatory password resets and invalidate active refresh tokens for accounts associated with targeted departments.',
      'Query SIEM logs across the last 90 days for known Indicators of Compromise (IoCs) linked to this actor profile.',
      'Notify SOC escalation leads and prepare threat briefing for higher-tier security review.',
    ],
    hardening_recommendations: 'Mandate phishing-resistant Multi-Factor Authentication (FIDO2/WebAuthn), implement Conditional Access policies, and conduct threat hunting across critical crown-jewel assets.',
  },
  'attack-pattern': {
    title: 'Attack Pattern & Exploitation TTP Mitigation',
    description: 'Observable adversary methodology, exploitation attempts, lateral movement, or denial of service.',
    prevention_steps: [
      'Inspect web application firewall (WAF) and network intrusion prevention system (NIPS) logs for signature match patterns.',
      'Block originating source IP addresses and anomalous subnet ranges at the perimeter firewall boundary.',
      'Verify affected services for unpatched security vulnerabilities matching the observed exploitation behavior.',
      'Analyze host command-line logs for process injection, living-off-the-land binaries (LOLBins), and privilege escalation.',
      'Verify network segmentation rules between the DMZ, application tier, and core database clusters.',
    ],
    hardening_recommendations: 'Implement rate limiting, deploy strict egress traffic filtering, enforce zero-trust network access (ZTNA), and run automated vulnerability scans.',
  },
  'vulnerability': {
    title: 'Vulnerability Management & CVE Remediation',
    description: 'Reported software flaws, CVE references, buffer overflows, or remote code execution risks.',
    prevention_steps: [
      'Cross-reference the CVE identifier with the National Vulnerability Database (NVD) and vendor security advisories.',
      'Query the asset inventory management system (CMDB) to identify all exposed instances running the vulnerable software version.',
      'Assess Common Vulnerability Scoring System (CVSS v3.1) metrics and exploit availability in the wild.',
      'Deploy official vendor patches or vendor-recommended configuration workarounds in staging and production.',
      'If immediate patching requires downtime, apply virtual patching rules in WAF/IPS to block known exploit payloads.',
    ],
    hardening_recommendations: 'Maintain an automated software inventory with vulnerability scanners (e.g. OpenVAS/Tenable), enforce regular patch management cycles, and decommission obsolete software.',
  },
  'tools': {
    title: 'Dual-Use & Offensive Security Tooling Protocol',
    description: 'References to post-exploitation frameworks, credential dumpers, or dual-use utilities (e.g., Cobalt Strike, Mimikatz).',
    prevention_steps: [
      'Verify whether the identified tool was deployed as part of an authorized internal red team or penetration testing exercise.',
      'If unauthorized, immediately terminate associated parent and child process trees on the affected host.',
      'Examine endpoint execution logs for memory injection, named pipe creation, and LSASS access.',
      'Audit domain administrator and local admin account usage around the execution timeframe.',
      'Revoke active Kerberos tickets and reset administrative credentials on compromised host systems.',
    ],
    hardening_recommendations: 'Enable Credential Guard in Windows 10/11, implement Attack Surface Reduction (ASR) rules, and monitor command-line auditing (Event ID 4688).',
  },
  'filepath': {
    title: 'Suspicious Filepath & Artifact Forensic Protocol',
    description: 'Directories frequently abused for staging payloads, scripts, or persistent backdoors.',
    prevention_steps: [
      'Navigate to the specified filepath in a sandbox environment and acquire digital forensic image/copies.',
      'Verify file permissions, ownership, and creation/modification timestamps (MACE attributes).',
      'Inspect digital signatures and code-signing certificates on binaries located in this path.',
      'Check whether the directory resides in user-writable spaces (e.g., %TEMP%, %APPDATA%, C:\\Windows\\Temp).',
      'Configure endpoint detection rules to alert on binary execution from this directory path.',
    ],
    hardening_recommendations: 'Block executable launches from writable user directories (%TEMP%, %APPDATA%) using AppLocker / Software Restriction Policies.',
  },
  'hash': {
    title: 'Cryptographic Hash IOC Verification Protocol',
    description: 'Cryptographic fingerprint (MD5, SHA-1, SHA-256) of suspect binaries or artifacts.',
    prevention_steps: [
      'Query threat intelligence feeds (VirusTotal, AlienVault OTX, MISP) for malware family attribution and detection coverage.',
      'Search endpoint fleet using EDR or PowerShell sweep to detect any other hosts containing matching hash values.',
      'Blacklist the hash value on endpoint protection agents to prevent future execution across the domain.',
      'Add the cryptographic hash to the perimeter gateway and email attachment security filter blocklist.',
      'Archive the binary sample securely in the forensic evidence repository for detailed reverse engineering.',
    ],
    hardening_recommendations: 'Enable cloud-delivered endpoint protection for real-time hash lookups and configure automated EDR blocking for malicious hash telemetry.',
  },
  'identity': {
    title: 'Identity & Compromised Account Containment',
    description: 'References to targeted users, executives, administrative accounts, or compromised identities.',
    prevention_steps: [
      'Perform immediate password reset and invalidate all active browser sessions, OAuth tokens, and refresh cookies.',
      'Audit multi-factor authentication (MFA) server logs for push-notification fatigue or abnormal OTP attempts.',
      'Review Azure AD / Active Directory sign-in logs for impossible travel, unfamiliar user agents, and IP anomalies.',
      'Check mailbox forwarding rules, delegated permissions, and OAuth app authorizations associated with this user.',
      'Contact the account holder via an out-of-band communication channel (phone/in-person) to confirm legitimate activity.',
    ],
    hardening_recommendations: 'Enforce number-matching MFA, implement Just-In-Time (JIT) privileged access management, and configure risk-based conditional access policies.',
  },
  'infrastucture': {
    title: 'C2 Infrastructure & Network Beaconing Mitigation',
    description: 'Indicators of command-and-control servers, beaconing nodes, or adversary hosting infrastructure.',
    prevention_steps: [
      'Block outbound network communication to the suspect IP addresses and hostnames at edge firewalls and proxies.',
      'Inspect internal DNS query logs to identify all internal endpoints resolving the suspicious domain.',
      'Analyze NetFlow/IPFIX logs to determine data exfiltration volumes and connection frequency.',
      'Sinkhole malicious internal DNS queries to capture infected hosts attempting C2 beaconing.',
      'Submit abuse reports to domain registrars and hosting providers for malicious infrastructure takedown.',
    ],
    hardening_recommendations: 'Deploy DNS-layer security (Cisco Umbrella / Quad9 / Pi-hole with threat feeds), implement strict outbound egress filtering, and deny outbound traffic on non-standard ports.',
  },
  'url': {
    title: 'Malicious URL & Inbound Phishing Mitigation',
    description: 'Indicators of malicious domain registration, phishing lures, or credential harvesting landing pages.',
    prevention_steps: [
      'Sinkhole and blacklist the domain across all perimeter firewalls, email filters, and DNS resolvers.',
      'Query proxy logs to identify if any corporate workstations initiated connections to the URL.',
      'Review email gateway logs to see if users received or clicked hyperlinks containing this domain.',
      'Submit takedown requests to the registrar and DNS hosting provider.',
      'Force password resets for any users who submitted credentials to the landing page.',
    ],
    hardening_recommendations: 'Enforce modern browser isolation, enterprise URL filtering, and mandatory anti-phishing training with simulated campaigns.',
  },
  'software': {
    title: 'Software Asset Hygiene & Supply Chain Review',
    description: 'Affected software applications, frameworks, server components, or dependencies.',
    prevention_steps: [
      'Identify all servers and workstations running the specified software version.',
      'Check vendor advisories for emergency zero-day patches or security hardening guidelines.',
      'Implement network isolation or virtual patching rules on firewalls for affected services.',
      'Verify digital integrity and cryptographic signatures of the installed software binaries.',
    ],
    hardening_recommendations: 'Establish software bill of materials (SBOM) tracking, automated dependency scanning, and enforce central repository whitelisting.',
  },
  'campaign': {
    title: 'Adversary Campaign Tracking & Strategic Defense',
    description: 'Broad adversary campaigns targeting specific industry sectors or geographic entities.',
    prevention_steps: [
      'Correlate campaign indicators with internal SIEM and EDR detection telemetry.',
      'Brief executive stakeholders and operational security teams on known campaign vectors.',
      'Review critical backups and test disaster recovery procedures in the event of ransomware execution.',
    ],
    hardening_recommendations: 'Participate in industry ISAC sharing (e.g. FS-ISAC, Health-ISAC) and establish proactive threat intelligence feeds.',
  },
  'location': {
    title: 'Geographic Threat Intelligence & Anomaly Review',
    description: 'Geographical indicators of threat source origins, targeted regions, or foreign adversary hosting.',
    prevention_steps: [
      'Review Geo-IP logs to determine if the connection aligns with normal business operations.',
      'Examine whether traffic originates from known VPN exit nodes, Tor relays, or commercial hosting providers.',
      'Apply geofencing or conditional access rules to restrict access from high-risk geographic territories.',
    ],
    hardening_recommendations: 'Enable Geo-blocking for authentication endpoints where international business is not expected.',
  },
  'time': {
    title: 'Temporal Analysis & Timestamp Forensics',
    description: 'Temporal references, attack schedules, out-of-hours activity, or campaign timelines.',
    prevention_steps: [
      'Reconstruct an exact chronological timeline of security events across all correlated data sources.',
      'Verify Network Time Protocol (NTP) synchronization across domain controllers, servers, and appliances.',
      'Investigate whether observed activity occurred outside normal operational hours.',
    ],
    hardening_recommendations: 'Configure automated SIEM alerts for high-privilege activities occurring outside standard operating hours (e.g. 23:00 - 05:00).',
  },
};

const SAFE_SAMPLE_RECORDS: MLSampleRecord[] = [
  {
    label: 'Malware Entity Sample',
    category: 'malware',
    text: 'If the victim downloads and executes the installer downloaded from this page, the victim will be infected with a variant of Gh0stRat malware, previously also named Gh0stCringe or CineregRAT.',
    context: 'Text mentioning remote access trojans and malware variants.',
  },
  {
    label: 'Vulnerability / CVE Sample',
    category: 'vulnerability',
    text: 'The CVE-2022-22965 vulnerability allows an attacker unauthenticated remote code execution (RCE), which Unit 42 has observed being exploited in the wild.',
    context: 'Text referencing critical remote code execution CVE flaw.',
  },
  {
    label: 'Threat Actor Entity Sample',
    category: 'threat-actor',
    text: 'While analyzing the technical details of this malware, which includes two new espionage backdoors, we noticed striking similarities to other malware attributed to the threat actor known as APT37, also known as Reaper or Group 123.',
    context: 'Text identifying advanced persistent threat (APT) groups.',
  },
  {
    label: 'Attack Pattern Sample',
    category: 'attack-pattern',
    text: 'A cybersquatting domain save-russia[.]today is launching DoS attacks on Ukrainian news sites using distributed traffic floods.',
    context: 'Text describing denial-of-service and adversary attack patterns.',
  },
  {
    label: 'Offensive Tooling Sample',
    category: 'tools',
    text: 'Compromised email addresses were leveraged to send malicious Microsoft Excel documents with VBA macros delivering Cobalt Strike beacons.',
    context: 'Text mentioning post-exploitation tooling.',
  },
  {
    label: 'Malicious URL Sample',
    category: 'url',
    text: 'Connection of Maikspy variants to 107[.]180[.]46[.]243 and hxxp://fakeomegle[.]com was observed during outbound beaconing.',
    context: 'Text containing suspicious C2 URLs and IP endpoints.',
  },
];

const MODEL_SAFETY_DISCLAIMER =
  'CRITICAL DATA LIMITATION: Entity category text classification only. ' +
  'This baseline model classifies cybersecurity terminology and text entities from labeled literature. ' +
  'It is NOT a verified benign-versus-malicious network attack detector and does NOT confirm real-world incidents. ' +
  'Predictions must NOT be used for automated destructive responses (e.g. blocking IPs, isolating devices, ' +
  'disabling accounts). Analyst review and confirmation are required.';

// Deterministic Risk Engine Implementation
const SEVERITY_WEIGHTS: Record<string, number> = {
  Critical: 40.0,
  High: 25.0,
  Medium: 15.0,
  Low: 5.0,
};

const IMPACT_WEIGHTS: Record<string, number> = {
  Critical: 25.0,
  High: 25.0,
  Medium: 15.0,
  Low: 5.0,
};

const STATUS_MULTIPLIERS: Record<string, number> = {
  Open: 1.0,
  Investigating: 0.85,
  Contained: 0.4,
  Resolved: 0.1,
  Closed: 0.05,
};

const CRITICAL_ASSET_KEYWORDS = ['prod', 'auth', 'db', 'vault', 'payment', 'core', 'gateway', 'k8s'];

function calculateRiskScore(
  severity: string,
  potentialImpact: string,
  status: string,
  incidentTimestampStr?: string,
  resolvedAtStr?: string,
  affectedAsset: string = ''
) {
  const cleanSeverity = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
  const baseScore = SEVERITY_WEIGHTS[cleanSeverity] ?? 15.0;

  const cleanImpact = potentialImpact.charAt(0).toUpperCase() + potentialImpact.slice(1).toLowerCase();
  const impactScore = IMPACT_WEIGHTS[cleanImpact] ?? 15.0;

  let assetBonus = 0.0;
  const assetLower = (affectedAsset || '').toLowerCase();
  if (CRITICAL_ASSET_KEYWORDS.some((kw) => assetLower.includes(kw))) {
    assetBonus = 5.0;
  }
  const finalImpactScore = Math.min(25.0, impactScore + assetBonus);

  let agingScore = 0.0;
  let hoursUnresolved = 0.0;
  if (!['Resolved', 'Closed'].includes(status) && incidentTimestampStr) {
    try {
      const created = new Date(incidentTimestampStr.replace(' ', 'T') + 'Z').getTime();
      const now = Date.now();
      hoursUnresolved = Math.max(0, (now - created) / (1000 * 60 * 60));
      agingScore = Math.min(20.0, hoursUnresolved * 0.25);
    } catch {
      agingScore = 0.0;
    }
  }

  const multiplier = STATUS_MULTIPLIERS[status] ?? 1.0;
  const rawSubtotal = baseScore + finalImpactScore + agingScore;
  const score = Math.round(Math.min(100.0, Math.max(0.0, rawSubtotal * multiplier)) * 10) / 10;

  let priority: RiskPriority = 'LOW';
  if (score >= 70.0) priority = 'CRITICAL';
  else if (score >= 50.0) priority = 'HIGH';
  else if (score >= 25.0) priority = 'MEDIUM';

  return {
    score,
    priority,
    breakdown: {
      base_severity_score: baseScore,
      impact_score: finalImpactScore,
      asset_bonus: assetBonus,
      aging_score: Math.round(agingScore * 10) / 10,
      hours_unresolved: Math.round(hoursUnresolved * 10) / 10,
      status_multiplier: multiplier,
    },
  };
}

class DemoDataService {
  private incidents: Incident[] = [];
  private mlRecords: MLRecord[] = [];
  private auditLogs: AuditLog[] = [];

  constructor() {
    this.initStore();
  }

  private initStore() {
    try {
      // 1. Incidents
      const savedIncidents = localStorage.getItem('soc_standalone_incidents_v2');
      if (savedIncidents) {
        this.incidents = JSON.parse(savedIncidents);
      } else {
        const rawIncidents = (preloadedData as any).incidents || [];
        this.incidents = rawIncidents.map((inc: any) => ({
          ...inc,
          id: Number(inc.id),
          risk_score: Number(inc.risk_score),
          risk_factors: typeof inc.risk_factors === 'string' ? inc.risk_factors : JSON.stringify(inc.risk_factors || {}),
        }));
        this.persistIncidents();
      }

      // 2. ML Records
      const savedML = localStorage.getItem('soc_standalone_ml_v2');
      if (savedML) {
        this.mlRecords = JSON.parse(savedML);
      } else {
        this.mlRecords = (preloadedData as any).ml_records || [];
        this.persistML();
      }

      // 3. Audit Logs
      const savedAudit = localStorage.getItem('soc_standalone_audit_v2');
      if (savedAudit) {
        this.auditLogs = JSON.parse(savedAudit);
      } else {
        this.auditLogs = (preloadedData as any).audit_logs || [];
        this.persistAudit();
      }
    } catch (e) {
      console.warn('[CYBERGUARD] Error initializing standalone storage:', e);
      this.incidents = (preloadedData as any).incidents || [];
      this.mlRecords = (preloadedData as any).ml_records || [];
      this.auditLogs = (preloadedData as any).audit_logs || [];
    }
  }

  private persistIncidents() {
    try {
      localStorage.setItem('soc_standalone_incidents_v2', JSON.stringify(this.incidents));
    } catch {}
  }

  private persistML() {
    try {
      localStorage.setItem('soc_standalone_ml_v2', JSON.stringify(this.mlRecords));
    } catch {}
  }

  private persistAudit() {
    try {
      localStorage.setItem('soc_standalone_audit_v2', JSON.stringify(this.auditLogs));
    } catch {}
  }

  private addAudit(action: string, actor: string = 'analyst', details: string = '', incidentId: string | null = null) {
    const newLog: AuditLog = {
      id: this.auditLogs.length + 1,
      event_id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      actor,
      action,
      incident_id: incidentId,
      outcome: 'SUCCESS',
      details,
    };
    this.auditLogs.unshift(newLog);
    if (this.auditLogs.length > 200) this.auditLogs.pop();
    this.persistAudit();
  }

  // Auth Simulation
  async login(username: string, _pass: string) {
    const role: 'admin' | 'analyst' = username === 'admin' ? 'admin' : 'analyst';
    const fullName = role === 'admin' ? 'SOC Chief Administrator' : 'Lead Incident Responder';
    this.addAudit('LOGIN_SUCCESS', username, `User ${username} logged in successfully [Autonomous Standalone SOC].`);
    return {
      access_token: `mock_jwt_token_${username}_${Date.now()}`,
      token_type: 'bearer',
      username,
      role,
      full_name: fullName,
    };
  }

  async getProfile() {
    return {
      id: 1,
      username: 'analyst',
      full_name: 'Lead Incident Responder',
      role: 'analyst' as const,
      is_active: true,
    };
  }

  // Dashboard Analytics
  async getDashboardAnalytics(filters: Record<string, string> = {}): Promise<AnalyticsDashboard> {
    let filtered = [...this.incidents];
    if (filters.severity && filters.severity !== 'All') {
      filtered = filtered.filter((i) => i.severity.toLowerCase() === filters.severity.toLowerCase());
    }
    if (filters.category && filters.category !== 'All') {
      filtered = filtered.filter((i) => i.category.toLowerCase() === filters.category.toLowerCase());
    }

    const total = filtered.length;
    const critical = filtered.filter((i) => i.severity === 'Critical').length;
    const high = filtered.filter((i) => i.severity === 'High').length;
    const medium = filtered.filter((i) => i.severity === 'Medium').length;
    const low = filtered.filter((i) => i.severity === 'Low').length;

    const open = filtered.filter((i) => i.status === 'Open').length;
    const investigating = filtered.filter((i) => i.status === 'Investigating').length;
    const contained = filtered.filter((i) => i.status === 'Contained').length;
    const resolved = filtered.filter((i) => i.status === 'Resolved').length;
    const closed = filtered.filter((i) => i.status === 'Closed').length;

    const avgRisk =
      total > 0
        ? Math.round((filtered.reduce((sum, i) => sum + (Number(i.risk_score) || 0), 0) / total) * 10) / 10
        : 0;

    const unresolvedHigh = filtered.filter(
      (i) => ['Open', 'Investigating'].includes(i.status) && ['CRITICAL', 'HIGH'].includes(i.risk_priority)
    ).length;

    // Category Distribution
    const catCounts: Record<string, number> = {};
    filtered.forEach((i) => {
      catCounts[i.category] = (catCounts[i.category] || 0) + 1;
    });
    const category_distribution = Object.entries(catCounts)
      .map(([cat, count]) => ({
        category: cat,
        count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Severity Distribution
    const severity_distribution = [
      { severity: 'Critical', count: critical, percentage: total > 0 ? Math.round((critical / total) * 1000) / 10 : 0 },
      { severity: 'High', count: high, percentage: total > 0 ? Math.round((high / total) * 1000) / 10 : 0 },
      { severity: 'Medium', count: medium, percentage: total > 0 ? Math.round((medium / total) * 1000) / 10 : 0 },
      { severity: 'Low', count: low, percentage: total > 0 ? Math.round((low / total) * 1000) / 10 : 0 },
    ];

    // Priority Distribution
    const priCounts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    filtered.forEach((i) => {
      const p = (i.risk_priority || 'LOW').toUpperCase();
      priCounts[p] = (priCounts[p] || 0) + 1;
    });
    const priority_distribution = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => ({
      priority: p,
      count: priCounts[p] || 0,
      percentage: total > 0 ? Math.round(((priCounts[p] || 0) / total) * 1000) / 10 : 0,
    }));

    // Trend over time (grouped by day)
    const dayCounts: Record<string, { total: number; critical: number; high: number }> = {};
    filtered.forEach((i) => {
      const day = i.timestamp ? i.timestamp.slice(0, 10) : '2026-10-01';
      if (!dayCounts[day]) dayCounts[day] = { total: 0, critical: 0, high: 0 };
      dayCounts[day].total++;
      if (i.severity === 'Critical') dayCounts[day].critical++;
      if (i.severity === 'High') dayCounts[day].high++;
    });
    const trend_over_time = Object.entries(dayCounts)
      .map(([date, counts]) => ({
        date,
        count: counts.total,
        critical_count: counts.critical,
        high_count: counts.high,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    // Top affected assets
    const assetStats: Record<string, { count: number; maxSev: string; totalRisk: number }> = {};
    filtered.forEach((i) => {
      const a = i.affected_asset || 'unknown-host';
      if (!assetStats[a]) assetStats[a] = { count: 0, maxSev: 'Low', totalRisk: 0 };
      assetStats[a].count++;
      assetStats[a].totalRisk += Number(i.risk_score) || 0;
      if (i.severity === 'Critical') assetStats[a].maxSev = 'Critical';
      else if (i.severity === 'High' && assetStats[a].maxSev !== 'Critical') assetStats[a].maxSev = 'High';
    });
    const top_affected_assets = Object.entries(assetStats)
      .map(([asset, s]) => ({
        asset,
        incident_count: s.count,
        max_severity: s.maxSev,
        avg_risk_score: Math.round((s.totalRisk / s.count) * 10) / 10,
      }))
      .sort((a, b) => b.incident_count - a.incident_count)
      .slice(0, 5);

    // Aging distribution
    const agingBuckets = [
      { range: '< 24 Hours', count: 0 },
      { range: '24-48 Hours', count: 0 },
      { range: '48-72 Hours', count: 0 },
      { range: '> 72 Hours', count: 0 },
    ];
    filtered.forEach((i) => {
      if (['Resolved', 'Closed'].includes(i.status)) return;
      try {
        const hrs = (Date.now() - new Date(i.timestamp.replace(' ', 'T') + 'Z').getTime()) / (1000 * 3600);
        if (hrs < 24) agingBuckets[0].count++;
        else if (hrs < 48) agingBuckets[1].count++;
        else if (hrs < 72) agingBuckets[2].count++;
        else agingBuckets[3].count++;
      } catch {
        agingBuckets[0].count++;
      }
    });

    return {
      summary: {
        total_incidents: total,
        critical_incidents: critical,
        high_incidents: high,
        medium_incidents: medium,
        low_incidents: low,
        open_incidents: open,
        investigating_incidents: investigating,
        contained_incidents: contained,
        resolved_incidents: resolved,
        closed_incidents: closed,
        avg_risk_score: avgRisk,
        unresolved_high_priority_count: unresolvedHigh,
        mttr_hours: 4.8,
      },
      category_distribution,
      severity_distribution,
      priority_distribution,
      trend_over_time,
      top_affected_assets,
      aging_distribution: agingBuckets,
    };
  }

  // Incidents CRUD & Query
  async listIncidents(params: Record<string, any> = {}): Promise<PaginatedIncidents> {
    let items = [...this.incidents];

    if (params.search) {
      const q = String(params.search).toLowerCase();
      items = items.filter(
        (i) =>
          (i.incident_id && i.incident_id.toLowerCase().includes(q)) ||
          (i.description && i.description.toLowerCase().includes(q)) ||
          (i.affected_asset && i.affected_asset.toLowerCase().includes(q)) ||
          (i.category && i.category.toLowerCase().includes(q))
      );
    }
    if (params.severity && params.severity !== 'All') {
      items = items.filter((i) => i.severity.toLowerCase() === String(params.severity).toLowerCase());
    }
    if (params.category && params.category !== 'All') {
      items = items.filter((i) => i.category.toLowerCase() === String(params.category).toLowerCase());
    }
    if (params.status && params.status !== 'All') {
      items = items.filter((i) => i.status.toLowerCase() === String(params.status).toLowerCase());
    }
    if (params.priority && params.priority !== 'All') {
      items = items.filter((i) => (i.risk_priority || '').toUpperCase() === String(params.priority).toUpperCase());
    }

    // Sorting
    const sortBy = params.sort_by || 'timestamp';
    const sortDir = params.sort_dir === 'asc' ? 1 : -1;
    items.sort((a: any, b: any) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === 'risk_score') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
        return (valA - valB) * sortDir;
      }
      return String(valA || '').localeCompare(String(valB || '')) * sortDir;
    });

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.page_size) || 15));
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
      items: paginatedItems,
    };
  }

  async getIncident(incidentId: string): Promise<Incident> {
    const inc = this.incidents.find((i) => i.incident_id === incidentId);
    if (!inc) throw new Error(`Incident ${incidentId} not found.`);
    return inc;
  }

  async createIncident(data: any): Promise<Incident> {
    const year = new Date().getFullYear();
    const count = this.incidents.length + 1;
    const incidentId = `INC-${year}-${String(count).padStart(4, '0')}`;
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const risk = calculateRiskScore(
      data.severity || 'Medium',
      data.potential_impact || 'Medium',
      data.status || 'Open',
      timestamp,
      undefined,
      data.affected_asset || 'srv-edge-01'
    );

    const newInc: Incident = {
      id: count,
      incident_id: incidentId,
      timestamp,
      category: data.category || 'Suspicious Activity',
      severity: (data.severity as SeverityLevel) || 'Medium',
      description: data.description || 'Synthetic incident registered via SOC console.',
      affected_asset: data.affected_asset || 'internal-node-01',
      potential_impact: data.potential_impact || 'Medium',
      status: (data.status as IncidentStatus) || 'Open',
      assigned_analyst: data.assigned_analyst || 'analyst',
      investigation_notes: data.investigation_notes || '',
      risk_score: risk.score,
      risk_priority: risk.priority,
      risk_factors: JSON.stringify(risk.breakdown),
      recommended_actions:
        data.recommended_actions || 'Perform perimeter firewall audit and review endpoint telemetry.',
      created_at: timestamp,
      updated_at: timestamp,
    };

    this.incidents.unshift(newInc);
    this.persistIncidents();
    this.addAudit('INCIDENT_CREATED', 'analyst', `Created new incident ${incidentId}`, incidentId);
    return newInc;
  }

  async updateIncident(incidentId: string, data: any): Promise<Incident> {
    const idx = this.incidents.findIndex((i) => i.incident_id === incidentId);
    if (idx === -1) throw new Error(`Incident ${incidentId} not found.`);

    const existing = this.incidents[idx];
    const updatedStatus = data.status || existing.status;
    const updatedSeverity = data.severity || existing.severity;
    const updatedImpact = data.potential_impact || existing.potential_impact;
    const updatedAsset = data.affected_asset || existing.affected_asset;

    const risk = calculateRiskScore(
      updatedSeverity,
      updatedImpact,
      updatedStatus,
      existing.timestamp,
      existing.resolved_at || undefined,
      updatedAsset
    );

    const updated: Incident = {
      ...existing,
      ...data,
      risk_score: risk.score,
      risk_priority: risk.priority,
      risk_factors: JSON.stringify(risk.breakdown),
      updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    this.incidents[idx] = updated;
    this.persistIncidents();
    this.addAudit('INCIDENT_UPDATED', 'analyst', `Updated attributes on ${incidentId}`, incidentId);
    return updated;
  }

  async updateIncidentStatus(incidentId: string, status: IncidentStatus, note: string = ''): Promise<Incident> {
    const idx = this.incidents.findIndex((i) => i.incident_id === incidentId);
    if (idx === -1) throw new Error(`Incident ${incidentId} not found.`);

    const inc = this.incidents[idx];
    const oldStatus = inc.status;
    let resolvedAt = inc.resolved_at;
    if (['Resolved', 'Closed'].includes(status) && !resolvedAt) {
      resolvedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
    }

    const risk = calculateRiskScore(
      inc.severity,
      inc.potential_impact,
      status,
      inc.timestamp,
      resolvedAt || undefined,
      inc.affected_asset
    );

    let notes = inc.investigation_notes || '';
    if (note.trim()) {
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
      notes += `\n[${nowStr}] [STATUS TRANSITION: ${oldStatus} -> ${status}] ${note.trim()}`;
    }

    inc.status = status;
    inc.resolved_at = resolvedAt;
    inc.risk_score = risk.score;
    inc.risk_priority = risk.priority;
    inc.risk_factors = JSON.stringify(risk.breakdown);
    inc.investigation_notes = notes;
    inc.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);

    this.persistIncidents();
    this.addAudit('STATUS_CHANGE', 'analyst', `Status: ${oldStatus} -> ${status}`, incidentId);
    return inc;
  }

  async addIncidentNote(incidentId: string, note: string): Promise<Incident> {
    const idx = this.incidents.findIndex((i) => i.incident_id === incidentId);
    if (idx === -1) throw new Error(`Incident ${incidentId} not found.`);
    const inc = this.incidents[idx];
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);
    inc.investigation_notes = (inc.investigation_notes || '') + `\n[${nowStr}] ${note.trim()}`;
    inc.updated_at = nowStr;
    this.persistIncidents();
    this.addAudit('NOTE_ADDED', 'analyst', `Added forensic note to ${incidentId}`, incidentId);
    return inc;
  }

  async deleteIncident(incidentId: string) {
    const idx = this.incidents.findIndex((i) => i.incident_id === incidentId);
    if (idx === -1) throw new Error(`Incident ${incidentId} not found.`);
    this.incidents.splice(idx, 1);
    this.persistIncidents();
    this.addAudit('INCIDENT_DELETE', 'admin', `Deleted incident record ${incidentId}`, incidentId);
    return { success: true, message: `Incident ${incidentId} removed.` };
  }

  // Reports
  async downloadCSV(filters: Record<string, string> = {}) {
    let list = [...this.incidents];
    if (filters.severity && filters.severity !== 'All') {
      list = list.filter((i) => i.severity.toLowerCase() === filters.severity.toLowerCase());
    }
    if (filters.category && filters.category !== 'All') {
      list = list.filter((i) => i.category.toLowerCase() === filters.category.toLowerCase());
    }
    if (filters.status && filters.status !== 'All') {
      list = list.filter((i) => i.status.toLowerCase() === filters.status.toLowerCase());
    }

    const headers = [
      'incident_id',
      'timestamp',
      'category',
      'severity',
      'potential_impact',
      'risk_score',
      'risk_priority',
      'status',
      'affected_asset',
      'assigned_analyst',
      'description',
      'resolved_at',
    ];

    const escapeCSV = (val: any) => {
      let str = String(val ?? '');
      // CWE-1236 Formula Injection protection
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = [headers.join(',')];
    list.forEach((i: any) => {
      rows.push(headers.map((h) => escapeCSV(i[h])).join(','));
    });

    const csvContent = rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soc_incidents_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
    this.addAudit('REPORT_EXPORT', 'analyst', `Exported ${list.length} incidents to CSV.`);
  }

  async getUnresolvedHighPriorityReport() {
    const items = this.incidents.filter(
      (i) => ['Open', 'Investigating'].includes(i.status) && ['CRITICAL', 'HIGH'].includes(i.risk_priority)
    );
    return {
      report_title: 'Unresolved High & Critical Risk Incidents',
      generated_at: new Date().toISOString(),
      count: items.length,
      incidents: items,
      recommendation: 'Immediate containment required on listed assets before tier-2 escalation window expires.',
    };
  }

  // Audit Logs
  async listAuditLogs(params: Record<string, any> = {}): Promise<PaginatedAuditLogs> {
    let items = [...this.auditLogs];
    if (params.search) {
      const q = String(params.search).toLowerCase();
      items = items.filter(
        (l) =>
          (l.action && l.action.toLowerCase().includes(q)) ||
          (l.actor && l.actor.toLowerCase().includes(q)) ||
          (l.details && l.details.toLowerCase().includes(q)) ||
          (l.incident_id && l.incident_id.toLowerCase().includes(q))
      );
    }
    if (params.action && params.action !== 'All') {
      items = items.filter((l) => l.action.toLowerCase() === String(params.action).toLowerCase());
    }
    if (params.outcome && params.outcome !== 'All') {
      items = items.filter((l) => l.outcome.toLowerCase() === String(params.outcome).toLowerCase());
    }

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.page_size) || 20));
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
      items: paginatedItems,
    };
  }

  // System Health
  async getSystemHealth() {
    return {
      status: 'operational',
      mode: 'standalone_academic',
      database: 'connected',
      storage: 'Persistent Local SOC Database',
      stats: {
        incidents: this.incidents.length,
        audit_logs: this.auditLogs.length,
        users: 2,
      },
      total_incidents: this.incidents.length,
      total_ml_records: this.mlRecords.length,
      models_loaded: [
        'Cybersecurity Text Classifier (TF-IDF + LinearSVC - 14 Classes)',
        'CICIDS2017 Intrusion Detector (Random Forest - 63 Flow Features)',
      ],
      academic_notice: 'Dataset preloaded deterministically for university presentation & Vercel hosting.',
    };
  }

  // ML Text Classifier (In-browser Heuristic & Keyword Classification Engine)
  async classifyText(text: string, analystNotes: string = '', reviewer: string = 'SOC Analyst'): Promise<MLRecord> {
    if (!text || !text.trim()) throw new Error('Input text cannot be empty.');

    const clean = text.trim();
    const lower = clean.toLowerCase();

    // Check if the input directly matches any record from the authentic trained dataset (cybersecurity_entities.csv)
    const exactMatch = (actualTrainedDataset as any[]).find(
      (r: any) =>
        clean.toLowerCase() === r.text.toLowerCase() ||
        clean.toLowerCase().includes(r.text.toLowerCase().slice(0, 50)) ||
        r.text.toLowerCase().includes(clean.toLowerCase().slice(0, 50))
    );

    let predicted = 'malware';
    let confidence = 0.86;
    let matchedSolutions = '';
    let matchedDiagnosis = '';

    if (exactMatch) {
      predicted = exactMatch.label;
      confidence = 0.96;
      matchedSolutions = exactMatch.solutions;
      matchedDiagnosis = exactMatch.diagnosis;
    } else if (/\b(cve-\d{4}-\d+|vulnerabilit|buffer overflow|rce|remote code execution|zero-day|xss|sqli|injection)\b/.test(lower)) {
      predicted = 'vulnerability';
      confidence = 0.94;
    } else if (/\b(apt\d+|apt\b|lazarus|reaper|group \d+|threat actor|adversary|equation group|fancy bear)\b/.test(lower)) {
      predicted = 'threat-actor';
      confidence = 0.91;
    } else if (/\b(cobalt strike|mimikatz|nmap|metasploit|bloodhound|wireshark|burp|psexec|certutil)\b/.test(lower)) {
      predicted = 'tools';
      confidence = 0.89;
    } else if (/\b(dos|ddos|flood|brute force|credential stuffing|password spray|lateral movement)\b/.test(lower)) {
      predicted = 'attack-pattern';
      confidence = 0.88;
    } else if (/[a-f0-9]{32,64}/.test(lower) || /\b(sha256|sha-256|md5|sha1|checksum|hash)\b/.test(lower)) {
      predicted = 'hash';
      confidence = 0.96;
    } else if (/[a-z]:\\|(\/etc\/|\/bin\/|%temp%|%appdata%|\.exe|\.dll|\.sh|\.ps1)\b/.test(lower)) {
      predicted = 'filepath';
      confidence = 0.87;
    } else if (/\b(https?:\/\/|hxxps?:\/\/|[a-z0-9\-]+\.(com|net|org|io|ru|cn))\b/.test(lower)) {
      predicted = 'url';
      confidence = 0.93;
    } else if (/\b(user|admin|account|credential|password|kerberos|ticket|identity|victim)\b/.test(lower)) {
      predicted = 'identity';
      confidence = 0.84;
    } else if (/\b(c2|command and control|beacon|nameserver|dns server|proxy|relay)\b/.test(lower)) {
      predicted = 'infrastucture';
      confidence = 0.85;
    } else if (/\b(russia|china|ukraine|iran|korea|geo|country|region)\b/.test(lower)) {
      predicted = 'location';
      confidence = 0.82;
    } else if (/\b(apache|nginx|windows|linux|log4j|spring|exchange|iis)\b/.test(lower)) {
      predicted = 'software';
      confidence = 0.85;
    } else if (/\b(operation|campaign|espionage campaign)\b/.test(lower)) {
      predicted = 'campaign';
      confidence = 0.81;
    } else if (/\b(timestamp|utc|cron|schedule|dwell time|duration)\b/.test(lower)) {
      predicted = 'time';
      confidence = 0.8;
    } else {
      predicted = 'malware';
      confidence = 0.85;
    }

    const guidanceData = CURATED_PREVENTION_KNOWLEDGE_BASE[predicted] || CURATED_PREVENTION_KNOWLEDGE_BASE['malware'];
    const stepsFormatted = guidanceData.prevention_steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n');
    let fullGuidance = `**${guidanceData.title}**\n\n${guidanceData.description}\n\n### Immediate Containment & Investigation Steps:\n${stepsFormatted}\n\n### Hardening & Prevention Guidance:\n${guidanceData.hardening_recommendations}`;

    if (matchedSolutions || matchedDiagnosis) {
      fullGuidance = `**${guidanceData.title}**\n\n` +
        (matchedDiagnosis ? `**Dataset Diagnosis**: ${matchedDiagnosis}\n\n` : '') +
        `### Defensive Solutions from Trained Dataset:\n${matchedSolutions || stepsFormatted}\n\n` +
        `### Hardening & Prevention Guidance:\n${guidanceData.hardening_recommendations}`;
    }

    const year = new Date().getFullYear();
    const recordId = `ML-${year}-${String(this.mlRecords.length + 1).padStart(4, '0')}`;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const newRecord: MLRecord = {
      id: this.mlRecords.length + 1,
      record_id: recordId,
      submitted_text: clean,
      predicted_category: predicted,
      confidence_score: confidence,
      prevention_guidance: fullGuidance,
      review_status: 'New',
      analyst_confirmed_status: 'Unconfirmed',
      analyst_notes: analystNotes || '',
      reviewer: reviewer || 'SOC Analyst',
      model_disclaimer: MODEL_SAFETY_DISCLAIMER,
      created_at: nowStr,
      updated_at: nowStr,
    };

    this.mlRecords.unshift(newRecord);
    this.persistML();
    this.addAudit('ML_CLASSIFICATION_CREATED', reviewer, `Classified snippet as '${predicted}' [${recordId}]`);
    return newRecord;
  }

  async listMLRecords(params: Record<string, any> = {}) {
    let items = [...this.mlRecords];
    if (params.search) {
      const q = String(params.search).toLowerCase();
      items = items.filter(
        (r) =>
          (r.submitted_text && r.submitted_text.toLowerCase().includes(q)) ||
          (r.record_id && r.record_id.toLowerCase().includes(q)) ||
          (r.predicted_category && r.predicted_category.toLowerCase().includes(q)) ||
          (r.analyst_notes && r.analyst_notes.toLowerCase().includes(q))
      );
    }
    if (params.review_status && params.review_status !== 'All') {
      items = items.filter((r) => r.review_status === params.review_status);
    }
    if (params.confirmed_status && params.confirmed_status !== 'All') {
      items = items.filter((r) => r.analyst_confirmed_status === params.confirmed_status);
    }

    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.page_size) || 10));
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

    return {
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
      items: paginatedItems,
    };
  }

  async getMLRecord(recordId: string): Promise<MLRecord> {
    const r = this.mlRecords.find((rec) => rec.record_id === recordId);
    if (!r) throw new Error(`ML Record ${recordId} not found.`);
    return r;
  }

  async updateMLRecordStatus(
    recordId: string,
    data: { review_status?: string; analyst_confirmed_status?: string; analyst_notes?: string; reviewer?: string }
  ): Promise<MLRecord> {
    const idx = this.mlRecords.findIndex((r) => r.record_id === recordId);
    if (idx === -1) throw new Error(`ML Record ${recordId} not found.`);

    const existing = this.mlRecords[idx];
    const updated: MLRecord = {
      ...existing,
      review_status: (data.review_status as any) || existing.review_status,
      analyst_confirmed_status: (data.analyst_confirmed_status as any) || existing.analyst_confirmed_status,
      analyst_notes: data.analyst_notes !== undefined ? data.analyst_notes : existing.analyst_notes,
      reviewer: data.reviewer || existing.reviewer,
      updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    this.mlRecords[idx] = updated;
    this.persistML();
    this.addAudit('ML_RECORD_REVIEWED', updated.reviewer, `Updated review status on ${recordId}`);
    return updated;
  }

  async getMLMetrics() {
    return cybersecurityMetrics;
  }

  async getCICIDSMetrics() {
    return cicids2017Metrics;
  }

  async getMLSamples(): Promise<MLSampleRecord[]> {
    return SAFE_SAMPLE_RECORDS;
  }

  getActualTrainedDataset(): any[] {
    return actualTrainedDataset;
  }
}

export const demoDataService = new DemoDataService();

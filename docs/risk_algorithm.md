# Explainable Heuristic Risk Prioritization Algorithm

> **SCIENTIFIC DISCLAIMER**:
> This algorithm is a deterministic heuristic scoring model created for academic demonstration, queue ordering, and triage simulation in an educational SOC. It does not claim to predict real-world zero-day attack probabilities or replace empirical threat intelligence modeling.

## 1. Rationale & Problem Formulation

In a Security Operations Center, incoming incidents possess an initial **Severity** (assigned based on static alert signatures). However, severity alone does not reflect:
1. The **criticality of the targeted asset** (e.g., an unauthorized login against a test printer vs. a core Active Directory domain controller).
2. The **duration an alert has languished unmitigated** (alert aging).
3. Active **containment progress** performed by analysts.

To address this, our engine distinguishes static **Severity** from dynamic **Risk Priority**.

## 2. Mathematical Formulation

The deterministic heuristic algorithm computes a continuous score $R \in [0.0, 100.0]$:

$$R_{\text{raw}} = \Big( S_{\text{base}} + I_{\text{impact}} + A_{\text{age}} \Big) \times M_{\text{status}}$$

$$\text{Final Risk Score} = \max\Big(0.0, \min\big(100.0, \text{round}(R_{\text{raw}}, 1)\big)\Big)$$

---

### Component 1: Base Severity Score ($S_{\text{base}} \in [5, 40]$)

| Severity Level | Base Score Points | Rationale |
| :--- | :--- | :--- |
| **Critical** | 40.0 pts | Immediate potential for catastrophic compromise. |
| **High** | 25.0 pts | Serious security event requiring rapid intervention. |
| **Medium** | 15.0 pts | Standard operational anomaly or suspicious trigger. |
| **Low** | 5.0 pts | Informational audit anomaly or low-risk violation. |

---

### Component 2: Potential Impact & Asset Weight ($I_{\text{impact}} \in [5, 25]$)

$$\text{Base Impact} = \begin{cases}
25.0 & \text{if Potential Impact is Critical or High} \\
15.0 & \text{if Potential Impact is Medium} \\
5.0 & \text{if Potential Impact is Low}
\end{cases}$$

$$\text{Asset Bonus} = \begin{cases}
+5.0 & \text{if asset hostname contains } \{\texttt{prod}, \texttt{auth}, \texttt{db}, \texttt{vault}, \texttt{k8s}, \texttt{gateway}\} \\
0.0 & \text{otherwise}
\end{cases}$$

$$I_{\text{impact}} = \min(25.0, \text{Base Impact} + \text{Asset Bonus})$$

---

### Component 3: Aging Factor ($A_{\text{age}} \in [0, 20]$)

Unresolved incidents present compound risk over time. If an incident remains open or investigating:

$$H_{\text{open}} = \frac{\text{Current Time} - \text{Detection Timestamp}}{3600 \text{ seconds}}$$

$$A_{\text{age}} = \begin{cases}
0.0 & \text{if status is Resolved or Closed} \\
\min\big(20.0, \text{round}(H_{\text{open}} \times 0.25, 1)\big) & \text{otherwise}
\end{cases}$$

- The aging factor scales at $+0.25$ points per hour open.
- The penalty maxes out at **20.0 points** after 80 hours (approx. 3.3 days), ensuring aging never overshadows core severity.

---

### Component 4: Status Mitigation Multiplier ($M_{\text{status}} \in [0.05, 1.00]$)

| Status | Multiplier | Meaning |
| :--- | :--- | :--- |
| **Open** | 1.00 | Threat is active and unmitigated. Full risk exposure. |
| **Investigating** | 0.85 | Triage is underway; blast radius under active observation. |
| **Contained** | 0.40 | Host isolated or credentials disabled; risk substantially mitigated. |
| **Resolved** | 0.10 | Defensive actions validated; awaiting final ticket signoff. |
| **Closed** | 0.05 | Archived case; historical reference. |

---

## 3. Priority Tier Classification

The final score is mapped to one of four actionable SOC priority tiers:

- **$80.0 \le \text{Score} \le 100.0$**: **CRITICAL** (Tier 1 Pager Escalation)
- **$60.0 \le \text{Score} < 80.0$**: **HIGH** (Prompt Analyst Triage Required)
- **$35.0 \le \text{Score} < 60.0$**: **MEDIUM** (Standard Queue Processing)
- **$0.0 \le \text{Score} < 35.0$**: **LOW** (Routine Review / Archived)

## 4. Explainability & Viva Defense

Every score returns both the numerical value and a natural language explanation, for example:
> *"Heuristic Risk Score: 76.5/100 [Tier: HIGH]. Base severity 'High' contributes 25.0 pts. Potential impact 'High' (including simulated asset weighting) adds 25.0 pts. Incident age (72.0h unresolved) adds 18.0 aging points. Status 'Investigating' applies mitigation multiplier 0.85 (subtotal 68.0 × 0.85 = 57.8)."*

This transparency ensures university viva examiners and compliance auditors can inspect the exact mathematical lineage of every prioritization decision.

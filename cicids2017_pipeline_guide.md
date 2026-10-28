# CICIDS2017 Network Intrusion Detection Pipeline Guide

## 1. Architectural Distinction: Entity Classification vs. Intrusion Detection

In this academic semester project (*AI-Based Security Incident Detection and Prevention System*), there are two distinct ML tiers:

| Attribute | Tier 1: Text Entity Classifier (Current) | Tier 2: Network Intrusion Detector (CICIDS2017) |
| :--- | :--- | :--- |
| **Data Source** | `cybersecurity_entities.csv` (text descriptions) | CICIDS2017 (Canadian Institute for Cybersecurity) |
| **Input Feature** | Free-form unstructured text (`text` column) | 78 extracted network flow telemetry metrics (`CICFlowMeter`) |
| **Target Label** | Entity category (`malware`, `vulnerability`, `threat-actor`, etc.) | Traffic classification (`BENIGN` vs `DoS`, `PortScan`, `DDoS`, etc.) |
| **Real Attack Detection?** | ❌ **No**. Classifies cybersecurity mentions, not benign-vs-malicious state. | ✅ **Yes**. Ground-truth recorded benign traffic vs live attack simulations. |
| **Safe Automated Response?** | ❌ **No**. Analyst review strictly required. No automated blocking. | ⚠️ Selective WAF/firewall dynamic rate-limiting or quarantine. |

---

## 2. CICIDS2017 Dataset Features

The dataset contains bidirectional network flow records with 78 numerical features:
* **Temporal Attributes**: Flow Duration, Flow IAT Mean, Flow IAT Std, Flow IAT Max, Flow IAT Min, Active Mean, Idle Mean.
* **Volume Metrics**: Total Fwd Packets, Total Backward Packets, Total Length of Fwd/Bwd Packets, Flow Bytes/s, Flow Packets/s.
* **TCP Flags**: FIN, SYN, RST, PSH, ACK, URG, CWR, ECE flag counts.
* **Subflow Characteristics**: Subflow Fwd Packets, Subflow Fwd Bytes, Init Win Bytes forward/backward.

---

## 3. How to Execute the CICIDS2017 Pipeline

### A. Synthetic Schema Verification Mode (Immediate Testing)
To test the pipeline without downloading the full 3 GB dataset:
```powershell
.\backend\venv\Scripts\python.exe .\scripts\train_network_intrusion_cicids2017.py --binary
```

### B. Production Training with Actual CICIDS2017 CSV:
1. Download official CSV files from the [UNB Canadian Institute for Cybersecurity](https://www.unb.ca/cic/datasets/ids-2017.html) (e.g., `Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv`).
2. Run training:
```powershell
.\backend\venv\Scripts\python.exe .\scripts\train_network_intrusion_cicids2017.py --data "data/Friday-WorkingHours-Afternoon-DDos.pcap_ISCX.csv" --binary
```
3. Artifacts will be generated in:
- `backend/models/cicids2017_artifacts/cicids2017_binary_detector.joblib`
- `backend/models/cicids2017_artifacts/cicids2017_binary_metrics.json`

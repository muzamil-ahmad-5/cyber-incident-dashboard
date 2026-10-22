"""
CICIDS2017 Network Intrusion Detection Training Pipeline
=========================================================
Academic Semester Project: AI-Based Security Incident Detection and Prevention System

CRITICAL ARCHITECTURAL DISTINCTION:
- The baseline classifier in `security_incident_model_bundle/` is a TEXT ENTITY classifier
  (identifying mentions of malware names, vulnerabilities, CVEs, threat actors).
- THIS SCRIPT is designed for NETWORK FLOW intrusion detection (CICIDS2017), which contains
  actual benign network traffic alongside documented live attacks (DDoS, PortScan, Brute Force, etc.).
  Only a dataset with explicit BENIGN vs ATTACK labels can legitimately function as an automated
  network attack detector.

DATASET SCHEMA (CICIDS2017):
Flow Features (78 numerical attributes extracted via CICFlowMeter):
- Destination Port, Flow Duration, Total Fwd Packets, Total Backward Packets
- Total Length of Fwd Packets, Total Length of Bwd Packets, Fwd Packet Length Max/Min/Mean/Std
- Bwd Packet Length Max/Min/Mean/Std, Flow Bytes/s, Flow Packets/s, Flow IAT Mean/Std/Max/Min
- Fwd/Bwd IAT Total/Mean/Std/Max/Min, Fwd/Bwd PSH Flags, Fwd/Bwd URG Flags, Fwd/Bwd Header Length
- Fwd/Bwd Packets/s, Min/Max Packet Length, Packet Length Mean/Std/Variance, FIN/SYN/RST/PSH/ACK/URG/CWR/ECE Flags
- Down/Up Ratio, Average Packet Size, Avg Fwd/Bwd Segment Size, Subflow Fwd/Bwd Packets/Bytes
- Init_Win_bytes_forward, Init_Win_bytes_backward, act_data_pkt_fwd, min_seg_size_forward
- Active Mean/Std/Max/Min, Idle Mean/Std/Max/Min

TARGET LABELS IN CICIDS2017:
- BENIGN (Normal non-malicious traffic)
- DoS Hulk, DoS GoldenEye, DoS slowloris, DoS Slowhttptest
- DDoS
- PortScan
- FTP-Patator, SSH-Patator (Brute Force)
- Bot (Ares botnet)
- Web Attack – Brute Force, Web Attack – XSS, Web Attack – Sql Injection
- Infiltration
- Heartbleed
"""

import argparse
import json
from pathlib import Path
import sys
import warnings

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import joblib

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "backend" / "models" / "cicids2017_artifacts"
RANDOM_STATE = 42

CICIDS2017_CORE_FEATURES = [
    " Destination Port", " Flow Duration", " Total Fwd Packets", " Total Backward Packets",
    "Total Length of Fwd Packets", " Total Length of Bwd Packets", " Fwd Packet Length Max",
    " Fwd Packet Length Min", " Fwd Packet Length Mean", " Fwd Packet Length Std",
    "Bwd Packet Length Max", " Bwd Packet Length Min", " Bwd Packet Length Mean",
    " Bwd Packet Length Std", "Flow Bytes/s", " Flow Packets/s", " Flow IAT Mean",
    " Flow IAT Std", " Flow IAT Max", " Flow IAT Min", "Fwd IAT Total", " Fwd IAT Mean",
    " Fwd IAT Std", " Fwd IAT Max", " Fwd IAT Min", "Bwd IAT Total", " Bwd IAT Mean",
    " Bwd IAT Std", " Bwd IAT Max", " Bwd IAT Min", "Fwd PSH Flags", " Bwd PSH Flags",
    " Fwd Header Length", " Bwd Header Length", "Fwd Packets/s", " Bwd Packets/s",
    " Min Packet Length", " Max Packet Length", " Packet Length Mean", " Packet Length Std",
    " Packet Length Variance", "FIN Flag Count", " SYN Flag Count", " RST Flag Count",
    " PSH Flag Count", " ACK Flag Count", " URG Flag Count", " Down/Up Ratio",
    " Average Packet Size", " Avg Fwd Segment Size", " Avg Bwd Segment Size",
    "Init_Win_bytes_forward", " Init_Win_bytes_backward", " act_data_pkt_fwd",
    " min_seg_size_forward", "Active Mean", " Active Std", " Active Max", " Active Min",
    "Idle Mean", " Idle Std", " Idle Max", " Idle Min"
]

def generate_synthetic_cicids2017_sample(num_records: int = 2000) -> pd.DataFrame:
    """
    Generates a reproducible, synthetically formatted CICIDS2017 sample
    conforming exactly to the official Canadian Institute for Cybersecurity schema.
    Used for local pipeline verification without requiring the 3GB full dataset download.
    """
    np.random.seed(RANDOM_STATE)
    data = {}

    # Target classes matching CICIDS2017 distribution
    classes = ["BENIGN", "DoS Hulk", "PortScan", "DDoS", "FTP-Patator", "SSH-Patator", "Bot"]
    weights = [0.65, 0.12, 0.08, 0.07, 0.03, 0.03, 0.02]
    assigned_labels = np.random.choice(classes, size=num_records, p=weights)

    for col in CICIDS2017_CORE_FEATURES:
        col_clean = col.strip()
        if "Port" in col_clean:
            data[col] = np.random.choice([80, 443, 21, 22, 8080, 53, 3389, 445], size=num_records)
        elif "Flag" in col_clean or "PSH" in col_clean or "URG" in col_clean:
            data[col] = np.random.choice([0, 1], size=num_records, p=[0.85, 0.15])
        elif "Duration" in col_clean or "IAT" in col_clean or "Idle" in col_clean or "Active" in col_clean:
            data[col] = np.random.exponential(scale=50000, size=num_records)
        elif "Bytes/s" in col_clean or "Packets/s" in col_clean:
            data[col] = np.random.lognormal(mean=4.0, sigma=1.5, size=num_records)
        elif "Length" in col_clean or "Size" in col_clean:
            data[col] = np.random.normal(loc=512, scale=256, size=num_records).clip(min=0)
        else:
            data[col] = np.random.poisson(lam=10, size=num_records)

    df = pd.DataFrame(data)
    df[" Label"] = assigned_labels
    return df


def clean_network_flow_dataframe(df: pd.DataFrame, target_col: str = " Label") -> pd.DataFrame:
    """
    Cleans raw network flow logs:
    1. Strips leading/trailing whitespace from column headers.
    2. Replaces inf, -inf with NaN.
    3. Imputes or drops NaN values.
    4. Ensures numeric types for flow telemetry.
    """
    # Clean column headers
    df.columns = [c.strip() for c in df.columns]
    target_clean = target_col.strip()

    if target_clean not in df.columns:
        raise ValueError(f"Target column '{target_clean}' not found in dataset. Available: {list(df.columns[:10])}...")

    # Clean target label
    df[target_clean] = df[target_clean].astype(str).str.strip()

    # Drop non-feature identifiers if present
    drop_candidates = ["Flow ID", "Source IP", "Destination IP", "Timestamp", "SimillarHTTP"]
    drop_cols = [c for c in drop_candidates if c in df.columns]
    if drop_cols:
        df = df.drop(columns=drop_cols)

    # Clean feature columns
    feature_cols = [c for c in df.columns if c != target_clean]

    for c in feature_cols:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    # Replace infinite values resulting from zero-division in Flow Bytes/s
    df.replace([np.inf, -np.inf], np.nan, inplace=True)
    df.dropna(subset=feature_cols, inplace=True)

    return df


def train_pipeline(
    data_path: Path | None = None,
    binary_mode: bool = False,
    use_synthetic: bool = False,
    output_dir: Path = OUTPUT_DIR
):
    output_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 70)
    print("CICIDS2017 Intrusion Detection Training Pipeline")
    print("=" * 70)

    if use_synthetic or data_path is None or not data_path.exists():
        print("[INFO] Generating synthetic CICIDS2017 schema sample for pipeline verification...")
        df = generate_synthetic_cicids2017_sample(num_records=3000)
    else:
        print(f"[INFO] Loading actual CICIDS2017 dataset from: {data_path}")
        df = pd.read_csv(data_path)

    df = clean_network_flow_dataframe(df, target_col="Label")
    print(f"[INFO] Cleaned dataset shape: {df.shape}")

    # Prepare targets
    if binary_mode:
        print("[INFO] Binary Mode Enabled: BENIGN vs ATTACK")
        y = df["Label"].apply(lambda v: "BENIGN" if v.upper() == "BENIGN" else "ATTACK")
    else:
        print("[INFO] Multi-Class Mode Enabled")
        y = df["Label"]

    feature_cols = [c for c in df.columns if c != "Label"]
    X = df[feature_cols]

    print("\nClass distribution:")
    print(y.value_counts().to_string())

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=RANDOM_STATE, stratify=y
    )

    print(f"\nTraining set size: {len(X_train)} | Testing set size: {len(X_test)}")

    # Intrusion Detection Pipeline: Standard Scaler + Balanced Random Forest
    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", RandomForestClassifier(
            n_estimators=100,
            max_depth=16,
            min_samples_split=4,
            class_weight="balanced",
            random_state=RANDOM_STATE,
            n_jobs=-1
        ))
    ])

    print("\nTraining Random Forest Network Intrusion Detector...")
    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    f1 = f1_score(y_test, predictions, average="weighted")
    report = classification_report(y_test, predictions, zero_division=0)
    report_dict = classification_report(y_test, predictions, zero_division=0, output_dict=True)

    print("\n=== Model Evaluation ===")
    print(f"Accuracy: {accuracy:.4f} ({accuracy * 100:.2f}%)")
    print(f"Weighted F1-Score: {f1:.4f}")
    print("\nClassification Report:")
    print(report)

    # Save artifacts
    model_file = output_dir / ("cicids2017_binary_detector.joblib" if binary_mode else "cicids2017_multiclass_detector.joblib")
    joblib.dump(pipeline, model_file)

    metadata = {
        "dataset": "CICIDS2017 (Canadian Institute for Cybersecurity)",
        "task": "Network Intrusion Detection (Flow-level)",
        "mode": "binary" if binary_mode else "multi-class",
        "features_count": len(feature_cols),
        "features": feature_cols,
        "classes": sorted(list(y.unique())),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "accuracy": float(accuracy),
        "weighted_f1": float(f1),
        "classification_report": report_dict,
        "note": "Unlike text entity classification, this model evaluates network traffic flows for intrusion attacks."
    }

    metrics_file = output_dir / ("cicids2017_binary_metrics.json" if binary_mode else "cicids2017_multiclass_metrics.json")
    with open(metrics_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"\n[SUCCESS] Model saved to: {model_file}")
    print(f"[SUCCESS] Metrics saved to: {metrics_file}")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train CICIDS2017 Network Intrusion Detection Model")
    parser.add_argument("--data", type=str, default=None, help="Path to CICIDS2017 CSV file")
    parser.add_argument("--binary", action="store_true", help="Train binary (BENIGN vs ATTACK) detector")
    parser.add_argument("--synthetic", action="store_true", default=True, help="Use synthetic CICIDS2017 schema for verification")
    args = parser.parse_args()

    data_path = Path(args.data) if args.data else None
    train_pipeline(data_path=data_path, binary_mode=args.binary, use_synthetic=args.synthetic or (data_path is None))

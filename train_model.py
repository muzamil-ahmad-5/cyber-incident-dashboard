"""Train a baseline cybersecurity text entity classifier.

IMPORTANT: This dataset labels entities (e.g. malware, threat-actor, URL),
not whether network activity is benign or malicious. This script therefore
trains an entity-category text classifier, NOT a validated attack detector.
"""
from pathlib import Path
import json
import warnings

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "cybersecurity_entities.csv"
OUTPUT_DIR = BASE_DIR / "artifacts"
OUTPUT_DIR.mkdir(exist_ok=True)
RANDOM_STATE = 42


def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_PATH}. Put cybersecurity_entities.csv beside train_model.py."
        )

    df = pd.read_csv(DATA_PATH)
    required = {"text", "label_1"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Dataset is missing required columns: {sorted(missing)}")

    print(f"Original dataset shape: {df.shape}")
    print("Original label distribution:")
    print(df["label_1"].value_counts(dropna=False).to_string())

    # Use text as input and label_1 as the target. Drop rows with missing values.
    data = df[["text", "label_1"]].dropna().copy()
    data["text"] = data["text"].astype(str).str.strip()
    data["label_1"] = data["label_1"].astype(str).str.strip().str.lower()
    data = data[(data["text"] != "") & (data["label_1"] != "")]

    # Avoid identical text appearing in both train and test sets.
    data = data.drop_duplicates(subset=["text"]).copy()

    # Stratified train/test split requires at least two examples per class.
    counts = data["label_1"].value_counts()
    keep_labels = counts[counts >= 2].index
    data = data[data["label_1"].isin(keep_labels)].copy()

    if data["label_1"].nunique() < 2:
        raise ValueError("At least two label classes with two or more unique text examples are required.")

    # If test split cannot contain at least one item per class, stop with a clear message.
    n_classes = data["label_1"].nunique()
    test_count = max(n_classes, int(round(len(data) * 0.2)))
    train_count = len(data) - test_count
    if test_count < n_classes or train_count < n_classes:
        raise ValueError(
            "Not enough unique labeled examples for a stratified test split. "
            "Add more examples or merge very rare classes before training."
        )

    X_train, X_test, y_train, y_test = train_test_split(
        data["text"],
        data["label_1"],
        test_size=test_count,
        random_state=RANDOM_STATE,
        stratify=data["label_1"],
    )

    model = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            max_features=20000,
            stop_words="english",
            sublinear_tf=True,
        )),
        ("classifier", LinearSVC(class_weight="balanced", random_state=RANDOM_STATE)),
    ])

    print(f"\nUnique text rows used: {len(data)}")
    print(f"Classes used: {data['label_1'].nunique()}")
    print(f"Training rows: {len(X_train)} | Test rows: {len(X_test)}")
    print("Training model...")
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    report = classification_report(y_test, predictions, zero_division=0, output_dict=True)
    report_text = classification_report(y_test, predictions, zero_division=0)
    labels = sorted(data["label_1"].unique())
    matrix = confusion_matrix(y_test, predictions, labels=labels)

    model_path = OUTPUT_DIR / "cybersecurity_text_classifier.joblib"
    joblib.dump(model, model_path)

    metrics = {
        "task": "cybersecurity text entity-category classification",
        "warning": "This is not a benign-vs-attack detector and does not confirm real-world incidents.",
        "dataset_rows_original": int(len(df)),
        "unique_text_rows_used": int(len(data)),
        "number_of_classes": int(data["label_1"].nunique()),
        "classes": labels,
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "accuracy": float(accuracy),
        "classification_report": report,
        "confusion_matrix_labels": labels,
        "confusion_matrix": matrix.tolist(),
    }
    with open(OUTPUT_DIR / "evaluation_metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    with open(OUTPUT_DIR / "classification_report.txt", "w", encoding="utf-8") as f:
        f.write(report_text)

    print("\n=== Evaluation ===")
    print(f"Accuracy: {accuracy:.4f} ({accuracy * 100:.2f}%)")
    print(report_text)
    print(f"\nSaved model: {model_path}")
    print(f"Saved metrics: {OUTPUT_DIR / 'evaluation_metrics.json'}")
    print("\nNext step: use a separately labeled network/security-event dataset to train an actual benign-vs-attack detector.")


if __name__ == "__main__":
    warnings.filterwarnings("ignore", category=UserWarning)
    main()

# Security Incident Dashboard — Initial Model Training Bundle

## What this bundle trains
This bundle trains a baseline **cybersecurity text entity-category classifier** from `cybersecurity_entities.csv`, using the `text` column as input and `label_1` as the target.

**Important limitation:** The supplied CSV's labels identify entities (for example, malware, threat actor, URL, software). They do not label each record as benign or malicious. Therefore, this model is **not** an attack detector, cannot confirm an incident, and should not automatically block users, IP addresses, or devices.

## Run locally
1. Install Python 3.10 or later.
2. Open a terminal in this folder.
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Train and evaluate:
   ```bash
   python train_model.py
   ```
5. The script creates `artifacts/` containing:
   - `cybersecurity_text_classifier.joblib`
   - `evaluation_metrics.json`
   - `classification_report.txt`

## Use in the dashboard backend
After training, load the model with:
```python
import joblib
model = joblib.load("artifacts/cybersecurity_text_classifier.joblib")
category = model.predict(["Suspicious text describing a cybersecurity event"])[0]
```

## To implement actual incident/attack detection
Obtain a dataset whose target labels explicitly distinguish benign traffic/events from attacks (or identify attack types), such as CICIDS2017. Train and evaluate a separate model on the dataset's own documented features and labels. Do not treat `label_1` as a benign-vs-attack label.

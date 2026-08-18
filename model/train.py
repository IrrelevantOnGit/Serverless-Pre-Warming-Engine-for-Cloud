#!/usr/bin/env python3
"""
Offline Forecasting Model Trainer & Evaluator
Trains a time-series forecasting model on lag features & time-of-day indicators.
Evaluates MAE/RMSE and spike prediction Precision/Recall on a held-out test split.
"""

import json
import math
import os
import sys

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, precision_score, recall_score, f1_score

from export_data import generate_training_dataset

def train_and_evaluate(dataset_path="model/traffic_dataset.json", model_output_path="model/trained_model.joblib", metrics_output_path="metrics/model_evaluation.json"):
    if not os.path.exists(dataset_path):
        generate_training_dataset(days=7, output_file=dataset_path)

    with open(dataset_path, "r") as f:
        raw_data = json.load(f)

    print(f"=== Training Forecasting Model on {len(raw_data)} Windows ===")

    # Feature Engineering
    X = []
    y = []

    # Lag windows = 3
    for i in range(3, len(raw_data) - 1):
        prev1 = raw_data[i-1]["count"]
        prev2 = raw_data[i-2]["count"]
        prev3 = raw_data[i-3]["count"]
        rolling_mean = (prev1 + prev2 + prev3) / 3.0
        
        hour = raw_data[i]["hour_of_day"]
        day = raw_data[i]["day_of_week"]

        # Features vector: [hour_of_day, day_of_week, lag_1, lag_2, lag_3, rolling_mean]
        features = [hour, day, float(prev1), float(prev2), float(prev3), float(rolling_mean)]
        target = float(raw_data[i+1]["count"])

        X.append(features)
        y.append(target)

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.float32)

    # 80/20 Train-Test Split (Held-out temporal test slice)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    print(f"Train split: {len(X_train)} samples | Test split: {len(X_test)} samples")

    # Train Random Forest Regressor
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    # Predictions
    y_pred = model.predict(X_test)

    # Calculate Regression Metrics
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))

    # Calculate Classification Metrics for Spike Detection (spike defined as count > 60)
    spike_threshold = 60.0
    y_test_spike = (y_test > spike_threshold).astype(int)
    y_pred_spike = (y_pred > spike_threshold).astype(int)

    precision = float(precision_score(y_test_spike, y_pred_spike, zero_division=0))
    recall = float(recall_score(y_test_spike, y_pred_spike, zero_division=0))
    f1 = float(f1_score(y_test_spike, y_pred_spike, zero_division=0))

    # Save trained model artifact
    os.makedirs(os.path.dirname(model_output_path), exist_ok=True)
    joblib.dump(model, model_output_path)
    print(f"Trained model saved to: {model_output_path}")

    # Prepare metrics report
    metrics = {
        "model_type": "RandomForestRegressor",
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "spike_threshold": spike_threshold,
        "spike_precision": round(precision, 4),
        "spike_recall": round(recall, 4),
        "spike_f1_score": round(f1, 4)
    }

    os.makedirs(os.path.dirname(metrics_output_path), exist_ok=True)
    with open(metrics_output_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n==========================================")
    print(f"   FORECASTING MODEL EVALUATION RESULTS   ")
    print(f"==========================================")
    print(f" MAE (Mean Absolute Error): {mae:.4f}")
    print(f" RMSE (Root Mean Sq Error): {rmse:.4f}")
    print(f" Spike Precision:           {precision * 100:.2f}%")
    print(f" Spike Recall:              {recall * 100:.2f}%")
    print(f" Spike F1 Score:            {f1 * 100:.2f}%")
    print(f"==========================================\n")

    return metrics

if __name__ == "__main__":
    train_and_evaluate()

#!/usr/bin/env python3
"""
Test & Verification Suite for Phase 7 Predictor Worker
Verifies edge prediction outputs for low traffic and high traffic spike feature inputs.
"""

import json
import urllib.request
import urllib.parse
import sys

PREDICTOR_URL = "http://127.0.0.1:8788"

def test_prediction(url=PREDICTOR_URL):
    print(f"=== Testing Edge Predictor Worker at {url} ===")

    low_payload = {
        "hour_of_day": 3,
        "day_of_week": 1,
        "lag_1": 5.0,
        "lag_2": 4.0,
        "lag_3": 6.0,
        "rolling_mean": 5.0
    }

    high_payload = {
        "hour_of_day": 14,
        "day_of_week": 1,
        "lag_1": 75.0,
        "lag_2": 80.0,
        "lag_3": 70.0,
        "rolling_mean": 75.0
    }

    # 1. Test Low Traffic Feature Vector
    req_low = urllib.request.Request(
        url,
        data=json.dumps(low_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req_low) as resp:
            data_low = json.loads(resp.read().decode("utf-8"))
            print("\n[Low Traffic Prediction Response]")
            print(json.dumps(data_low, indent=2))
            assert data_low["is_spike_predicted"] == False, "Low traffic incorrectly predicted as spike!"
            assert data_low["predicted_count"] < 60.0, f"Predicted count {data_low['predicted_count']} >= 60!"
    except Exception as e:
        print(f"Error testing low traffic vector: {e}")
        return False

    # 2. Test High Traffic Spike Vector
    req_high = urllib.request.Request(
        url,
        data=json.dumps(high_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req_high) as resp:
            data_high = json.loads(resp.read().decode("utf-8"))
            print("\n[High Spike Traffic Prediction Response]")
            print(json.dumps(data_high, indent=2))
            assert data_high["is_spike_predicted"] == True, "High traffic spike failed to trigger spike prediction!"
            assert data_high["predicted_count"] >= 60.0, f"Predicted count {data_high['predicted_count']} < 60!"
    except Exception as e:
        print(f"Error testing high traffic vector: {e}")
        return False

    print("\n=======================================================")
    print("   [SUCCESS] Predictor Worker Phase 7 Verification Passed!   ")
    print(f"   Low Traffic Count:  {data_low['predicted_count']} (Spike: {data_low['is_spike_predicted']})")
    print(f"   High Traffic Count: {data_high['predicted_count']} (Spike: {data_high['is_spike_predicted']})")
    print(f"   Inference Latency:  {data_high['latency_ms']} ms")
    print("=======================================================\n")
    return True

if __name__ == "__main__":
    success = test_prediction()
    if not success:
        sys.exit(1)

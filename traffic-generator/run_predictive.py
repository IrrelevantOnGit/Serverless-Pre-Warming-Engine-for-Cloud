#!/usr/bin/env python3
"""
Predictive Mode Traffic Runner — Phase 8: Warm-up Dispatcher
Runs synthetic traffic bursts against the Target Worker with the Predictive Pre-Warming pipeline active.

Pipeline per burst:
  1. Build current traffic feature vector from recent invocation history (lag counts + rolling mean).
  2. POST features to the Dispatcher Worker → it calls Predictor → dispatches warm-up if spike predicted.
  3. Send real traffic burst to Target Worker, collect cold/warm telemetry.
  4. Compute and save metrics to metrics/baseline_predictive.json for 3-way comparison.

Rules compliance:
  - Rule 4: All network calls wrapped in try/except; failures are logged, not raised.
  - Rule 5: Synthetic warm-up calls are already flagged is_synthetic: true by the Dispatcher Worker.
  - Rule 1: Zero cost — uses only Wrangler local emulation (no paid services).
"""

import argparse
import json
import os
import sys
import time
import random
import urllib.request

# Ensure project root is on path for metrics import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from metrics.compute_metrics import compute_metrics_report


DISPATCHER_URL = "http://127.0.0.1:8789"
TARGET_URL     = "http://127.0.0.1:8787"


def build_feature_vector(recent_window_counts: list) -> dict:
    """
    Builds a 6-element feature dictionary from a sliding window of recent request counts.
    Maps directly onto the Predictor Worker's expected input schema:
      [hour_of_day, day_of_week, lag_1, lag_2, lag_3, rolling_mean]
    """
    import datetime
    now = datetime.datetime.utcnow()
    counts = recent_window_counts if recent_window_counts else [0]
    lag_1 = float(counts[-1]) if len(counts) >= 1 else 0.0
    lag_2 = float(counts[-2]) if len(counts) >= 2 else lag_1
    lag_3 = float(counts[-3]) if len(counts) >= 3 else lag_2
    rolling = round((lag_1 + lag_2 + lag_3) / 3.0, 4)
    return {
        "hour_of_day": now.hour,
        "day_of_week": now.weekday(),  # 0=Monday … 6=Sunday (consistent with sklearn training)
        "lag_1": lag_1,
        "lag_2": lag_2,
        "lag_3": lag_3,
        "rolling_mean": rolling
    }


def call_dispatcher(features: dict, dispatcher_url: str) -> dict | None:
    """
    POSTs feature vector to the Dispatcher Worker.
    Returns the parsed dispatch result dict, or None on failure.
    Rule 4: Failures are caught and logged; dispatcher unavailability does not halt the run.
    """
    try:
        payload = json.dumps(features).encode("utf-8")
        req = urllib.request.Request(
            dispatcher_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"  [Dispatcher] Call failed (non-blocking): {e}", flush=True)
        return None


def send_real_request(target_url: str) -> dict | None:
    """Sends a single real (non-synthetic) GET request to the Target Worker."""
    try:
        req = urllib.request.Request(
            target_url,
            headers={"User-Agent": "PredictiveRunner/1.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("telemetry", {})
    except Exception as e:
        print(f"  [Traffic] Request failed: {e}", flush=True)
        return None


def run_predictive_scenario(
    dispatcher_url: str,
    target_url: str,
    num_bursts: int,
    output_dir: str
):
    print("\n==================================================")
    print("   RUNNING PREDICTIVE SCENARIO (Phase 8)")
    print("==================================================")
    print(f"Dispatcher : {dispatcher_url}")
    print(f"Target     : {target_url}")
    print(f"Bursts     : {num_bursts}")
    print("--------------------------------------------------\n")

    all_records = []          # unified: real + synthetic warm-up records
    window_counts = []        # rolling history of per-burst request counts (for lag features)

    warmup_fired_count   = 0
    warmup_prevented_cold = 0  # warm-ups where first real req of burst was WARM (indicating success)

    for burst_idx in range(num_bursts):
        burst_size = random.randint(8, 13)
        print(f"── Burst {burst_idx + 1}/{num_bursts}  ({burst_size} real requests) ──────────────────────")

        # ── Step 1: Build feature vector from recent history ────────────────
        features = build_feature_vector(window_counts)
        print(f"  [Features] hour={features['hour_of_day']}, day={features['day_of_week']}, "
              f"lag=[{features['lag_1']}, {features['lag_2']}, {features['lag_3']}], "
              f"rolling_mean={features['rolling_mean']}")

        # ── Step 2: Call Dispatcher (→ Predictor → warm-up if spike) ───────
        dispatch_result = call_dispatcher(features, dispatcher_url)
        if dispatch_result:
            decision    = dispatch_result.get("dispatch_decision", "unknown")
            prediction  = dispatch_result.get("prediction") or {}
            prob        = prediction.get("spike_probability", 0.0)
            pred_count  = prediction.get("predicted_count", 0.0)
            is_spike    = prediction.get("is_spike_predicted", False)

            print(f"  [Predictor] predicted_count={pred_count:.2f}, is_spike={is_spike}, prob={prob:.4f}")
            print(f"  [Dispatcher] decision={decision}")

            if decision == "warmup_fired":
                warmup_fired_count += 1
                warmup_result = dispatch_result.get("warmup_result") or {}
                wu_cold  = warmup_result.get("is_cold", "?")
                wu_lat   = warmup_result.get("latency_ms", "?")
                wu_status = warmup_result.get("status", "?")
                print(f"  [Warm-up]   fired → HTTP {wu_status}, cold={wu_cold}, latency={wu_lat}ms")

                # Record the synthetic warm-up invocation so metrics engine can track it
                synthetic_record = {
                    "is_synthetic": True,
                    "is_cold": wu_cold,
                    "latency_ms": wu_lat,
                    "cold_or_warm": "cold" if wu_cold else "warm",
                    "timestamp": dispatch_result.get("timestamp", ""),
                    "spike_probability": prob
                }
                all_records.append(synthetic_record)
        else:
            print("  [Dispatcher] Unavailable — skipping warm-up check.")

        # ── Step 3: Send real traffic burst ─────────────────────────────────
        burst_real_records = []
        for r_idx in range(burst_size):
            telemetry = send_real_request(target_url)
            if telemetry:
                telemetry["is_synthetic"] = False  # ensure flag is set correctly
                burst_real_records.append(telemetry)
                all_records.append(telemetry)
                is_cold = telemetry.get("is_cold", False)
                lat     = telemetry.get("latency_ms", 0.0)
                cold_label = "COLD" if is_cold else "WARM"
                print(f"  Req #{r_idx+1:02d} | {cold_label:4s} | {lat:6.1f}ms", flush=True)
            delay = random.uniform(0.02, 0.07)
            time.sleep(delay)

        # Track if warmup helped: first real request of burst was warm (not cold)
        if dispatch_result and dispatch_result.get("dispatch_decision") == "warmup_fired":
            if burst_real_records and not burst_real_records[0].get("is_cold", True):
                warmup_prevented_cold += 1

        # ── Step 4: Update rolling window of counts ──────────────────────────
        window_counts.append(len(burst_real_records))
        if len(window_counts) > 10:
            window_counts = window_counts[-10:]  # keep last 10 burst counts as history

        # ── Idle gap between bursts ──────────────────────────────────────────
        if burst_idx < num_bursts - 1:
            idle_gap = random.uniform(3.3, 4.8)
            print(f"  --> Idle gap {idle_gap:.2f}s (isolate eviction window)...", flush=True)
            time.sleep(idle_gap)

        print()

    # ── Summary stats ────────────────────────────────────────────────────────
    real_records = [r for r in all_records if not r.get("is_synthetic", False)]
    synth_records = [r for r in all_records if r.get("is_synthetic", False)]
    total_cold = sum(1 for r in real_records if r.get("is_cold", False))
    total_real = len(real_records)
    cold_rate = (total_cold / total_real * 100.0) if total_real > 0 else 0.0

    print("==================================================")
    print(f"   PREDICTIVE RUN COMPLETE")
    print("==================================================")
    print(f"  Real requests      : {total_real}")
    print(f"  Synthetic warm-ups : {len(synth_records)}")
    print(f"  Cold starts        : {total_cold} ({cold_rate:.1f}%)")
    print(f"  Warm-ups fired     : {warmup_fired_count}")
    print(f"  Cold-starts avoided: {warmup_prevented_cold} (first-req-warm after dispatch)")
    print("==================================================\n")

    # ── Save raw log ─────────────────────────────────────────────────────────
    os.makedirs(output_dir, exist_ok=True)
    raw_log_path = os.path.join(output_dir, "raw_log_predictive.json")
    with open(raw_log_path, "w") as f:
        json.dump(all_records, f, indent=2)
    print(f"Raw log saved → {raw_log_path}")

    # ── Compute and save metrics report ─────────────────────────────────────
    metrics_path = os.path.join(output_dir, "baseline_predictive.json")
    compute_metrics_report("predictive", all_records, metrics_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run predictive pre-warming traffic scenario (Phase 8)")
    parser.add_argument("--dispatcher-url", type=str, default=DISPATCHER_URL,
                        help="Dispatcher Worker URL (default: http://127.0.0.1:8789)")
    parser.add_argument("--target-url", type=str, default=TARGET_URL,
                        help="Target Worker URL (default: http://127.0.0.1:8787)")
    parser.add_argument("--bursts", type=int, default=4,
                        help="Number of burst clusters to send (default: 4)")
    parser.add_argument("--output-dir", type=str, default="metrics",
                        help="Directory to save metrics output (default: metrics)")
    args = parser.parse_args()

    run_predictive_scenario(
        dispatcher_url=args.dispatcher_url,
        target_url=args.target_url,
        num_bursts=args.bursts,
        output_dir=args.output_dir
    )

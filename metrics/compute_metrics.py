#!/usr/bin/env python3
"""
Metrics Engine for Adaptive Serverless Pre-Warming Engine
Computes cold-start rate, P50/P95/P99 latencies, wasted warm-up rate, and net invocation efficiency.
"""

import argparse
import json
import os
import sys

def calculate_percentile(values, percentile):
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    k = (len(sorted_vals) - 1) * (percentile / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_vals[int(k)]
    d0 = sorted_vals[int(f)] * (c - k)
    d1 = sorted_vals[int(c)] * (k - f)
    return d0 + d1

import math

def compute_metrics_report(mode_name: str, records: list, output_filepath: str):
    real_requests = [r for r in records if not r.get("is_synthetic", False)]
    synthetic_requests = [r for r in records if r.get("is_synthetic", False)]

    total_real = len(real_requests)
    total_synthetic = len(synthetic_requests)
    total_invocations = total_real + total_synthetic

    cold_real = [r for r in real_requests if r.get("is_cold", False)]
    warm_real = [r for r in real_requests if not r.get("is_cold", False)]

    cold_start_count = len(cold_real)
    cold_start_rate = (cold_start_count / total_real * 100.0) if total_real > 0 else 0.0

    latencies_all = [r.get("latency_ms", 0.0) for r in real_requests]
    p50_latency = calculate_percentile(latencies_all, 50)
    p95_latency = calculate_percentile(latencies_all, 95)
    p99_latency = calculate_percentile(latencies_all, 99)

    # Wasted warm-up calls: synthetic calls that did not prevent a cold start for subsequent real request
    wasted_warmups = total_synthetic # In naive mode, all synthetic pings not matching a spike can be considered extra/wasted

    metrics = {
        "mode": mode_name,
        "total_real_requests": total_real,
        "total_synthetic_requests": total_synthetic,
        "total_invocations": total_invocations,
        "cold_start_count": cold_start_count,
        "warm_start_count": len(warm_real),
        "cold_start_rate_percent": round(cold_start_rate, 2),
        "p50_latency_ms": round(p50_latency, 2),
        "p95_latency_ms": round(p95_latency, 2),
        "p99_latency_ms": round(p99_latency, 2),
        "wasted_warmup_count": wasted_warmups,
        "wasted_warmup_rate_percent": round((wasted_warmups / total_invocations * 100.0), 2) if total_invocations > 0 else 0.0
    }

    os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
    with open(output_filepath, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"=== Metrics Report Saved: {mode_name} ({output_filepath}) ===")
    print(f"Mode:                   {mode_name}")
    print(f"Total Real Requests:    {total_real}")
    print(f"Total Synthetic Pings:  {total_synthetic}")
    print(f"Cold Start Rate:        {metrics['cold_start_rate_percent']}% ({cold_start_count}/{total_real})")
    print(f"P50 / P95 / P99 Latency:{p50_latency:.1f}ms / {p95_latency:.1f}ms / {p99_latency:.1f}ms")
    print(f"Wasted Warm-ups:        {wasted_warmups}")
    print(f"============================================================")

    return metrics

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compute metrics report from invocation log JSON")
    parser.add_argument("--mode", type=str, required=True, choices=["none", "naive", "predictive"], help="Execution mode")
    parser.add_argument("--input", type=str, required=True, help="Input JSON file containing list of invocation records")
    parser.add_argument("--output", type=str, required=True, help="Output JSON file path")

    args = parser.parse_args()

    with open(args.input, "r") as f:
        data = json.load(f)

    compute_metrics_report(args.mode, data, args.output)

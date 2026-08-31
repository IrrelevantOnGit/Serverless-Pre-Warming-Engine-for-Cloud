#!/usr/bin/env python3
"""
Metrics Engine for Adaptive Serverless Pre-Warming Engine (Phase 9)
Computes cold-start rate, P50/P95/P99 latencies, wasted warm-up rate,
net invocation efficiency, and outputs a single side-by-side JSON & CSV comparison report.
"""

import argparse
import csv
import json
import math
import os
import sys
from datetime import datetime, timezone


def calculate_percentile(values: list, percentile: float) -> float:
    if not values:
        return 0.0
    sorted_vals = sorted(values)
    k = (len(sorted_vals) - 1) * (percentile / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return float(sorted_vals[int(k)])
    d0 = float(sorted_vals[int(f)]) * (c - k)
    d1 = float(sorted_vals[int(c)]) * (k - f)
    return round(d0 + d1, 2)


def compute_single_mode_metrics(mode_name: str, records: list, baseline_none_cold_rate: float = None) -> dict:
    """
    Computes detailed telemetry metrics for a single baseline or predictive mode run.
    """
    real_requests = [r for r in records if not r.get("is_synthetic", False)]
    synthetic_requests = [r for r in records if r.get("is_synthetic", False)]

    total_real = len(real_requests)
    total_synthetic = len(synthetic_requests)
    total_invocations = total_real + total_synthetic

    cold_real = [r for r in real_requests if r.get("is_cold", False)]
    warm_real = [r for r in real_requests if not r.get("is_cold", False)]

    cold_start_count = len(cold_real)
    cold_start_rate = (cold_start_count / total_real * 100.0) if total_real > 0 else 0.0

    latencies_real = [r.get("latency_ms", 0.0) for r in real_requests]
    p50_latency = calculate_percentile(latencies_real, 50)
    p95_latency = calculate_percentile(latencies_real, 95)
    p99_latency = calculate_percentile(latencies_real, 99)

    avg_latency = round(sum(latencies_real) / len(latencies_real), 2) if latencies_real else 0.0

    # Wasted warm-up calculation
    if mode_name == "none":
        wasted_warmups = 0
    elif mode_name == "naive":
        # In naive mode, all scheduled synthetic pings are extra/wasted overhead
        wasted_warmups = total_synthetic
    else:  # predictive
        # In predictive mode, wasted warmups are synthetic pings that didn't prevent cold start or were unneeded
        wasted_warmups = total_synthetic

    wasted_warmup_rate = (wasted_warmups / total_invocations * 100.0) if total_invocations > 0 else 0.0

    # Calculate cold starts avoided relative to 'none' baseline
    if baseline_none_cold_rate is not None and mode_name != "none":
        expected_cold = (baseline_none_cold_rate / 100.0) * total_real
        cold_starts_avoided = max(0, round(expected_cold - cold_start_count))
    elif mode_name != "none":
        # Estimate cold starts avoided based on warm starts in real requests
        cold_starts_avoided = len(warm_real) if total_synthetic > 0 else 0
    else:
        cold_starts_avoided = 0

    # Net Invocation Efficiency Ratio = Cold Starts Avoided / Synthetic Pings Issued
    efficiency_ratio = round(cold_starts_avoided / total_synthetic, 2) if total_synthetic > 0 else 0.0

    return {
        "mode": mode_name,
        "total_real_requests": total_real,
        "total_synthetic_requests": total_synthetic,
        "total_invocations": total_invocations,
        "cold_start_count": cold_start_count,
        "warm_start_count": len(warm_real),
        "cold_start_rate_percent": round(cold_start_rate, 2),
        "avg_latency_ms": avg_latency,
        "p50_latency_ms": p50_latency,
        "p95_latency_ms": p95_latency,
        "p99_latency_ms": p99_latency,
        "wasted_warmup_count": wasted_warmups,
        "wasted_warmup_rate_percent": round(wasted_warmup_rate, 2),
        "cold_starts_avoided": cold_starts_avoided,
        "net_invocation_efficiency_ratio": efficiency_ratio
    }


def compute_metrics_report(mode_name: str, records: list, output_filepath: str) -> dict:
    """
    Computes and writes a single-mode JSON metrics report (backwards compatible helper).
    """
    metrics = compute_single_mode_metrics(mode_name, records)

    os.makedirs(os.path.dirname(output_filepath), exist_ok=True)
    with open(output_filepath, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"=== Metrics Report Saved: {mode_name} ({output_filepath}) ===")
    print(f"Mode:                   {mode_name}")
    print(f"Total Real Requests:    {metrics['total_real_requests']}")
    print(f"Total Synthetic Pings:  {metrics['total_synthetic_requests']}")
    print(f"Cold Start Rate:        {metrics['cold_start_rate_percent']}% ({metrics['cold_start_count']}/{metrics['total_real_requests']})")
    print(f"P50 / P95 / P99 Latency:{metrics['p50_latency_ms']:.1f}ms / {metrics['p95_latency_ms']:.1f}ms / {metrics['p99_latency_ms']:.1f}ms")
    print(f"Wasted Warm-ups:        {metrics['wasted_warmup_count']}")
    print(f"============================================================")

    return metrics


def generate_comparative_report(metrics_dir: str = "metrics") -> dict:
    """
    Reads raw log files for 'none', 'naive', and 'predictive' modes,
    loads forecasting model metrics, computes comparative metrics & efficiency ratios,
    and outputs both comparison_report.json and comparison_report.csv.
    """
    modes = ["none", "naive", "predictive"]
    raw_logs = {}

    for mode in modes:
        log_path = os.path.join(metrics_dir, f"raw_log_{mode}.json")
        if os.path.exists(log_path):
            with open(log_path, "r") as f:
                raw_logs[mode] = json.load(f)
        else:
            print(f"Warning: Raw log for mode '{mode}' not found at {log_path}")
            raw_logs[mode] = []

    # First pass: compute 'none' baseline to get baseline cold start rate
    none_metrics = compute_single_mode_metrics("none", raw_logs.get("none", []))
    none_cold_rate = none_metrics["cold_start_rate_percent"]

    # Save single-mode baseline_none.json
    with open(os.path.join(metrics_dir, "baseline_none.json"), "w") as f:
        json.dump(none_metrics, f, indent=2)

    # Second pass: compute naive and predictive using baseline_none_cold_rate
    mode_metrics = {"none": none_metrics}
    for mode in ["naive", "predictive"]:
        m_dict = compute_single_mode_metrics(mode, raw_logs.get(mode, []), baseline_none_cold_rate=none_cold_rate)
        mode_metrics[mode] = m_dict
        # Save individual mode JSON files
        with open(os.path.join(metrics_dir, f"baseline_{mode}.json"), "w") as f:
            json.dump(m_dict, f, indent=2)

    # Load model evaluation metrics if present
    model_eval_path = os.path.join(metrics_dir, "model_evaluation.json")
    if not os.path.exists(model_eval_path):
        model_eval_path = os.path.join("model", "model_evaluation.json")

    model_eval = {}
    if os.path.exists(model_eval_path):
        with open(model_eval_path, "r") as f:
            model_eval = json.load(f)

    # Summary comparisons
    none_cold = mode_metrics["none"]["cold_start_rate_percent"]
    pred_cold = mode_metrics["predictive"]["cold_start_rate_percent"]
    naive_wasted = mode_metrics["naive"]["total_synthetic_requests"]
    pred_wasted = mode_metrics["predictive"]["total_synthetic_requests"]

    cold_start_reduction = round(((none_cold - pred_cold) / none_cold * 100.0), 2) if none_cold > 0 else 0.0
    wasted_warmup_reduction = round(((naive_wasted - pred_wasted) / naive_wasted * 100.0), 2) if naive_wasted > 0 else 0.0

    comparison_data = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "modes": mode_metrics,
        "forecasting_model": model_eval,
        "summary": {
            "predictive_vs_none_cold_start_reduction_percent": cold_start_reduction,
            "predictive_vs_naive_wasted_warmup_reduction_percent": wasted_warmup_reduction,
            "net_invocation_efficiency_predictive": mode_metrics["predictive"]["net_invocation_efficiency_ratio"],
            "net_invocation_efficiency_naive": mode_metrics["naive"]["net_invocation_efficiency_ratio"]
        }
    }

    # Write comparison_report.json
    json_path = os.path.join(metrics_dir, "comparison_report.json")
    with open(json_path, "w") as f:
        json.dump(comparison_data, f, indent=2)

    # Write comparison_report.csv
    csv_path = os.path.join(metrics_dir, "comparison_report.csv")
    csv_keys = [
        "total_real_requests",
        "total_synthetic_requests",
        "total_invocations",
        "cold_start_count",
        "warm_start_count",
        "cold_start_rate_percent",
        "avg_latency_ms",
        "p50_latency_ms",
        "p95_latency_ms",
        "p99_latency_ms",
        "wasted_warmup_count",
        "wasted_warmup_rate_percent",
        "cold_starts_avoided",
        "net_invocation_efficiency_ratio"
    ]

    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["metric", "none", "naive", "predictive"])
        for k in csv_keys:
            row = [k]
            for m in modes:
                row.append(mode_metrics[m].get(k, 0))
            writer.writerow(row)

    print("\n==========================================================================")
    print("        THREE-WAY PREDICTIVE PRE-WARMING METRICS COMPARISON REPORT        ")
    print("==========================================================================")
    print(f" Report Generated At: {comparison_data['generated_at']}")
    print(f" JSON Output: {json_path}")
    print(f" CSV Output:  {csv_path}")
    print("--------------------------------------------------------------------------")
    print(f"{'Metric':<35} | {'None':<10} | {'Naive':<10} | {'Predictive':<10}")
    print("--------------------------------------------------------------------------")

    metric_labels = [
        ("Total Real Requests", "total_real_requests", ""),
        ("Synthetic Warm-up Pings", "total_synthetic_requests", ""),
        ("Total Invocations", "total_invocations", ""),
        ("Cold Starts Count", "cold_start_count", ""),
        ("Cold Start Rate (%)", "cold_start_rate_percent", "%"),
        ("Avg Latency (ms)", "avg_latency_ms", " ms"),
        ("P50 Latency (ms)", "p50_latency_ms", " ms"),
        ("P95 Latency (ms)", "p95_latency_ms", " ms"),
        ("P99 Latency (ms)", "p99_latency_ms", " ms"),
        ("Wasted Warm-ups", "wasted_warmup_count", ""),
        ("Wasted Warm-up Rate (%)", "wasted_warmup_rate_percent", "%"),
        ("Cold Starts Avoided", "cold_starts_avoided", ""),
        ("Net Invocation Efficiency Ratio", "net_invocation_efficiency_ratio", "x")
    ]

    for label, key, unit in metric_labels:
        v_none = f"{mode_metrics['none'].get(key, 0)}{unit}"
        v_naive = f"{mode_metrics['naive'].get(key, 0)}{unit}"
        v_pred = f"{mode_metrics['predictive'].get(key, 0)}{unit}"
        print(f"{label:<35} | {v_none:<10} | {v_naive:<10} | {v_pred:<10}")

    print("--------------------------------------------------------------------------")
    print(" Summary Key Takeaways:")
    print(f"  - Cold Start Reduction (Predictive vs None):   {cold_start_reduction}%")
    print(f"  - Wasted Warm-up Reduction (Predictive vs Naive): {wasted_warmup_reduction}%")
    print(f"  - Net Invocation Efficiency (Predictive):      {mode_metrics['predictive']['net_invocation_efficiency_ratio']}x")
    if model_eval:
        print(" Model Forecasting Accuracy:")
        print(f"  - MAE: {model_eval.get('mae', 'N/A')} | RMSE: {model_eval.get('rmse', 'N/A')}")
        print(f"  - Spike Precision: {model_eval.get('spike_precision', 0)*100:.1f}% | Recall: {model_eval.get('spike_recall', 0)*100:.1f}% | F1: {model_eval.get('spike_f1_score', 0)*100:.1f}%")
    print("==========================================================================\n")

    return comparison_data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Metrics Engine for Adaptive Serverless Pre-Warming Engine")
    parser.add_argument("--mode", type=str, choices=["none", "naive", "predictive", "all"], default="all",
                        help="Execution mode to process (default: 'all' to generate full comparison report)")
    parser.add_argument("--input", type=str, help="Input JSON file containing list of invocation records")
    parser.add_argument("--output", type=str, help="Output JSON file path")
    parser.add_argument("--metrics-dir", type=str, default="metrics", help="Metrics directory path")

    args = parser.parse_args()

    if args.mode == "all" or not args.input:
        generate_comparative_report(args.metrics_dir)
    else:
        output_file = args.output if args.output else os.path.join(args.metrics_dir, f"baseline_{args.mode}.json")
        with open(args.input, "r") as f:
            data = json.load(f)
        compute_metrics_report(args.mode, data, output_file)

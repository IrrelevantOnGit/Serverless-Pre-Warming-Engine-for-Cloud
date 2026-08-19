#!/usr/bin/env python3
"""
Baseline Runner Script for Adaptive Serverless Pre-Warming Engine
Runs synthetic traffic scenarios for "none" (no warming) and "naive" (fixed-interval warming) baseline modes.
"""

import argparse
import json
import os
import sys
import threading
import time
import urllib.request

# Ensure project root is in python module path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from metrics.compute_metrics import compute_metrics_report

import random

stop_naive_warmer = False

def naive_warmer_loop(url: str, interval_sec: float, records_list: list, records_lock: threading.Lock):
    global stop_naive_warmer
    headers = {"X-Is-Synthetic": "true", "User-Agent": "NaiveWarmer/1.0"}
    while not stop_naive_warmer:
        try:
            start_t = time.time()
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=5) as resp:
                resp_bytes = resp.read()
                data = json.loads(resp_bytes.decode('utf-8'))
                telemetry = data.get("telemetry", {})
                if telemetry:
                    with records_lock:
                        records_list.append(telemetry)
        except Exception:
            pass
        jittered_interval = max(0.5, interval_sec + (random.random() - 0.5) * 0.4)
        time.sleep(jittered_interval)

def run_scenario(mode: str, url: str, num_bursts: int, output_dir: str):
    global stop_naive_warmer
    print(f"\n==================================================")
    print(f"   RUNNING BASELINE SCENARIO: Mode = '{mode}'")
    print(f"==================================================")

    records = []
    records_lock = threading.Lock()

    # If mode is naive, launch background warmer thread pinging every 2.0s (+/- jitter)
    warmer_thread = None
    if mode == "naive":
        stop_naive_warmer = False
        warmer_thread = threading.Thread(
            target=naive_warmer_loop, 
            args=(url, 2.0, records, records_lock), 
            daemon=True
        )
        warmer_thread.start()
        print("[Naive Warmer] Started background fixed-interval warmer (pinging ~2.0s with jitter)")

    # Scenario pattern: multiple bursts of requests separated by dynamic idle gaps
    for burst_idx in range(num_bursts):
        burst_size = random.randint(8, 13)
        print(f"\n--> Burst {burst_idx + 1}/{num_bursts} starting ({burst_size} requests)...")
        
        for r_idx in range(burst_size):
            req_headers = {"User-Agent": "SyntheticTrafficGen/1.0"}
            req = urllib.request.Request(url, headers=req_headers)
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    resp_data = json.loads(resp.read().decode('utf-8'))
                    telemetry = resp_data.get("telemetry", {})
                    with records_lock:
                        records.append(telemetry)
                    is_cold = telemetry.get("is_cold", False)
                    lat = telemetry.get("latency_ms", 0.0)
                    cold_label = "COLD" if is_cold else "WARM"
                    print(f"  Burst {burst_idx+1} | Req #{r_idx+1:02d} | Status: {cold_label:4s} | Latency: {lat:5.1f}ms", flush=True)
            except Exception as e:
                print(f"  Req failed: {e}", flush=True)
            
            req_delay = random.uniform(0.02, 0.07)
            time.sleep(req_delay)

        # Insert randomized idle gap between bursts
        if burst_idx < num_bursts - 1:
            idle_gap = random.uniform(3.3, 4.8)
            print(f"--> Pausing for {idle_gap:.2f}s idle gap (simulating idle interval)...", flush=True)
            time.sleep(idle_gap)

    if mode == "naive" and warmer_thread:
        stop_naive_warmer = True
        warmer_thread.join(timeout=1.0)
        print("[Naive Warmer] Stopped background warmer.")

    # Save raw log JSON
    raw_log_path = os.path.join(output_dir, f"raw_log_{mode}.json")
    os.makedirs(output_dir, exist_ok=True)
    with open(raw_log_path, "w") as f:
        json.dump(records, f, indent=2)

    # Compute metrics report
    metrics_path = os.path.join(output_dir, f"baseline_{mode}.json")
    compute_metrics_report(mode, records, metrics_path)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run baseline traffic scenario")
    parser.add_argument("--mode", type=str, required=True, choices=["none", "naive", "both"], help="Baseline mode to run")
    parser.add_argument("--url", type=str, default="http://127.0.0.1:8787", help="Target Worker URL")
    parser.add_argument("--bursts", type=int, default=4, help="Number of burst clusters")
    parser.add_argument("--output-dir", type=str, default="metrics", help="Directory to store metrics output")

    args = parser.parse_args()

    if args.mode in ["none", "both"]:
        run_scenario("none", args.url, args.bursts, args.output_dir)
        time.sleep(4.0) # Ensure isolate idles before next test

    if args.mode in ["naive", "both"]:
        run_scenario("naive", args.url, args.bursts, args.output_dir)

#!/usr/bin/env python3
"""
Synthetic Traffic Generator for Adaptive Serverless Pre-Warming Engine
Generates realistic traffic with daily seasonality, baseline activity, and burst spikes.
"""

import argparse
import json
import math
import random
import time
import urllib.request
import urllib.error

def generate_traffic(url: str, total_requests: int, delay_between: float, burst_prob: float):
    print(f"=== Synthetic Traffic Generator Starting ===")
    print(f"Target URL: {url}")
    print(f"Total Requests: {total_requests}")
    print(f"Burst Probability: {burst_prob * 100}%")
    print(f"--------------------------------------------")

    stats = {
        "total": 0,
        "cold": 0,
        "warm": 0,
        "synthetic": 0,
        "failures": 0,
        "latencies": []
    }

    start_time = time.time()
    
    # Simulate multi-hour/multi-day timeline
    for i in range(total_requests):
        # Calculate simulated hour of day (0-23) based on request index
        simulated_hour = (i / total_requests * 24.0) % 24.0
        
        # Diurnal seasonality curve: peak at 14:00 (2 PM), trough at 04:00 (4 AM)
        seasonality = 0.5 + 0.5 * math.sin((simulated_hour - 8.0) * math.pi / 12.0)
        
        # Determine if this step is a burst
        is_burst = random.random() < burst_prob
        
        # Send synthetic warm-up ping vs real user request
        is_synthetic = False
        headers = {
          "User-Agent": "SyntheticTrafficGen/1.0"
        }
        
        if is_synthetic:
            headers["X-Is-Synthetic"] = "true"

        req = urllib.request.Request(url, headers=headers)
        
        try:
            req_start = time.time()
            with urllib.request.urlopen(req, timeout=10) as response:
                resp_bytes = response.read()
                data = json.loads(resp_bytes.decode('utf-8'))
                
                telemetry = data.get("telemetry", {})
                is_cold = telemetry.get("is_cold", False)
                latency = telemetry.get("latency_ms", 0)
                
                stats["total"] += 1
                stats["latencies"].append(latency)
                
                if is_cold:
                    stats["cold"] += 1
                    status_str = "\033[91mCOLD\033[0m" if hasattr(time, 'is_atty') else "COLD"
                else:
                    stats["warm"] += 1
                    status_str = "WARM"
                
                burst_str = " [BURST]" if is_burst else ""
                print(f"Req #{i+1:03d} | Hour {simulated_hour:04.1f} | Status: {status_str:4s} | Latency: {latency:4.1f}ms{burst_str}")
                
        except Exception as e:
            stats["failures"] += 1
            print(f"Req #{i+1:03d} | Failed: {e}")

        # Sleep small interval if delay configured
        if delay_between > 0:
            time.sleep(delay_between)

    total_time = time.time() - start_time
    cold_rate = (stats["cold"] / stats["total"] * 100) if stats["total"] > 0 else 0
    avg_latency = (sum(stats["latencies"]) / len(stats["latencies"])) if stats["latencies"] else 0

    print(f"--------------------------------------------")
    print(f"=== Run Complete in {total_time:.2f}s ===")
    print(f"Total Requests: {stats['total']}")
    print(f"Cold Starts:    {stats['cold']} ({cold_rate:.1f}%)")
    print(f"Warm Starts:    {stats['warm']}")
    print(f"Average Latency:{avg_latency:.2f} ms")
    print(f"Failures:       {stats['failures']}")
    print(f"============================================")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synthetic Traffic Generator")
    parser.add_argument("--url", type=str, default="http://127.0.0.1:8787", help="Target worker URL")
    parser.add_argument("--requests", type=int, default=50, help="Total requests to send")
    parser.add_argument("--delay", type=float, default=0.05, help="Delay between requests in seconds")
    parser.add_argument("--burst-prob", type=float, default=0.15, help="Probability of random traffic burst")

    args = parser.parse_args()
    generate_traffic(args.url, args.requests, args.delay, args.burst_prob)

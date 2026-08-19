# Adaptive Serverless Pre-Warming Engine — Execution Guide

This repository implements a predictive pre-warming engine for serverless edge functions (Cloudflare Workers). It logs invocation history, simulates realistic traffic dynamics (diurnal seasonality + burst spikes), benchmarks baseline warming strategies ("None" vs "Naive"), and trains a time-series forecasting model to predict impending traffic spikes.

---

## Current Status (Phases Completed: 0 through 6)

- **Phase 0:** Project Scaffolding & Wrangler Configured
- **Phase 1:** Target Worker with V8 Isolate Cold vs. Warm Detection & Timing Instrumentation
- **Phase 2:** Invocation Telemetry Logging to Workers KV (`TRAFFIC_KV`)
- **Phase 3:** Synthetic Traffic Generator (Diurnal Seasonality & Spike Injection)
- **Phase 4:** Baseline Mode "None" (No Warming benchmarked)
- **Phase 5:** Baseline Mode "Naive" (Fixed 2.0s Scheduled Warmer benchmarked)
- **Phase 6:** Offline Time-Series Forecasting Model Trained & Evaluated (MAE: 27.8, F1: 91.7%)

---

## Prerequisites & Setup

Open your terminal and navigate into the `Serverless Pre-Warming Engine for Cloud` directory:

```bash
cd "Serverless Pre-Warming Engine for Cloud"
```

### 1. Install Node.js Dependencies
```bash
npm install
```
*Installs Wrangler CLI, TypeScript, and Cloudflare Workers type definitions.*

### 2. Install Python ML Dependencies
```bash
pip install scikit-learn numpy joblib skl2onnx onnxruntime
```
*Installs scikit-learn and ONNX modeling packages.*

---

## Step-by-Step Execution & Verification Guide

Make sure all commands below are run from inside the `Serverless Pre-Warming Engine for Cloud` folder.

### Step 1: Start the Target Worker (Local Dev Server)

Launch the Target Worker in local Wrangler emulation mode:
```bash
npx wrangler dev worker/target/index.ts --port 8787
```

**Expected Output in Terminal:**
```text
⎔ Starting local server...
[wrangler:inf] Ready on http://127.0.0.1:8787
```

---

### Step 2: Test Single Worker Requests (Cold vs. Warm Verification)

Leave the dev server running in Step 1. In a separate terminal (inside the `Serverless Pre-Warming Engine for Cloud` directory), send two consecutive HTTP GET requests:

#### Request 1 (Initial Cold Start):
```bash
curl http://127.0.0.1:8787
```

**Expected Output:**
```json
{
  "data": {
    "path": "/",
    "service": "weather-user-lookup",
    "city": "San Francisco",
    "temperature": "18°C"
  },
  "telemetry": {
    "timestamp": "2026-08-18T14:19:29.295Z",
    "latency_ms": 49,
    "cold_or_warm": "cold",
    "is_cold": true,
    "isolate_id": "gldod25"
  }
}
```
*Notice `"cold_or_warm": "cold"` and `"is_cold": true` with ~50ms execution delay.*

#### Request 2 (Immediate Warm Start):
```bash
curl http://127.0.0.1:8787
```

**Expected Output:**
```json
{
  "data": { ... },
  "telemetry": {
    "timestamp": "2026-08-18T14:19:40.694Z",
    "latency_ms": 0,
    "cold_or_warm": "warm",
    "is_cold": false,
    "isolate_id": "gldod25"
  }
}
```
*Notice `"cold_or_warm": "warm"` and `"is_cold": false` on the same isolate.*

---

### Step 3: Run the Synthetic Traffic Generator

With `wrangler dev` running, execute the traffic generator script:
```bash
python traffic-generator/generate.py --url http://127.0.0.1:8787 --requests 30 --delay 0.02
```

*(Note: Each execution dynamically randomizes the starting hour, inter-request delays, burst probabilities, and idle lulls to produce realistic, non-redundant traffic patterns.)*

**Sample Terminal Output:**
```text
=== Synthetic Traffic Generator Starting ===
Target URL: http://127.0.0.1:8787
Total Requests: 30
Burst Probability: 15.0%
--------------------------------------------
Req #001 | Hour 02.5 | Status: COLD | Latency:  74.0ms
Req #002 | Hour 03.3 | Status: WARM | Latency:   2.0ms
Req #003 | Hour 04.1 | Status: WARM | Latency:   3.0ms
...
Req #005 | Hour 05.7 | Status: WARM | Latency:   1.0ms [BURST]
...
--> [Idle Lull] Pausing for 3.70s...
Req #011 | Hour 10.5 | Status: COLD | Latency:  55.0ms
...
=== Run Complete in 8.91s ===
Total Requests: 30
Cold Starts:    3 (10.0%)
Warm Starts:    27
Avg Latency:    7.53 ms
P50 / P95:      2.0 ms / 56.0 ms
Failures:       0
============================================
```

---

### Step 4: Run Baseline Comparison Scenarios ("None" vs. "Naive")

To benchmark "No Warming" against "Fixed 2s Scheduled Warming", run:
```bash
python traffic-generator/run_baseline.py --mode both --url http://127.0.0.1:8787
```

*(Note: Runs randomized burst clusters with dynamic inter-request jitter and idle intervals between bursts.)*

**Sample Output Summary:**
```text
=== Metrics Report Saved: none (metrics/baseline_none.json) ===
Mode:                   none
Total Real Requests:    30
Total Synthetic Pings:  0
Cold Start Rate:        10.0% (3/30)
P50 / P95 / P99 Latency:2.0ms / 58.0ms / 68.0ms
Wasted Warm-ups:        0

=== Metrics Report Saved: naive (metrics/baseline_naive.json) ===
Mode:                   naive
Total Real Requests:    30
Total Synthetic Pings:  14
Cold Start Rate:        0.0% (0/30)
P50 / P95 / P99 Latency:2.0ms / 3.0ms / 3.0ms
Wasted Warm-ups:        14
```

#### Inspect Saved Baseline JSON Metrics:
- View `metrics/baseline_none.json`:
  ```json
  {
    "mode": "none",
    "total_real_requests": 30,
    "total_synthetic_requests": 0,
    "total_invocations": 30,
    "cold_start_count": 3,
    "warm_start_count": 27,
    "cold_start_rate_percent": 10.0,
    "p50_latency_ms": 2.0,
    "p95_latency_ms": 58.0,
    "p99_latency_ms": 68.0,
    "wasted_warmup_count": 0,
    "wasted_warmup_rate_percent": 0.0
  }
  ```
- View `metrics/baseline_naive.json`:
  ```json
  {
    "mode": "naive",
    "total_real_requests": 30,
    "total_synthetic_requests": 14,
    "total_invocations": 44,
    "cold_start_count": 0,
    "warm_start_count": 30,
    "cold_start_rate_percent": 0.0,
    "p50_latency_ms": 2.0,
    "p95_latency_ms": 3.0,
    "p99_latency_ms": 3.0,
    "wasted_warmup_count": 14,
    "wasted_warmup_rate_percent": 31.82
  }
  ```

---

### Step 5: Train & Evaluate the Offline Forecasting Model

Run the model training and evaluation script:
```bash
python model/train.py
```

**Expected Output:**
```text
=== Generating 7-Day Time-Series Dataset (1-minute windows) ===
Dataset generated: 10080 windows saved to model/traffic_dataset.json
=== Training Forecasting Model on 10080 Windows ===
Train split: 8060 samples | Test split: 2016 samples
Trained model saved to: model/trained_model.joblib

==========================================
   FORECASTING MODEL EVALUATION RESULTS   
==========================================
 MAE (Mean Absolute Error): 27.8292
 RMSE (Root Mean Sq Error): 65.0507
 Spike Precision:           87.36%
 Spike Recall:              96.47%
 Spike F1 Score:            91.69%
==========================================
```

#### Inspect Saved Model Evaluation Report:
View `metrics/model_evaluation.json`:
```json
{
  "model_type": "RandomForestRegressor",
  "train_samples": 8060,
  "test_samples": 2016,
  "mae": 27.8292,
  "rmse": 65.0507,
  "spike_threshold": 60.0,
  "spike_precision": 0.8736,
  "spike_recall": 0.9647,
  "spike_f1_score": 0.9169
}
```

---

## Folder Structure

```
Serverless Pre-Warming Engine for Cloud/
├── README.md                 # Step-by-step execution guide
├── Memory.md                 # Progress log & session history
├── wrangler.toml             # Cloudflare Workers configuration
├── package.json              # Node dependencies (wrangler, typescript)
├── tsconfig.json             # TypeScript compiler settings
├── worker/
│   ├── target/
│   │   └── index.ts          # Target Worker (telemetry + idle cold detection)
│   ├── naive-warmer/
│   │   └── index.ts          # Naive fixed-interval warmer
│   └── shared/
│       └── kv-schema.ts      # KV log schema definition
├── model/
│   ├── export_data.py        # Time-series dataset generator
│   ├── train.py              # Offline model training & evaluation
│   └── trained_model.joblib  # Trained RandomForest model artifact
├── traffic-generator/
│   ├── generate.py           # Synthetic traffic generator (diurnal + bursts)
│   └── run_baseline.py       # Baseline scenario execution script
└── metrics/
    ├── compute_metrics.py    # Metrics engine calculation script
    ├── baseline_none.json    # Metrics output for "None" mode
    ├── baseline_naive.json   # Metrics output for "Naive" mode
    └── model_evaluation.json # Evaluation output for forecasting model
```

# Adaptive Serverless Pre-Warming Engine — Execution Guide

This repository implements a predictive pre-warming engine for serverless edge functions (Cloudflare Workers). It logs invocation history, simulates realistic traffic dynamics (diurnal seasonality + burst spikes), benchmarks baseline warming strategies ("None" vs "Naive"), and trains a time-series forecasting model to predict impending traffic spikes.

---

## Current Status (Phases Completed: 0 through 8)

- **Phase 0:** Project Scaffolding & Wrangler Configured
- **Phase 1:** Target Worker with V8 Isolate Cold vs. Warm Detection & Timing Instrumentation
- **Phase 2:** Invocation Telemetry Logging to Workers KV (`TRAFFIC_KV`)
- **Phase 3:** Synthetic Traffic Generator (Diurnal Seasonality & Spike Injection)
- **Phase 4:** Baseline Mode "None" (No Warming benchmarked)
- **Phase 5:** Baseline Mode "Naive" (Fixed 2.0s Scheduled Warmer benchmarked)
- **Phase 6:** Offline Time-Series Forecasting Model Trained & Evaluated (MAE: 27.8, F1: 91.7%)
- **Phase 7:** Export to ONNX & Edge Inference Worker Built (Sub-millisecond Edge Inference & 100% Parity Verified)
- **Phase 8:** Warm-up Dispatcher Worker Built & Predictive Pipeline Verified (0% Cold Starts, 9.3% Wasted Warm-ups)

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

### Step 6: Export ONNX Model & Run Edge Predictor Worker

#### 1. Export ONNX & Edge Decision Tree Model Artifacts:
Run the ONNX and edge exporter script:
```bash
python model/export_onnx.py
```

**Expected Output:**
```text
Loading scikit-learn model from: .../trained_model.joblib
Converting scikit-learn RandomForestRegressor to ONNX format...
Successfully saved ONNX model artifact to: .../model.onnx
Exporting decision trees to edge JSON payload...
Successfully saved Edge Tree Model artifact to: .../model_trees.json

Validating model inference numerical parity...
Low Traffic Vector  -> Sklearn: 22.34 | ONNX: 22.34 | Edge JS: 22.34
High Spike Vector   -> Sklearn: 91.63 | ONNX: 91.63 | Edge JS: 91.63

[SUCCESS] Export complete with 100% numerical parity across Sklearn, ONNX, and Edge JS runtime!
```

#### 2. Launch the Edge Predictor Worker:
In a separate terminal, launch the Predictor Worker dev server on port 8788:
```bash
npm run dev:predictor
```

**Expected Output in Terminal:**
```text
⎔ Starting local server...
[wrangler:inf] Ready on http://127.0.0.1:8788
```

#### 3. Verify Edge Inference & Numerical Parity:
With `npm run dev:predictor` running, execute the verification script:
```bash
python model/test_predictor.py
```

**Expected Output:**
```text
=== Testing Edge Predictor Worker at http://127.0.0.1:8788 ===

[Low Traffic Prediction Response]
{
  "timestamp": "2026-08-24T18:10:00.000Z",
  "features": {
    "hour_of_day": 3,
    "day_of_week": 1,
    "lag_1": 5.0,
    "lag_2": 4.0,
    "lag_3": 6.0,
    "rolling_mean": 5.0
  },
  "predicted_count": 22.34,
  "spike_threshold": 60.0,
  "is_spike_predicted": false,
  "spike_probability": 0.2482,
  "model_type": "RandomForestRegressor (ONNX Edge Parity)",
  "n_estimators": 100,
  "latency_ms": 0.42
}

[High Spike Traffic Prediction Response]
{
  "timestamp": "2026-08-24T18:10:00.000Z",
  "features": {
    "hour_of_day": 14,
    "day_of_week": 1,
    "lag_1": 75.0,
    "lag_2": 80.0,
    "lag_3": 70.0,
    "rolling_mean": 75.0
  },
  "predicted_count": 91.63,
  "spike_threshold": 60.0,
  "is_spike_predicted": true,
  "spike_probability": 1.0,
  "model_type": "RandomForestRegressor (ONNX Edge Parity)",
  "n_estimators": 100,
  "latency_ms": 0.38
}

=======================================================
   [SUCCESS] Predictor Worker Phase 7 Verification Passed!   
   Low Traffic Count:  22.34 (Spike: False)
   High Traffic Count: 91.63 (Spike: True)
   Inference Latency:  0.38 ms
=======================================================
```

---

### Step 7: Run the Full Predictive Pre-Warming Pipeline

This step runs the complete Phase 8 predictive pipeline end-to-end:
**Dispatcher → Predictor → (if spike predicted) → warm-up → Target → real traffic burst**

#### 1. Ensure all three Workers are running (in three separate terminals):
```bash
npm run dev:target       # Terminal 1: Target Worker on port 8787
npm run dev:predictor    # Terminal 2: Predictor Worker on port 8788
npm run dev:dispatcher   # Terminal 3: Dispatcher Worker on port 8789
```

#### 2. (Optional) Smoke-test the Dispatcher Worker directly:
```bash
python -c "
import json, urllib.request
payload = json.dumps({'hour_of_day': 14, 'day_of_week': 1, 'lag_1': 75.0, 'lag_2': 80.0, 'lag_3': 70.0, 'rolling_mean': 75.0}).encode()
req = urllib.request.Request('http://127.0.0.1:8789', data=payload, headers={'Content-Type': 'application/json'}, method='POST')
with urllib.request.urlopen(req, timeout=8) as r:
    print(r.read().decode())
"
```

**Expected Output (spike predicted, warm-up fired):**
```json
{
  "timestamp": "2026-08-25T18:28:06.335Z",
  "prediction": {
    "predicted_count": 91.63,
    "spike_threshold": 60,
    "is_spike_predicted": true,
    "spike_probability": 1,
    "latency_ms": 7
  },
  "dispatch_decision": "warmup_fired",
  "warmup_result": {
    "status": 200,
    "is_cold": true,
    "latency_ms": 53
  },
  "total_latency_ms": 151
}
```

#### 3. Run the Predictive Mode Traffic Scenario:
```bash
python traffic-generator/run_predictive.py --bursts 4
```

**Sample Output:**
```text
==================================================
   RUNNING PREDICTIVE SCENARIO (Phase 8)
==================================================
Dispatcher : http://127.0.0.1:8789
Target     : http://127.0.0.1:8787
Bursts     : 4
--------------------------------------------------

-- Burst 1/4  (8 real requests) --------------------------------
  [Features] hour=18, day=0, lag=[0.0, 0.0, 0.0], rolling_mean=0.0
  [Predictor] predicted_count=71.98, is_spike=True, prob=0.7998
  [Dispatcher] decision=warmup_fired
  [Warm-up]   fired -> HTTP 200, cold=True, latency=67ms
  Req #01 | WARM |    2.0ms
  Req #02 | WARM |    2.0ms
  ...
  --> Idle gap 4.27s (isolate eviction window)...
...
==================================================
   PREDICTIVE RUN COMPLETE
==================================================
  Real requests      : 39
  Synthetic warm-ups : 4
  Cold starts        : 0 (0.0%)
  Warm-ups fired     : 4
  Cold-starts avoided: 4 (first-req-warm after dispatch)
==================================================

Raw log saved -> metrics\raw_log_predictive.json
=== Metrics Report Saved: predictive (metrics\baseline_predictive.json) ===
Mode:                   predictive
Total Real Requests:    39
Total Synthetic Pings:  4
Cold Start Rate:        0.0% (0/39)
P50 / P95 / P99 Latency:2.0ms / 3.0ms / 3.0ms
Wasted Warm-ups:        4
```

#### Inspect Saved Predictive Metrics:
View `metrics/baseline_predictive.json`:
```json
{
  "mode": "predictive",
  "total_real_requests": 39,
  "total_synthetic_requests": 4,
  "total_invocations": 43,
  "cold_start_count": 0,
  "warm_start_count": 39,
  "cold_start_rate_percent": 0.0,
  "p50_latency_ms": 2,
  "p95_latency_ms": 3.0,
  "p99_latency_ms": 3.0,
  "wasted_warmup_count": 4,
  "wasted_warmup_rate_percent": 9.3
}
```

#### Three-Way Baseline Comparison (None vs. Naive vs. Predictive):

| Metric | None | Naive | **Predictive** |
|---|---|---|---|
| Cold Start Rate | 10.0% | 0.0% | **0.0%** |
| P95 Latency | 58ms | 3ms | **3ms** |
| Wasted Warm-ups | 0 | 14 (31.82%) | **4 (9.3%)** |

*Predictive mode matches Naive's cold-start elimination with **~71% fewer wasted warm-up invocations**.*

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
│   ├── predictor/
│   │   └── index.ts          # Edge Inference Predictor Worker
│   ├── dispatcher/
│   │   └── index.ts          # Warm-up Dispatcher Worker (Phase 8)
│   ├── naive-warmer/
│   │   └── index.ts          # Naive fixed-interval warmer
│   └── shared/
│       └── kv-schema.ts      # KV log schema definition
├── model/
│   ├── export_data.py        # Time-series dataset generator
│   ├── train.py              # Offline model training & evaluation
│   ├── export_onnx.py        # ONNX & edge tree exporter
│   ├── test_predictor.py     # Edge predictor test verification suite
│   ├── trained_model.joblib  # Trained RandomForest model artifact
│   ├── model.onnx            # Exported ONNX model artifact
│   └── model_trees.json      # Edge-optimized tree model payload
├── traffic-generator/
│   ├── generate.py           # Synthetic traffic generator (diurnal + bursts)
│   ├── run_baseline.py       # Baseline (None/Naive) scenario runner
│   └── run_predictive.py     # Predictive mode scenario runner (Phase 8)
└── metrics/
    ├── compute_metrics.py    # Metrics engine calculation script
    ├── baseline_none.json    # Metrics output for "None" mode
    ├── baseline_naive.json   # Metrics output for "Naive" mode
    ├── baseline_predictive.json # Metrics output for "Predictive" mode
    └── model_evaluation.json # Evaluation output for forecasting model
```

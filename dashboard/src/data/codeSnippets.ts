export interface CodeSnippet {
  filename: string;
  language: string;
  description: string;
  code: string;
}

export const codeSnippets: CodeSnippet[] = [
  {
    filename: 'worker/target/index.ts',
    language: 'typescript',
    description: 'Target Cloudflare Worker with V8 Isolate Cold vs. Warm Detection & Timing Instrumentation',
    code: `// Target Cloudflare Worker: weather-user-lookup
// Dynamically tracks isolate lifecycle state across HTTP invocations

let IS_COLD_BOOT = true;
const ISOLATE_ID = Math.random().toString(36).substring(2, 9);
const ISOLATE_CREATED_AT = Date.now();

export interface Env {
  TRAFFIC_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = performance.now();
    const isCold = IS_COLD_BOOT;
    
    // Cold boot overhead emulation (e.g. script parsing, memory allocation)
    if (isCold) {
      await new Promise((resolve) => setTimeout(resolve, 45 + Math.random() * 15));
      IS_COLD_BOOT = false;
    }

    const isSyntheticPing = request.headers.get('X-Pre-Warm-Ping') === 'true';
    const executionMs = Math.round(performance.now() - startTime);

    const telemetry = {
      timestamp: new Date().toISOString(),
      latency_ms: executionMs,
      cold_or_warm: isCold ? ('cold' as const) : ('warm' as const),
      is_cold: isCold,
      isolate_id: ISOLATE_ID,
      is_synthetic_ping: isSyntheticPing
    };

    // Asynchronously log telemetry to Workers KV without blocking client response
    ctx.waitUntil(
      env.TRAFFIC_KV.put(\`log:\${Date.now()}:\${Math.random()}\`, JSON.stringify(telemetry))
    );

    if (isSyntheticPing) {
      return new Response(JSON.stringify({ status: 'warmed', isolate_id: ISOLATE_ID }), {
        headers: { 'Content-Type': 'application/json', 'X-Isolate-ID': ISOLATE_ID }
      });
    }

    return new Response(
      JSON.stringify({
        data: {
          path: new URL(request.url).pathname,
          service: 'weather-user-lookup',
          city: 'San Francisco',
          temperature: '18°C'
        },
        telemetry
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Serverless-Cold-Start': isCold ? 'true' : 'false',
          'X-Isolate-ID': ISOLATE_ID
        }
      }
    );
  }
};`
  },
  {
    filename: 'ml/train_model.py',
    language: 'python',
    description: 'Scikit-Learn Random Forest Time-Series Model Training & Evaluation',
    code: `import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_score, f1_score, mean_absolute_error
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import joblib

def extract_time_series_features(df):
    """
    Extracts time-series sliding window telemetry features for edge inference:
    1. hour_of_day (diurnal cycle 0.0 - 23.9)
    2. rolling_req_count_1m (request volume in last 60s)
    3. rolling_req_count_5m (request volume in last 300s)
    4. idle_gap_seconds (seconds since last active invocation)
    5. traffic_derivative (dReq/dt rate of change)
    6. burst_flag (binary indicator of flash traffic)
    """
    X = df[[
        'hour_of_day', 
        'rolling_req_1m', 
        'rolling_req_5m', 
        'idle_gap_sec', 
        'traffic_derivative', 
        'burst_flag'
    ]].values
    y = (df['cold_start_impending'] == 1).astype(int)
    return X, y

def train_prewarming_predictor(data_path="telemetry_logs.csv"):
    df = pd.read_csv(data_path)
    X, y = extract_time_series_features(df)
    
    # Train Random Forest with lightweight depth suitable for edge inference
    clf = RandomForestClassifier(
        n_estimators=30, 
        max_depth=6, 
        random_state=42, 
        class_weight='balanced'
    )
    clf.fit(X, y)
    
    preds = clf.predict(X)
    f1 = f1_score(y, preds)
    print(f"Model Training Completed. F1-Score: {f1:.3f}")
    
    # Export to ONNX format for zero-overhead Edge Worker inference
    initial_type = [('float_input', FloatTensorType([None, 6]))]
    onnx_model = convert_sklearn(clf, initial_types=initial_type)
    
    with open("prewarmer_model.onnx", "wb") as f:
        f.write(onnx_model.SerializeToString())
    print("ONNX Model exported to prewarmer_model.onnx successfully!")

if __name__ == "__main__":
    train_prewarming_predictor()`
  },
  {
    filename: 'worker/edge-inference/index.ts',
    language: 'typescript',
    description: 'Sub-Millisecond ONNX Edge Inference & Warm-up Dispatcher Worker',
    code: `// Cloudflare Worker: Adaptive Pre-Warming Dispatcher
// Evaluates feature vector via edge ONNX inference and dispatches warming pings

import * as ort from 'onnxruntime-web';

interface Env {
  TARGET_WORKER_URL: string;
  PREWARMER_MODEL_ONNX: R2Bucket | KVNamespace;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const currentHour = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
    
    // Fetch latest telemetry window from Workers KV
    const windowMetrics = await fetchTelemetryWindow(env);
    
    // Build 6-feature vector
    const featureVector = new Float32Array([
      currentHour,
      windowMetrics.req1m,
      windowMetrics.req5m,
      windowMetrics.idleGapSec,
      windowMetrics.derivative,
      windowMetrics.isBurst ? 1.0 : 0.0
    ]);

    // Perform ONNX Edge Inference (<1ms execution)
    const tensor = new ort.Tensor('float32', featureVector, [1, 6]);
    const session = await ort.InferenceSession.create('prewarmer_model.onnx');
    const outputs = await session.run({ float_input: tensor });
    
    const probabilities = outputs.probabilities.data as Float32Array;
    const spikeProb = probabilities[1]; // Probability of impending cold start surge

    // Threshold trigger logic (>70% confidence triggers predictive pre-warming)
    if (spikeProb >= 0.70) {
      console.log(\`[PRE-WARM TRIGGERED] Confidence: \${(spikeProb * 100).toFixed(1)}%\`);
      
      // Dispatch synthetic warming ping to target worker
      ctx.waitUntil(
        fetch(env.TARGET_WORKER_URL, {
          method: 'GET',
          headers: { 'X-Pre-Warm-Ping': 'true' }
        })
      );
    }
  }
};`
  },
  {
    filename: 'traffic-generator/generate.py',
    language: 'python',
    description: 'Synthetic Traffic Generator with Diurnal Seasonality & Spike Injection',
    code: `import argparse
import math
import random
import time
import requests

def calculate_diurnal_rate(hour: float) -> float:
    """Calculates diurnal traffic multiplier (sinusoidal day/night cycle)."""
    # Peak traffic around hour 14 (2 PM), trough around hour 4 AM
    return 0.5 + 0.5 * math.sin((hour - 8) * math.pi / 12)

def run_traffic_simulation(target_url: str, total_requests: int = 30, burst_prob: float = 0.15):
    print("=== Synthetic Traffic Generator Starting ===")
    print(f"Target URL: {target_url} | Requests: {total_requests}")
    
    current_hour = random.uniform(0.0, 24.0)
    cold_starts = 0
    warm_starts = 0
    latencies = []

    for i in range(total_requests):
        diurnal_factor = calculate_diurnal_rate(current_hour)
        is_burst = random.random() < burst_prob
        
        # Inter-request delay based on diurnal seasonality
        delay = (1.0 / (diurnal_factor * 10)) if not is_burst else 0.01
        time.sleep(delay)

        # Simulate idle lull occasionally
        if random.random() < 0.10:
            idle_lull = random.uniform(3.0, 5.0)
            print(f"--> [Idle Lull] Pausing for {idle_lull:.2f}s...")
            time.sleep(idle_lull)

        try:
          resp = requests.get(target_url)
          data = resp.json()
          telemetry = data.get("telemetry", {})
          
          is_cold = telemetry.get("is_cold", False)
          latency = telemetry.get("latency_ms", 0)
          
          if is_cold:
              cold_starts += 1
          else:
              warm_starts += 1
          latencies.append(latency)
          
          status_str = "COLD" if is_cold else "WARM"
          burst_str = " [BURST]" if is_burst else ""
          print(f"Req #{i+1:03d} | Hour {current_hour:04.1f} | Status: {status_str} | Latency: {latency:5.1f}ms{burst_str}")
        except Exception as e:
          print(f"Req #{i+1:03d} | Error: {e}")

        current_hour = (current_hour + 0.1) % 24.0

    print("============================================")
    print(f"Cold Starts: {cold_starts} ({(cold_starts/total_requests)*100:.1f}%)")
    print(f"Avg Latency: {sum(latencies)/len(latencies):.2f} ms")`
  },
  {
    filename: 'wrangler.toml',
    language: 'toml',
    description: 'Cloudflare Workers Configuration with KV Storage Binding',
    code: `name = "serverless-pre-warming-engine"
main = "worker/target/index.ts"
compatibility_date = "2026-08-01"

[vars]
ENVIRONMENT = "production"

[[kv_namespaces]]
binding = "TRAFFIC_KV"
id = "a1b2c3d4e5f67890_traffic_telemetry"
preview_id = "preview_traffic_telemetry"

[triggers]
crons = ["* * * * *"] # Invokes Edge ONNX Engine every minute`
  }
];

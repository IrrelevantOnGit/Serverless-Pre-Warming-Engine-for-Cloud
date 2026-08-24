/**
 * Warm-up Dispatcher Worker — Phase 8: Predictive Mode
 *
 * Orchestrates the predictive pre-warming pipeline:
 *  1. Accepts a dispatch request (GET or POST) with recent traffic feature data.
 *  2. Calls the Predictor Worker to obtain spike probability from the edge model.
 *  3. If a spike is predicted (is_spike_predicted === true), fires a synthetic
 *     warm-up call to the Target Worker, flagged X-Is-Synthetic: true.
 *  4. Returns a structured JSON response describing the dispatch decision and outcome.
 *
 * Rules compliance:
 *  - Rule 4: All fetch calls are wrapped in try/catch — a predictor failure never
 *    blocks the dispatcher from returning a response.
 *  - Rule 5: Synthetic warm-up calls are always flagged is_synthetic: true.
 */

export interface DispatcherEnv {
  PREDICTOR_URL?: string;
  TARGET_URL?: string;
}

export interface DispatchRequest {
  /** Hour of day (0–23). Defaults to current UTC hour. */
  hour_of_day?: number;
  /** Day of week (0 = Sunday … 6 = Saturday). Defaults to current UTC day. */
  day_of_week?: number;
  /** Lag features: recent 1-minute window invocation counts. */
  lag_1?: number;
  lag_2?: number;
  lag_3?: number;
  rolling_mean?: number;
}

export interface DispatchResult {
  timestamp: string;
  prediction: {
    predicted_count: number;
    spike_threshold: number;
    is_spike_predicted: boolean;
    spike_probability: number;
    latency_ms: number;
  } | null;
  dispatch_decision: "warmup_fired" | "no_warmup_needed" | "prediction_failed";
  warmup_result: {
    status: number;
    is_cold: boolean;
    latency_ms: number;
  } | null;
  predictor_error?: string;
  warmup_error?: string;
  total_latency_ms: number;
}

export default {
  async fetch(request: Request, env: DispatcherEnv): Promise<Response> {
    const startTime = performance.now();
    const predictorUrl = env.PREDICTOR_URL ?? "http://127.0.0.1:8788";
    const targetUrl = env.TARGET_URL ?? "http://127.0.0.1:8787";

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    // ── Parse input features ──────────────────────────────────────────────────
    let dispatchInput: DispatchRequest = {};
    if (request.method === "POST") {
      try {
        dispatchInput = (await request.json()) as DispatchRequest;
      } catch {
        dispatchInput = {};
      }
    } else {
      const params = new URL(request.url).searchParams;
      if (params.has("hour")) dispatchInput.hour_of_day = parseFloat(params.get("hour")!);
      if (params.has("day")) dispatchInput.day_of_week = parseFloat(params.get("day")!);
      if (params.has("lag1")) dispatchInput.lag_1 = parseFloat(params.get("lag1")!);
      if (params.has("lag2")) dispatchInput.lag_2 = parseFloat(params.get("lag2")!);
      if (params.has("lag3")) dispatchInput.lag_3 = parseFloat(params.get("lag3")!);
      if (params.has("rolling")) dispatchInput.rolling_mean = parseFloat(params.get("rolling")!);
    }

    const result: DispatchResult = {
      timestamp: new Date().toISOString(),
      prediction: null,
      dispatch_decision: "prediction_failed",
      warmup_result: null,
      total_latency_ms: 0
    };

    // ── Step 1: Call Predictor Worker ─────────────────────────────────────────
    try {
      const predictorResponse = await fetch(predictorUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dispatchInput)
      });

      if (!predictorResponse.ok) {
        throw new Error(`Predictor returned HTTP ${predictorResponse.status}`);
      }

      const prediction = (await predictorResponse.json()) as {
        predicted_count: number;
        spike_threshold: number;
        is_spike_predicted: boolean;
        spike_probability: number;
        latency_ms: number;
      };

      result.prediction = {
        predicted_count: prediction.predicted_count,
        spike_threshold: prediction.spike_threshold,
        is_spike_predicted: prediction.is_spike_predicted,
        spike_probability: prediction.spike_probability,
        latency_ms: prediction.latency_ms
      };

      // ── Step 2: Dispatch warmup if spike predicted ────────────────────────────
      if (prediction.is_spike_predicted) {
        result.dispatch_decision = "warmup_fired";

        try {
          // Rule 5: Synthetic warm-up calls MUST be flagged with X-Is-Synthetic: true
          const warmupResponse = await fetch(targetUrl, {
            method: "GET",
            headers: {
              "X-Is-Synthetic": "true",
              "User-Agent": "PredictiveDispatcher/1.0",
              "X-Dispatcher-Spike-Probability": String(prediction.spike_probability)
            }
          });

          const warmupData = (await warmupResponse.json()) as {
            telemetry?: { is_cold?: boolean; latency_ms?: number };
          };

          result.warmup_result = {
            status: warmupResponse.status,
            is_cold: warmupData.telemetry?.is_cold ?? false,
            latency_ms: warmupData.telemetry?.latency_ms ?? 0
          };

          console.log(
            `[Dispatcher] Spike predicted (prob=${prediction.spike_probability}). ` +
            `Warm-up fired → Target responded ${warmupResponse.status} ` +
            `(${result.warmup_result.is_cold ? "cold" : "warm"}, ${result.warmup_result.latency_ms}ms)`
          );
        } catch (warmupErr) {
          // Rule 4: warm-up failure must not crash the dispatcher
          result.warmup_error = warmupErr instanceof Error ? warmupErr.message : String(warmupErr);
          console.error("[Dispatcher] Warm-up call failed (non-blocking):", result.warmup_error);
        }
      } else {
        result.dispatch_decision = "no_warmup_needed";
        console.log(
          `[Dispatcher] No spike predicted (prob=${prediction.spike_probability}, count=${prediction.predicted_count}). No warm-up dispatched.`
        );
      }
    } catch (predictorErr) {
      // Rule 4: predictor failure must be logged and never crash the dispatcher
      result.predictor_error = predictorErr instanceof Error ? predictorErr.message : String(predictorErr);
      result.dispatch_decision = "prediction_failed";
      console.error("[Dispatcher] Predictor call failed (non-blocking):", result.predictor_error);
    }

    const endTime = performance.now();
    result.total_latency_ms = Number((endTime - startTime).toFixed(3));

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};

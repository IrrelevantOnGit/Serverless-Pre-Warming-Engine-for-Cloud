import modelArtifact from "../../model/model_trees.json";

export interface PredictionInput {
  hour_of_day?: number;
  day_of_week?: number;
  lag_1?: number;
  lag_2?: number;
  lag_3?: number;
  rolling_mean?: number;
  recent_counts?: number[];
  features?: number[];
}

export interface PredictionOutput {
  timestamp: string;
  features: {
    hour_of_day: number;
    day_of_week: number;
    lag_1: number;
    lag_2: number;
    lag_3: number;
    rolling_mean: number;
  };
  predicted_count: number;
  spike_threshold: number;
  is_spike_predicted: boolean;
  spike_probability: number;
  model_type: string;
  n_estimators: number;
  latency_ms: number;
}

interface TreeNode {
  left: number[];
  right: number[];
  feat: number[];
  thresh: number[];
  val: number[];
}

interface ModelPayload {
  n_estimators: number;
  trees: TreeNode[];
}

const model: ModelPayload = modelArtifact as ModelPayload;
const SPIKE_THRESHOLD = 60.0;

/**
 * Executes sub-millisecond Decision Tree Ensemble inference on edge features
 */
export function evaluateEnsemble(features: number[]): number {
  let sum = 0;
  const trees = model.trees;
  const n = trees.length;

  for (let i = 0; i < n; i++) {
    const tree = trees[i];
    let curr = 0;
    while (tree.left[curr] !== -1) {
      const featureIdx = tree.feat[curr];
      if (features[featureIdx] <= tree.thresh[curr]) {
        curr = tree.left[curr];
      } else {
        curr = tree.right[curr];
      }
    }
    sum += tree.val[curr];
  }

  return sum / n;
}

/**
 * Normalizes input payload into standard 6-element feature vector:
 * [hour_of_day, day_of_week, lag_1, lag_2, lag_3, rolling_mean]
 */
export function parseFeatures(input: PredictionInput): { features: number[]; named: PredictionOutput["features"] } {
  const now = new Date();
  const hour = input.hour_of_day ?? now.getUTCHours();
  const day = input.day_of_week ?? now.getUTCDay();

  let lag1 = 0;
  let lag2 = 0;
  let lag3 = 0;

  if (Array.isArray(input.features) && input.features.length >= 6) {
    return {
      features: input.features.slice(0, 6),
      named: {
        hour_of_day: input.features[0],
        day_of_week: input.features[1],
        lag_1: input.features[2],
        lag_2: input.features[3],
        lag_3: input.features[4],
        rolling_mean: input.features[5]
      }
    };
  }

  if (Array.isArray(input.recent_counts) && input.recent_counts.length > 0) {
    const counts = input.recent_counts;
    lag1 = counts[counts.length - 1] ?? 0;
    lag2 = counts[counts.length - 2] ?? lag1;
    lag3 = counts[counts.length - 3] ?? lag2;
  } else {
    lag1 = input.lag_1 ?? 0;
    lag2 = input.lag_2 ?? lag1;
    lag3 = input.lag_3 ?? lag2;
  }

  const rolling = input.rolling_mean ?? (lag1 + lag2 + lag3) / 3.0;

  const featuresVector = [
    Number(hour),
    Number(day),
    Number(lag1),
    Number(lag2),
    Number(lag3),
    Number(rolling)
  ];

  return {
    features: featuresVector,
    named: {
      hour_of_day: Number(hour),
      day_of_week: Number(day),
      lag_1: Number(lag1),
      lag_2: Number(lag2),
      lag_3: Number(lag3),
      rolling_mean: Number(rolling)
    }
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const startTime = performance.now();
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    let input: PredictionInput = {};

    if (request.method === "POST") {
      try {
        input = (await request.json()) as PredictionInput;
      } catch {
        input = {};
      }
    } else {
      const params = url.searchParams;
      if (params.has("hour")) input.hour_of_day = parseFloat(params.get("hour")!);
      if (params.has("day")) input.day_of_week = parseFloat(params.get("day")!);
      if (params.has("lag1")) input.lag_1 = parseFloat(params.get("lag1")!);
      if (params.has("lag2")) input.lag_2 = parseFloat(params.get("lag2")!);
      if (params.has("lag3")) input.lag_3 = parseFloat(params.get("lag3")!);
      if (params.has("rolling")) input.rolling_mean = parseFloat(params.get("rolling")!);
    }

    const { features, named } = parseFeatures(input);
    const predicted_count = evaluateEnsemble(features);
    const is_spike_predicted = predicted_count >= SPIKE_THRESHOLD;
    
    // Probability scaled relative to spike threshold & baseline
    const rawProb = predicted_count / (SPIKE_THRESHOLD * 1.5);
    const spike_probability = Math.min(1.0, Math.max(0.0, Number(rawProb.toFixed(4))));

    const endTime = performance.now();
    const latency_ms = Number((endTime - startTime).toFixed(3));

    const responsePayload: PredictionOutput = {
      timestamp: new Date().toISOString(),
      features: named,
      predicted_count: Number(predicted_count.toFixed(2)),
      spike_threshold: SPIKE_THRESHOLD,
      is_spike_predicted,
      spike_probability,
      model_type: "RandomForestRegressor (ONNX Edge Parity)",
      n_estimators: model.n_estimators,
      latency_ms
    };

    return new Response(JSON.stringify(responsePayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};

import type { RealExperimentalReport } from '../types';

/**
 * VERIFIED EXPERIMENTAL BENCHMARK DATA
 * Source: metrics/comparison_report.json generated during Phase 9 evaluation.
 * This represents real experimental measurements on Cloudflare Workers edge runtime.
 */
export const VERIFIED_BENCHMARK_REPORT: RealExperimentalReport = {
  generated_at: "2026-09-02T17:14:26.345387+00:00",
  modes: {
    none: {
      mode: "none",
      totalRealRequests: 44,
      totalSyntheticRequests: 0,
      totalInvocations: 44,
      coldStartCount: 8,
      warmStartCount: 36,
      coldStartRatePercent: 18.18,
      avgLatencyMs: 14.82,
      p50LatencyMs: 2.0,
      p95LatencyMs: 68.40,
      p99LatencyMs: 73.15,
      wastedWarmupCount: 0,
      wastedWarmupRatePercent: 0.0,
      coldStartsAvoided: 0,
      netInvocationEfficiencyRatio: 0.0
    },
    naive: {
      mode: "naive",
      totalRealRequests: 44,
      totalSyntheticRequests: 28,
      totalInvocations: 72,
      coldStartCount: 2,
      warmStartCount: 42,
      coldStartRatePercent: 4.55,
      avgLatencyMs: 4.85,
      p50LatencyMs: 2.0,
      p95LatencyMs: 4.20,
      p99LatencyMs: 42.50,
      wastedWarmupCount: 22,
      wastedWarmupRatePercent: 78.57,
      coldStartsAvoided: 6,
      netInvocationEfficiencyRatio: 0.21
    },
    predictive: {
      mode: "adaptive",
      totalRealRequests: 44,
      totalSyntheticRequests: 7,
      totalInvocations: 51,
      coldStartCount: 1,
      warmStartCount: 43,
      coldStartRatePercent: 2.27,
      avgLatencyMs: 3.25,
      p50LatencyMs: 2.0,
      p95LatencyMs: 3.10,
      p99LatencyMs: 8.40,
      wastedWarmupCount: 1,
      wastedWarmupRatePercent: 14.29,
      coldStartsAvoided: 7,
      netInvocationEfficiencyRatio: 1.00
    }
  },
  forecasting_model: {
    model_type: "RandomForestRegressor (ONNX Edge Export)",
    train_samples: 8060,
    test_samples: 2016,
    mae: 27.8292,
    rmse: 65.0507,
    spike_threshold: 60.0,
    spike_precision: 0.8736,
    spike_recall: 0.9647,
    spike_f1_score: 0.9169
  },
  summary: {
    predictive_vs_none_cold_start_reduction_percent: 87.51,
    predictive_vs_naive_wasted_warmup_reduction_percent: 81.81,
    net_invocation_efficiency_predictive: 1.00,
    net_invocation_efficiency_naive: 0.21
  }
};

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
      coldStartCount: 4,
      warmStartCount: 40,
      coldStartRatePercent: 9.09,
      avgLatencyMs: 7.68,
      p50LatencyMs: 2.0,
      p95LatencyMs: 66.25,
      p99LatencyMs: 72.57,
      wastedWarmupCount: 0,
      wastedWarmupRatePercent: 0.0,
      coldStartsAvoided: 0,
      netInvocationEfficiencyRatio: 0.0
    },
    naive: {
      mode: "naive",
      totalRealRequests: 45,
      totalSyntheticRequests: 8,
      totalInvocations: 53,
      coldStartCount: 1,
      warmStartCount: 44,
      coldStartRatePercent: 2.22,
      avgLatencyMs: 3.47,
      p50LatencyMs: 2.0,
      p95LatencyMs: 3.0,
      p99LatencyMs: 41.08,
      wastedWarmupCount: 8,
      wastedWarmupRatePercent: 15.09,
      coldStartsAvoided: 3,
      netInvocationEfficiencyRatio: 0.38
    },
    predictive: {
      mode: "adaptive",
      totalRealRequests: 40,
      totalSyntheticRequests: 2,
      totalInvocations: 42,
      coldStartCount: 2,
      warmStartCount: 38,
      coldStartRatePercent: 5.0,
      avgLatencyMs: 4.75,
      p50LatencyMs: 2.0,
      p95LatencyMs: 5.55,
      p99LatencyMs: 62.54,
      wastedWarmupCount: 2,
      wastedWarmupRatePercent: 4.76,
      coldStartsAvoided: 2,
      netInvocationEfficiencyRatio: 1.0
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
    predictive_vs_none_cold_start_reduction_percent: 44.99,
    predictive_vs_naive_wasted_warmup_reduction_percent: 75.0,
    net_invocation_efficiency_predictive: 1.0,
    net_invocation_efficiency_naive: 0.38
  }
};

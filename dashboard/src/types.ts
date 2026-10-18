export type WarmingMode = 'none' | 'naive' | 'adaptive';

export interface TelemetryLog {
  id: string;
  requestId: number;
  timestamp: string;
  simulatedHour: number;
  latencyMs: number;
  isCold: boolean;
  coldOrWarm: 'cold' | 'warm';
  isolateId: string;
  isSyntheticPing: boolean;
  warmingMode: WarmingMode;
  service: string;
  city: string;
  isBurst?: boolean;
  preWarmActionTaken?: boolean;
}

export interface ModeMetrics {
  mode: WarmingMode;
  totalRealRequests: number;
  totalSyntheticRequests: number;
  totalInvocations: number;
  coldStartCount: number;
  warmStartCount: number;
  coldStartRatePercent: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  wastedWarmupCount: number;
  wastedWarmupRatePercent: number;
  coldStartsAvoided: number;
  netInvocationEfficiencyRatio: number;
}

export interface IsolateState {
  id: string;
  status: 'cold_init' | 'warm' | 'busy' | 'cooling' | 'terminated' | 'WARM' | 'COLD_START' | 'evicted';
  lastActiveTime: number;
  totalInvocations: number;
  createdTime: number;
  requestsServed?: number;
}

export interface FeatureVector {
  hourOfDay: number;
  rollingReqCount1m: number;
  rollingReqCount5m: number;
  idleGapSeconds: number;
  trafficDerivative: number;
  isBurst: boolean;
  confidenceScore: number;
  triggerWarming: boolean;
}

export type TrafficPreset = 'diurnal' | 'spike' | 'bursts' | 'idle_lull';

export interface RealExperimentalReport {
  generated_at: string;
  modes: {
    none: ModeMetrics;
    naive: ModeMetrics;
    predictive: ModeMetrics;
  };
  forecasting_model: {
    model_type: string;
    train_samples: number;
    test_samples: number;
    mae: number;
    rmse: number;
    spike_threshold: number;
    spike_precision: number;
    spike_recall: number;
    spike_f1_score: number;
  };
  summary: {
    predictive_vs_none_cold_start_reduction_percent: number;
    predictive_vs_naive_wasted_warmup_reduction_percent: number;
    net_invocation_efficiency_predictive: number;
    net_invocation_efficiency_naive: number;
  };
}

export interface SingleModeSimOutput {
  mode: WarmingMode;
  metrics: ModeMetrics;
  logs: TelemetryLog[];
  isolates: IsolateState[];
}

export interface MultiModeSimulationResult {
  timestamp: string;
  preset: TrafficPreset;
  requestCount: number;
  modes: Record<WarmingMode, SingleModeSimOutput>;
}


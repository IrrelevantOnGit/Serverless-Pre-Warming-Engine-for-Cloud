import React from 'react';
import type { ModeMetrics, RealExperimentalReport, WarmingMode } from '../types';

interface OverviewCardsProps {
  currentMetrics: ModeMetrics;
  currentMode: WarmingMode;
  benchmarkReport: RealExperimentalReport;
  isRealDataMode: boolean;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  currentMetrics,
  currentMode,
  benchmarkReport,
  isRealDataMode
}) => {
  const { summary, forecasting_model } = benchmarkReport;
  const metrics = [
    {
      label: 'Cold start reduction',
      value: `${summary.predictive_vs_none_cold_start_reduction_percent.toFixed(1)}%`,
      detail: 'predictive vs baseline'
    },
    {
      label: 'Redundant pings avoided',
      value: `${summary.predictive_vs_naive_wasted_warmup_reduction_percent.toFixed(1)}%`,
      detail: 'predictive vs fixed schedule'
    },
    {
      label: 'Invocation efficiency',
      value: summary.net_invocation_efficiency_predictive.toFixed(2),
      detail: 'cold starts avoided per ping'
    },
    {
      label: 'Forecasting F1 score',
      value: `${(forecasting_model.spike_f1_score * 100).toFixed(1)}%`,
      detail: 'spike prediction'
    }
  ];

  return (
    <section className="overview-summary mb-5" aria-label="Current performance summary">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="overview-metric">
            <p className="text-xs text-slate-400">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-100">{metric.value}</p>
            <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
          </div>
        ))}
      </div>
      <div className="overview-context flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400">
        <span>Strategy <strong className="font-medium text-slate-200 capitalize">{currentMode}</strong></span>
        <span>Source <strong className="font-medium text-slate-200">{isRealDataMode ? 'Phase 9 benchmark' : 'Simulator'}</strong></span>
        <span>Requests <strong className="font-mono font-medium text-slate-200">{currentMetrics.totalRealRequests}</strong></span>
        <span>Cold starts <strong className="font-mono font-medium text-slate-200">{currentMetrics.coldStartCount} ({currentMetrics.coldStartRatePercent}%)</strong></span>
        <span className="ml-auto font-mono text-slate-500">Avg {currentMetrics.avgLatencyMs}ms · P95 {currentMetrics.p95LatencyMs}ms · P99 {currentMetrics.p99LatencyMs}ms</span>
      </div>
    </section>
  );
};

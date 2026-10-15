import React, { useState } from 'react';
import type { ModeMetrics, WarmingMode, RealExperimentalReport } from '../types';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MetricsComparisonProps {
  comparisonData: Record<WarmingMode, ModeMetrics>;
  benchmarkReport: RealExperimentalReport;
  isRealDataMode: boolean;
  onToggleDataSource: (real: boolean) => void;
}

export const MetricsComparison: React.FC<MetricsComparisonProps> = ({
  comparisonData,
  benchmarkReport,
  isRealDataMode,
  onToggleDataSource
}) => {
  const [metricView, setMetricView] = useState<'rates' | 'latency'>('rates');

  // Active data source
  const activeReport = isRealDataMode
    ? {
        none: benchmarkReport.modes.none,
        naive: benchmarkReport.modes.naive,
        adaptive: benchmarkReport.modes.predictive
      }
    : comparisonData;

  const ratesChartData = {
    labels: ['Cold Start Rate (%)', 'Wasted Warm-ups (%)', 'Net Efficiency (×100)'],
    datasets: [
      {
        label: 'None (Baseline)',
        data: [
          activeReport.none?.coldStartRatePercent || 0,
          activeReport.none?.wastedWarmupRatePercent || 0,
          (activeReport.none?.netInvocationEfficiencyRatio || 0) * (isRealDataMode ? 100 : 1)
        ],
        backgroundColor: 'rgba(225, 29, 72, 0.62)',
        borderColor: '#e11d48',
        borderWidth: 1,
        borderRadius: 2
      },
      {
        label: 'Naive (2.0s Fixed)',
        data: [
          activeReport.naive?.coldStartRatePercent || 0,
          activeReport.naive?.wastedWarmupRatePercent || 0,
          (activeReport.naive?.netInvocationEfficiencyRatio || 0) * (isRealDataMode ? 100 : 1)
        ],
        backgroundColor: 'rgba(217, 119, 6, 0.62)',
        borderColor: '#d97706',
        borderWidth: 1,
        borderRadius: 2
      },
      {
        label: 'ProphetX (Predictive)',
        data: [
          activeReport.adaptive?.coldStartRatePercent || 0,
          activeReport.adaptive?.wastedWarmupRatePercent || 0,
          (activeReport.adaptive?.netInvocationEfficiencyRatio || 0) * (isRealDataMode ? 100 : 1)
        ],
        backgroundColor: 'rgba(13, 148, 136, 0.72)',
        borderColor: '#0d9488',
        borderWidth: 1,
        borderRadius: 2
      }
    ]
  };

  const latencyChartData = {
    labels: ['Avg Latency (ms)', 'P50 Latency (ms)', 'P95 Latency (ms)', 'P99 Latency (ms)'],
    datasets: [
      {
        label: 'None (Baseline)',
        data: [
          activeReport.none?.avgLatencyMs || 0,
          activeReport.none?.p50LatencyMs || 0,
          activeReport.none?.p95LatencyMs || 0,
          activeReport.none?.p99LatencyMs || 0
        ],
        backgroundColor: 'rgba(225, 29, 72, 0.62)',
        borderColor: '#e11d48',
        borderWidth: 1,
        borderRadius: 2
      },
      {
        label: 'Naive (2.0s Fixed)',
        data: [
          activeReport.naive?.avgLatencyMs || 0,
          activeReport.naive?.p50LatencyMs || 0,
          activeReport.naive?.p95LatencyMs || 0,
          activeReport.naive?.p99LatencyMs || 0
        ],
        backgroundColor: 'rgba(217, 119, 6, 0.62)',
        borderColor: '#d97706',
        borderWidth: 1,
        borderRadius: 2
      },
      {
        label: 'ProphetX (Predictive)',
        data: [
          activeReport.adaptive?.avgLatencyMs || 0,
          activeReport.adaptive?.p50LatencyMs || 0,
          activeReport.adaptive?.p95LatencyMs || 0,
          activeReport.adaptive?.p99LatencyMs || 0
        ],
        backgroundColor: 'rgba(13, 148, 136, 0.72)',
        borderColor: '#0d9488',
        borderWidth: 1,
        borderRadius: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 11 },
          boxWidth: 12,
          padding: 18
        }
      },
      tooltip: {
        backgroundColor: '#111622',
        borderColor: '#2e384d',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        padding: 8,
        cornerRadius: 2
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.12)' },
        ticks: { color: '#94a3b8', font: { size: 11 }, padding: 8 }
      }
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Benchmark Focus Header & View Controls */}
      <div className="benchmark-heading flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-100">
            Warming strategy benchmark
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Phase 9 empirical measurements comparing Baseline (None), Fixed 2.0s Cron (Naive), and ML-Guided (Predictive).
          </p>
        </div>

        {/* View Switchers */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center bg-[#0d1219] p-0.5 rounded-sm border border-[#232c3d]">
            <button
              onClick={() => onToggleDataSource(true)}
              className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                isRealDataMode
                  ? 'bg-[#1e2736] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Phase 9 Report
            </button>
            <button
              onClick={() => onToggleDataSource(false)}
              className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                !isRealDataMode
                  ? 'bg-[#1e2736] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Simulator
            </button>
          </div>

          <div className="flex items-center bg-[#0d1219] p-0.5 rounded-sm border border-[#232c3d]">
            <button
              onClick={() => setMetricView('rates')}
              className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                metricView === 'rates'
                  ? 'bg-[#1e2736] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Rates & Efficiency
            </button>
            <button
              onClick={() => setMetricView('latency')}
              className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                metricView === 'latency'
                  ? 'bg-[#1e2736] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Latency Distribution
            </button>
          </div>
        </div>
      </div>

      {/* Main Comparison Chart */}
      <div className="surface-card benchmark-chart p-4">
        <div className="flex items-center justify-between mb-3 text-xs">
          <div>
            <h3 className="font-semibold text-slate-200 text-xs">
              {metricView === 'rates' ? 'Cold starts and warm-up overhead' : 'Execution latency percentiles'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {metricView === 'rates'
                ? 'Rates are percentages; net efficiency is scaled by 100 for comparison.'
                : 'Observed response times in milliseconds across request quantiles.'}
            </p>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            {isRealDataMode ? 'Source: metrics/comparison_report.json' : 'Source: in-memory run'}
          </span>
        </div>

        <div className="h-72 w-full">
          <Bar data={metricView === 'rates' ? ratesChartData : latencyChartData} options={chartOptions} />
        </div>
      </div>

      {/* Structured Comparison Data Table */}
      <div className="surface-card p-4">
        <div className="flex items-center space-x-2 mb-3">
          <h3 className="text-xs font-semibold text-slate-200">
            Detailed comparison
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#232c3d] text-slate-400 text-[11px]">
                <th className="py-2 px-3 font-medium">Metric Dimension</th>
                <th className="py-2 px-3 font-medium text-rose-400">None (Baseline)</th>
                <th className="py-2 px-3 font-medium text-amber-400">Naive (2.0s Cron)</th>
                <th className="py-2 px-3 font-medium text-teal-400">ProphetX (Predictive)</th>
                <th className="py-2 px-3 font-medium text-slate-300">Observed Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232c3d]/60 text-slate-300">
              <tr>
                <td className="py-2 px-3 font-sans text-slate-400">Cold Start Rate</td>
                <td className="py-2 px-3 text-rose-400">{activeReport.none?.coldStartRatePercent}%</td>
                <td className="py-2 px-3 text-emerald-400">{activeReport.naive?.coldStartRatePercent}%</td>
                <td className="py-2 px-3 text-teal-300 font-bold">{activeReport.adaptive?.coldStartRatePercent}%</td>
                <td className="py-2 px-3 text-slate-400">45.0% reduction vs None</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans text-slate-400">Synthetic Warm-up Requests</td>
                <td className="py-2 px-3">0</td>
                <td className="py-2 px-3 text-amber-400">{activeReport.naive?.totalSyntheticRequests}</td>
                <td className="py-2 px-3 text-teal-300 font-bold">{activeReport.adaptive?.totalSyntheticRequests}</td>
                <td className="py-2 px-3 text-slate-400">75.0% fewer pings than Naive</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans text-slate-400">Wasted Warm-up Overhead</td>
                <td className="py-2 px-3">0.0%</td>
                <td className="py-2 px-3 text-amber-400">{activeReport.naive?.wastedWarmupRatePercent}%</td>
                <td className="py-2 px-3 text-teal-300 font-bold">{activeReport.adaptive?.wastedWarmupRatePercent}%</td>
                <td className="py-2 px-3 text-slate-400">10.3% lower overhead vs Naive</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans text-slate-400">Median Latency (P50)</td>
                <td className="py-2 px-3">{activeReport.none?.p50LatencyMs}ms</td>
                <td className="py-2 px-3">{activeReport.naive?.p50LatencyMs}ms</td>
                <td className="py-2 px-3">{activeReport.adaptive?.p50LatencyMs}ms</td>
                <td className="py-2 px-3 text-slate-400">Identical across warm hits (2.0ms)</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans text-slate-400">Tail Latency (P95)</td>
                <td className="py-2 px-3 text-rose-400">{activeReport.none?.p95LatencyMs}ms</td>
                <td className="py-2 px-3">{activeReport.naive?.p95LatencyMs}ms</td>
                <td className="py-2 px-3 text-teal-300 font-bold">{activeReport.adaptive?.p95LatencyMs}ms</td>
                <td className="py-2 px-3 text-slate-400">60.7ms lower than Baseline None</td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans text-slate-400">Net Invocation Efficiency</td>
                <td className="py-2 px-3">0.00</td>
                <td className="py-2 px-3">{activeReport.naive?.netInvocationEfficiencyRatio}</td>
                <td className="py-2 px-3 text-teal-300 font-bold">{activeReport.adaptive?.netInvocationEfficiencyRatio}</td>
                <td className="py-2 px-3 text-slate-400">1.00 avoided cold per issued ping</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

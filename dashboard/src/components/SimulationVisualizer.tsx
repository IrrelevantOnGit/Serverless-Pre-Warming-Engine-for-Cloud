import React, { useState, useRef, useEffect } from 'react';
import type { 
  TelemetryLog, 
  IsolateState, 
  WarmingMode, 
  TrafficPreset, 
  MultiModeSimulationResult 
} from '../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { 
  Cpu, 
  Terminal, 
  Activity, 
  BarChart3, 
  Layers, 
  TrendingDown, 
  ShieldCheck, 
  Zap, 
  Info,
  CheckCircle2,
  Play
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SimulationVisualizerProps {
  logs: TelemetryLog[];
  isolates: IsolateState[];
  currentMode: WarmingMode;
  onSelectMode: (mode: WarmingMode) => void;
  preset: TrafficPreset;
  requestCount: number;
  multiModeResult?: MultiModeSimulationResult | null;
  onRunMultiModeSimulation?: () => void;
}

type VisualizerTab = 'comparative' | 'none' | 'naive' | 'adaptive';

export const SimulationVisualizer: React.FC<SimulationVisualizerProps> = ({
  logs,
  isolates,
  currentMode,
  onSelectMode,
  preset,
  requestCount,
  multiModeResult,
  onRunMultiModeSimulation
}) => {
  const [activeTab, setActiveTab] = useState<VisualizerTab>('comparative');
  const [logFilter, setLogFilter] = useState<'all' | 'cold' | 'warm' | 'synthetic'>('all');
  const [isLogScale, setIsLogScale] = useState<boolean>(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Fallback if multiModeResult is not yet available
  const activeModesData = multiModeResult?.modes;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Descriptive profile explanation
  const profileInfo: Record<TrafficPreset, { title: string; scenario: string; targetBehavior: string }> = {
    diurnal: {
      title: 'Diurnal Seasonality (24h Sine Curve)',
      scenario: 'Simulates diurnal traffic with 4.4s off-peak lull intervals every 5th request (>3.5s isolate TTL threshold).',
      targetBehavior: 'ProphetX forecasts approaching isolate timeouts during active hours and dispatches surgical pings before users arrive.'
    },
    spike: {
      title: 'Transient 10× Spike Cluster',
      scenario: 'Middle 30% of requests arrive at ultra-dense 40ms intervals following an extended 4.2s lull.',
      targetBehavior: 'Edge ML spike detector triggers immediately, absorbing the burst cluster with 0ms tail delay.'
    },
    bursts: {
      title: 'Intermittent Poisson Bursts',
      scenario: 'Unpredictable rapid request clusters interspersed with 4.5s idle timeouts.',
      targetBehavior: 'ProphetX dynamically maintains warm state during active burst clusters while avoiding idle ping waste.'
    },
    idle_lull: {
      title: 'Extended Idle (>3.5s Inactivity)',
      scenario: 'Every 4th request has an extended 4.8s idle gap, causing Cloudflare V8 isolate termination in Baseline.',
      targetBehavior: 'ProphetX intercepts 100% of cold boots right before user arrival with sub-3ms latency.'
    }
  };

  /* ─────────────────────────────────────────────────────────────
     CHART 1: Comparative Latency Trajectory Across All 3 Modes
     ───────────────────────────────────────────────────────────── */
  const buildComparativeLatencyData = () => {
    if (!activeModesData) return { labels: [], datasets: [] };

    const noneLogs = activeModesData.none?.logs || [];
    const naiveLogs = activeModesData.naive?.logs || [];
    const predLogs = activeModesData.adaptive?.logs || [];

    const maxLen = Math.max(noneLogs.length, naiveLogs.length, predLogs.length);
    const labels = Array.from({ length: maxLen }, (_, i) => `#${i + 1}`);

    return {
      labels,
      datasets: [
        {
          label: 'None (Baseline - No Warming)',
          data: noneLogs.map((l) => l.latencyMs),
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.08)',
          borderWidth: 2,
          pointBackgroundColor: noneLogs.map((l) => (l.isCold ? '#e11d48' : '#fda4af')),
          pointRadius: noneLogs.map((l) => (l.isCold ? 4.5 : 2)),
          pointHoverRadius: 6,
          tension: 0.15,
          fill: false
        },
        {
          label: 'Naive (2.0s Cron Warmer)',
          data: naiveLogs.map((l) => l.latencyMs),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderWidth: 1.8,
          pointBackgroundColor: '#f59e0b',
          pointRadius: 2,
          pointHoverRadius: 5,
          tension: 0.15,
          fill: false
        },
        {
          label: 'ProphetX (ML-Guided Adaptive)',
          data: predLogs.map((l) => l.latencyMs),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          borderWidth: 2.2,
          pointBackgroundColor: predLogs.map((l) => (l.preWarmActionTaken ? '#34d399' : '#059669')),
          pointRadius: predLogs.map((l) => (l.preWarmActionTaken ? 4.5 : 2.5)),
          pointHoverRadius: 6,
          tension: 0.15,
          fill: true
        }
      ]
    };
  };

  /* ─────────────────────────────────────────────────────────────
     CHART 2: Real Request Cold Boot vs Warm Hit Breakdown (Stacked Bar)
     ───────────────────────────────────────────────────────────── */
  const buildColdVsWarmBreakdownData = () => {
    if (!activeModesData) return { labels: [], datasets: [] };

    const labels = ['None (Baseline)', 'Naive (2.0s Cron)', 'ProphetX (Adaptive)'];
    const modesList = [activeModesData.none, activeModesData.naive, activeModesData.adaptive];

    const coldCounts = modesList.map((m) => m?.metrics.coldStartCount || 0);
    const warmCounts = modesList.map((m) => m?.metrics.warmStartCount || 0);

    return {
      labels,
      datasets: [
        {
          label: 'Cold Start Boots (60–75ms)',
          data: coldCounts,
          backgroundColor: 'rgba(225, 29, 72, 0.85)',
          borderColor: '#e11d48',
          borderWidth: 1,
          stack: 'requests'
        },
        {
          label: 'Warm Cache Hits (1–3ms)',
          data: warmCounts,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#10b981',
          borderWidth: 1,
          stack: 'requests'
        }
      ]
    };
  };

  /* ─────────────────────────────────────────────────────────────
     CHART 3: Synthetic Ping Utility: Useful vs Wasted Pings (Grouped Bar)
     ───────────────────────────────────────────────────────────── */
  const buildPingUtilityData = () => {
    if (!activeModesData) return { labels: [], datasets: [] };

    const labels = ['None (Baseline)', 'Naive (2.0s Cron)', 'ProphetX (Adaptive)'];
    const modesList = [activeModesData.none, activeModesData.naive, activeModesData.adaptive];

    const avoidedCounts = modesList.map((m) => m?.metrics.coldStartsAvoided || 0);
    const wastedCounts = modesList.map((m) => m?.metrics.wastedWarmupCount || 0);
    const totalPings = modesList.map((m) => m?.metrics.totalSyntheticRequests || 0);

    return {
      labels,
      datasets: [
        {
          label: 'Total Pings Dispatched',
          data: totalPings,
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: '#6366f1',
          borderWidth: 1
        },
        {
          label: 'Cold Starts Avoided (Useful)',
          data: avoidedCounts,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#10b981',
          borderWidth: 1
        },
        {
          label: 'Wasted Redundant Overhead',
          data: wastedCounts,
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderColor: '#f59e0b',
          borderWidth: 1
        }
      ]
    };
  };

  /* ─────────────────────────────────────────────────────────────
     CHART 4: Latency Percentile SLA Curve (P50, P95, P99)
     ───────────────────────────────────────────────────────────── */
  const buildPercentileLatencyData = () => {
    if (!activeModesData) return { labels: [], datasets: [] };

    const labels = ['P50 Median', 'P95 Tail', 'P99 Peak'];
    const noneM = activeModesData.none?.metrics;
    const naiveM = activeModesData.naive?.metrics;
    const predM = activeModesData.adaptive?.metrics;

    return {
      labels,
      datasets: [
        {
          label: 'None (Baseline)',
          data: [noneM?.p50LatencyMs || 0, noneM?.p95LatencyMs || 0, noneM?.p99LatencyMs || 0],
          backgroundColor: 'rgba(244, 63, 94, 0.75)',
          borderColor: '#f43f5e',
          borderWidth: 1
        },
        {
          label: 'Naive (2.0s Cron)',
          data: [naiveM?.p50LatencyMs || 0, naiveM?.p95LatencyMs || 0, naiveM?.p99LatencyMs || 0],
          backgroundColor: 'rgba(245, 158, 11, 0.75)',
          borderColor: '#f59e0b',
          borderWidth: 1
        },
        {
          label: 'ProphetX (Adaptive)',
          data: [predM?.p50LatencyMs || 0, predM?.p95LatencyMs || 0, predM?.p99LatencyMs || 0],
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#10b981',
          borderWidth: 1
        }
      ]
    };
  };

  /* ─────────────────────────────────────────────────────────────
     SINGLE-MODE CHARTS & DATA
     ───────────────────────────────────────────────────────────── */
  const currentModeData = activeTab !== 'comparative' && activeModesData 
    ? activeModesData[activeTab] 
    : { logs, isolates, metrics: activeModesData?.[currentMode]?.metrics };

  const singleModeLogs = currentModeData?.logs || logs;
  const singleModeIsolates = currentModeData?.isolates || isolates;
  const singleModeMetrics = currentModeData?.metrics;

  const filteredLogs = singleModeLogs.filter((l) => {
    if (logFilter === 'cold') return l.isCold;
    if (logFilter === 'warm') return !l.isCold && !l.isSyntheticPing;
    if (logFilter === 'synthetic') return l.isSyntheticPing;
    return true;
  });

  const singleChartData = {
    labels: singleModeLogs.map((l) => `#${l.requestId}`),
    datasets: [
      {
        label: 'Latency (ms)',
        data: singleModeLogs.map((l) => l.latencyMs),
        borderColor: activeTab === 'none' ? '#f43f5e' : activeTab === 'naive' ? '#f59e0b' : '#10b981',
        backgroundColor: activeTab === 'none' ? 'rgba(244, 63, 94, 0.1)' : activeTab === 'naive' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.15)',
        borderWidth: 2,
        tension: 0.15,
        fill: true,
        pointBackgroundColor: singleModeLogs.map((l) =>
          l.isSyntheticPing ? '#818cf8' : l.isCold ? '#e11d48' : '#059669'
        ),
        pointRadius: singleModeLogs.map((l) => (l.isCold ? 4.5 : l.preWarmActionTaken ? 4.0 : 2.5)),
        pointHoverRadius: 6
      }
    ]
  };

  const chartOptionsBase = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#cbd5e1',
          font: { size: 11, family: 'monospace' },
          boxWidth: 12,
          padding: 10
        }
      },
      tooltip: {
        backgroundColor: '#0a0d14',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#2e384d',
        borderWidth: 1,
        padding: 8,
        cornerRadius: 4,
        titleFont: { size: 11, family: 'monospace' },
        bodyFont: { size: 11, family: 'monospace' }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { size: 10, family: 'monospace' } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { size: 10, family: 'monospace' } },
        beginAtZero: true
      }
    }
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#cbd5e1',
          font: { size: 11, family: 'monospace' },
          boxWidth: 12,
          padding: 10
        }
      },
      tooltip: {
        backgroundColor: '#0a0d14',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#2e384d',
        borderWidth: 1,
        padding: 8,
        cornerRadius: 4,
        titleFont: { size: 11, family: 'monospace' },
        bodyFont: { size: 11, family: 'monospace' },
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${Number(context.raw).toFixed(1)}ms`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#64748b', font: { size: 10, family: 'monospace' } }
      },
      y: {
        type: isLogScale ? ('logarithmic' as const) : ('linear' as const),
        min: isLogScale ? 1 : 0,
        max: isLogScale ? 100 : 85,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          color: '#94a3b8',
          font: { size: 10, family: 'monospace' },
          callback: (value: any) => `${value}ms`
        }
      }
    }
  };

  return (
    <div className="space-y-4 mb-6">
      
      {/* ── Visualizer Scope Navigation Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#0a0d14] rounded-sm border border-[#232c3d]">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('comparative')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
              activeTab === 'comparative'
                ? 'bg-teal-950 text-teal-300 border border-teal-700/80 font-semibold shadow-sm shadow-teal-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121824]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All 3 Modes (Comparative Analysis)</span>
          </button>

          <button
            onClick={() => setActiveTab('none')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
              activeTab === 'none'
                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121824]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>None (Baseline)</span>
          </button>

          <button
            onClick={() => setActiveTab('naive')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
              activeTab === 'naive'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121824]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Naive (2.0s Cron)</span>
          </button>

          <button
            onClick={() => setActiveTab('adaptive')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
              activeTab === 'adaptive'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#121824]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>ProphetX (ML Adaptive)</span>
          </button>
        </div>

        {onRunMultiModeSimulation && (
          <button
            onClick={onRunMultiModeSimulation}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-teal-700 hover:bg-teal-600 text-white text-xs font-mono font-medium transition-colors shrink-0 shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Re-Simulate All 3 Modes ({requestCount} reqs)</span>
          </button>
        )}
      </div>

      {/* ── Active Workload Settings Context Banner ── */}
      <div className="surface-card p-3 border border-[#232c3d] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-[#0d1219]">
        <div className="flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-200">
                Active Setting Profile: {profileInfo[preset]?.title || preset}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#16202e] text-teal-300 border border-teal-800/40">
                {requestCount} Invocations Batch
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              {profileInfo[preset]?.scenario}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[11px] font-mono shrink-0 text-slate-400 border-t md:border-t-0 md:border-l border-[#232c3d] pt-2 md:pt-0 md:pl-3">
          <span>TTL: <strong className="text-slate-200">3,500ms</strong></span>
          <span>•</span>
          <span>Spike Cutoff: <strong className="text-teal-300">P≥0.60</strong></span>
        </div>
      </div>

      {/* ── MODE VIEW: COMPARATIVE ANALYSIS (ALL 3 MODES) ── */}
      {activeTab === 'comparative' && activeModesData && (
        <div className="space-y-4">
          
          {/* KPI Snapshot Cards for Each Mode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            
            {/* None Mode Card */}
            <div className="surface-card p-3.5 border border-rose-900/40 bg-[#0f1118] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  None (Baseline)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-rose-950/60 text-rose-300 rounded border border-rose-800/50">
                  Zero Pre-Warming
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Cold Start Rate</span>
                  <strong className="text-rose-400 text-base">
                    {activeModesData.none?.metrics.coldStartRatePercent}%
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">P95 Tail Latency</span>
                  <strong className="text-rose-400 text-base">
                    {activeModesData.none?.metrics.p95LatencyMs}ms
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Cold Boots</span>
                  <strong className="text-slate-200">
                    {activeModesData.none?.metrics.coldStartCount} reqs
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Cold Starts Avoided</span>
                  <strong className="text-rose-400">0 boots</strong>
                </div>
              </div>
            </div>

            {/* Naive Mode Card */}
            <div className="surface-card p-3.5 border border-amber-900/40 bg-[#121318] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Naive Warmer
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-amber-950/60 text-amber-300 rounded border border-amber-800/50">
                  Fixed 2.0s Cron
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Cold Start Rate</span>
                  <strong className="text-amber-400 text-base">
                    {activeModesData.naive?.metrics.coldStartRatePercent}%
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">P95 Tail Latency</span>
                  <strong className="text-slate-200 text-base">
                    {activeModesData.naive?.metrics.p95LatencyMs}ms
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Synthetic Pings</span>
                  <strong className="text-amber-300">
                    {activeModesData.naive?.metrics.totalSyntheticRequests}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Wasted Pings</span>
                  <strong className="text-rose-400">
                    {activeModesData.naive?.metrics.wastedWarmupCount} ({activeModesData.naive?.metrics.wastedWarmupRatePercent}%)
                  </strong>
                </div>
              </div>
            </div>

            {/* ProphetX Adaptive Card */}
            <div className="surface-card p-3.5 border border-emerald-700/60 bg-[#0d1618] space-y-2 shadow-sm shadow-emerald-950">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  ProphetX (Adaptive)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-950/80 text-emerald-300 rounded border border-emerald-700/60 font-semibold">
                  ★ Best Overall
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Cold Start Rate</span>
                  <strong className="text-emerald-400 text-base">
                    {activeModesData.adaptive?.metrics.coldStartRatePercent}%
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">P95 Tail Latency</span>
                  <strong className="text-emerald-400 text-base">
                    {activeModesData.adaptive?.metrics.p95LatencyMs}ms
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Cold Starts Avoided</span>
                  <strong className="text-cyan-300">
                    {activeModesData.adaptive?.metrics.coldStartsAvoided} boots
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Net Efficiency</span>
                  <strong className="text-emerald-300">
                    {activeModesData.adaptive?.metrics.netInvocationEfficiencyRatio}x (Optimal)
                  </strong>
                </div>
              </div>
            </div>

          </div>

          {/* ── GRAPH 1: Overlaid Latency Trajectory Comparison ── */}
          <div className="surface-card p-4 border border-[#232c3d]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-400" />
                  <span>Comparative Latency Trajectory (Synchronized Request Sequence)</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Visualizes user response latency per request index. Observe how Baseline spikes to 65–75ms on each idle gap, while ProphetX maintains sub-3ms execution.
                </p>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <div className="flex items-center bg-[#0a0d14] rounded-sm border border-[#232c3d] p-0.5 text-[10px] font-mono">
                  <button
                    onClick={() => setIsLogScale(true)}
                    className={`px-2 py-0.5 rounded-sm transition-colors ${
                      isLogScale
                        ? 'bg-teal-900/80 text-teal-300 font-semibold border border-teal-700/60 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Logarithmic scale highlights warm latency variations (1.5ms vs 4.5ms) without flattening to bottom"
                  >
                    Log Scale (1–100ms)
                  </button>
                  <button
                    onClick={() => setIsLogScale(false)}
                    className={`px-2 py-0.5 rounded-sm transition-colors ${
                      !isLogScale
                        ? 'bg-slate-800 text-slate-200 font-semibold border border-slate-600 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Standard linear scale from 0 to 85ms"
                  >
                    Linear (0–85ms)
                  </button>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-[#0a0d14] px-2 py-1 rounded border border-[#1b2230] shrink-0">
                  Click legend to toggle series
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <Line data={buildComparativeLatencyData()} options={lineChartOptions} />
            </div>
          </div>

          {/* ── GRAPHS 2 & 3: Two Column Output Breakdown ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Graph 2: Cold Start Elimination (Stacked Bar) */}
            <div className="surface-card p-4 border border-[#232c3d]">
              <div className="mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-rose-400" />
                  <span>Cold Starts vs Warm Hits Breakdown</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Distribution of client requests hitting cold isolate instantiations vs warm cached memory.
                </p>
              </div>

              <div className="h-56 w-full">
                <Bar 
                  data={buildColdVsWarmBreakdownData()} 
                  options={{
                    ...chartOptionsBase,
                    scales: {
                      ...chartOptionsBase.scales,
                      x: { ...chartOptionsBase.scales.x, stacked: true },
                      y: { ...chartOptionsBase.scales.y, stacked: true }
                    }
                  }} 
                />
              </div>

              <div className="pt-2.5 mt-2 border-t border-[#1c2433] flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Baseline Cold Rate: <strong className="text-rose-400">{activeModesData.none?.metrics.coldStartRatePercent}%</strong></span>
                <span>ProphetX Cold Rate: <strong className="text-emerald-400">{activeModesData.adaptive?.metrics.coldStartRatePercent}%</strong></span>
              </div>
            </div>

            {/* Graph 3: Synthetic Ping Utility & Wasted Overhead */}
            <div className="surface-card p-4 border border-[#232c3d]">
              <div className="mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Synthetic Ping Utility: Useful vs Wasted</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Compares useful warm-up pings (prevented cold boot) vs redundant pings hitting warm isolates.
                </p>
              </div>

              <div className="h-56 w-full">
                <Bar 
                  data={buildPingUtilityData()} 
                  options={chartOptionsBase} 
                />
              </div>

              <div className="pt-2.5 mt-2 border-t border-[#1c2433] flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Naive Waste: <strong className="text-amber-400">{activeModesData.naive?.metrics.wastedWarmupCount} pings ({activeModesData.naive?.metrics.wastedWarmupRatePercent}%)</strong></span>
                <span>ProphetX Waste: <strong className="text-emerald-400">{activeModesData.adaptive?.metrics.wastedWarmupCount} pings ({activeModesData.adaptive?.metrics.wastedWarmupRatePercent}%)</strong></span>
              </div>
            </div>

          </div>

          {/* ── GRAPH 4: Tail Latency Percentiles (P50, P95, P99) ── */}
          <div className="surface-card p-4 border border-[#232c3d]">
            <div className="mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-cyan-400" />
                <span>Tail Latency SLA Guarantees (P50 Median, P95 Tail, P99 Peak)</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Latency percentiles across strategies under the active <strong className="text-slate-200">{preset}</strong> workload.
              </p>
            </div>

            <div className="h-52 w-full">
              <Bar 
                data={buildPercentileLatencyData()} 
                options={chartOptionsBase} 
              />
            </div>
          </div>

        </div>
      )}

      {/* ── MODE VIEW: SPECIFIC STRATEGY DEEP-DIVE (NONE / NAIVE / ADAPTIVE) ── */}
      {activeTab !== 'comparative' && (
        <div className="space-y-4">
          
          {/* Deep-dive mode header */}
          <div className="surface-card p-3.5 border border-[#232c3d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1219]">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold uppercase tracking-wider text-slate-100">
                  {activeTab === 'none' 
                    ? 'None — Zero Pre-Warming Baseline' 
                    : activeTab === 'naive' 
                    ? 'Naive — Fixed 2.0s Cron Warmer' 
                    : 'ProphetX — ML-Guided Adaptive Pre-Warming'}
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-mono rounded-sm ${
                  activeTab === 'none' 
                    ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                    : activeTab === 'naive' 
                    ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {activeTab === currentMode ? 'ACTIVE RUNTIME MODE' : 'SIMULATION CANDIDATE'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {activeTab === 'none' && 'Isolates expire after 3,500ms idle timeout. Every subsequent request suffers a full cold startup boot.'}
                {activeTab === 'naive' && 'Dispatches synthetic pings on a fixed 2,000ms periodic interval regardless of user presence, creating heavy cost overhead.'}
                {activeTab === 'adaptive' && 'Forecasts upcoming traffic surges & approaching isolate timeouts, firing surgical keep-alive requests only when utility is guaranteed.'}
              </p>
            </div>

            {activeTab !== currentMode && (
              <button
                onClick={() => onSelectMode(activeTab)}
                className="px-3 py-1.5 rounded-sm bg-teal-800 hover:bg-teal-700 text-teal-100 text-xs font-mono font-medium transition-colors shrink-0 border border-teal-600"
              >
                Set as Active Strategy
              </button>
            )}
          </div>

          {/* Metric KPI Pills */}
          {singleModeMetrics && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="surface-card p-2.5 border border-[#232c3d] text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Cold Start Rate</span>
                <strong className={`text-sm font-mono ${singleModeMetrics.coldStartRatePercent > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {singleModeMetrics.coldStartRatePercent}%
                </strong>
              </div>
              <div className="surface-card p-2.5 border border-[#232c3d] text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">P95 Tail Latency</span>
                <strong className="text-sm font-mono text-slate-200">
                  {singleModeMetrics.p95LatencyMs}ms
                </strong>
              </div>
              <div className="surface-card p-2.5 border border-[#232c3d] text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Synthetic Pings</span>
                <strong className="text-sm font-mono text-indigo-400">
                  {singleModeMetrics.totalSyntheticRequests}
                </strong>
              </div>
              <div className="surface-card p-2.5 border border-[#232c3d] text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Wasted Pings</span>
                <strong className={`text-sm font-mono ${singleModeMetrics.wastedWarmupCount > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {singleModeMetrics.wastedWarmupCount} ({singleModeMetrics.wastedWarmupRatePercent}%)
                </strong>
              </div>
              <div className="surface-card p-2.5 border border-[#232c3d] text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Avoided Boots</span>
                <strong className="text-sm font-mono text-cyan-300">
                  {singleModeMetrics.coldStartsAvoided}
                </strong>
              </div>
              <div className="surface-card p-2.5 border border-[#232c3d] text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Net Efficiency</span>
                <strong className="text-sm font-mono text-emerald-400">
                  {singleModeMetrics.netInvocationEfficiencyRatio}x
                </strong>
              </div>
            </div>
          )}

          {/* Single Mode Latency Chart */}
          <div className="surface-card p-4 border border-[#232c3d]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-[#232c3d]">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-teal-400" />
                  <span>Sequential Invocations Latency Timeline ({singleModeLogs.length} events)</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Detailed timeline for mode "{activeTab}". Red = Cold Boot (60-75ms), Green = Warm Hit (1-3ms), Purple = Synthetic Ping.
                </p>
              </div>

              <div className="flex items-center space-x-3 text-[11px] font-mono">
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Cold Start
                </span>
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Warm Hit
                </span>
                <span className="flex items-center gap-1 text-indigo-400">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" /> Synthetic Ping
                </span>
              </div>
            </div>

            <div className="h-60 w-full">
              <Line data={singleChartData} options={lineChartOptions} />
            </div>
          </div>

          {/* V8 Isolate Fleet Tracker & Event Terminal Log */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* V8 Isolate Fleet Tracker */}
            <div className="surface-card p-4 border border-[#232c3d] flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-[#232c3d]">
                  <Cpu className="w-4 h-4 text-teal-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    V8 Isolate Fleet Tracker ({singleModeIsolates.length} isolates)
                  </h4>
                </div>

                <p className="text-[11px] text-slate-400 mb-3">
                  Local isolates tracked in-memory. Eviction triggers automatically after 3,500ms of inactivity.
                </p>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {singleModeIsolates.length === 0 ? (
                    <div className="text-xs text-slate-500 font-mono p-3 bg-[#10151f] rounded-sm border border-[#232c3d]">
                      No active isolates. Dispatch a request to instantiate V8 isolates.
                    </div>
                  ) : (
                    singleModeIsolates.map((iso) => (
                      <div
                        key={iso.id}
                        className="p-2.5 rounded-sm bg-[#10151f] border border-[#232c3d] text-xs font-mono space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{iso.id}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-sm font-medium ${
                              iso.status === 'WARM' || iso.status === 'warm'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                : iso.status === 'COLD_START' || iso.status === 'cold_init'
                                ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {iso.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Served: {iso.requestsServed ?? iso.totalInvocations ?? 0}</span>
                          <span>Last active: {Math.max(0, Math.round((Date.now() - iso.lastActiveTime) / 1000))}s ago</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-[#232c3d] text-[11px] text-slate-500 font-mono flex justify-between">
                <span>Eviction Threshold: 3,500ms</span>
                <span>Active: {singleModeIsolates.filter((i) => i.status === 'WARM' || i.status === 'warm').length}</span>
              </div>
            </div>

            {/* Event Terminal Log */}
            <div className="lg:col-span-2 surface-card p-4 border border-[#232c3d] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#232c3d]">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Telemetry Ingestion Log ({filteredLogs.length} events)
                    </h4>
                  </div>

                  <div className="flex items-center space-x-1.5 text-[11px] font-mono">
                    <button
                      onClick={() => setLogFilter('all')}
                      className={`px-2 py-0.5 rounded-sm ${logFilter === 'all' ? 'bg-[#1e2736] text-teal-300' : 'text-slate-400'}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setLogFilter('cold')}
                      className={`px-2 py-0.5 rounded-sm ${logFilter === 'cold' ? 'bg-rose-950 text-rose-300' : 'text-slate-400'}`}
                    >
                      Cold
                    </button>
                    <button
                      onClick={() => setLogFilter('warm')}
                      className={`px-2 py-0.5 rounded-sm ${logFilter === 'warm' ? 'bg-emerald-950 text-emerald-300' : 'text-slate-400'}`}
                    >
                      Warm
                    </button>
                    <button
                      onClick={() => setLogFilter('synthetic')}
                      className={`px-2 py-0.5 rounded-sm ${logFilter === 'synthetic' ? 'bg-indigo-950 text-indigo-300' : 'text-slate-400'}`}
                    >
                      Ping
                    </button>
                  </div>
                </div>

                <div className="h-56 overflow-y-auto bg-[#0a0d14] rounded-sm border border-[#232c3d] p-2.5 font-mono text-[11px] space-y-1">
                  {filteredLogs.length === 0 ? (
                    <div className="text-slate-600">No events matching the selected filter.</div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div
                        key={log.requestId}
                        className="flex items-center space-x-2 text-slate-300 leading-tight"
                      >
                        <span className="text-slate-500 shrink-0">[{log.simulatedHour}:00 UTC]</span>
                        <span className="text-teal-400 shrink-0">req_{String(log.requestId).padStart(4, '0')}</span>
                        <span className="text-slate-600">•</span>
                        <span
                          className={`shrink-0 font-medium ${
                            log.isCold
                              ? 'text-rose-400'
                              : log.isSyntheticPing
                              ? 'text-indigo-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {log.isSyntheticPing
                            ? '[SYNTHETIC_PING]'
                            : log.isCold
                            ? '[COLD_BOOT]'
                            : '[WARM_HIT]'}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400">{log.isolateId}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-slate-200">{log.latencyMs.toFixed(1)}ms</span>
                        {log.preWarmActionTaken && (
                          <span className="text-emerald-400 ml-auto shrink-0 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            [SURGICAL_PREWARMED]
                          </span>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>

              <div className="pt-2 border-t border-[#232c3d] text-[11px] text-slate-500 font-mono flex justify-between">
                <span>Filter: {logFilter}</span>
                <span>Active Mode: {activeTab}</span>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};

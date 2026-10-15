import React, { useState } from 'react';
import type { ModeMetrics, WarmingMode, RealExperimentalReport } from '../types';
import { Bar, Line, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { 
  BarChart3, 
  LineChart as LineIcon, 
  Activity, 
  Layers, 
  SlidersHorizontal, 
  Filter, 
  Download, 
  Check
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CustomTelemetryStudioProps {
  comparisonData: Record<WarmingMode, ModeMetrics>;
  benchmarkReport: RealExperimentalReport;
  isRealDataMode: boolean;
  onToggleDataSource: (real: boolean) => void;
}

type GraphType = 'bar' | 'line' | 'radar';

interface MetricDef {
  id: string;
  label: string;
  category: 'latency' | 'economy' | 'volume';
  unit: string;
  getter: (m: ModeMetrics) => number;
}

export const CustomTelemetryStudio: React.FC<CustomTelemetryStudioProps> = ({
  comparisonData,
  benchmarkReport,
  isRealDataMode,
  onToggleDataSource
}) => {
  // Graph configuration state
  const [graphType, setGraphType] = useState<GraphType>('bar');
  const [isLogScale, setIsLogScale] = useState<boolean>(false);
  const [showNoneMode, setShowNoneMode] = useState<boolean>(true);
  const [showNaiveMode, setShowNaiveMode] = useState<boolean>(true);
  const [showPredictiveMode, setShowPredictiveMode] = useState<boolean>(true);

  // All available observation points
  const allMetricDefs: MetricDef[] = [
    { id: 'cold_rate', label: 'Cold Start Rate', category: 'economy', unit: '%', getter: (m) => m?.coldStartRatePercent ?? 0 },
    { id: 'p95_lat', label: 'P95 Latency', category: 'latency', unit: 'ms', getter: (m) => m?.p95LatencyMs ?? 0 },
    { id: 'p99_lat', label: 'P99 Tail Latency', category: 'latency', unit: 'ms', getter: (m) => m?.p99LatencyMs ?? 0 },
    { id: 'p50_lat', label: 'P50 Median Latency', category: 'latency', unit: 'ms', getter: (m) => m?.p50LatencyMs ?? 0 },
    { id: 'avg_lat', label: 'Average Latency', category: 'latency', unit: 'ms', getter: (m) => m?.avgLatencyMs ?? 0 },
    { id: 'wasted_rate', label: 'Wasted Warmup Rate', category: 'economy', unit: '%', getter: (m) => m?.wastedWarmupRatePercent ?? 0 },
    { id: 'net_eff', label: 'Net Efficiency Ratio', category: 'economy', unit: 'x', getter: (m) => m?.netInvocationEfficiencyRatio ?? 0 },
    { id: 'cold_avoided', label: 'Cold Starts Avoided', category: 'volume', unit: '', getter: (m) => m?.coldStartsAvoided ?? 0 },
    { id: 'synth_pings', label: 'Synthetic Pings Issued', category: 'volume', unit: '', getter: (m) => m?.totalSyntheticRequests ?? 0 },
    { id: 'total_real', label: 'Total Real Workload', category: 'volume', unit: '', getter: (m) => m?.totalRealRequests ?? 0 },
  ];

  // Selected observation points (default subset)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'cold_rate',
    'p95_lat',
    'wasted_rate',
    'net_eff'
  ]);

  const toggleMetric = (id: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((m) => m !== id)
          : prev // keep at least 1
        : [...prev, id]
    );
  };

  // Active data sources based on Phase 9 report or Simulator
  const activeReport = isRealDataMode
    ? {
        none: benchmarkReport.modes.none,
        naive: benchmarkReport.modes.naive,
        predictive: benchmarkReport.modes.predictive
      }
    : {
        none: comparisonData.none,
        naive: comparisonData.naive,
        predictive: comparisonData.adaptive
      };

  // Filtered active metrics
  const activeMetricList = allMetricDefs.filter((m) => selectedMetrics.includes(m.id));

  // Build Chart Datasets for Bar Chart
  const barChartData = {
    labels: activeMetricList.map((m) => `${m.label} (${m.unit || 'count'})`),
    datasets: [
      ...(showNoneMode
        ? [
            {
              label: 'None (Baseline)',
              data: activeMetricList.map((m) => m.getter(activeReport.none)),
              backgroundColor: 'rgba(225, 29, 72, 0.72)',
              borderColor: '#e11d48',
              borderWidth: 1.5,
              borderRadius: 3,
            }
          ]
        : []),
      ...(showNaiveMode
        ? [
            {
              label: 'Naive (2.0s Fixed Cron)',
              data: activeMetricList.map((m) => m.getter(activeReport.naive)),
              backgroundColor: 'rgba(217, 119, 6, 0.72)',
              borderColor: '#d97706',
              borderWidth: 1.5,
              borderRadius: 3,
            }
          ]
        : []),
      ...(showPredictiveMode
        ? [
            {
              label: 'Predictive (Adaptive Pre-Warming)',
              data: activeMetricList.map((m) => m.getter(activeReport.predictive)),
              backgroundColor: 'rgba(16, 185, 129, 0.75)',
              borderColor: '#10b981',
              borderWidth: 1.5,
              borderRadius: 3,
            }
          ]
        : [])
    ]
  };

  // Build Chart Datasets for Line Curves (Percentiles)
  const lineChartData = {
    labels: ['P50 Median', 'Avg Latency', 'P95 Tail', 'P99 Spike'],
    datasets: [
      ...(showNoneMode
        ? [
            {
              label: 'None Mode (ms)',
              data: [
                activeReport.none?.p50LatencyMs || 0,
                activeReport.none?.avgLatencyMs || 0,
                activeReport.none?.p95LatencyMs || 0,
                activeReport.none?.p99LatencyMs || 0,
              ],
              borderColor: '#e11d48',
              backgroundColor: 'rgba(225, 29, 72, 0.15)',
              tension: 0.35,
              fill: true,
              pointRadius: 4,
            }
          ]
        : []),
      ...(showNaiveMode
        ? [
            {
              label: 'Naive Mode (ms)',
              data: [
                activeReport.naive?.p50LatencyMs || 0,
                activeReport.naive?.avgLatencyMs || 0,
                activeReport.naive?.p95LatencyMs || 0,
                activeReport.naive?.p99LatencyMs || 0,
              ],
              borderColor: '#d97706',
              backgroundColor: 'rgba(217, 119, 6, 0.15)',
              tension: 0.35,
              fill: true,
              pointRadius: 4,
            }
          ]
        : []),
      ...(showPredictiveMode
        ? [
            {
              label: 'Predictive Mode (ms)',
              data: [
                activeReport.predictive?.p50LatencyMs || 0,
                activeReport.predictive?.avgLatencyMs || 0,
                activeReport.predictive?.p95LatencyMs || 0,
                activeReport.predictive?.p99LatencyMs || 0,
              ],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.25)',
              tension: 0.35,
              fill: true,
              pointRadius: 5,
              pointHoverRadius: 7,
            }
          ]
        : [])
    ]
  };

  // Build Radar Dataset (Normalized 0-100 Score)
  const radarChartData = {
    labels: [
      'Cold Start Immunity',
      'Warmup Invocation Economy',
      'Tail Latency Suppression',
      'Net Invoc Efficiency (x100)',
      'Real Workload Quality'
    ],
    datasets: [
      ...(showNoneMode
        ? [
            {
              label: 'None (Baseline)',
              data: [
                Math.max(0, 100 - (activeReport.none?.coldStartRatePercent || 0) * 8),
                100, // zero warmups
                Math.max(0, 100 - (activeReport.none?.p95LatencyMs || 0)),
                (activeReport.none?.netInvocationEfficiencyRatio || 0) * 100,
                90
              ],
              borderColor: '#e11d48',
              backgroundColor: 'rgba(225, 29, 72, 0.2)',
              pointBackgroundColor: '#e11d48'
            }
          ]
        : []),
      ...(showNaiveMode
        ? [
            {
              label: 'Naive Cron',
              data: [
                Math.max(0, 100 - (activeReport.naive?.coldStartRatePercent || 0) * 8),
                Math.max(0, 100 - (activeReport.naive?.wastedWarmupRatePercent || 0) * 4),
                Math.max(0, 100 - (activeReport.naive?.p95LatencyMs || 0)),
                (activeReport.naive?.netInvocationEfficiencyRatio || 0) * 100,
                90
              ],
              borderColor: '#d97706',
              backgroundColor: 'rgba(217, 119, 6, 0.2)',
              pointBackgroundColor: '#d97706'
            }
          ]
        : []),
      ...(showPredictiveMode
        ? [
            {
              label: 'Predictive Engine',
              data: [
                Math.max(0, 100 - (activeReport.predictive?.coldStartRatePercent || 0) * 8),
                Math.max(0, 100 - (activeReport.predictive?.wastedWarmupRatePercent || 0) * 4),
                Math.max(0, 100 - (activeReport.predictive?.p95LatencyMs || 0)),
                (activeReport.predictive?.netInvocationEfficiencyRatio || 0) * 100,
                98
              ],
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.3)',
              pointBackgroundColor: '#10b981'
            }
          ]
        : [])
    ]
  };

  const cartesianChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#cbd5e1',
          font: { family: 'ui-monospace, monospace', size: 11 },
          boxWidth: 12
        }
      },
      tooltip: {
        backgroundColor: '#0a0d14',
        borderColor: '#293440',
        borderWidth: 1,
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        titleFont: { family: 'ui-monospace, monospace', size: 12 },
        bodyFont: { family: 'ui-monospace, monospace', size: 11 }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(41, 52, 64, 0.45)' },
        ticks: { color: '#94a3b8', font: { family: 'ui-monospace, monospace', size: 10 } }
      },
      y: {
        type: isLogScale ? ('logarithmic' as const) : ('linear' as const),
        grid: { color: 'rgba(41, 52, 64, 0.45)' },
        ticks: { color: '#94a3b8', font: { family: 'ui-monospace, monospace', size: 10 } }
      }
    }
  };

  const radarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#cbd5e1',
          font: { family: 'ui-monospace, monospace', size: 11 },
          boxWidth: 12
        }
      },
      tooltip: {
        backgroundColor: '#0a0d14',
        borderColor: '#293440',
        borderWidth: 1,
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        titleFont: { family: 'ui-monospace, monospace', size: 12 },
        bodyFont: { family: 'ui-monospace, monospace', size: 11 }
      }
    },
    scales: {
      r: {
        grid: { color: 'rgba(41, 52, 64, 0.55)' },
        pointLabels: { color: '#cbd5e1', font: { family: 'ui-monospace, monospace', size: 10 } },
        ticks: { color: '#64748b', backdropColor: 'transparent', font: { size: 9 } }
      }
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = 'Metric,None Mode,Naive Mode,Predictive Mode\n';
    for (const m of activeMetricList) {
      csv += `"${m.label} (${m.unit})",${m.getter(activeReport.none)},${m.getter(activeReport.naive)},${m.getter(activeReport.predictive)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom_telemetry_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="surface-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#232c3d]">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-md bg-[#111927] border border-teal-500/50 flex items-center justify-center text-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.2)]">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-100 uppercase">
                Customizable Telemetry Studio & Observation Station
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-teal-950/80 text-teal-300 border border-teal-800/60">
                Multi-Axis Graph Filter
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize observation points, filter baseline series, and switch between multi-bar, percentile curve, and radar projections.
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center space-x-2">
          {/* Data Source Selector */}
          <div className="flex items-center bg-[#0d1219] p-0.5 rounded-md border border-[#232c3d] text-xs font-mono">
            <button
              onClick={() => onToggleDataSource(true)}
              className={`px-2.5 py-1 rounded transition-colors ${
                isRealDataMode
                  ? 'bg-[#1e2736] text-teal-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Phase 9 Data
            </button>
            <button
              onClick={() => onToggleDataSource(false)}
              className={`px-2.5 py-1 rounded transition-colors ${
                !isRealDataMode
                  ? 'bg-[#1e2736] text-teal-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Simulator
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-md bg-[#10151c] hover:bg-[#18202d] border border-[#293440] text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-all active:scale-95"
            title="Download active customized observation points as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tactile Control Station: Mode Filter & Chart Type */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Strategy Comparator Toggles (Left 6 cols) */}
        <div className="md:col-span-6 surface-card p-3.5 border border-[#232c3d] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-1.5 border-b border-[#232c3d]">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-teal-400" />
              <span>ACTIVE COMPARATOR SERIES:</span>
            </span>
            <span className="text-[10px]">SELECT TO HIDE/SHOW</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* None Mode Tactile Toggle */}
            <button
              onClick={() => setShowNoneMode(!showNoneMode)}
              className={`py-2 px-2.5 rounded-md text-xs font-mono font-medium flex items-center justify-between border transition-all ${
                showNoneMode
                  ? 'bg-rose-950/70 text-rose-300 border-rose-800 shadow-[0_0_10px_rgba(225,29,72,0.25)]'
                  : 'bg-[#0f141c] text-slate-500 border-[#232c3d] opacity-60'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className={`w-2 h-2 rounded-full ${showNoneMode ? 'bg-rose-400 shadow-[0_0_6px_#e11d48]' : 'bg-slate-600'}`} />
                <span>None</span>
              </span>
              {showNoneMode && <Check className="w-3 h-3 text-rose-400 shrink-0" />}
            </button>

            {/* Naive Mode Tactile Toggle */}
            <button
              onClick={() => setShowNaiveMode(!showNaiveMode)}
              className={`py-2 px-2.5 rounded-md text-xs font-mono font-medium flex items-center justify-between border transition-all ${
                showNaiveMode
                  ? 'bg-amber-950/70 text-amber-300 border-amber-800 shadow-[0_0_10px_rgba(217,119,6,0.25)]'
                  : 'bg-[#0f141c] text-slate-500 border-[#232c3d] opacity-60'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className={`w-2 h-2 rounded-full ${showNaiveMode ? 'bg-amber-400 shadow-[0_0_6px_#d97706]' : 'bg-slate-600'}`} />
                <span>Naive</span>
              </span>
              {showNaiveMode && <Check className="w-3 h-3 text-amber-400 shrink-0" />}
            </button>

            {/* Predictive Mode Tactile Toggle */}
            <button
              onClick={() => setShowPredictiveMode(!showPredictiveMode)}
              className={`py-2 px-2.5 rounded-md text-xs font-mono font-medium flex items-center justify-between border transition-all ${
                showPredictiveMode
                  ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                  : 'bg-[#0f141c] text-slate-500 border-[#232c3d] opacity-60'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <span className={`w-2 h-2 rounded-full ${showPredictiveMode ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-slate-600'}`} />
                <span>Predictive</span>
              </span>
              {showPredictiveMode && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
            </button>
          </div>
        </div>

        {/* Graph Projection & Scale Controls (Right 6 cols) */}
        <div className="md:col-span-6 surface-card p-3.5 border border-[#232c3d] space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-1.5 border-b border-[#232c3d]">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>GRAPH PROJECTION TYPE:</span>
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px]">LOG SCALE:</span>
              <button
                onClick={() => setIsLogScale(!isLogScale)}
                disabled={graphType === 'radar'}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                  isLogScale && graphType !== 'radar'
                    ? 'bg-teal-950 text-teal-300 border-teal-700'
                    : 'bg-[#10151c] text-slate-500 border-[#232c3d]'
                }`}
              >
                {isLogScale ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setGraphType('bar')}
              className={`py-2 px-2.5 rounded-md text-xs font-mono flex items-center justify-center gap-1.5 border transition-all ${
                graphType === 'bar'
                  ? 'bg-[#192435] text-teal-300 border-teal-500/80 shadow-[0_0_10px_rgba(45,212,191,0.2)]'
                  : 'bg-[#10151c] text-slate-400 border-[#232c3d] hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bar Group</span>
            </button>

            <button
              onClick={() => setGraphType('line')}
              className={`py-2 px-2.5 rounded-md text-xs font-mono flex items-center justify-center gap-1.5 border transition-all ${
                graphType === 'line'
                  ? 'bg-[#192435] text-teal-300 border-teal-500/80 shadow-[0_0_10px_rgba(45,212,191,0.2)]'
                  : 'bg-[#10151c] text-slate-400 border-[#232c3d] hover:text-slate-200'
              }`}
            >
              <LineIcon className="w-3.5 h-3.5" />
              <span>Percentiles</span>
            </button>

            <button
              onClick={() => setGraphType('radar')}
              className={`py-2 px-2.5 rounded-md text-xs font-mono flex items-center justify-center gap-1.5 border transition-all ${
                graphType === 'radar'
                  ? 'bg-[#192435] text-teal-300 border-teal-500/80 shadow-[0_0_10px_rgba(45,212,191,0.2)]'
                  : 'bg-[#10151c] text-slate-400 border-[#232c3d] hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Radar Multi</span>
            </button>
          </div>
        </div>

      </div>

      {/* Observation Points Tactile Switchboard */}
      <div className="surface-card p-4 border border-[#232c3d] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#232c3d] gap-2">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Custom Observation Points Filter ({selectedMetrics.length} Active)
            </h3>
          </div>
          <div className="flex items-center space-x-2 text-[11px] font-mono">
            <button
              onClick={() => setSelectedMetrics(allMetricDefs.map((m) => m.id))}
              className="text-slate-400 hover:text-teal-300 underline"
            >
              Select All
            </button>
            <span className="text-slate-600">•</span>
            <button
              onClick={() => setSelectedMetrics(['cold_rate', 'p95_lat', 'wasted_rate', 'net_eff'])}
              className="text-slate-400 hover:text-teal-300 underline"
            >
              Core 4
            </button>
          </div>
        </div>

        {/* 10 Tactile Observation Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {allMetricDefs.map((def) => {
            const isSelected = selectedMetrics.includes(def.id);
            return (
              <button
                key={def.id}
                onClick={() => toggleMetric(def.id)}
                className={`py-2 px-2.5 rounded-md border text-[11px] font-mono text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#14202e] text-slate-100 border-teal-500/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_0_8px_rgba(45,212,191,0.15)]'
                    : 'bg-[#0f141c] text-slate-500 border-[#232c3d] hover:text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{def.category}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-teal-400 shadow-[0_0_5px_#2dd4bf]' : 'bg-slate-700'}`} />
                </div>
                <div className="font-semibold text-slate-200 truncate">{def.label}</div>
                <div className="text-[10px] text-teal-400/80 mt-0.5">
                  Unit: {def.unit ? def.unit : 'count'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Chart Display Box */}
      <div className="surface-card p-5 border border-[#232c3d] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#232c3d]">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
              {graphType === 'bar'
                ? 'Grouped Observation Metric Comparison'
                : graphType === 'line'
                ? 'Latency Distribution Percentile Curves (P50 to P99)'
                : '5-Axis System Optimization & Tradeoff Radar'}
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {isRealDataMode ? 'Verified Test Telemetry' : 'Simulator Workload'}
          </div>
        </div>

        {/* Dynamic Chart Container */}
        <div className="h-[380px] sm:h-[440px] w-full relative">
          {graphType === 'bar' && <Bar data={barChartData} options={cartesianChartOptions} />}
          {graphType === 'line' && <Line data={lineChartData} options={cartesianChartOptions} />}
          {graphType === 'radar' && <Radar data={radarChartData} options={radarChartOptions} />}
        </div>
      </div>

      {/* Observation Table with Exact Values & Deltas */}
      <div className="surface-card p-4 sm:p-5 border border-[#232c3d] space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#232c3d]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Granular Telemetry Matrix & Cold-Start Deltas
          </h3>
          <span className="text-[10px] font-mono text-slate-500">LIVE AGGREGATION</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#232c3d] text-slate-400 text-[11px]">
                <th className="py-2 px-3">OBSERVATION POINT</th>
                {showNoneMode && <th className="py-2 px-3 text-rose-400">NONE (BASELINE)</th>}
                {showNaiveMode && <th className="py-2 px-3 text-amber-400">NAIVE CRON (2.0s)</th>}
                {showPredictiveMode && <th className="py-2 px-3 text-emerald-400">PREDICTIVE ENGINE</th>}
                <th className="py-2 px-3 text-teal-400">PREDICTIVE DELTA / ADVANTAGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b232e] text-slate-300">
              {activeMetricList.map((m) => {
                const valNone = m.getter(activeReport.none);
                const valNaive = m.getter(activeReport.naive);
                const valPred = m.getter(activeReport.predictive);

                let deltaText = '—';
                if (m.id === 'cold_rate') {
                  const reduction = valNone > 0 ? (((valNone - valPred) / valNone) * 100).toFixed(1) : '0';
                  deltaText = `-${reduction}% cold starts vs none`;
                } else if (m.id === 'wasted_rate') {
                  const reduction = valNaive > 0 ? (((valNaive - valPred) / valNaive) * 100).toFixed(1) : '0';
                  deltaText = `-${reduction}% wasted warmups vs naive`;
                } else if (m.id === 'net_eff') {
                  deltaText = `${valPred.toFixed(2)}x efficiency (>1.0 favorable)`;
                } else if (m.id.includes('lat')) {
                  const diff = (valNone - valPred).toFixed(1);
                  deltaText = `${diff}ms latency saved vs none`;
                } else if (m.id === 'cold_avoided') {
                  deltaText = `+${valPred} cold starts intercepted`;
                }

                return (
                  <tr key={m.id} className="hover:bg-[#141b25] transition-colors">
                    <td className="py-2 px-3 font-semibold text-slate-200">
                      {m.label} <span className="text-slate-500 font-normal">({m.unit || 'count'})</span>
                    </td>
                    {showNoneMode && (
                      <td className="py-2 px-3 text-rose-300">
                        {valNone} {m.unit}
                      </td>
                    )}
                    {showNaiveMode && (
                      <td className="py-2 px-3 text-amber-300">
                        {valNaive} {m.unit}
                      </td>
                    )}
                    {showPredictiveMode && (
                      <td className="py-2 px-3 text-emerald-300 font-bold">
                        {valPred} {m.unit}
                      </td>
                    )}
                    <td className="py-2 px-3 text-teal-300 font-semibold">
                      {deltaText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

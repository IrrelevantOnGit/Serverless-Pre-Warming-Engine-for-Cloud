import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Layers, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Filter
} from 'lucide-react';

interface PhaseRoadmapProps {
  onNavigateTab?: (tab: string) => void;
}

interface PhaseItem {
  phase: string;
  title: string;
  desc: string;
  category: 'infra' | 'ml' | 'benchmark' | 'traffic';
  metric: string;
  deliverable: string;
  targetTab: string;
}

export const PhaseRoadmap: React.FC<PhaseRoadmapProps> = ({ onNavigateTab }) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'infra' | 'ml' | 'benchmark' | 'traffic'>('all');
  const [expandedPhase, setExpandedPhase] = useState<string | null>('Phase 9');
  const [copiedReport, setCopiedReport] = useState(false);

  const phases: PhaseItem[] = [
    {
      phase: 'Phase 0',
      title: 'Project Scaffolding & Wrangler Config',
      desc: 'Initialized Cloudflare Workers environment, Wrangler TOML, and TypeScript definitions.',
      category: 'infra',
      metric: '4 micro-workers configured',
      deliverable: 'wrangler.toml, tsconfig.json, npm scripts',
      targetTab: 'functions'
    },
    {
      phase: 'Phase 1',
      title: 'Target Worker & V8 Isolate Instrumentation',
      desc: 'Implemented cold vs warm state detection via global boolean and performance.now() latency timing.',
      category: 'infra',
      metric: 'Cold detection: 100% precision',
      deliverable: 'worker/target/index.ts (global IS_COLD_BOOT)',
      targetTab: 'probe'
    },
    {
      phase: 'Phase 2',
      title: 'Telemetry Logging to Workers KV',
      desc: 'Asynchronous, non-blocking telemetry logging to TRAFFIC_KV using ctx.waitUntil().',
      category: 'infra',
      metric: '0.0ms user thread blocking',
      deliverable: 'worker/target KV persistence layer',
      targetTab: 'probe'
    },
    {
      phase: 'Phase 3',
      title: 'Synthetic Traffic Generator',
      desc: 'Diurnal seasonality load generator with sinusoidal day/night curves and burst spike injections.',
      category: 'traffic',
      metric: '24-hour sinusoidal wave + Poisson bursts',
      deliverable: 'traffic/generator.py & in-browser simulator',
      targetTab: 'simulator'
    },
    {
      phase: 'Phase 4',
      title: 'Baseline Mode None Benchmarking',
      desc: 'Benchmarked on-demand execution with zero synthetic pre-warming (9.09% cold start rate).',
      category: 'benchmark',
      metric: '9.09% cold starts, 68ms P95',
      deliverable: 'metrics/baseline_none_benchmark.json',
      targetTab: 'benchmark'
    },
    {
      phase: 'Phase 5',
      title: 'Baseline Mode Naive Benchmarking',
      desc: 'Evaluated fixed 2.0s periodic cron warmer, documenting 15.09% redundant ping overhead.',
      category: 'benchmark',
      metric: '15.09% wasted synthetic warmups',
      deliverable: 'worker/naive-warmer cron worker',
      targetTab: 'benchmark'
    },
    {
      phase: 'Phase 6',
      title: 'Offline ML Time-Series Forecasting',
      desc: 'Trained Scikit-Learn RandomForestRegressor on time-series telemetry (F1: 91.7%, MAE: 27.8).',
      category: 'ml',
      metric: 'F1: 91.7%, Recall: 92.3%, MAE: 27.8',
      deliverable: 'models/train_forecaster.py (Scikit-Learn pipeline)',
      targetTab: 'onnx'
    },
    {
      phase: 'Phase 7',
      title: 'ONNX Export & Edge Inference Worker',
      desc: 'Converted Scikit-Learn model to ONNX format and deployed worker/predictor for sub-millisecond edge scoring.',
      category: 'ml',
      metric: '0.42ms edge inference latency',
      deliverable: 'models/random_forest.onnx & worker/predictor',
      targetTab: 'onnx'
    },
    {
      phase: 'Phase 8',
      title: 'Warm-up Dispatcher & Predictive Pipeline',
      desc: 'Constructed worker/dispatcher to ping target worker when spike probability >= 70%.',
      category: 'infra',
      metric: '1.00 net invocation efficiency ratio',
      deliverable: 'worker/dispatcher pre-warm orchestrator',
      targetTab: 'functions'
    },
    {
      phase: 'Phase 9',
      title: 'Metrics Engine & Comparison Report',
      desc: 'Generated comprehensive comparison_report.json and comparison_report.csv benchmarking all 3 modes.',
      category: 'benchmark',
      metric: '45.0% cold start reduction, 75% fewer pings',
      deliverable: 'metrics/comparison_report.json & CSV',
      targetTab: 'benchmark'
    }
  ];

  const filteredPhases = selectedCategory === 'all'
    ? phases
    : phases.filter((p) => p.category === selectedCategory);

  const toggleExpand = (phaseName: string) => {
    setExpandedPhase(prev => (prev === phaseName ? null : phaseName));
  };

  const handleCopySummary = () => {
    const summary = phases.map(p => `${p.phase}: ${p.title} — ${p.metric}`).join('\n');
    navigator.clipboard.writeText(summary);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  return (
    <div className="surface-card p-4 space-y-4 mb-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#232c3d]">
        <div className="flex items-center space-x-2.5">
          <Layers className="w-4 h-4 text-teal-400" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Experimental Phases & Milestone Roadmap
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Technical milestones completed across telemetry instrumentation, offline modeling, and edge deployment.
            </p>
          </div>
        </div>

        <button
          onClick={handleCopySummary}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-sm bg-[#10151f] hover:bg-[#18202d] text-slate-300 border border-[#232c3d] text-xs font-mono transition-colors"
        >
          {copiedReport ? (
            <>
              <Check className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-teal-400">Roadmap Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy Milestone Summary</span>
            </>
          )}
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 flex items-center gap-1 font-mono text-[11px] mr-1">
          <Filter className="w-3 h-3 text-slate-400" />
          Filter:
        </span>
        {[
          { id: 'all', label: 'All Phases (10)' },
          { id: 'infra', label: 'Edge Workers & KV' },
          { id: 'traffic', label: 'Traffic & Sandbox' },
          { id: 'ml', label: 'Machine Learning & ONNX' },
          { id: 'benchmark', label: 'Empirical Benchmarks' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id as any)}
            className={`px-2.5 py-1 rounded-sm transition-colors font-medium ${
              selectedCategory === cat.id
                ? 'bg-[#18202d] text-teal-300 border border-teal-500/60'
                : 'bg-[#10151f] text-slate-400 border border-[#232c3d] hover:text-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid of Interactive Phase Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {filteredPhases.map((p) => {
          const isExpanded = expandedPhase === p.phase;
          return (
            <div
              key={p.phase}
              onClick={() => toggleExpand(p.phase)}
              className={`p-3 rounded-sm border transition-all cursor-pointer ${
                isExpanded
                  ? 'bg-[#141b27] border-teal-500/60'
                  : 'bg-[#10151f] border-[#232c3d] hover:border-[#2e384d]'
              }`}
            >
              <div className="flex items-start justify-between space-x-2">
                <div className="flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-sm bg-[#18202d] text-slate-300 border border-[#2e384d] font-semibold">
                        {p.phase}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">{p.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-normal">{p.desc}</p>
                  </div>
                </div>

                <div className="text-slate-500 shrink-0 mt-0.5">
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </div>

              {/* Expanded Details & Navigation Action */}
              {isExpanded && (
                <div className="mt-3 pt-2.5 border-t border-[#232c3d] space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-[11px] text-slate-300 bg-[#0d1219] p-2 rounded-sm border border-[#232c3d]">
                    <span className="text-slate-500">Metric Achieved:</span>
                    <strong className="text-teal-300">{p.metric}</strong>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-300 bg-[#0d1219] p-2 rounded-sm border border-[#232c3d]">
                    <span className="text-slate-500">Deliverable:</span>
                    <span className="text-slate-300 truncate max-w-[200px]">{p.deliverable}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateTab?.(p.targetTab);
                    }}
                    className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded-sm bg-teal-800/80 hover:bg-teal-700 text-white text-xs font-medium transition-colors mt-2"
                  >
                    <span>Launch {p.phase} Feature Tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

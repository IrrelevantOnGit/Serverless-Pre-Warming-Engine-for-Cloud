import React from 'react';
import { CheckCircle2, Layers } from 'lucide-react';

export const PhaseRoadmap: React.FC = () => {
  const phases = [
    { phase: 'Phase 0', title: 'Project Scaffolding & Wrangler Config', desc: 'Initialized Cloudflare Workers environment, Wrangler TOML, and TypeScript definitions.' },
    { phase: 'Phase 1', title: 'Target Worker & V8 Isolate Instrumentation', desc: 'Implemented cold vs warm state detection via global boolean and performance.now() latency timing.' },
    { phase: 'Phase 2', title: 'Telemetry Logging to Workers KV', desc: 'Asynchronous, non-blocking telemetry logging to TRAFFIC_KV using ctx.waitUntil().' },
    { phase: 'Phase 3', title: 'Synthetic Traffic Generator', desc: 'Diurnal seasonality load generator with sinusoidal day/night curves and burst spike injections.' },
    { phase: 'Phase 4', title: 'Baseline Mode None Benchmarking', desc: 'Benchmarked on-demand execution with zero synthetic pre-warming (9.09% cold start rate).' },
    { phase: 'Phase 5', title: 'Baseline Mode Naive Benchmarking', desc: 'Evaluated fixed 2.0s periodic cron warmer, documenting 15.09% redundant ping overhead.' },
    { phase: 'Phase 6', title: 'Offline ML Time-Series Forecasting', desc: 'Trained Scikit-Learn RandomForestRegressor on time-series telemetry (F1: 91.7%, MAE: 27.8).' },
    { phase: 'Phase 7', title: 'ONNX Export & Edge Inference Worker', desc: 'Converted Scikit-Learn model to ONNX format and deployed worker/predictor for sub-millisecond edge scoring.' },
    { phase: 'Phase 8', title: 'Warm-up Dispatcher & Predictive Pipeline', desc: 'Constructed worker/dispatcher to ping target worker when spike probability >= 70%.' },
    { phase: 'Phase 9', title: 'Metrics Engine & Comparison Report', desc: 'Generated comprehensive comparison_report.json and comparison_report.csv benchmarking all 3 modes.' }
  ];

  return (
    <div className="surface-card p-4 space-y-4 mb-5">
      <div className="flex items-center space-x-2.5 pb-2 border-b border-[#232c3d]">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {phases.map((p) => (
          <div
            key={p.phase}
            className="p-3 rounded-sm border border-[#232c3d] bg-[#10151f] flex items-start space-x-2.5"
          >
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
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import type { TrafficPreset, WarmingMode } from '../types';
import { 
  Play, 
  FastForward, 
  RotateCcw, 
  BarChart2, 
  Sun, 
  Zap, 
  Sliders, 
  PauseCircle,
  Activity
} from 'lucide-react';

interface TrafficControlsProps {
  preset: TrafficPreset;
  onSelectPreset: (preset: TrafficPreset) => void;
  requestCount: number;
  onChangeRequestCount: (count: number) => void;
  onRunSingle: () => void;
  onRunBatch: () => void;
  onRunComparison: () => void;
  onReset: () => void;
  isSimulating: boolean;
  currentMode: WarmingMode;
}

export const TrafficControls: React.FC<TrafficControlsProps> = ({
  preset,
  onSelectPreset,
  requestCount,
  onChangeRequestCount,
  onRunSingle,
  onRunBatch,
  onRunComparison,
  onReset,
  isSimulating,
  currentMode
}) => {
  const presets: { id: TrafficPreset; name: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      id: 'diurnal',
      name: 'Diurnal Seasonality',
      desc: '24-hour sinusoidal load curve peaking at 14:00 UTC.',
      icon: Sun
    },
    {
      id: 'spike',
      name: 'Transient Spike Cluster',
      desc: 'Sudden 10× traffic surge to evaluate edge detector responsiveness.',
      icon: Zap
    },
    {
      id: 'bursts',
      name: 'Intermittent Bursts',
      desc: 'Clustered Poisson-like request bursts with variable gaps.',
      icon: Activity
    },
    {
      id: 'idle_lull',
      name: 'Extended Idle (>3.5s)',
      desc: 'Prolonged intervals that trigger Cloudflare V8 isolate reclamation.',
      icon: PauseCircle
    }
  ];

  return (
    <div className="surface-card p-4 space-y-4 mb-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#232c3d]">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Synthetic Workload Ingestion Engine
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Inject controlled invocation patterns into the in-browser isolate simulator.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2 py-0.5 rounded-sm text-[11px] font-mono bg-[#10151f] text-slate-400 border border-[#232c3d]">
            In-Browser Sandbox
          </span>
          <span className="px-2 py-0.5 rounded-sm text-[11px] font-mono bg-[#10151f] text-slate-300 border border-[#232c3d]">
            Target Mode: <strong className="capitalize text-slate-100">{currentMode}</strong>
          </span>
        </div>
      </div>

      {/* Preset Profiles Selection */}
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-2">
          Workload Profile
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {presets.map((p) => {
            const Icon = p.icon;
            const isSelected = preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPreset(p.id)}
                className={`p-3 rounded-sm text-left transition-colors border ${
                  isSelected
                    ? 'bg-[#18202d] border-teal-500/80 text-slate-100'
                    : 'bg-[#10151f] border-[#232c3d] hover:border-[#2e384d] text-slate-300 hover:bg-[#141a24]'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-semibold">
                    {p.name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">{p.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slider & Actions Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center pt-2 border-t border-[#232c3d]">
        
        {/* Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Batch Invocations</span>
            <span className="font-mono text-slate-200 font-medium">{requestCount} reqs</span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={requestCount}
            onChange={(e) => onChangeRequestCount(Number(e.target.value))}
            className="w-full h-1 bg-[#18202d] rounded-sm appearance-none cursor-pointer accent-teal-500"
          />
        </div>

        {/* Buttons Action Bar */}
        <div className="lg:col-span-2 flex flex-wrap items-center gap-2">
          <button
            onClick={onRunSingle}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-[#18202d] hover:bg-[#20293a] text-slate-200 border border-[#2e384d] text-xs font-medium transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-slate-400" />
            <span>Single Step</span>
          </button>

          <button
            onClick={onRunBatch}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-sm bg-teal-700 hover:bg-teal-600 text-white text-xs font-medium transition-colors"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Inject Batch ({requestCount})</span>
          </button>

          <button
            onClick={onRunComparison}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-[#18202d] hover:bg-[#20293a] text-slate-200 border border-[#2e384d] text-xs font-medium transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Run Multi-Mode Comparison</span>
          </button>

          <button
            onClick={onReset}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-[#18202d] hover:bg-[#20293a] text-slate-400 hover:text-slate-200 border border-[#2e384d] text-xs font-medium transition-colors ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

      </div>

    </div>
  );
};

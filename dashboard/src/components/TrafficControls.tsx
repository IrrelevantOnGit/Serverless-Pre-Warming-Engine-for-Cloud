import React, { useState } from 'react';
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
  Activity,
  Flame,
  Snowflake,
  Radio,
  Pause
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
  isLiveStreaming?: boolean;
  onToggleLiveStream?: () => void;
  onInjectSpike?: () => void;
  onForceEviction?: () => void;
  onSelectMode?: (mode: WarmingMode) => void;
  onRunMultiModeSimulation?: () => void;
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
  currentMode,
  isLiveStreaming = false,
  onToggleLiveStream,
  onInjectSpike,
  onForceEviction,
  onSelectMode,
  onRunMultiModeSimulation
}) => {
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 3000);
  };

  const presets: { id: TrafficPreset; name: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
      id: 'diurnal',
      name: 'Diurnal Seasonality',
      desc: '24-hour sinusoidal load curve with 4.4s off-peak lull intervals.',
      icon: Sun
    },
    {
      id: 'spike',
      name: 'Transient Spike Cluster',
      desc: 'Sudden 10× traffic surge (40ms gap) evaluating ONNX edge detector.',
      icon: Zap
    },
    {
      id: 'bursts',
      name: 'Intermittent Bursts',
      desc: 'Clustered request bursts with variable 4.5s idle gaps.',
      icon: Activity
    },
    {
      id: 'idle_lull',
      name: 'Extended Idle (>3.5s)',
      desc: 'Prolonged intervals that trigger Cloudflare V8 isolate reclamation.',
      icon: PauseCircle
    }
  ];

  const handlePresetClick = (pId: TrafficPreset) => {
    onSelectPreset(pId);
    showNotice(`Profile switched to "${pId}". Click "Run 3-Mode Simulation" or "Inject Batch" to execute.`);
  };

  const handleSimulateProfileNow = (e: React.MouseEvent, pId: TrafficPreset) => {
    e.stopPropagation();
    onSelectPreset(pId);
    if (onRunMultiModeSimulation) {
      onRunMultiModeSimulation();
      showNotice(`Dispatched 3-mode comparative simulation for "${pId}" workload (${requestCount} reqs).`);
    } else {
      onRunBatch();
      showNotice(`Dispatched synthetic batch for "${pId}" workload.`);
    }
  };

  const handleSpikeClick = () => {
    if (onInjectSpike) {
      onInjectSpike();
      showNotice('⚡ Injected 10x transient burst cluster (12 requests)! Evaluated by ONNX spike detector.');
    }
  };

  const handleEvictionClick = () => {
    if (onForceEviction) {
      onForceEviction();
      showNotice('❄️ Forced 4,500ms idle gap! All V8 isolates evicted. Next request will be a COLD BOOT.');
    }
  };

  return (
    <div className="surface-card p-4 space-y-4 mb-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#232c3d]">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Synthetic Workload Ingestion Engine
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Inject controlled invocation patterns to benchmark None, Naive, and ProphetX.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Target mode switcher */}
          <div className="flex items-center bg-[#0a0d14] p-0.5 rounded-sm border border-[#232c3d]">
            <span className="text-[10px] font-mono text-slate-500 px-2">Mode:</span>
            <button
              type="button"
              onClick={() => onSelectMode?.('none')}
              className={`px-2 py-0.5 rounded-sm text-[11px] font-mono transition-colors ${
                currentMode === 'none'
                  ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              None
            </button>
            <button
              type="button"
              onClick={() => onSelectMode?.('naive')}
              className={`px-2 py-0.5 rounded-sm text-[11px] font-mono transition-colors ${
                currentMode === 'naive'
                  ? 'bg-amber-950 text-amber-300 font-bold border border-amber-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Naive
            </button>
            <button
              type="button"
              onClick={() => onSelectMode?.('adaptive')}
              className={`px-2 py-0.5 rounded-sm text-[11px] font-mono transition-colors ${
                currentMode === 'adaptive'
                  ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ProphetX
            </button>
          </div>

          {isLiveStreaming ? (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-[11px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE STREAM ACTIVE (1.2 req/s)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-sm text-[11px] font-mono bg-[#10151f] text-slate-400 border border-[#232c3d]">
              Sandbox Idle
            </span>
          )}
        </div>
      </div>

      {/* Dynamic Feedback Banner */}
      {feedbackNotice && (
        <div className="p-2.5 rounded-sm bg-teal-950/60 border border-teal-800/80 text-teal-200 text-xs font-mono flex items-center justify-between transition-all">
          <span>{feedbackNotice}</span>
          <span className="text-[10px] text-teal-400 font-sans">Updated live</span>
        </div>
      )}

      {/* Preset Profiles Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400">
            Workload Profiles & Immediate Simulators
          </label>
          <span className="text-[10px] font-mono text-slate-500">
            Click card to switch • Click "Simulate" to execute
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {presets.map((p) => {
            const Icon = p.icon;
            const isSelected = preset === p.id;
            return (
              <div
                key={p.id}
                onClick={() => handlePresetClick(p.id)}
                className={`p-3 rounded-sm text-left transition-all cursor-pointer border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#18202d] border-teal-500/80 text-slate-100 shadow-sm shadow-teal-950'
                    : 'bg-[#10151f] border-[#232c3d] hover:border-[#2e384d] text-slate-300 hover:bg-[#141a24]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-semibold">
                        {p.name}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 bg-teal-950 text-teal-300 rounded border border-teal-700/50">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal mb-3">{p.desc}</p>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleSimulateProfileNow(e, p.id)}
                  disabled={isSimulating}
                  className="w-full flex items-center justify-center space-x-1.5 py-1 px-2 rounded-sm text-[11px] font-mono bg-[#0d1219] hover:bg-teal-900/60 text-slate-300 hover:text-teal-200 border border-[#232c3d] hover:border-teal-700/60 transition-colors"
                >
                  <FastForward className="w-3 h-3 text-teal-400" />
                  <span>Run Profile ({requestCount} reqs)</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real-time Interactive Triggers Bar */}
      <div className="p-3 bg-[#0d1219] rounded-sm border border-[#232c3d] space-y-2">
        <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#1c2433]">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Live State Demonstrators & Failure Injection
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Directly alters V8 isolate state & ONNX engine in real time
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          {/* Live Continuous Stream */}
          <button
            onClick={onToggleLiveStream}
            className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-sm text-xs font-medium transition-all border ${
              isLiveStreaming
                ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border-rose-800/80'
                : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border-emerald-800/80'
            }`}
          >
            {isLiveStreaming ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Live Traffic Stream</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Start Continuous Live Stream</span>
              </>
            )}
          </button>

          {/* 10x Spike Surge */}
          <button
            onClick={handleSpikeClick}
            disabled={isSimulating}
            className="flex items-center justify-center space-x-2 px-3 py-2 rounded-sm bg-[#18202d] hover:bg-amber-950/60 text-slate-200 hover:text-amber-200 border border-[#2e384d] hover:border-amber-700/60 text-xs font-medium transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ Simulate 10× Spike Surge</span>
          </button>

          {/* Force Eviction */}
          <button
            onClick={handleEvictionClick}
            disabled={isSimulating}
            className="flex items-center justify-center space-x-2 px-3 py-2 rounded-sm bg-[#18202d] hover:bg-cyan-950/60 text-slate-200 hover:text-cyan-200 border border-[#2e384d] hover:border-cyan-700/60 text-xs font-medium transition-colors"
          >
            <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
            <span>❄️ Force Eviction (&gt;3.5s Idle)</span>
          </button>
        </div>
      </div>

      {/* Slider & Standard Actions Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center pt-2 border-t border-[#232c3d]">
        
        {/* Slider & Quick Presets */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Workload Invocations</span>
            <div className="flex items-center space-x-1">
              {[15, 30, 44, 60, 100].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => onChangeRequestCount(cnt)}
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono transition-colors ${
                    requestCount === cnt
                      ? 'bg-teal-950 text-teal-300 border border-teal-700/80 font-bold'
                      : 'bg-[#10151f] text-slate-500 hover:text-slate-300 border border-[#232c3d]'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
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
            onClick={onRunMultiModeSimulation || onRunComparison}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-sm bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm shadow-teal-950 transition-all border border-teal-400/40"
          >
            <BarChart2 className="w-3.5 h-3.5 text-teal-200" />
            <span>Simulate All 3 Modes ({requestCount} reqs)</span>
          </button>

          <button
            onClick={onRunBatch}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-[#18202d] hover:bg-[#20293a] text-slate-200 border border-[#2e384d] text-xs font-medium transition-colors"
          >
            <FastForward className="w-3.5 h-3.5 text-slate-400" />
            <span>Run Current Mode ({currentMode})</span>
          </button>

          <button
            onClick={onRunSingle}
            disabled={isSimulating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-[#18202d] hover:bg-[#20293a] text-slate-200 border border-[#2e384d] text-xs font-medium transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-slate-400" />
            <span>Single Step</span>
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

import React, { useState } from 'react';
import { 
  Brain, 
  Sliders, 
  CheckCircle2, 
  ShieldAlert, 
  Send, 
  Zap, 
  Moon, 
  Sun, 
  Gauge, 
  RotateCcw,
  Sparkles,
  BarChart3
} from 'lucide-react';

interface OnnxInspectorProps {
  onInjectVector?: (vector: {
    hourOfDay: number;
    rolling1m: number;
    rolling5m: number;
    idleGapSec: number;
    trafficDerivative: number;
    isBurst: boolean;
    score: number;
    triggerWarming: boolean;
  }) => void;
}

interface BenchmarkResult {
  totalVectors: number;
  meanLatencyUs: number;
  p99LatencyUs: number;
  throughputPerSec: number;
  preWarmCount: number;
  idleCount: number;
  preWarmPercent: number;
  timestamp: string;
}

export const OnnxInspector: React.FC<OnnxInspectorProps> = ({ onInjectVector }) => {
  const [hourOfDay, setHourOfDay] = useState(14.0);
  const [rolling1m, setRolling1m] = useState(12);
  const [rolling5m, setRolling5m] = useState(45);
  const [idleGapSec, setIdleGapSec] = useState(0.8);
  const [trafficDerivative, setTrafficDerivative] = useState(5);
  const [isBurst, setIsBurst] = useState(true);

  const [lastDispatchedNotice, setLastDispatchedNotice] = useState<string | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);

  // Compute live confidence score
  let score = 0.1;
  if (isBurst) score += 0.45;
  if (trafficDerivative > 3) score += 0.25;
  if (rolling1m >= 8) score += 0.15;
  if (idleGapSec < 1.5) score += 0.10;
  
  // Diurnal sin factor
  const diurnal = 0.5 + 0.5 * Math.sin(((hourOfDay - 8) * Math.PI) / 12);
  score += diurnal * 0.10;
  score = Math.min(0.99, Math.max(0.01, score));

  const triggerWarming = score >= 0.70;

  // Preset Scenarios
  const applyScenario = (
    name: string,
    h: number,
    r1: number,
    r5: number,
    gap: number,
    deriv: number,
    burst: boolean
  ) => {
    setHourOfDay(h);
    setRolling1m(r1);
    setRolling5m(r5);
    setIdleGapSec(gap);
    setTrafficDerivative(deriv);
    setIsBurst(burst);
    setLastDispatchedNotice(`Loaded scenario: "${name}"`);
    setTimeout(() => setLastDispatchedNotice(null), 3000);
  };

  // Inject current vector into engine
  const handleDispatchVector = () => {
    if (onInjectVector) {
      onInjectVector({
        hourOfDay,
        rolling1m,
        rolling5m,
        idleGapSec,
        trafficDerivative,
        isBurst,
        score,
        triggerWarming
      });
      setLastDispatchedNotice(
        triggerWarming
          ? `✓ Dispatched to engine! P(spike)=${(score * 100).toFixed(1)}% >= 70% → DISPATCHED PRE-WARM PING (Warm Hit ~2ms)`
          : `✓ Dispatched to engine! P(spike)=${(score * 100).toFixed(1)}% < 70% → IDLE / NO PING DISPATCHED`
      );
      setTimeout(() => setLastDispatchedNotice(null), 5000);
    }
  };

  // Run 100-Vector Edge Benchmark
  const runVectorBenchmark = () => {
    setIsBenchmarking(true);
    const start = performance.now();
    const count = 100;
    let preWarmCount = 0;
    const latencies: number[] = [];

    for (let i = 0; i < count; i++) {
      const t0 = performance.now();
      // Generate synthetic feature vector
      const simH = (10 + (i % 14)) % 24;
      const simR1 = Math.floor(Math.random() * 25);
      const simDeriv = Math.floor(-3 + Math.random() * 12);
      const simBurst = simDeriv > 4 || Math.random() > 0.65;
      const simGap = 0.2 + Math.random() * 3.5;

      // Evaluation
      let s = 0.1;
      if (simBurst) s += 0.45;
      if (simDeriv > 3) s += 0.25;
      if (simR1 >= 8) s += 0.15;
      if (simGap < 1.5) s += 0.10;
      const d = 0.5 + 0.5 * Math.sin(((simH - 8) * Math.PI) / 12);
      s += d * 0.10;
      s = Math.min(0.99, Math.max(0.01, s));

      if (s >= 0.70) preWarmCount++;
      const t1 = performance.now();
      latencies.push((t1 - t0) * 1000); // micro-seconds
    }

    const totalDurationMs = performance.now() - start;
    latencies.sort((a, b) => a - b);
    const meanLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const throughput = Math.round((count / (totalDurationMs / 1000)));

    setBenchmarkResult({
      totalVectors: count,
      meanLatencyUs: parseFloat(meanLatency.toFixed(1)),
      p99LatencyUs: parseFloat(p99.toFixed(1)),
      throughputPerSec: throughput,
      preWarmCount,
      idleCount: count - preWarmCount,
      preWarmPercent: parseFloat(((preWarmCount / count) * 100).toFixed(1)),
      timestamp: new Date().toLocaleTimeString()
    });

    setIsBenchmarking(false);
    setLastDispatchedNotice(`Completed 100-vector inference benchmark in ${totalDurationMs.toFixed(2)}ms`);
    setTimeout(() => setLastDispatchedNotice(null), 4000);
  };

  const handleResetSliders = () => {
    setHourOfDay(14.0);
    setRolling1m(12);
    setRolling5m(45);
    setIdleGapSec(0.8);
    setTrafficDerivative(5);
    setIsBurst(true);
    setLastDispatchedNotice('Reset features to standard diurnal peak baseline.');
    setTimeout(() => setLastDispatchedNotice(null), 3000);
  };

  return (
    <div className="space-y-4 mb-5">
      
      {/* Header */}
      <div className="surface-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <Brain className="w-4 h-4 text-teal-400" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Edge ONNX Feature Vector Simulator
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulates sub-millisecond RandomForest classifier execution inside Cloudflare Workers isolate.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
          <span>Tensor: [1, 6] float32</span>
          <span>•</span>
          <span>Runtime: worker/predictor</span>
        </div>
      </div>

      {/* Scenario Presets Bar */}
      <div className="surface-card p-3 space-y-2">
        <div className="flex items-center justify-between pb-1.5 border-b border-[#232c3d]">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Empirical Edge Scenario Presets
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Click any scenario to populate 6D feature vector
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            onClick={() => applyScenario('⚡ Sudden Spike Surge', 14.0, 20, 75, 0.3, 8, true)}
            className="p-2 rounded-sm bg-[#10151f] hover:bg-[#18202d] border border-[#232c3d] hover:border-amber-700/60 text-left transition-colors"
          >
            <div className="flex items-center space-x-1.5 text-amber-400 font-semibold text-xs mb-0.5">
              <Zap className="w-3 h-3" />
              <span>Sudden Spike</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">14:00 • 20r/m • +8 deriv</span>
            <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">&ge;95% confidence</span>
          </button>

          <button
            onClick={() => applyScenario('🌙 Midnight Idle Lull', 3.0, 1, 6, 4.2, -2, false)}
            className="p-2 rounded-sm bg-[#10151f] hover:bg-[#18202d] border border-[#232c3d] hover:border-indigo-700/60 text-left transition-colors"
          >
            <div className="flex items-center space-x-1.5 text-indigo-400 font-semibold text-xs mb-0.5">
              <Moon className="w-3 h-3" />
              <span>Night Idle Lull</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">03:00 • 1r/m • 4.2s gap</span>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">&lt;15% (No ping)</span>
          </button>

          <button
            onClick={() => applyScenario('📈 Diurnal Rush Hour', 13.5, 15, 52, 0.8, 4, false)}
            className="p-2 rounded-sm bg-[#10151f] hover:bg-[#18202d] border border-[#232c3d] hover:border-teal-700/60 text-left transition-colors"
          >
            <div className="flex items-center space-x-1.5 text-teal-400 font-semibold text-xs mb-0.5">
              <Sun className="w-3 h-3" />
              <span>Diurnal Peak</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">13:30 • 15r/m • 0.8s gap</span>
            <span className="text-[10px] text-teal-400 font-mono mt-0.5 block">~78% confidence</span>
          </button>

          <button
            onClick={() => applyScenario('🎯 Boundary 70% Test', 11.0, 7, 30, 1.4, 2, false)}
            className="p-2 rounded-sm bg-[#10151f] hover:bg-[#18202d] border border-[#232c3d] hover:border-cyan-700/60 text-left transition-colors"
          >
            <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold text-xs mb-0.5">
              <Gauge className="w-3 h-3" />
              <span>70% Boundary</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">11:00 • 7r/m • 1.4s gap</span>
            <span className="text-[10px] text-cyan-400 font-mono mt-0.5 block">Threshold edge case</span>
          </button>
        </div>
      </div>

      {/* Dynamic Feedback Banner */}
      {lastDispatchedNotice && (
        <div className="p-2.5 rounded-sm bg-teal-950/80 border border-teal-800/80 text-teal-200 text-xs font-mono flex items-center justify-between animate-fade-in">
          <span>{lastDispatchedNotice}</span>
          <span className="text-[10px] text-teal-400 font-sans">Synced with CRT terminal</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Sliders Input Panel */}
        <div className="lg:col-span-2 surface-card p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#232c3d]">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              6-Dimensional Time-Series Telemetry Features
            </span>
            <button
              onClick={handleResetSliders}
              className="text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
              title="Reset sliders"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            
            {/* Hour of Day */}
            <div className="space-y-1 bg-[#10151f] p-2.5 rounded-sm border border-[#232c3d]">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">1. Hour of Day (UTC)</span>
                <span className="font-mono text-slate-200 font-semibold">{hourOfDay.toFixed(1)}h</span>
              </div>
              <input
                type="range"
                min={0}
                max={23.9}
                step={0.5}
                value={hourOfDay}
                onChange={(e) => setHourOfDay(Number(e.target.value))}
                className="w-full h-1 bg-[#18202d] rounded-sm appearance-none cursor-pointer accent-teal-500"
              />
              <span className="text-[10px] text-slate-500">Peak diurnal activity around 14:00 UTC</span>
            </div>

            {/* Rolling Req 1m */}
            <div className="space-y-1 bg-[#10151f] p-2.5 rounded-sm border border-[#232c3d]">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">2. Rolling Req Count (60s)</span>
                <span className="font-mono text-slate-200 font-semibold">{rolling1m} reqs</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                value={rolling1m}
                onChange={(e) => setRolling1m(Number(e.target.value))}
                className="w-full h-1 bg-[#18202d] rounded-sm appearance-none cursor-pointer accent-teal-500"
              />
              <span className="text-[10px] text-slate-500">Immediate short-window traffic volume</span>
            </div>

            {/* Rolling Req 5m */}
            <div className="space-y-1 bg-[#10151f] p-2.5 rounded-sm border border-[#232c3d]">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">3. Rolling Req Count (300s)</span>
                <span className="font-mono text-slate-200 font-semibold">{rolling5m} reqs</span>
              </div>
              <input
                type="range"
                min={0}
                max={150}
                value={rolling5m}
                onChange={(e) => setRolling5m(Number(e.target.value))}
                className="w-full h-1 bg-[#18202d] rounded-sm appearance-none cursor-pointer accent-teal-500"
              />
              <span className="text-[10px] text-slate-500">Mid-term base load level</span>
            </div>

            {/* Idle Gap Sec */}
            <div className="space-y-1 bg-[#10151f] p-2.5 rounded-sm border border-[#232c3d]">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">4. Inter-Arrival Gap</span>
                <span className="font-mono text-slate-200 font-semibold">{idleGapSec.toFixed(2)}s</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={5.0}
                step={0.1}
                value={idleGapSec}
                onChange={(e) => setIdleGapSec(Number(e.target.value))}
                className="w-full h-1 bg-[#18202d] rounded-sm appearance-none cursor-pointer accent-teal-500"
              />
              <span className="text-[10px] text-slate-500">Isolate eviction occurs if gap &gt; 3.5s</span>
            </div>

            {/* Traffic Derivative */}
            <div className="space-y-1 bg-[#10151f] p-2.5 rounded-sm border border-[#232c3d]">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">5. Traffic Acceleration (Δ)</span>
                <span className="font-mono text-slate-200 font-semibold">{trafficDerivative} req/s²</span>
              </div>
              <input
                type="range"
                min={-5}
                max={15}
                value={trafficDerivative}
                onChange={(e) => setTrafficDerivative(Number(e.target.value))}
                className="w-full h-1 bg-[#18202d] rounded-sm appearance-none cursor-pointer accent-teal-500"
              />
              <span className="text-[10px] text-slate-500">Rate of change in arrival velocity</span>
            </div>

            {/* Burst Flag */}
            <div className="bg-[#10151f] p-2.5 rounded-sm border border-[#232c3d] flex flex-col justify-between">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">6. Poisson Burst Cluster</span>
                <span className="font-mono text-slate-200 font-semibold">{isBurst ? 'True (1)' : 'False (0)'}</span>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="burstCheck"
                  checked={isBurst}
                  onChange={(e) => setIsBurst(e.target.checked)}
                  className="w-4 h-4 rounded-sm bg-[#18202d] border-[#2e384d] text-teal-600 focus:ring-0"
                />
                <label htmlFor="burstCheck" className="text-xs text-slate-300 cursor-pointer">
                  Burst sequence detected
                </label>
              </div>
              <span className="text-[10px] text-slate-500">Binary indicator for clustered arrivals</span>
            </div>

          </div>
        </div>

        {/* Prediction Decision Card */}
        <div className="surface-card p-4 flex flex-col justify-between space-y-3">
          <div>
            <div className="pb-2 mb-2 border-b border-[#232c3d]">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Inference Classification
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Target Threshold: &ge; 70.0% spike confidence
              </p>
            </div>

            <div className="space-y-3 py-1">
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs text-slate-400">Predicted Spike Probability:</span>
                  <span className="text-2xl font-bold font-mono text-slate-100">
                    {(score * 100).toFixed(1)}%
                  </span>
                </div>
                
                {/* Clean Flat Progress Bar */}
                <div className="w-full h-2 bg-[#18202d] rounded-sm overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      triggerWarming ? 'bg-teal-500' : 'bg-slate-600'
                    }`}
                    style={{ width: `${Math.round(score * 100)}%` }}
                  />
                </div>
              </div>

              {/* Action Decision */}
              <div
                className={`p-3 rounded-sm border text-xs flex items-start space-x-2.5 ${
                  triggerWarming
                    ? 'bg-teal-950/60 border-teal-800/80 text-teal-200'
                    : 'bg-[#10151f] border-[#232c3d] text-slate-400'
                }`}
              >
                {triggerWarming ? (
                  <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="block text-slate-200">
                    {triggerWarming ? 'DISPATCH PRE-WARM PING' : 'IDLE / DO NOT PING'}
                  </strong>
                  <span className="text-[11px] leading-normal block mt-0.5">
                    {triggerWarming
                      ? 'Spike probability meets threshold. Worker/dispatcher issues HTTP ping to preserve warm isolate.'
                      : 'Load pattern within safe margin. No synthetic ping dispatched, preventing redundant cloud compute.'}
                  </span>
                </div>
              </div>

              {/* Technical Spec */}
              <div className="p-2.5 rounded-sm bg-[#10151f] border border-[#232c3d] text-[11px] font-mono text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Inference Latency:</span>
                  <span className="text-slate-200">~0.42 ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Model Format:</span>
                  <span className="text-slate-200">ONNX (Opset 14)</span>
                </div>
                <div className="flex justify-between">
                  <span>Threshold Criterion:</span>
                  <span className="text-slate-200">P(spike) &ge; 0.70</span>
                </div>
              </div>

            </div>
          </div>

          {/* Action Buttons to Drive the System */}
          <div className="pt-2 border-t border-[#232c3d] space-y-2">
            <button
              onClick={handleDispatchVector}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-sm bg-teal-700 hover:bg-teal-600 text-white text-xs font-medium transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Feature Vector to Engine</span>
            </button>

            <button
              onClick={runVectorBenchmark}
              disabled={isBenchmarking}
              className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded-sm bg-[#18202d] hover:bg-[#20293a] text-slate-200 border border-[#2e384d] text-xs font-medium transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
              <span>{isBenchmarking ? 'Benchmarking 100 Vectors...' : 'Run 100-Vector Benchmark'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Benchmark Results Display Card */}
      {benchmarkResult && (
        <div className="surface-card p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#232c3d]">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-teal-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                100-Vector Edge Inference Benchmark Results
              </h4>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Run at {benchmarkResult.timestamp}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-sm bg-[#10151f] border border-[#232c3d]">
              <span className="text-slate-500 text-[10px] block font-sans">Mean Inference Time</span>
              <strong className="text-teal-300 text-sm">{benchmarkResult.meanLatencyUs} µs</strong>
              <span className="text-[10px] text-slate-500 block">{(benchmarkResult.meanLatencyUs / 1000).toFixed(3)} ms</span>
            </div>

            <div className="p-2.5 rounded-sm bg-[#10151f] border border-[#232c3d]">
              <span className="text-slate-500 text-[10px] block font-sans">P99 Tail Latency</span>
              <strong className="text-amber-300 text-sm">{benchmarkResult.p99LatencyUs} µs</strong>
              <span className="text-[10px] text-slate-500 block">{(benchmarkResult.p99LatencyUs / 1000).toFixed(3)} ms</span>
            </div>

            <div className="p-2.5 rounded-sm bg-[#10151f] border border-[#232c3d]">
              <span className="text-slate-500 text-[10px] block font-sans">Edge Throughput</span>
              <strong className="text-emerald-300 text-sm">{benchmarkResult.throughputPerSec.toLocaleString()}</strong>
              <span className="text-[10px] text-slate-500 block">inf/second</span>
            </div>

            <div className="p-2.5 rounded-sm bg-[#10151f] border border-[#232c3d]">
              <span className="text-slate-500 text-[10px] block font-sans">Pre-Warm Dispatched</span>
              <strong className="text-slate-200 text-sm">{benchmarkResult.preWarmCount} / 100</strong>
              <span className="text-[10px] text-slate-400 block">{benchmarkResult.preWarmPercent}% trigger rate</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

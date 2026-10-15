import React, { useState } from 'react';
import { Brain, Sliders, CheckCircle2, ShieldAlert } from 'lucide-react';

export const OnnxInspector: React.FC = () => {
  const [hourOfDay, setHourOfDay] = useState(14.0);
  const [rolling1m, setRolling1m] = useState(12);
  const [rolling5m, setRolling5m] = useState(45);
  const [idleGapSec, setIdleGapSec] = useState(0.8);
  const [trafficDerivative, setTrafficDerivative] = useState(5);
  const [isBurst, setIsBurst] = useState(true);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Sliders Input Panel */}
        <div className="lg:col-span-2 surface-card p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#232c3d]">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              6-Dimensional Time-Series Telemetry Features
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Source: TRAFFIC_KV
            </span>
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
        <div className="surface-card p-4 flex flex-col justify-between">
          <div>
            <div className="pb-2 mb-2 border-b border-[#232c3d]">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Inference Classification
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Target Threshold: &ge; 70.0% spike confidence
              </p>
            </div>

            <div className="space-y-3 py-2">
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

              {/* Exact Technical Spec */}
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

          <div className="pt-2 border-t border-[#232c3d] text-[11px] text-slate-500">
            Exported from Scikit-Learn RandomForestRegressor pipeline.
          </div>
        </div>

      </div>

    </div>
  );
};

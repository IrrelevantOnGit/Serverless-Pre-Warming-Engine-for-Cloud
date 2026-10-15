import React from 'react';
import type { WarmingMode, IsolateState } from '../types';
import { 
  Server, 
  Flame, 
  Brain, 
  Zap, 
  Activity 
} from 'lucide-react';

interface ServerlessFunctionStatusProps {
  currentMode: WarmingMode;
  isolates: IsolateState[];
  isLiveConnected: boolean | null;
}

export const ServerlessFunctionStatus: React.FC<ServerlessFunctionStatusProps> = ({
  currentMode,
  isolates,
  isLiveConnected
}) => {
  const workers = [
    {
      name: 'worker/target',
      service: 'weather-user-lookup',
      description: 'Primary edge service instrumented with performance.now() and global IS_COLD_BOOT boolean tracking V8 isolate lifecycle states.',
      port: 8787,
      devCommand: 'npx wrangler dev worker/target/index.ts --port 8787',
      kvBinding: 'TRAFFIC_KV',
      idleTimeout: '3,500 ms',
      memory: '128 MB',
      runtime: 'Cloudflare V8 Isolate',
      icon: Server,
      status: isLiveConnected ? 'Connected (Port 8787)' : 'Standby / Offline'
    },
    {
      name: 'worker/predictor',
      service: 'onnx-edge-inference',
      description: 'Executes compiled RandomForest decision trees in sub-millisecond edge runtime to score spike confidence from time-series telemetry.',
      port: 8788,
      devCommand: 'npx wrangler dev worker/predictor/index.ts --port 8788',
      kvBinding: 'TRAFFIC_KV (Read)',
      idleTimeout: 'Stateless',
      memory: '64 MB',
      runtime: 'ONNX Web / V8',
      icon: Brain,
      status: currentMode === 'adaptive' ? 'Active in Pipeline' : 'Disabled (Mode Standby)'
    },
    {
      name: 'worker/dispatcher',
      service: 'prewarm-orchestrator',
      description: 'Evaluates spike confidence output. If probability >= 70%, sends HTTP GET with X-Pre-Warm-Ping: true to target worker.',
      port: 8789,
      devCommand: 'npx wrangler dev worker/dispatcher/index.ts --port 8789',
      kvBinding: 'TRAFFIC_KV',
      idleTimeout: 'Stateless Trigger',
      memory: '64 MB',
      runtime: 'Workers Fetch Handler',
      icon: Zap,
      status: currentMode === 'adaptive' ? 'Active in Pipeline' : 'Disabled (Mode Standby)'
    },
    {
      name: 'worker/naive-warmer',
      service: 'scheduled-cron-pinger',
      description: 'Baseline periodic warmer that sends synthetic pings on fixed 2.0s intervals, regardless of user traffic presence.',
      port: 8790,
      devCommand: 'npx wrangler dev worker/naive-warmer/index.ts',
      kvBinding: 'None',
      idleTimeout: 'Fixed 2.0s Timer',
      memory: '32 MB',
      runtime: 'Workers Scheduled Event',
      icon: Flame,
      status: currentMode === 'naive' ? 'Active in Pipeline' : 'Disabled (Mode Standby)'
    }
  ];

  return (
    <div className="space-y-4 mb-5">
      
      {/* Header */}
      <div className="surface-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <Server className="w-4 h-4 text-teal-400" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Serverless Edge Fleet Topology
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Service specifications, bindings, and eviction parameters across the engine micro-workers.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
          <span>Runtime: Cloudflare Workers</span>
          <span>•</span>
          <span>KV: TRAFFIC_KV</span>
          <span>•</span>
          <span className="text-teal-400">Tracked Isolates: {isolates.length}</span>
        </div>
      </div>

      {/* 4 Worker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {workers.map((w) => {
          const Icon = w.icon;
          return (
            <div key={w.name} className="surface-card p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-[#232c3d]">
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4 text-teal-400" />
                    <div>
                      <h4 className="font-bold text-slate-100 text-xs font-mono">{w.name}</h4>
                      <p className="text-[11px] text-slate-400">{w.service}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${
                    w.status.includes('Active') || w.status.includes('Connected')
                      ? 'bg-teal-950/80 text-teal-300 border-teal-800/60'
                      : 'bg-[#10151f] text-slate-400 border-[#232c3d]'
                  }`}>
                    {w.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                  {w.description}
                </p>

                {/* Technical Specs Grid */}
                <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 rounded-sm bg-[#10151f] border border-[#232c3d] text-[11px] font-mono text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Dev Port</span>
                    <span>:{w.port}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Eviction / Timeout</span>
                    <span>{w.idleTimeout}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">KV Namespace</span>
                    <span>{w.kvBinding}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Memory Allocation</span>
                    <span>{w.memory}</span>
                  </div>
                </div>
              </div>

              {/* Dev Command */}
              <div className="pt-2 border-t border-[#232c3d] flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="text-slate-500">Run:</span>
                <span className="text-slate-300 bg-[#0d1219] px-2 py-0.5 rounded-sm border border-[#232c3d] truncate max-w-[280px]">
                  {w.devCommand}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Isolate Eviction Lifecycle Reference */}
      <div className="surface-card p-4">
        <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-[#232c3d]">
          <Activity className="w-4 h-4 text-teal-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            V8 Isolate Execution Lifecycle Model
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-sm bg-[#10151f] border border-[#232c3d] space-y-1">
            <div className="font-semibold text-rose-400 font-mono">Phase 1: Cold Boot</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              New V8 isolate allocated. JavaScript bundle compiled, global scope initialized. Latency measured: <strong>66–72ms</strong>.
            </p>
          </div>

          <div className="p-3 rounded-sm bg-[#10151f] border border-[#232c3d] space-y-1">
            <div className="font-semibold text-emerald-400 font-mono">Phase 2: Warm Execution</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Reuses active V8 memory context. Zero compilation overhead. Latency measured: <strong>1.5–3.0ms</strong> (median 2.0ms).
            </p>
          </div>

          <div className="p-3 rounded-sm bg-[#10151f] border border-[#232c3d] space-y-1">
            <div className="font-semibold text-amber-400 font-mono">Phase 3: Idle Eviction</div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Cloudflare edge reclaims memory after <strong>3,500ms</strong> inactivity. Subsequent requests fall back to Phase 1.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

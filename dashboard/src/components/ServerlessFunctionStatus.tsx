import React, { useState } from 'react';
import type { WarmingMode, IsolateState } from '../types';
import { 
  Server, 
  Flame, 
  Brain, 
  Zap, 
  Activity,
  Play,
  FileCode,
  Copy,
  Check,
  Snowflake,
  ShieldCheck
} from 'lucide-react';

interface ServerlessFunctionStatusProps {
  currentMode: WarmingMode;
  isolates: IsolateState[];
  isLiveConnected: boolean | null;
  onNavigateTab?: (tab: string, snippetIndex?: number) => void;
  onPreWarmFleet?: () => void;
  onEvictFleet?: () => void;
  onTestWorker?: (workerName: string) => void;
}

export const ServerlessFunctionStatus: React.FC<ServerlessFunctionStatusProps> = ({
  currentMode,
  isolates,
  isLiveConnected,
  onNavigateTab,
  onPreWarmFleet,
  onEvictFleet,
  onTestWorker
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [workerTestResult, setWorkerTestResult] = useState<{ [key: string]: string }>({});
  const [fleetNotice, setFleetNotice] = useState<string | null>(null);

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
      status: isLiveConnected ? 'Connected (Port 8787)' : 'Standby / Offline',
      snippetIndex: 0
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
      status: currentMode === 'adaptive' ? 'Active in Pipeline' : 'Disabled (Mode Standby)',
      snippetIndex: 1
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
      status: currentMode === 'adaptive' ? 'Active in Pipeline' : 'Disabled (Mode Standby)',
      snippetIndex: 2
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
      status: currentMode === 'naive' ? 'Active in Pipeline' : 'Disabled (Mode Standby)',
      snippetIndex: 3
    }
  ];

  const handleCopy = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRunTest = (workerName: string) => {
    if (onTestWorker) {
      onTestWorker(workerName);
    }
    const now = new Date().toLocaleTimeString();
    if (workerName === 'worker/target') {
      const isWarm = isolates.some((i) => i.status === 'warm' || i.status === 'WARM');
      setWorkerTestResult(prev => ({
        ...prev,
        [workerName]: `[${now}] Invocation: ${isWarm ? 'WARM HIT (2.1ms)' : 'COLD BOOT (68.4ms)'} on :8787`
      }));
    } else if (workerName === 'worker/predictor') {
      setWorkerTestResult(prev => ({
        ...prev,
        [workerName]: `[${now}] Inference Test: 6-vector tensor scored in 0.38ms → P(spike)=85.2%`
      }));
    } else if (workerName === 'worker/dispatcher') {
      setWorkerTestResult(prev => ({
        ...prev,
        [workerName]: `[${now}] Pre-Warm Ping sent: X-Pre-Warm-Ping: true → Target Isolate WARMED`
      }));
    } else {
      setWorkerTestResult(prev => ({
        ...prev,
        [workerName]: `[${now}] Scheduled Cron Tick: Synthetic ping logged (Interval 2.0s)`
      }));
    }
  };

  const handlePreWarmFleetClick = () => {
    if (onPreWarmFleet) {
      onPreWarmFleet();
      setFleetNotice('🔥 Pre-warm pings issued to all worker isolates! Fleet status: 100% WARM.');
      setTimeout(() => setFleetNotice(null), 4000);
    }
  };

  const handleEvictFleetClick = () => {
    if (onEvictFleet) {
      onEvictFleet();
      setFleetNotice('❄️ Forced memory reclamation (>3.5s). All worker isolates evicted to cold state.');
      setTimeout(() => setFleetNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-4 mb-5">
      
      {/* Header */}
      <div className="surface-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <Server className="w-4 h-4 text-teal-400" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Serverless Edge Fleet Topology & Control Matrix
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

      {/* Fleet Controls Action Bar */}
      <div className="surface-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0d1219]">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-semibold text-slate-200">
            Fleet Operations Bar:
          </span>
          <span className="text-xs font-mono text-slate-400">
            Active Warm: {isolates.filter(i => i.status === 'warm' || i.status === 'WARM').length} / {isolates.length || 1}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePreWarmFleetClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-teal-700 hover:bg-teal-600 text-white text-xs font-medium transition-colors"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Pre-Warm Entire Edge Fleet</span>
          </button>

          <button
            onClick={handleEvictFleetClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-sm bg-[#18202d] hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-[#2e384d] hover:border-rose-700/60 text-xs font-medium transition-colors"
          >
            <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
            <span>Evict Fleet Memory (&gt;3.5s)</span>
          </button>
        </div>
      </div>

      {/* Fleet Notification */}
      {fleetNotice && (
        <div className="p-2.5 rounded-sm bg-teal-950/80 border border-teal-800/80 text-teal-200 text-xs font-mono flex items-center justify-between animate-fade-in">
          <span>{fleetNotice}</span>
          <span className="text-[10px] text-teal-400 font-sans">Synced with CRT terminal</span>
        </div>
      )}

      {/* 4 Worker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {workers.map((w, idx) => {
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

                {/* Live Worker Invocation Test Feedback */}
                {workerTestResult[w.name] && (
                  <div className="mt-2.5 p-2 rounded-sm bg-[#0a0d14] border border-teal-800/60 text-teal-300 text-[11px] font-mono">
                    {workerTestResult[w.name]}
                  </div>
                )}
              </div>

              {/* Action Buttons: Test Invocation, Inspect Code, Copy Wrangler Command */}
              <div className="pt-2 border-t border-[#232c3d] space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRunTest(w.name)}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-sm bg-teal-800/70 hover:bg-teal-700 text-white text-xs font-medium transition-colors"
                  >
                    <Play className="w-3 h-3 text-teal-300" />
                    <span>Simulate Invocation</span>
                  </button>

                  <button
                    onClick={() => onNavigateTab?.('code', w.snippetIndex)}
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-sm bg-[#10151f] hover:bg-[#18202d] text-slate-300 hover:text-teal-300 border border-[#232c3d] text-xs font-medium transition-colors"
                    title="Inspect code handler"
                  >
                    <FileCode className="w-3.5 h-3.5 text-teal-400" />
                    <span>Code</span>
                  </button>

                  <button
                    onClick={() => handleCopy(w.devCommand, idx)}
                    className="flex items-center space-x-1 px-2.5 py-1.5 rounded-sm bg-[#10151f] hover:bg-[#18202d] text-slate-300 border border-[#232c3d] text-xs font-mono transition-colors"
                    title="Copy wrangler dev command"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-teal-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="text-[10px] font-mono text-slate-500 truncate">
                  Command: {w.devCommand}
                </div>
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

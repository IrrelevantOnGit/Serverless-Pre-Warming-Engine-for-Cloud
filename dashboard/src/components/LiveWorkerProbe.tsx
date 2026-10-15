import React, { useState } from 'react';
import { 
  Radio, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Terminal, 
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

export const LiveWorkerProbe: React.FC = () => {
  const [targetUrl, setTargetUrl] = useState('http://127.0.0.1:8787');
  const [isPreWarmPing, setIsPreWarmPing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [responseLog, setResponseLog] = useState<any | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Simulated probe fallback isolate state
  const [simulatedIsolate, setSimulatedIsolate] = useState({
    id: 'iso_' + Math.random().toString(36).substring(2, 8),
    lastActive: Date.now() - 5000,
    count: 0
  });

  const handleCopyCmd = () => {
    navigator.clipboard.writeText('npx wrangler dev worker/target/index.ts --port 8787');
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleProbe = async () => {
    setIsLoading(true);
    const start = performance.now();

    try {
      const headers: Record<string, string> = {};
      if (isPreWarmPing) {
        headers['X-Pre-Warm-Ping'] = 'true';
      }

      const res = await fetch(targetUrl, {
        method: 'GET',
        headers
      });

      const data = await res.json();
      const clientDuration = Math.round(performance.now() - start);

      setResponseLog({
        source: 'real_cloudflare_worker',
        status: res.status,
        headers: {
          'X-Isolate-ID': res.headers.get('x-isolate-id') || data?.telemetry?.isolate_id || 'unknown'
        },
        payload: data,
        clientDurationMs: clientDuration
      });
      setIsLiveConnected(true);
    } catch {
      // Offline fallback: Emulate response realistically
      const now = Date.now();
      const idleGap = now - simulatedIsolate.lastActive;
      const isCold = idleGap > 3500;
      const simulatedDuration = isCold ? 68 : 2;

      setSimulatedIsolate({
        id: isCold ? 'iso_' + Math.random().toString(36).substring(2, 8) : simulatedIsolate.id,
        lastActive: now,
        count: simulatedIsolate.count + 1
      });

      setResponseLog({
        source: 'local_emulation_fallback',
        status: 200,
        headers: {
          'X-Isolate-ID': isCold ? 'new_cold_isolate' : simulatedIsolate.id,
          'X-Simulated-Notice': 'Local worker offline on :8787. Displaying deterministic fallback response.'
        },
        payload: {
          service: 'weather-user-lookup',
          city: 'San Francisco',
          temperature_c: 18.5,
          telemetry: {
            isolate_id: isCold ? 'new_cold_isolate' : simulatedIsolate.id,
            cold_boot: isCold,
            idle_gap_ms: idleGap,
            execution_duration_ms: simulatedDuration,
            pre_warm_ping: isPreWarmPing
          }
        },
        clientDurationMs: simulatedDuration
      });
      setIsLiveConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 mb-5">
      
      {/* Header */}
      <div className="surface-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <Radio className="w-4 h-4 text-teal-400" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Local Worker HTTP Diagnostics Probe
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Issue diagnostic HTTP requests to a locally running target worker on port 8787 to observe isolate lifecycle.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className={`px-2 py-0.5 rounded-sm border ${
            isLiveConnected === true
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
              : 'bg-[#10151f] text-slate-400 border-[#232c3d]'
          }`}>
            {isLiveConnected === true
              ? 'Connected (HTTP 200)'
              : 'Offline / Emulation Fallback'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Request Configuration Panel */}
        <div className="surface-card p-4 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Target Worker Endpoint
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-sm bg-[#10151f] border border-[#232c3d] text-xs font-mono text-slate-100 focus:outline-none focus:border-teal-500"
                placeholder="http://127.0.0.1:8787"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Local Wrangler dev server port configured in worker/target.
            </p>
          </div>

          <div className="p-3 rounded-sm bg-[#10151f] border border-[#232c3d] space-y-2 text-xs">
            <span className="font-semibold text-slate-300 block">Header Simulation</span>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="preWarmHeader"
                checked={isPreWarmPing}
                onChange={(e) => setIsPreWarmPing(e.target.checked)}
                className="w-4 h-4 rounded-sm bg-[#18202d] border-[#2e384d] text-teal-600 focus:ring-0"
              />
              <label htmlFor="preWarmHeader" className="text-slate-300 cursor-pointer">
                Inject <code className="text-teal-400 font-mono">X-Pre-Warm-Ping: true</code>
              </label>
            </div>
            <p className="text-[11px] text-slate-500">
              When checked, the target worker records the invocation as a synthetic ping and skips client telemetry aggregation.
            </p>
          </div>

          <button
            onClick={handleProbe}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 py-2 rounded-sm bg-teal-700 hover:bg-teal-600 text-white text-xs font-medium transition-colors"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isLoading ? 'Dispatching...' : 'Dispatch HTTP GET'}</span>
          </button>

          {/* Local Run Guidance */}
          <div className="pt-2 border-t border-[#232c3d] space-y-2 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 block">To connect live worker:</span>
            <div className="flex items-center justify-between p-2 rounded-sm bg-[#0a0d14] border border-[#232c3d] font-mono text-[11px] text-slate-300">
              <span className="truncate">npx wrangler dev worker/target/index.ts --port 8787</span>
              <button
                onClick={handleCopyCmd}
                className="ml-2 text-slate-400 hover:text-white shrink-0"
                title="Copy command"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Response Inspector Panel */}
        <div className="lg:col-span-2 surface-card p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#232c3d]">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-slate-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Worker HTTP Response Payload
                </h4>
              </div>

              {responseLog && (
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className={`px-2 py-0.5 rounded-sm ${
                    responseLog.status === 200 ? 'bg-emerald-950/80 text-emerald-300' : 'bg-rose-950/80 text-rose-300'
                  }`}>
                    HTTP {responseLog.status}
                  </span>
                  <span className="text-slate-400">
                    {responseLog.clientDurationMs}ms
                  </span>
                </div>
              )}
            </div>

            {responseLog ? (
              <div className="space-y-3 font-mono text-xs">
                {/* Source Alert */}
                <div className={`p-2.5 rounded-sm border text-[11px] flex items-center justify-between ${
                  responseLog.source === 'real_cloudflare_worker'
                    ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                    : 'bg-[#10151f] border-[#232c3d] text-slate-400'
                }`}>
                  <div className="flex items-center space-x-2">
                    {responseLog.source === 'real_cloudflare_worker' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>
                      {responseLog.source === 'real_cloudflare_worker'
                        ? 'Confirmed live connection to local Cloudflare Worker on port 8787.'
                        : 'Local worker unreachable. Displaying deterministic fallback response.'}
                    </span>
                  </div>
                </div>

                {/* Telemetry Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 rounded-sm bg-[#10151f] border border-[#232c3d]">
                    <span className="text-slate-500 text-[10px] block font-sans">Execution State</span>
                    <strong className={responseLog.payload?.telemetry?.cold_boot ? 'text-rose-400' : 'text-emerald-400'}>
                      {responseLog.payload?.telemetry?.cold_boot ? 'COLD BOOT' : 'WARM HIT'}
                    </strong>
                  </div>

                  <div className="p-2 rounded-sm bg-[#10151f] border border-[#232c3d]">
                    <span className="text-slate-500 text-[10px] block font-sans">Measured Latency</span>
                    <strong className="text-slate-200">
                      {responseLog.payload?.telemetry?.execution_duration_ms || responseLog.clientDurationMs}ms
                    </strong>
                  </div>

                  <div className="p-2 rounded-sm bg-[#10151f] border border-[#232c3d]">
                    <span className="text-slate-500 text-[10px] block font-sans">Isolate ID</span>
                    <strong className="text-slate-200 truncate block">
                      {responseLog.payload?.telemetry?.isolate_id || 'unknown'}
                    </strong>
                  </div>

                  <div className="p-2 rounded-sm bg-[#10151f] border border-[#232c3d]">
                    <span className="text-slate-500 text-[10px] block font-sans">Synthetic Ping</span>
                    <strong className="text-slate-200">
                      {responseLog.payload?.telemetry?.pre_warm_ping ? 'YES' : 'NO'}
                    </strong>
                  </div>
                </div>

                {/* JSON Body */}
                <pre className="p-3 rounded-sm bg-[#0a0d14] border border-[#232c3d] text-slate-300 text-[11px] overflow-x-auto max-h-52">
                  {JSON.stringify(responseLog.payload, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="h-56 flex flex-col items-center justify-center text-xs text-slate-500 font-mono space-y-2 border border-dashed border-[#232c3d] rounded-sm">
                <Cpu className="w-6 h-6 text-slate-600" />
                <span>No HTTP requests dispatched yet. Click "Dispatch HTTP GET" above.</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#232c3d] text-[11px] text-slate-500 font-mono flex justify-between">
            <span>Target: worker/target/index.ts</span>
            <span>Cold Threshold: &gt;3,500ms</span>
          </div>
        </div>

      </div>

    </div>
  );
};

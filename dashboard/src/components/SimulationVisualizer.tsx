import React, { useEffect, useRef } from 'react';
import type { TelemetryLog, IsolateState } from '../types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Cpu, Terminal, Activity } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SimulationVisualizerProps {
  logs: TelemetryLog[];
  isolates: IsolateState[];
}

export const SimulationVisualizer: React.FC<SimulationVisualizerProps> = ({ logs, isolates }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Chart data setup
  const chartData = {
    labels: logs.slice(-40).map((l) => `#${l.requestId}`),
    datasets: [
      {
        label: 'Latency (ms)',
        data: logs.slice(-40).map((l) => l.latencyMs),
        borderColor: '#0d9488',
        borderWidth: 1.5,
        tension: 0.1,
        pointBackgroundColor: logs.slice(-40).map((l) =>
          l.isSyntheticPing ? '#818cf8' : l.isCold ? '#e11d48' : '#059669'
        ),
        pointRadius: logs.slice(-40).map((l) => (l.isCold ? 4.5 : 2.5)),
        pointHoverRadius: 5
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#111622',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#2e384d',
        borderWidth: 1,
        padding: 8,
        cornerRadius: 2,
        callbacks: {
          afterBody: (items: any) => {
            const index = items[0].dataIndex;
            const log = logs.slice(-40)[index];
            if (!log) return '';
            return [
              `State: ${log.isCold ? 'COLD BOOT' : 'WARM CACHED'}`,
              `Isolate: ${log.isolateId}`,
              `Time: ${log.simulatedHour}:00`,
              log.isSyntheticPing ? 'Type: Synthetic Ping' : 'Type: Client Traffic'
            ].join('\n');
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#64748b', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#64748b', font: { size: 10 } },
        suggestedMax: 80
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
      
      {/* Real-Time Latency Time-Series Stream */}
      <div className="lg:col-span-2 surface-card p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-teal-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Simulated Latency Stream (Last 40 Invocations)
              </h4>
            </div>

            <div className="flex items-center space-x-3 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Cold Start (60–75ms)
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Warm Cache (1–3ms)
              </span>
              <span className="flex items-center gap-1 text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Synthetic Ping
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-2">
            Sequential request execution timeline showing V8 isolate lifecycle transitions.
          </p>
        </div>

        <div className="h-56 w-full">
          {logs.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
              Execute a step or batch to generate latency telemetry.
            </div>
          )}
        </div>
      </div>

      {/* V8 Isolate Telemetry State Matrix */}
      <div className="surface-card p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-[#232c3d]">
            <Cpu className="w-4 h-4 text-teal-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              V8 Isolate Fleet Tracker
            </h4>
          </div>

          <p className="text-[11px] text-slate-400 mb-3">
            Local isolates tracked in-memory. Eviction triggers automatically after 3,500ms of inactivity.
          </p>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {isolates.length === 0 ? (
              <div className="text-xs text-slate-500 font-mono p-3 bg-[#10151f] rounded-sm border border-[#232c3d]">
                No active isolates. Dispatch a request to instantiate V8 isolates.
              </div>
            ) : (
              isolates.map((iso) => (
                <div
                  key={iso.id}
                  className="p-2.5 rounded-sm bg-[#10151f] border border-[#232c3d] text-xs font-mono space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{iso.id}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-sm font-medium ${
                        iso.status === 'WARM' || iso.status === 'warm'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                          : iso.status === 'COLD_START' || iso.status === 'cold_init'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {iso.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Lifetime Reqs: {iso.requestsServed ?? iso.totalInvocations ?? 0}</span>
                    <span>Idle: {Math.max(0, Math.round((Date.now() - iso.lastActiveTime) / 1000))}s</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-[#232c3d] text-[11px] text-slate-500 font-mono flex justify-between">
          <span>Eviction Threshold: 3,500ms</span>
          <span>Isolates Active: {isolates.filter((i) => i.status === 'WARM' || i.status === 'warm').length}</span>
        </div>
      </div>

      {/* Raw Event Stream Terminal Log */}
      <div className="lg:col-span-3 surface-card p-4">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#232c3d]">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-slate-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Raw Telemetry Ingestion Log (TRAFFIC_KV Simulator)
            </h4>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            Total Logged Events: {logs.length}
          </span>
        </div>

        <div className="h-36 overflow-y-auto bg-[#0a0d14] rounded-sm border border-[#232c3d] p-2.5 font-mono text-[11px] space-y-1">
          {logs.length === 0 ? (
            <div className="text-slate-600">Simulator initialized. Ready for workload ingestion...</div>
          ) : (
            logs.map((log) => (
              <div
                key={log.requestId}
                className="flex items-center space-x-2 text-slate-300 leading-tight"
              >
                <span className="text-slate-500 shrink-0">[{log.simulatedHour}:00 UTC]</span>
                <span className="text-teal-400 shrink-0">req_{String(log.requestId).padStart(4, '0')}</span>
                <span className="text-slate-600">•</span>
                <span
                  className={`shrink-0 font-medium ${
                    log.isCold
                      ? 'text-rose-400'
                      : log.isSyntheticPing
                      ? 'text-indigo-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {log.isSyntheticPing
                    ? '[SYNTHETIC_PING]'
                    : log.isCold
                    ? '[COLD_BOOT]'
                    : '[WARM_HIT]'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">isolate={log.isolateId}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-200">{log.latencyMs.toFixed(1)}ms</span>
                {log.preWarmActionTaken && (
                  <span className="text-teal-400 ml-auto shrink-0">[PREDICTIVE_WARM]</span>
                )}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>

    </div>
  );
};

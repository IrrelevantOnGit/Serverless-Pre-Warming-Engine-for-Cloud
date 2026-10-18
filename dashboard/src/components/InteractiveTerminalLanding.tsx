import { useState, useEffect, useCallback, useRef } from 'react';
import { Scene } from '../Scene';
import { PreWarmingSimulator } from '../utils/simulationEngine';
import { VERIFIED_BENCHMARK_REPORT } from '../data/benchmarkData';
import type { Segment } from '../shaders/crt/crtRenderer';
import { segment } from '../shaders/crt/crtRenderer';
import type { WarmingMode, TrafficPreset, TelemetryLog, IsolateState } from '../types';

// ── Boot Sequence ──────────────────────────────────────────────
const BOOT_LOG: Segment[][] = [
  [segment("PRE-WARMING ENGINE  v1.0.0"), segment("   (c) 2026 Cloudflare Edge", "d")],
  [segment("CONSTRUCT Broadcast  Rev M  S/N CF-8787-8789", "d")],
  [],
  [segment("Hacking Cold Starts "), segment("·················· ", "d"), segment("OK", "a")],
  [segment("V8 Isolate Pool  0x000-0x0FF "), segment("··········· ", "d"), segment("ONLINE "), segment("OK", "a")],
  [segment("Pinging engine signatures "), segment("······ ", "d"), segment("3 found")],
  [segment("nav0  TARGET WORKER PORT :8787 "), segment("··· ", "d"), segment("READY", "a")],
  [segment("vis0  ONNX PREDICTOR PORT :8788 ", "d"), segment("READY", "a")],
  [segment("net0  WARMUP DISPATCHER PORT :8789 ", "d"), segment("LINK", "a")],
  [segment("red0  NET EFFICIENCY 1.0x OPTIMAL ", "d"), segment("READY", "a")],
  [segment("Mounting /dev/workers-kv -> ROOT: "), segment("··· ", "d"), segment("OK", "a")],
  [segment("Loading RandomForest edge trees "), segment("···· ", "d"), segment("OK", "a")],
  [segment("Starting [ none naive predict ] "), segment("···· ", "d"), segment("OK", "a")],
  [segment("Locating the spike horizon "), segment("······ ", "d"), segment("99.9%")],
  [],
  [segment("SYSTEM COLD-START  "), segment("eliminated.", "h")],
  [segment("subject Cloudflare Isolate   status pre-warmed ", "d"), segment("!", "a"), segment("!", "a")],
  [],
  [segment("Type "), segment("help", "h"), segment(" for commands. Ready.")],
];

const PROMPT = "prophetx:~# ";

export interface TerminalMirrorHandle {
  logExternalRequest: (log: TelemetryLog) => void;
  logExternalBatchSummary: (count: number, preset: string, coldRate: number, avgLatency: number) => void;
  logCustomEvent: (tag: string, detail: string, color?: Segment['c']) => void;
}

interface InteractiveTerminalLandingProps {
  onNavigate: (tab: string) => void;
  onSimulateStep?: (log: TelemetryLog, isolates: IsolateState[]) => void;
  onSimulateStart?: (count: number, preset: TrafficPreset) => void;
  onSimulateEnd?: (logs: TelemetryLog[], isolates: IsolateState[]) => void;
  terminalRef?: React.MutableRefObject<TerminalMirrorHandle | null>;
}

export function InteractiveTerminalLanding({
  onNavigate,
  onSimulateStep,
  onSimulateStart,
  onSimulateEnd,
  terminalRef,
}: InteractiveTerminalLandingProps) {
  const [lines, setLines] = useState<Segment[][]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [booted, setBooted] = useState(false);
  const [version, setVersion] = useState(0);
  const simulatorRef = useRef(new PreWarmingSimulator('adaptive'));
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationAbortRef = useRef(false);

  // ── Boot animation: type lines one by one ──
  useEffect(() => {
    let cancelled = false;
    const bootLines: Segment[][] = [];
    let i = 0;

    const typeNext = () => {
      if (cancelled || i >= BOOT_LOG.length) {
        if (!cancelled) {
          setBooted(true);
        }
        return;
      }
      bootLines.push(BOOT_LOG[i]);
      setLines([...bootLines]);
      setVersion(v => v + 1);
      i++;
      setTimeout(typeNext, 40 + Math.random() * 60);
    };

    typeNext();
    return () => { cancelled = true; };
  }, []);

  // ── Focus capture ──
  useEffect(() => {
    const el = containerRef.current;
    if (el) el.focus();
  }, [booted]);

  // ── Append helper ──
  const appendLines = useCallback((newLines: Segment[][]) => {
    setLines(prev => {
      const next = [...prev, ...newLines];
      // Keep buffer manageable
      if (next.length > 200) return next.slice(-200);
      return next;
    });
    setVersion(v => v + 1);
  }, []);

  const appendLine = useCallback((segs: Segment[]) => {
    appendLines([segs]);
  }, [appendLines]);

  // ── Bi-directional terminal mirroring hook ──
  useEffect(() => {
    if (!terminalRef) return;
    terminalRef.current = {
      logExternalRequest: (log: TelemetryLog) => {
        const statusTag = log.isCold ? "COLD_BOOT" : "WARM_HIT";
        const statusColor: Segment["c"] = log.isCold ? "a" : "p";
        const latencyColor: Segment["c"] = log.latencyMs > 40 ? "a" : log.latencyMs > 5 ? "d" : "p";
        appendLine([
          segment("  [MIRROR-REQ] ", "h"),
          segment(`req_${String(log.requestId).padStart(4, '0')}`, "d"),
          segment(" • "),
          segment(`[${statusTag}]`, statusColor),
          segment(" • "),
          segment(`${log.latencyMs}ms`, latencyColor),
          segment(` • ${log.city}`, "d"),
        ]);
      },
      logExternalBatchSummary: (count: number, pr: string, coldRate: number, avgLat: number) => {
        appendLines([
          [],
          [segment("  [MIRROR-BATCH] ", "h"), segment(`${count} requests (${pr})`, "d")],
          [
            segment(`  ▸ Cold Start Rate: `, "d"),
            segment(`${coldRate}%`, coldRate > 10 ? "a" : "p"),
            segment(`  •  Avg Latency: `, "d"),
            segment(`${avgLat}ms`, "h"),
          ],
          [],
        ]);
      },
      logCustomEvent: (tag: string, detail: string, color: Segment["c"] = "h") => {
        appendLine([
          segment(`  [${tag}] `, color),
          segment(detail, "d"),
        ]);
      },
    };
  }, [terminalRef, appendLine, appendLines]);

  // ── Command Handlers ──
  const handleHelp = useCallback(() => {
    appendLines([
      [],
      [segment("╔══════════════════════════════════════════════╗")],
      [segment("║  "), segment("ProphetX Terminal Commands", "h"), segment("                 ║")],
      [segment("╠══════════════════════════════════════════════╣")],
      [segment("║                                              ║")],
      [segment("║  "), segment("simulate [n] [preset]", "a"), segment("                   ║")],
      [segment("║  ", "d"), segment("  Run n requests (default 30, diurnal)", "d"), segment("   ║")],
      [segment("║  ", "d"), segment("  Presets: diurnal|spike|bursts|idle_lull", "d"), segment("║")],
      [segment("║                                              ║")],
      [segment("║  "), segment("benchmark", "a"), segment("                                 ║")],
      [segment("║  ", "d"), segment("  3-mode comparison table", "d"), segment("               ║")],
      [segment("║                                              ║")],
      [segment("║  "), segment("graphs", "a"), segment("                                    ║")],
      [segment("║  ", "d"), segment("  Open custom telemetry studio", "d"), segment("          ║")],
      [segment("║                                              ║")],
      [segment("║  "), segment("workers", "a"), segment("                                   ║")],
      [segment("║  ", "d"), segment("  Show worker fleet status", "d"), segment("              ║")],
      [segment("║                                              ║")],
      [segment("║  "), segment("probe", "a"), segment("                                     ║")],
      [segment("║  ", "d"), segment("  HTTP probe local workers", "d"), segment("              ║")],
      [segment("║                                              ║")],
      [segment("║  "), segment("status", "a"), segment("                                    ║")],
      [segment("║  ", "d"), segment("  Engine metrics summary", "d"), segment("                ║")],
      [segment("║                                              ║")],
      [segment("║  "), segment("clear", "a"), segment("  "), segment("reboot", "a"), segment("                            ║")],
      [segment("║                                              ║")],
      [segment("╚══════════════════════════════════════════════╝")],
      [],
    ]);
  }, [appendLines]);

  const handleSimulate = useCallback((args: string[]) => {
    if (isSimulating) {
      appendLine([segment("  ERROR: ", "a"), segment("Simulation already running. Wait for completion.", "d")]);
      return;
    }

    const count = parseInt(args[0]) || 30;
    const preset = (['diurnal', 'spike', 'bursts', 'idle_lull'].includes(args[1]) ? args[1] : 'diurnal') as TrafficPreset;

    setIsSimulating(true);
    simulationAbortRef.current = false;

    const sim = simulatorRef.current;
    sim.reset('adaptive');

    onSimulateStart?.(count, preset);

    appendLines([
      [],
      [segment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")],
      [segment("  SIMULATION START  ", "h"), segment(`${count} requests • ${preset} • adaptive`, "d")],
      [segment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")],
      [],
    ]);

    let i = 0;
    const streamNext = () => {
      if (simulationAbortRef.current || i >= count) {
        // Print summary
        const metrics = sim.computeMetrics();
        const summaryLines: Segment[][] = [
          [],
          [segment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")],
          [segment("  SIMULATION COMPLETE", "h")],
          [segment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")],
          [segment(`  Total Requests   : `, "d"), segment(`${metrics.totalRealRequests}`)],
          [segment(`  Cold Starts      : `, "d"), segment(`${metrics.coldStartCount}`, metrics.coldStartCount > 0 ? "a" : "p")],
          [segment(`  Warm Hits        : `, "d"), segment(`${metrics.warmStartCount}`, "p")],
          [segment(`  Cold Start Rate  : `, "d"), segment(`${metrics.coldStartRatePercent}%`, metrics.coldStartRatePercent > 10 ? "a" : "p")],
          [segment(`  Avg Latency      : `, "d"), segment(`${metrics.avgLatencyMs}ms`)],
          [segment(`  P50 / P95 / P99  : `, "d"), segment(`${metrics.p50LatencyMs}ms / ${metrics.p95LatencyMs}ms / ${metrics.p99LatencyMs}ms`)],
          [segment(`  Synthetic Pings  : `, "d"), segment(`${metrics.totalSyntheticRequests}`)],
          [segment(`  Cold Avoided     : `, "d"), segment(`${metrics.coldStartsAvoided}`, "h")],
          [segment(`  Wasted Warmups   : `, "d"), segment(`${metrics.wastedWarmupCount}`, metrics.wastedWarmupCount > 0 ? "a" : "p")],
          [segment(`  Net Efficiency   : `, "d"), segment(`${metrics.netInvocationEfficiencyRatio}%`, "h")],
          [segment("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")],
          [],
        ];

        setLines(prev => {
          const next = [...prev, ...summaryLines];
          return next.length > 200 ? next.slice(-200) : next;
        });
        setVersion(v => v + 1);
        setIsSimulating(false);
        onSimulateEnd?.(sim.getLogs(), sim.getIsolates());
        return;
      }

      const log = sim.simulateRequest(false, false);
      i++;
      onSimulateStep?.(log, sim.getIsolates());

      const statusTag = log.isCold ? "COLD_BOOT" : "WARM_HIT";
      const statusColor: Segment["c"] = log.isCold ? "a" : "p";
      const latencyColor: Segment["c"] = log.latencyMs > 40 ? "a" : log.latencyMs > 5 ? "d" : "p";

      const line: Segment[] = [
        segment(`  req_${String(i).padStart(4, '0')}`, "d"),
        segment(` • `),
        segment(`[${statusTag}]`, statusColor),
        segment(` • latency=`),
        segment(`${log.latencyMs}ms`, latencyColor),
        segment(` • ${log.city}`, "d"),
      ];

      // Occasionally show dispatcher action
      const extraLines: Segment[][] = [line];
      if (log.isCold && i > 1) {
        extraLines.push([
          segment(`         `, "d"),
          segment(`[DISPATCHER]`, "a"),
          segment(` warm-up ping fired → isolate ${log.isolateId}`, "d"),
        ]);
      }

      setLines(prev => {
        const next = [...prev, ...extraLines];
        return next.length > 200 ? next.slice(-200) : next;
      });
      setVersion(v => v + 1);

      setTimeout(streamNext, 50 + Math.random() * 40);
    };

    // Start streaming after a beat
    setTimeout(streamNext, 120);
  }, [isSimulating, appendLines, appendLine, onSimulateStart, onSimulateStep, onSimulateEnd]);

  const handleBenchmark = useCallback(() => {
    const report = VERIFIED_BENCHMARK_REPORT;
    const none = report.modes.none;
    const naive = report.modes.naive;
    const pred = report.modes.predictive;

    appendLines([
      [],
      [segment("╔═══════════════════════════════════════════════════════════╗")],
      [segment("║  "), segment("3-MODE BENCHMARK COMPARISON  (Phase 9 Data)", "h"), segment("          ║")],
      [segment("╠═══════════════════════════════════════════════════════════╣")],
      [segment("║  Metric              None      Naive     Adaptive       ║")],
      [segment("╠═══════════════════════════════════════════════════════════╣")],
      [segment(`║  Cold Start Rate     `), segment(`${String(none.coldStartRatePercent).padEnd(10)}`, "a"), segment(`${String(naive.coldStartRatePercent).padEnd(10)}`), segment(`${String(pred.coldStartRatePercent).padEnd(10)}`, "h"), segment("  ║")],
      [segment(`║  Avg Latency (ms)    `), segment(`${String(none.avgLatencyMs).padEnd(10)}`, "a"), segment(`${String(naive.avgLatencyMs).padEnd(10)}`), segment(`${String(pred.avgLatencyMs).padEnd(10)}`, "h"), segment("  ║")],
      [segment(`║  P95 Latency         `), segment(`${String(none.p95LatencyMs).padEnd(10)}`, "a"), segment(`${String(naive.p95LatencyMs).padEnd(10)}`), segment(`${String(pred.p95LatencyMs).padEnd(10)}`, "h"), segment("  ║")],
      [segment(`║  P99 Latency         `), segment(`${String(none.p99LatencyMs).padEnd(10)}`, "a"), segment(`${String(naive.p99LatencyMs).padEnd(10)}`), segment(`${String(pred.p99LatencyMs).padEnd(10)}`, "h"), segment("  ║")],
      [segment(`║  Wasted Warmups      `), segment(`${String(none.wastedWarmupCount).padEnd(10)}`), segment(`${String(naive.wastedWarmupCount).padEnd(10)}`, "a"), segment(`${String(pred.wastedWarmupCount).padEnd(10)}`, "h"), segment("  ║")],
      [segment(`║  Cold Avoided        `), segment(`${String(none.coldStartsAvoided).padEnd(10)}`), segment(`${String(naive.coldStartsAvoided).padEnd(10)}`), segment(`${String(pred.coldStartsAvoided).padEnd(10)}`, "h"), segment("  ║")],
      [segment(`║  Efficiency          `), segment(`${String(none.netInvocationEfficiencyRatio + '%').padEnd(10)}`), segment(`${String(naive.netInvocationEfficiencyRatio + '%').padEnd(10)}`), segment(`${String(pred.netInvocationEfficiencyRatio + '%').padEnd(10)}`, "h"), segment("  ║")],
      [segment("╚═══════════════════════════════════════════════════════════╝")],
      [],
      [segment("  Cold-start reduction (pred vs none): ", "d"), segment(`${report.summary.predictive_vs_none_cold_start_reduction_percent}%`, "h")],
      [segment("  Wasted warmup reduction (pred vs naive): ", "d"), segment(`${report.summary.predictive_vs_naive_wasted_warmup_reduction_percent}%`, "h")],
      [],
      [segment("  Type "), segment("graphs", "a"), segment(" to open interactive telemetry studio.")],
      [],
    ]);
  }, [appendLines]);

  const handleWorkers = useCallback(() => {
    appendLines([
      [],
      [segment("  ┌─ WORKER FLEET STATUS ─────────────────────┐")],
      [segment("  │                                            │")],
      [segment("  │  "), segment(":8787", "h"), segment("  Target Worker     "), segment("● READY", "a"), segment("        │")],
      [segment("  │  "), segment(":8788", "h"), segment("  ONNX Predictor    "), segment("● READY", "a"), segment("        │")],
      [segment("  │  "), segment(":8789", "h"), segment("  Warmup Dispatcher "), segment("● READY", "a"), segment("        │")],
      [segment("  │                                            │")],
      [segment("  │  Isolate pool: ", "d"), segment(`${simulatorRef.current.getIsolates().length} active`, "p"), segment("                  │")],
      [segment("  │  Mode: ", "d"), segment("adaptive (ONNX RandomForest)", "h"), segment("       │")],
      [segment("  │                                            │")],
      [segment("  └────────────────────────────────────────────┘")],
      [],
    ]);
  }, [appendLines]);

  const handleProbe = useCallback(() => {
    appendLine([segment("  Probing local workers...", "d")]);
    setVersion(v => v + 1);

    const ports = [
      { port: 8787, name: "Target Worker" },
      { port: 8788, name: "ONNX Predictor" },
      { port: 8789, name: "Warmup Dispatcher" },
    ];

    let probeIdx = 0;
    const probeNext = () => {
      if (probeIdx >= ports.length) {
        appendLine([segment("  Probe complete.", "d")]);
        appendLine([]);
        return;
      }

      const p = ports[probeIdx];
      probeIdx++;

      const start = performance.now();
      fetch(`http://127.0.0.1:${p.port}/`, { signal: AbortSignal.timeout(3000) })
        .then(res => {
          const elapsed = (performance.now() - start).toFixed(1);
          appendLine([
            segment(`  ${p.name} :${p.port} → `, "d"),
            segment(`${res.status} ${res.statusText}`, res.ok ? "p" : "a"),
            segment(` (${elapsed}ms)`, "d"),
          ]);
          setTimeout(probeNext, 200);
        })
        .catch(() => {
          const elapsed = (performance.now() - start).toFixed(1);
          appendLine([
            segment(`  ${p.name} :${p.port} → `, "d"),
            segment("UNREACHABLE", "a"),
            segment(` (${elapsed}ms)`, "d"),
          ]);
          setTimeout(probeNext, 200);
        });
    };

    setTimeout(probeNext, 300);
  }, [appendLine]);

  const handleStatus = useCallback(() => {
    const metrics = simulatorRef.current.computeMetrics();
    appendLines([
      [],
      [segment("  ┌─ ENGINE STATUS ───────────────────────────┐")],
      [segment("  │  Mode          : ", "d"), segment("adaptive (ONNX RF)", "h"), segment("       │")],
      [segment("  │  Total Requests: ", "d"), segment(`${metrics.totalRealRequests}`, "p"), segment(`${' '.repeat(Math.max(0, 24 - String(metrics.totalRealRequests).length))}│`)],
      [segment("  │  Cold Starts   : ", "d"), segment(`${metrics.coldStartCount}`, metrics.coldStartCount > 0 ? "a" : "p"), segment(`${' '.repeat(Math.max(0, 24 - String(metrics.coldStartCount).length))}│`)],
      [segment("  │  Warm Hits     : ", "d"), segment(`${metrics.warmStartCount}`, "p"), segment(`${' '.repeat(Math.max(0, 24 - String(metrics.warmStartCount).length))}│`)],
      [segment("  │  Avg Latency   : ", "d"), segment(`${metrics.avgLatencyMs}ms`, "p"), segment(`${' '.repeat(Math.max(0, 22 - String(metrics.avgLatencyMs).length))}│`)],
      [segment("  │  Cold Rate     : ", "d"), segment(`${metrics.coldStartRatePercent}%`, metrics.coldStartRatePercent > 10 ? "a" : "h"), segment(`${' '.repeat(Math.max(0, 23 - String(metrics.coldStartRatePercent).length))}│`)],
      [segment("  │  Efficiency    : ", "d"), segment(`${metrics.netInvocationEfficiencyRatio}%`, "h"), segment(`${' '.repeat(Math.max(0, 23 - String(metrics.netInvocationEfficiencyRatio).length))}│`)],
      [segment("  └────────────────────────────────────────────┘")],
      [],
    ]);
  }, [appendLines]);

  // ── Command Dispatcher ──
  const executeCommand = useCallback((raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Echo the command
    appendLine([segment(PROMPT), segment(trimmed, "h")]);

    setHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);

    const [cmd, ...args] = trimmed.toLowerCase().split(/\s+/);

    switch (cmd) {
      case 'help':
      case '?':
        handleHelp();
        break;

      case 'simulate':
      case 'sim':
      case 'run':
        onNavigate('simulator');
        handleSimulate(args);
        break;

      case 'benchmark':
      case 'bench':
        handleBenchmark();
        onNavigate('benchmark');
        break;

      case 'graphs':
      case 'graph':
      case 'telemetry':
        appendLine([segment("  ▸ Custom Telemetry Studio → right panel", "d")]);
        appendLine([]);
        onNavigate('custom-graphs');
        break;

      case 'workers':
      case 'fleet':
        handleWorkers();
        onNavigate('functions');
        break;

      case 'probe':
      case 'ping':
        handleProbe();
        onNavigate('probe');
        break;

      case 'status':
      case 'metrics':
        handleStatus();
        break;

      case 'simulator':
        appendLine([segment("  ▸ Traffic Simulator → right panel", "d")]);
        appendLine([]);
        onNavigate('simulator');
        break;

      case 'onnx':
      case 'model':
        appendLine([segment("  ▸ ONNX Feature Inspector → right panel", "d")]);
        appendLine([]);
        onNavigate('onnx');
        break;

      case 'roadmap':
      case 'phases':
        appendLine([segment("  ▸ Phase Roadmap → right panel", "d")]);
        appendLine([]);
        onNavigate('roadmap');
        break;

      case 'code':
      case 'architecture':
      case 'arch':
        appendLine([segment("  ▸ Architecture Explorer → right panel", "d")]);
        appendLine([]);
        onNavigate('code');
        break;

      case 'functions':
        appendLine([segment("  ▸ Serverless Workers → right panel", "d")]);
        appendLine([]);
        onNavigate('functions');
        break;

      case 'clear':
      case 'cls':
        setLines([]);
        setVersion(v => v + 1);
        break;

      case 'reboot':
        setLines([]);
        setVersion(v => v + 1);
        setBooted(false);
        // Trigger re-boot
        setTimeout(() => {
          let idx = 0;
          const bootLines: Segment[][] = [];
          const typeNext = () => {
            if (idx >= BOOT_LOG.length) {
              setBooted(true);
              return;
            }
            bootLines.push(BOOT_LOG[idx]);
            setLines([...bootLines]);
            setVersion(v => v + 1);
            idx++;
            setTimeout(typeNext, 40 + Math.random() * 60);
          };
          typeNext();
        }, 100);
        break;

      case 'abort':
      case 'stop':
        if (isSimulating) {
          simulationAbortRef.current = true;
          appendLine([segment("  Simulation aborted.", "a")]);
          appendLine([]);
        } else {
          appendLine([segment("  No simulation running.", "d")]);
          appendLine([]);
        }
        break;

      default:
        appendLines([
          [segment(`  Unknown command: `, "d"), segment(trimmed, "a")],
          [segment("  Type "), segment("help", "h"), segment(" for available commands.")],
          [],
        ]);
        break;
    }
  }, [appendLine, appendLines, handleHelp, handleSimulate, handleBenchmark, handleWorkers, handleProbe, handleStatus, onNavigate, isSimulating]);

  // ── Keyboard Handler ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!booted) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = input;
      setInput('');
      executeCommand(cmd);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      setInput(prev => prev.slice(0, -1));
      setVersion(v => v + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIdx);
        setInput(history[newIdx]);
        setVersion(v => v + 1);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIdx = historyIndex + 1;
        if (newIdx >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(newIdx);
          setInput(history[newIdx]);
        }
        setVersion(v => v + 1);
      }
    } else if (e.key === 'Escape') {
      setInput('');
      setVersion(v => v + 1);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Tab completion
      const commands = ['help', 'simulate', 'benchmark', 'graphs', 'workers', 'probe', 'status', 'clear', 'reboot', 'simulator', 'onnx', 'roadmap', 'code', 'functions', 'abort'];
      const match = commands.filter(c => c.startsWith(input.toLowerCase()));
      if (match.length === 1) {
        setInput(match[0]);
        setVersion(v => v + 1);
      } else if (match.length > 1) {
        appendLine([segment(PROMPT), segment(input, "h")]);
        appendLine([segment("  " + match.join("  "), "d")]);
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setInput(prev => prev + e.key);
      setVersion(v => v + 1);
    } else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      if (isSimulating) {
        simulationAbortRef.current = true;
      }
      appendLine([segment(PROMPT + input + "^C", "d")]);
      setInput('');
      setVersion(v => v + 1);
    } else if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setLines([]);
      setVersion(v => v + 1);
    }
  }, [booted, input, history, historyIndex, executeCommand, appendLine, isSimulating]);

  // ── Quick-action chip click ──
  const handleChip = useCallback((cmd: string) => {
    if (!booted) return;
    setInput('');
    executeCommand(cmd);
    containerRef.current?.focus();
  }, [booted, executeCommand]);

  return (
    <div
      ref={containerRef}
      className="terminal-landing"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ outline: 'none' }}
    >
      {/* Full CRT Background */}
      <div className="terminal-crt-container">
        <Scene
          variant="terminal"
          speed={0.9}
          typeSpeed={1.0}
          motion={0.6}
          hue={0}
          saturation={1.0}
          brightness={1.0}
          opacity={1.0}
          logMode="project"
          customLines={booted ? lines : undefined}
          commandPrompt={booted ? PROMPT : undefined}
          commandInput={booted ? input : undefined}
          version={version}
          className="terminal-crt-scene"
        />
      </div>

      {/* Bezel Frame */}
      <div className="terminal-bezel">
        <div className="terminal-bezel-top">
          <div className="terminal-bezel-led" />
          <span className="terminal-bezel-label">ProphetX — Adaptive Pre-Warming Engine</span>
          <div className="terminal-bezel-led terminal-bezel-led--active" />
        </div>
      </div>

      {/* Quick-Action Chips */}
      <div className="terminal-chips">
        <button className="terminal-chip" onClick={() => handleChip('simulate 30')}>⚡ simulate 30</button>
        <button className="terminal-chip" onClick={() => handleChip('benchmark')}>📊 benchmark</button>
        <button className="terminal-chip" onClick={() => handleChip('graphs')}>📈 graphs</button>
        <button className="terminal-chip" onClick={() => handleChip('workers')}>🛡 workers</button>
        <button className="terminal-chip" onClick={() => handleChip('probe')}>🔍 probe</button>
        <button className="terminal-chip" onClick={() => handleChip('status')}>📋 status</button>
        <button className="terminal-chip" onClick={() => handleChip('help')}>❓ help</button>
        <button className="terminal-chip terminal-chip--danger" onClick={() => handleChip('clear')}>✕ clear</button>
      </div>

      {/* Click-to-focus hint */}
      {booted && (
        <div className="terminal-focus-hint">
          Click here or press any key to type commands
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { OverviewCards } from './components/OverviewCards';
import { TrafficControls } from './components/TrafficControls';
import { SimulationVisualizer } from './components/SimulationVisualizer';
import { MetricsComparison } from './components/MetricsComparison';
import { OnnxInspector } from './components/OnnxInspector';
import { ServerlessFunctionStatus } from './components/ServerlessFunctionStatus';
import { LiveWorkerProbe } from './components/LiveWorkerProbe';
import { CodeExplorer } from './components/CodeExplorer';
import { PhaseRoadmap } from './components/PhaseRoadmap';
import { CustomTelemetryStudio } from './components/CustomTelemetryStudio';
import { InteractiveTerminalLanding, type TerminalMirrorHandle } from './components/InteractiveTerminalLanding';
import { PreWarmingSimulator } from './utils/simulationEngine';
import { VERIFIED_BENCHMARK_REPORT } from './data/benchmarkData';
import type { WarmingMode, TrafficPreset, TelemetryLog, IsolateState, MultiModeSimulationResult } from './types';
import { Maximize2, Monitor, X } from 'lucide-react';
import './App.css';

const PANEL_TABS: { id: string; label: string }[] = [
  { id: 'benchmark', label: 'Benchmarks' },
  { id: 'custom-graphs', label: 'Telemetry' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'onnx', label: 'ONNX' },
  { id: 'functions', label: 'Workers' },
  { id: 'probe', label: 'Probe' },
  { id: 'code', label: 'Architecture' },
  { id: 'roadmap', label: 'Roadmap' },
];

export function App() {
  const [currentMode, setCurrentMode] = useState<WarmingMode>('adaptive');
  const [rightPanel, setRightPanel] = useState<string | null>(null);
  const [panelFullscreen, setPanelFullscreen] = useState(false);
  const [preset, setPreset] = useState<TrafficPreset>('diurnal');
  const [requestCount, setRequestCount] = useState<number>(30);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isRealDataMode, setIsRealDataMode] = useState<boolean>(true);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);
  const [activeSnippetIndex, setActiveSnippetIndex] = useState<number>(0);

  const simulatorRef = useRef<PreWarmingSimulator>(new PreWarmingSimulator('adaptive'));
  const terminalMirrorRef = useRef<TerminalMirrorHandle | null>(null);
  const streamIntervalRef = useRef<number | null>(null);

  const [multiModeResult, setMultiModeResult] = useState<MultiModeSimulationResult>(() =>
    PreWarmingSimulator.runFullMultiModeSimulation('diurnal', 30)
  );

  const [logs, setLogs] = useState<TelemetryLog[]>(() => multiModeResult.modes.adaptive.logs);
  const [isolates, setIsolates] = useState<IsolateState[]>(() => multiModeResult.modes.adaptive.isolates);
  const [comparisonData, setComparisonData] = useState(() => ({
    none: multiModeResult.modes.none.metrics,
    naive: multiModeResult.modes.naive.metrics,
    adaptive: multiModeResult.modes.adaptive.metrics
  }));

  // Switch strategy mode
  const handleSelectMode = (mode: WarmingMode) => {
    setCurrentMode(mode);
    simulatorRef.current.setMode(mode);
    if (multiModeResult?.modes[mode]) {
      setLogs([...multiModeResult.modes[mode].logs]);
      setIsolates([...multiModeResult.modes[mode].isolates]);
    } else {
      setLogs([...simulatorRef.current.getLogs()]);
      setIsolates([...simulatorRef.current.getIsolates()]);
    }
    terminalMirrorRef.current?.logCustomEvent(
      'MODE-CHANGE',
      `Strategy set to "${mode.toUpperCase()}". ${
        mode === 'adaptive'
          ? 'ML-guided ONNX predictor enabled.'
          : mode === 'naive'
          ? 'Fixed 2.0s periodic cron warmer enabled.'
          : 'Zero synthetic pre-warming baseline.'
      }`,
      'h'
    );
  };

  const handleToggleDataSource = (real: boolean) => {
    setIsRealDataMode(real);
  };

  const handleRunSingle = () => {
    const log = simulatorRef.current.simulateRequest(false, false);
    setLogs([...simulatorRef.current.getLogs()]);
    setIsolates([...simulatorRef.current.getIsolates()]);
    setIsRealDataMode(false);
    terminalMirrorRef.current?.logExternalRequest(log);
  };

  const handleRunBatch = () => {
    handleRunMultiModeSimulation(preset, requestCount);
  };

  const handleSelectPreset = (newPreset: TrafficPreset) => {
    setPreset(newPreset);
    handleRunMultiModeSimulation(newPreset, requestCount);
  };

  const handleChangeRequestCount = (newCount: number) => {
    setRequestCount(newCount);
    handleRunMultiModeSimulation(preset, newCount);
  };

  const handleRunMultiModeSimulation = (customPreset?: TrafficPreset, customCount?: number) => {
    const targetPreset = customPreset || preset;
    const targetCount = customCount || requestCount;
    setIsSimulating(true);

    const multi = PreWarmingSimulator.runFullMultiModeSimulation(targetPreset, targetCount);
    setMultiModeResult(multi);

    const comp = {
      none: multi.modes.none.metrics,
      naive: multi.modes.naive.metrics,
      adaptive: multi.modes.adaptive.metrics
    };
    setComparisonData(comp);

    const activeOutput = multi.modes[currentMode];
    if (activeOutput) {
      setLogs([...activeOutput.logs]);
      setIsolates([...activeOutput.isolates]);
    }

    setIsRealDataMode(false);
    setIsSimulating(false);

    terminalMirrorRef.current?.logCustomEvent(
      'MULTI-SIM',
      `Simulated all 3 modes (${targetCount} reqs, ${targetPreset}): None (${multi.modes.none.metrics.coldStartRatePercent}% cold) vs Naive (${multi.modes.naive.metrics.wastedWarmupCount} wasted) vs ProphetX (${multi.modes.adaptive.metrics.coldStartsAvoided} avoided, ${multi.modes.adaptive.metrics.p95LatencyMs}ms P95).`,
      'h'
    );
  };

  const handleRunComparison = () => {
    handleRunMultiModeSimulation();
    setRightPanel('benchmark');
  };

  const handleReset = () => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
      setIsLiveStreaming(false);
    }
    simulatorRef.current.reset(currentMode);
    setLogs([]);
    setIsolates([]);
    terminalMirrorRef.current?.logCustomEvent(
      'RESET',
      'Simulator telemetry and isolate memory cleared.',
      'a'
    );
  };

  // Continuous live traffic stream
  const handleToggleLiveStream = () => {
    if (isLiveStreaming) {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
      }
      setIsLiveStreaming(false);
      terminalMirrorRef.current?.logCustomEvent(
        'STREAM-STOP',
        'Continuous traffic generation paused.',
        'd'
      );
    } else {
      setIsLiveStreaming(true);
      setIsRealDataMode(false);
      terminalMirrorRef.current?.logCustomEvent(
        'STREAM-START',
        'Continuous traffic generation active (1 req / 800ms)',
        'p'
      );
      streamIntervalRef.current = window.setInterval(() => {
        const log = simulatorRef.current.simulateRequest(false, false);
        setLogs([...simulatorRef.current.getLogs()]);
        setIsolates([...simulatorRef.current.getIsolates()]);
        terminalMirrorRef.current?.logExternalRequest(log);
      }, 800);
    }
  };

  // 10x Spike surge action
  const handleInjectSpike = () => {
    setIsRealDataMode(false);
    const newLogs = simulatorRef.current.simulateSpikeCluster(12);
    setLogs([...simulatorRef.current.getLogs()]);
    setIsolates([...simulatorRef.current.getIsolates()]);
    terminalMirrorRef.current?.logCustomEvent(
      'SPIKE-SURGE',
      `Injected 10x traffic spike cluster (12 reqs). Last latency: ${newLogs[newLogs.length - 1]?.latencyMs}ms`,
      'a'
    );
  };

  // Force Eviction (>3.5s Idle) action
  const handleForceEviction = () => {
    const { evictedCount } = simulatorRef.current.forceEviction(4500);
    setIsolates([...simulatorRef.current.getIsolates()]);
    terminalMirrorRef.current?.logCustomEvent(
      'EVICTION',
      `Simulated 4,500ms idle delay. ${evictedCount} V8 isolates evicted. Next request will be COLD BOOT.`,
      'a'
    );
  };

  // Pre-warm fleet action
  const handlePreWarmFleet = () => {
    const { warmedId } = simulatorRef.current.preWarmFleet();
    setLogs([...simulatorRef.current.getLogs()]);
    setIsolates([...simulatorRef.current.getIsolates()]);
    terminalMirrorRef.current?.logCustomEvent(
      'FLEET-WARM',
      `Pre-warm ping dispatched to edge fleet. Active isolate: ${warmedId} (WARM)`,
      'p'
    );
  };

  // Custom vector injection from ONNX Inspector
  const handleInjectVector = (vector: {
    hourOfDay: number;
    rolling1m: number;
    rolling5m: number;
    idleGapSec: number;
    trafficDerivative: number;
    isBurst: boolean;
    score: number;
    triggerWarming: boolean;
  }) => {
    setIsRealDataMode(false);
    const log = simulatorRef.current.simulateCustomInference(
      vector.hourOfDay,
      vector.rolling1m,
      vector.rolling5m,
      vector.idleGapSec,
      vector.trafficDerivative,
      vector.isBurst,
      vector.score,
      vector.triggerWarming
    );
    setLogs([...simulatorRef.current.getLogs()]);
    setIsolates([...simulatorRef.current.getIsolates()]);
    terminalMirrorRef.current?.logCustomEvent(
      'ONNX-VECTOR',
      `Vector evaluated: P(spike)=${(vector.score * 100).toFixed(1)}% → ${
        vector.triggerWarming ? 'DISPATCH PRE-WARM' : 'IDLE / NO PING'
      } • ${log.isCold ? 'COLD BOOT' : 'WARM HIT'} (${log.latencyMs}ms)`,
      vector.triggerWarming ? 'p' : 'd'
    );
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) {
        clearInterval(streamIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    simulatorRef.current.runBatchSimulation('diurnal', 20);
    setLogs([...simulatorRef.current.getLogs()]);
    setIsolates([...simulatorRef.current.getIsolates()]);
  }, []);

  const activeMetrics = isRealDataMode
    ? (currentMode === 'none'
        ? VERIFIED_BENCHMARK_REPORT.modes.none
        : currentMode === 'naive'
        ? VERIFIED_BENCHMARK_REPORT.modes.naive
        : VERIFIED_BENCHMARK_REPORT.modes.predictive)
    : simulatorRef.current.computeMetrics();

  // Navigation handlers
  const handleTerminalNavigate = useCallback((tab: string) => {
    setRightPanel(tab);
    setPanelFullscreen(false);
  }, []);

  const handleNavigateTab = useCallback((tab: string, snippetIndex?: number) => {
    if (snippetIndex !== undefined) {
      setActiveSnippetIndex(snippetIndex);
    }
    setRightPanel(tab);
  }, []);

  const handleClosePanel = useCallback(() => {
    setRightPanel(null);
    setPanelFullscreen(false);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setPanelFullscreen(prev => !prev);
  }, []);

  // Bi-directional simulation event handlers from CRT terminal
  const handleTerminalSimulateStart = useCallback((_count: number, _preset: TrafficPreset) => {
    setRightPanel('simulator');
    setIsRealDataMode(false);
  }, []);

  const handleTerminalSimulateStep = useCallback((log: TelemetryLog, currentIsolates: IsolateState[]) => {
    setLogs(prev => [...prev.slice(-49), log]);
    setIsolates([...currentIsolates]);
  }, []);

  const handleTerminalSimulateEnd = useCallback((finalLogs: TelemetryLog[], finalIsolates: IsolateState[]) => {
    setLogs([...finalLogs]);
    setIsolates([...finalIsolates]);
  }, []);

  // ── Render the right panel content ──
  const renderPanelContent = () => {
    switch (rightPanel) {
      case 'benchmark':
        return (
          <>
            <OverviewCards
              currentMetrics={activeMetrics}
              currentMode={currentMode}
              benchmarkReport={VERIFIED_BENCHMARK_REPORT}
              isRealDataMode={isRealDataMode}
            />
            <MetricsComparison
              comparisonData={comparisonData}
              benchmarkReport={VERIFIED_BENCHMARK_REPORT}
              isRealDataMode={isRealDataMode}
              onToggleDataSource={handleToggleDataSource}
            />
          </>
        );
      case 'custom-graphs':
        return (
          <CustomTelemetryStudio
            comparisonData={comparisonData}
            benchmarkReport={VERIFIED_BENCHMARK_REPORT}
            isRealDataMode={isRealDataMode}
            onToggleDataSource={handleToggleDataSource}
          />
        );
      case 'simulator':
        return (
          <>
            <TrafficControls
              preset={preset}
              onSelectPreset={handleSelectPreset}
              requestCount={requestCount}
              onChangeRequestCount={handleChangeRequestCount}
              onRunSingle={handleRunSingle}
              onRunBatch={handleRunBatch}
              onRunComparison={handleRunComparison}
              onRunMultiModeSimulation={handleRunMultiModeSimulation}
              onSelectMode={handleSelectMode}
              onReset={handleReset}
              isSimulating={isSimulating}
              currentMode={currentMode}
              isLiveStreaming={isLiveStreaming}
              onToggleLiveStream={handleToggleLiveStream}
              onInjectSpike={handleInjectSpike}
              onForceEviction={handleForceEviction}
            />
            <SimulationVisualizer
              logs={logs}
              isolates={isolates}
              currentMode={currentMode}
              onSelectMode={handleSelectMode}
              preset={preset}
              requestCount={requestCount}
              multiModeResult={multiModeResult}
              onRunMultiModeSimulation={handleRunMultiModeSimulation}
            />
          </>
        );
      case 'onnx':
        return <OnnxInspector onInjectVector={handleInjectVector} />;
      case 'functions':
        return (
          <ServerlessFunctionStatus
            currentMode={currentMode}
            isolates={isolates}
            isLiveConnected={null}
            onNavigateTab={handleNavigateTab}
            onPreWarmFleet={handlePreWarmFleet}
            onEvictFleet={handleForceEviction}
            onTestWorker={(wName) => {
              if (wName === 'worker/target') handleRunSingle();
              else if (wName === 'worker/dispatcher') handlePreWarmFleet();
              else if (wName === 'worker/naive-warmer') handleRunSingle();
              else handleInjectSpike();
            }}
          />
        );
      case 'probe':
        return (
          <LiveWorkerProbe
            onProbeResult={(res) => {
              terminalMirrorRef.current?.logCustomEvent(
                'PROBE-HTTP',
                `HTTP ${res.status} on ${res.payload?.service || 'worker'} • ${
                  res.payload?.telemetry?.cold_boot ? 'COLD BOOT' : 'WARM HIT'
                } (${res.clientDurationMs}ms)`,
                res.payload?.telemetry?.cold_boot ? 'a' : 'p'
              );
            }}
          />
        );
      case 'code':
        return (
          <CodeExplorer
            initialSnippetIndex={activeSnippetIndex}
            onNavigateTab={handleNavigateTab}
          />
        );
      case 'roadmap':
        return <PhaseRoadmap onNavigateTab={handleNavigateTab} />;
      default:
        return null;
    }
  };

  return (
    <div className={`app-shell split-layout ${panelFullscreen ? 'panel-fullscreen' : ''} ${rightPanel ? 'panel-open' : ''}`}>

      {/* ── LEFT: CRT Terminal ── */}
      {!panelFullscreen && (
        <div className="split-left">
          <InteractiveTerminalLanding
            onNavigate={handleTerminalNavigate}
            onSimulateStart={handleTerminalSimulateStart}
            onSimulateStep={handleTerminalSimulateStep}
            onSimulateEnd={handleTerminalSimulateEnd}
            terminalRef={terminalMirrorRef}
          />
        </div>
      )}

      {/* ── RIGHT: UI Panel within green borders ── */}
      {rightPanel && (
        <div className="split-right">
          <div className="panel-screen-frame">
            {/* Panel header with tabs, fullscreen, close */}
            <div className="panel-header">
              <div className="panel-header-tabs">
                {PANEL_TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRightPanel(tab.id)}
                    className={`panel-tab ${rightPanel === tab.id ? 'panel-tab--active' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="panel-header-actions">
                {/* Mode selector */}
                <div className="panel-mode-selector">
                  <button onClick={() => handleSelectMode('none')} className={`panel-mode-btn ${currentMode === 'none' ? 'panel-mode-btn--none' : ''}`}>None</button>
                  <button onClick={() => handleSelectMode('naive')} className={`panel-mode-btn ${currentMode === 'naive' ? 'panel-mode-btn--naive' : ''}`}>Naive</button>
                  <button onClick={() => handleSelectMode('adaptive')} className={`panel-mode-btn ${currentMode === 'adaptive' ? 'panel-mode-btn--adaptive' : ''}`}>Predictive</button>
                </div>
                {/* Data source */}
                <div className="panel-mode-selector">
                  <button onClick={() => handleToggleDataSource(true)} className={`panel-mode-btn ${isRealDataMode ? 'panel-mode-btn--adaptive' : ''}`}>Phase 9</button>
                  <button onClick={() => handleToggleDataSource(false)} className={`panel-mode-btn ${!isRealDataMode ? 'panel-mode-btn--adaptive' : ''}`}>Sim</button>
                </div>
                {/* Fullscreen / Split Toggle Buttons */}
                {panelFullscreen ? (
                  <button
                    onClick={handleToggleFullscreen}
                    className="panel-fullscreen-btn panel-fullscreen-btn--exit"
                    title="Exit Fullscreen & Return to CRT Terminal Split View"
                  >
                    <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Back to Split</span>
                  </button>
                ) : (
                  <button
                    onClick={handleToggleFullscreen}
                    className="panel-fullscreen-btn panel-fullscreen-btn--enter"
                    title="Expand Dashboard to Full Screen (hides CRT terminal)"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Fullscreen</span>
                  </button>
                )}
                <button
                  onClick={handleClosePanel}
                  className="panel-control-btn panel-control-btn--close"
                  title="Close panel and return to terminal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Panel body — scrollable, original UI styling */}
            <div className="panel-body">
              <div className="panel-body-inner">
                {renderPanelContent()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

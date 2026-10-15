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
import type { WarmingMode, TrafficPreset, TelemetryLog, IsolateState } from './types';
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

  const simulatorRef = useRef<PreWarmingSimulator>(new PreWarmingSimulator('adaptive'));
  const terminalMirrorRef = useRef<TerminalMirrorHandle | null>(null);
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [isolates, setIsolates] = useState<IsolateState[]>([]);
  const [comparisonData, setComparisonData] = useState(
    simulatorRef.current.runComparisonAcrossAllModes('diurnal', 30)
  );

  // Switch strategy mode
  const handleSelectMode = (mode: WarmingMode) => {
    setCurrentMode(mode);
    simulatorRef.current.setMode(mode);
    setLogs([...simulatorRef.current.getLogs()]);
    setIsolates([...simulatorRef.current.getIsolates()]);
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
    setIsSimulating(true);
    simulatorRef.current.runBatchSimulation(preset, requestCount);
    const metrics = simulatorRef.current.computeMetrics();
    setLogs([...simulatorRef.current.getLogs()]);
    setIsolates([...simulatorRef.current.getIsolates()]);
    setIsSimulating(false);
    setIsRealDataMode(false);
    terminalMirrorRef.current?.logExternalBatchSummary(
      requestCount,
      preset,
      metrics.coldStartRatePercent,
      metrics.avgLatencyMs
    );
  };

  const handleRunComparison = () => {
    setIsSimulating(true);
    const comp = simulatorRef.current.runComparisonAcrossAllModes(preset, requestCount);
    setComparisonData(comp);
    setRightPanel('benchmark');
    setIsRealDataMode(false);
    setIsSimulating(false);
  };

  const handleReset = () => {
    simulatorRef.current.reset(currentMode);
    setLogs([]);
    setIsolates([]);
  };

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

  // Terminal navigates → open right panel
  const handleTerminalNavigate = useCallback((tab: string) => {
    setRightPanel(tab);
    setPanelFullscreen(false);
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
              onSelectPreset={setPreset}
              requestCount={requestCount}
              onChangeRequestCount={setRequestCount}
              onRunSingle={handleRunSingle}
              onRunBatch={handleRunBatch}
              onRunComparison={handleRunComparison}
              onReset={handleReset}
              isSimulating={isSimulating}
              currentMode={currentMode}
            />
            <SimulationVisualizer
              logs={logs}
              isolates={isolates}
            />
          </>
        );
      case 'onnx':
        return <OnnxInspector />;
      case 'functions':
        return (
          <ServerlessFunctionStatus
            currentMode={currentMode}
            isolates={isolates}
            isLiveConnected={null}
          />
        );
      case 'probe':
        return <LiveWorkerProbe />;
      case 'code':
        return <CodeExplorer />;
      case 'roadmap':
        return <PhaseRoadmap />;
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

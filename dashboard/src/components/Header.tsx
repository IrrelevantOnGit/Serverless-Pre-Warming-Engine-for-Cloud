import React from 'react';
import type { WarmingMode } from '../types';
import { Cpu, Menu, X, Terminal } from 'lucide-react';

interface HeaderProps {
  currentMode: WarmingMode;
  onSelectMode: (mode: WarmingMode) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isRealDataMode: boolean;
  onToggleDataSource: (real: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  activeTab,
  onSelectTab,
  isRealDataMode,
  onToggleDataSource,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navTabs = [
    { id: 'benchmark', label: 'Benchmarks' },
    { id: 'custom-graphs', label: 'Custom Telemetry' },
    { id: 'simulator', label: 'Simulator' },
    { id: 'onnx', label: 'ONNX model' },
    { id: 'functions', label: 'Workers' },
    { id: 'probe', label: 'Local probe' },
    { id: 'code', label: 'Architecture' },
    { id: 'roadmap', label: 'Roadmap' }
  ];

  return (
    <header className="border-b border-[#293440] bg-[#10151c] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Main Header Bar */}
        <div className="flex items-center justify-between h-13 gap-4">
          
          {/* Brand & Subtitle */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-7 h-7 rounded-sm bg-[#18202d] border border-[#2e384d] flex items-center justify-center text-teal-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold tracking-tight text-slate-100">ProphetX</span>
                <span className="text-[10px] font-mono text-slate-400">v1.0</span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-400">
                Serverless Pre-Warming Observability
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1 overflow-x-auto text-xs">
            <button
              onClick={() => onSelectTab('terminal')}
              className="px-3 py-1.5 rounded-sm font-medium transition-colors text-xs whitespace-nowrap bg-emerald-950/70 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900/80 flex items-center gap-1"
            >
              <Terminal className="w-3 h-3" />
              Terminal
            </button>
            <span className="w-px h-4 bg-[#2e384d] mx-1" />
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-3 py-1.5 rounded-sm font-medium transition-colors text-xs whitespace-nowrap ${
                    isActive
                      ? 'bg-[#18202d] text-teal-300 border border-[#2e384d]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#141a24]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Controls: Mode & Data Source */}
          <div className="hidden sm:flex items-center space-x-2 shrink-0">
            
            {/* Data Source Selector */}
            <div className="flex items-center bg-[#0d1219] p-0.5 rounded-sm border border-[#232c3d] text-[11px]">
              <button
                onClick={() => onToggleDataSource(true)}
                className={`px-2 py-0.5 rounded-sm font-medium transition-colors ${
                  isRealDataMode
                    ? 'bg-[#1e2736] text-slate-100'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
                title="Use offline experimental data from metrics/comparison_report.json"
              >
                Phase 9 Data
              </button>
              <button
                onClick={() => onToggleDataSource(false)}
                className={`px-2 py-0.5 rounded-sm font-medium transition-colors ${
                  !isRealDataMode
                    ? 'bg-[#1e2736] text-slate-100'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
                title="Use in-memory simulator data"
              >
                Simulator
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-[#0d1219] p-0.5 rounded-sm border border-[#232c3d] text-[11px]">
              <button
                onClick={() => onSelectMode('none')}
                className={`px-2 py-0.5 rounded-sm font-medium transition-colors ${
                  currentMode === 'none'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                None
              </button>
              <button
                onClick={() => onSelectMode('naive')}
                className={`px-2 py-0.5 rounded-sm font-medium transition-colors ${
                  currentMode === 'naive'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Naive
              </button>
              <button
                onClick={() => onSelectMode('adaptive')}
                className={`px-2 py-0.5 rounded-sm font-medium transition-colors ${
                  currentMode === 'adaptive'
                    ? 'bg-teal-950/80 text-teal-300 border border-teal-800/60'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Predictive
              </button>
            </div>


          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-sm bg-[#18202d] text-slate-300 border border-[#2e384d]"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-[#232c3d] space-y-2">
            <div className="flex flex-col space-y-1">
              {navTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    onSelectTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-left px-3 py-1.5 rounded-sm text-xs font-medium ${
                    activeTab === tab.id
                      ? 'bg-[#18202d] text-teal-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-[#232c3d] flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Evaluation Data Source:</span>
                <div className="flex bg-[#0d1219] p-0.5 rounded-sm border border-[#232c3d] text-[11px]">
                  <button
                    onClick={() => onToggleDataSource(true)}
                    className={`px-2 py-0.5 rounded-sm ${isRealDataMode ? 'bg-[#1e2736] text-white' : 'text-slate-400'}`}
                  >
                    Phase 9
                  </button>
                  <button
                    onClick={() => onToggleDataSource(false)}
                    className={`px-2 py-0.5 rounded-sm ${!isRealDataMode ? 'bg-[#1e2736] text-white' : 'text-slate-400'}`}
                  >
                    Simulator
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Strategy Mode:</span>
                <div className="flex bg-[#0d1219] p-0.5 rounded-sm border border-[#232c3d] text-[11px]">
                  <button
                    onClick={() => onSelectMode('none')}
                    className={`px-2 py-0.5 rounded-sm ${currentMode === 'none' ? 'bg-rose-950 text-rose-300' : 'text-slate-400'}`}
                  >
                    None
                  </button>
                  <button
                    onClick={() => onSelectMode('naive')}
                    className={`px-2 py-0.5 rounded-sm ${currentMode === 'naive' ? 'bg-amber-950 text-amber-300' : 'text-slate-400'}`}
                  >
                    Naive
                  </button>
                  <button
                    onClick={() => onSelectMode('adaptive')}
                    className={`px-2 py-0.5 rounded-sm ${currentMode === 'adaptive' ? 'bg-teal-950 text-teal-300' : 'text-slate-400'}`}
                  >
                    Predictive
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </header>
  );
};

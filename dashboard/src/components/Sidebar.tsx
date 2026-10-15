import React from 'react';
import type { WarmingMode } from '../types';
import { 
  BarChart3, 
  Activity, 
  Brain, 
  Server, 
  Radio, 
  Terminal, 
  Layers, 
  ExternalLink,
  Cpu,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  currentMode: WarmingMode;
  onSelectMode: (mode: WarmingMode) => void;
  isRealDataMode: boolean;
  onToggleDataSource: (real: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentMode,
  onSelectMode,
  isRealDataMode,
  onToggleDataSource,
  isOpen,
  onClose
}) => {
  const navItems = [
    { id: 'benchmark', label: 'Evaluation & Benchmarks', icon: BarChart3 },
    { id: 'simulator', label: 'Traffic Simulator', icon: Activity },
    { id: 'onnx', label: 'ONNX Feature Inspector', icon: Brain },
    { id: 'functions', label: 'Serverless Functions', icon: Server },
    { id: 'probe', label: 'Local Worker Probe', icon: Radio },
    { id: 'code', label: 'Codebase Architecture', icon: Terminal },
    { id: 'roadmap', label: 'Development Phases', icon: Layers }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0e131d] border-r border-[#232c3d]
        flex flex-col justify-between transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Top Header & Brand */}
        <div className="p-4 border-b border-[#232c3d]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-sm bg-[#18202d] border border-[#2e384d] flex items-center justify-center text-teal-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-slate-100 tracking-tight">
                    ProphetX
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    v1.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Pre-Warming Research Engine
                </p>
              </div>
            </div>

            {/* Mobile close button */}
            <button 
              onClick={onClose}
              className="lg:hidden p-1 rounded-sm text-slate-400 hover:text-white hover:bg-[#18202d]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Strategy Mode Switcher in Sidebar */}
          <div className="mt-4 pt-3 border-t border-[#232c3d]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Warming Strategy
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-1 bg-[#0a0d14] p-1 rounded-sm border border-[#232c3d] text-xs">
              <button
                onClick={() => onSelectMode('none')}
                className={`py-1 rounded-sm text-xs font-medium transition-colors text-center ${
                  currentMode === 'none'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                None
              </button>
              <button
                onClick={() => onSelectMode('naive')}
                className={`py-1 rounded-sm text-xs font-medium transition-colors text-center ${
                  currentMode === 'naive'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Naive
              </button>
              <button
                onClick={() => onSelectMode('adaptive')}
                className={`py-1 rounded-sm text-xs font-medium transition-colors text-center ${
                  currentMode === 'adaptive'
                    ? 'bg-teal-950/80 text-teal-300 border border-teal-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Predictive
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Items (Without decorative badges) */}
        <div className="p-3 flex-1 overflow-y-auto space-y-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2.5 py-1 block">
            Telemetry & Controls
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-sm text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#18202d] text-teal-300 border border-[#2e384d]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#141a24]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom System & Data Source Status Card */}
        <div className="p-3 border-t border-[#232c3d] bg-[#0a0d14] space-y-2.5">
          
          {/* Data Source Selector */}
          <div>
            <div className="flex items-center justify-between mb-1 text-[10px]">
              <span className="font-semibold uppercase tracking-wider text-slate-400">
                Evaluation Source
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 bg-[#10151f] p-0.5 rounded-sm border border-[#232c3d] text-[11px]">
              <button
                onClick={() => onToggleDataSource(true)}
                className={`py-1 rounded-sm font-medium transition-colors ${
                  isRealDataMode 
                    ? 'bg-[#1e2736] text-slate-100' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Phase 9
              </button>
              <button
                onClick={() => onToggleDataSource(false)}
                className={`py-1 rounded-sm font-medium transition-colors ${
                  !isRealDataMode 
                    ? 'bg-[#1e2736] text-slate-100' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Simulator
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Project Repository</span>
            <a
              href="https://github.com/IrrelevantOnGit/Serverless-Pre-Warming-Engine-for-Cloud"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-teal-400 flex items-center gap-1"
            >
              GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

      </aside>
    </>
  );
};

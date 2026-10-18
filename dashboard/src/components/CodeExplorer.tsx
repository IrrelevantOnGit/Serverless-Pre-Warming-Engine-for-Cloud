import React, { useState, useEffect } from 'react';
import { codeSnippets } from '../data/codeSnippets';
import { Terminal, Copy, Check, Download, ListOrdered, ExternalLink } from 'lucide-react';

interface CodeExplorerProps {
  initialSnippetIndex?: number;
  onNavigateTab?: (tab: string) => void;
}

export const CodeExplorer: React.FC<CodeExplorerProps> = ({ 
  initialSnippetIndex = 0,
  onNavigateTab 
}) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(initialSnippetIndex);
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  useEffect(() => {
    if (initialSnippetIndex !== undefined && initialSnippetIndex >= 0 && initialSnippetIndex < codeSnippets.length) {
      setSelectedFileIndex(initialSnippetIndex);
    }
  }, [initialSnippetIndex]);

  const activeSnippet = codeSnippets[selectedFileIndex] || codeSnippets[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeSnippet.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeSnippet.filename.split('/').pop() || 'code.ts';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Get test target tab for active file
  const getRelevantTestTab = () => {
    const fn = activeSnippet.filename.toLowerCase();
    if (fn.includes('target')) return { tab: 'probe', label: 'Test in Diagnostics Probe' };
    if (fn.includes('predictor')) return { tab: 'onnx', label: 'Test in ONNX Inspector' };
    if (fn.includes('dispatcher') || fn.includes('warmer')) return { tab: 'functions', label: 'View Worker Fleet' };
    return { tab: 'simulator', label: 'Run in Workload Simulator' };
  };

  const relevantTab = getRelevantTestTab();

  const codeLines = activeSnippet.code.split('\n');

  return (
    <div className="surface-card p-4 space-y-3 mb-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#232c3d]">
        <div>
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Repository Source Implementations & Architecture
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cloudflare Worker TypeScript handlers, Scikit-Learn training pipelines, and metrics evaluation scripts.
          </p>
        </div>

        {/* File Tabs */}
        <div className="flex space-x-1 overflow-x-auto pb-0.5 max-w-full">
          {codeSnippets.map((file, idx) => (
            <button
              key={file.filename}
              onClick={() => setSelectedFileIndex(idx)}
              className={`px-2.5 py-1 rounded-sm text-xs font-mono transition-colors border ${
                selectedFileIndex === idx
                  ? 'bg-[#18202d] text-teal-300 border-[#2e384d]'
                  : 'bg-[#10151f] text-slate-400 border-[#232c3d] hover:text-slate-200'
              }`}
            >
              {file.filename}
            </button>
          ))}
        </div>
      </div>

      {/* Code Display Container */}
      <div className="bg-[#0a0d14] rounded-sm border border-[#232c3d] overflow-hidden">
        <div className="px-3 py-2 bg-[#10151f] border-b border-[#232c3d] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-slate-300 text-[11px]">{activeSnippet.filename}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 text-[11px] truncate max-w-md">{activeSnippet.description}</span>
          </div>

          <div className="flex items-center space-x-1.5">
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab(relevantTab.tab)}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-sm bg-teal-900/60 hover:bg-teal-800 text-teal-200 border border-teal-700/60 text-[11px] transition-colors"
              >
                <span>{relevantTab.label}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            <button
              onClick={() => setShowLineNumbers(prev => !prev)}
              className={`flex items-center space-x-1 px-2 py-1 rounded-sm border text-[11px] transition-colors ${
                showLineNumbers
                  ? 'bg-[#18202d] text-teal-300 border-teal-600/60'
                  : 'bg-[#10151f] text-slate-400 border-[#2e384d]'
              }`}
              title="Toggle line numbers"
            >
              <ListOrdered className="w-3 h-3" />
              <span>Lines</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-1 px-2 py-1 rounded-sm bg-[#18202d] hover:bg-[#20293a] text-slate-300 border border-[#2e384d] text-[11px] transition-colors"
              title="Download file"
            >
              <Download className="w-3 h-3 text-slate-400" />
              <span>Download</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-2 py-1 rounded-sm bg-[#18202d] hover:bg-[#20293a] text-slate-300 border border-[#2e384d] text-[11px] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-teal-400" />
                  <span className="text-teal-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed">
          {showLineNumbers ? (
            <div className="flex">
              <div className="select-none text-slate-600 pr-4 text-right border-r border-[#1c2433]">
                {codeLines.map((_, i) => (
                  <div key={i}>{i + 1}</div>
                ))}
              </div>
              <pre className="pl-4">
                <code>{activeSnippet.code}</code>
              </pre>
            </div>
          ) : (
            <pre>
              <code>{activeSnippet.code}</code>
            </pre>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
        <span>Language: {activeSnippet.language.toUpperCase()}</span>
        <span>Location: {activeSnippet.filename}</span>
      </div>
    </div>
  );
};

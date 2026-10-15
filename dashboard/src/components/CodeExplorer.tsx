import React, { useState } from 'react';
import { codeSnippets } from '../data/codeSnippets';
import { Terminal, Copy, Check } from 'lucide-react';

export const CodeExplorer: React.FC = () => {
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const activeSnippet = codeSnippets[selectedFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="surface-card p-4 space-y-3 mb-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#232c3d]">
        <div>
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
              Repository Source Implementations
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
        <div className="px-3 py-2 bg-[#10151f] border-b border-[#232c3d] flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-slate-300 text-[11px]">{activeSnippet.filename}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 text-[11px]">{activeSnippet.description}</span>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2 py-0.5 rounded-sm bg-[#18202d] hover:bg-[#20293a] text-slate-300 border border-[#2e384d] text-[11px] transition-colors"
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

        <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed">
          <code>{activeSnippet.code}</code>
        </pre>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
        <span>Language: {activeSnippet.language.toUpperCase()}</span>
        <span>Location: {activeSnippet.filename}</span>
      </div>
    </div>
  );
};

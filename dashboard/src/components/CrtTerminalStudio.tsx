import React, { useState } from 'react';
import { Scene } from '../Scene';
import type { CrtVariant } from '../shaders/crt/crtScreens';
import { 
  Tv, 
  RotateCcw, 
  Maximize2, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Terminal, 
  CheckCircle2, 
  Copy,
  Check
} from 'lucide-react';

export const CrtTerminalStudio: React.FC = () => {
  const [variant, setVariant] = useState<CrtVariant>('terminal');
  const [logMode, setLogMode] = useState<'project' | 'zion'>('project');
  const [speed, setSpeed] = useState<number>(1.00);
  const [typeSpeed, setTypeSpeed] = useState<number>(1.00);
  const [motion, setMotion] = useState<number>(1.00);
  const [hue, setHue] = useState<number>(0);
  const [saturation, setSaturation] = useState<number>(1.00);
  const [brightness, setBrightness] = useState<number>(1.00);
  const [opacity, setOpacity] = useState<number>(1.00);
  const [resetKey, setResetKey] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  // Quick preset phosphor colors
  const colorPresets = [
    { label: 'Phosphor Green', hue: 0, color: '#8df0b4' },
    { label: 'Amber Plasma', hue: 35, color: '#ffba5e' },
    { label: 'Cyber Cyan', hue: -125, color: '#38dcd6' },
    { label: 'Matrix Red', hue: 145, color: '#ff5e7e' },
  ];

  // Re-trigger typing animation
  const handleReboot = () => {
    setResetKey((prev) => prev + 1);
    if (soundEnabled) {
      playBeep(440, 0.08);
      setTimeout(() => playBeep(880, 0.12), 100);
    }
  };

  // Sound generator using Web Audio API
  const playBeep = (freq: number, dur: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + dur);
    } catch {
      // Audio not supported or blocked
    }
  };

  // Copy active terminal transcript
  const handleCopyTranscript = () => {
    const transcript = logMode === 'project'
      ? `PRE-WARMING ENGINE v1.0.0 (c) 2026 Cloudflare Edge\nCONSTRUCT Broadcast Rev M S/N CF-8787-8789\n\nHacking Cold Starts .............. OK\nV8 Isolate Pool 0x000-0x0FF ........... ONLINE OK\nPinging engine signatures ...... 3 found\nnav0 TARGET WORKER PORT :8787 ...... READY\nvis0 ONNX PREDICTOR PORT :8788 READY\nnet0 WARMUP DISPATCHER PORT :8789 .... LINK\nred0 NET EFFICIENCY 1.0x OPTIMAL .... READY\nMounting /dev/workers-kv -> ROOT: ...... OK\nLoading RandomForest edge trees .... OK\nStarting [ none naive predict ] .... OK\nLocating the spike horizon ...... 99.9%\n\nSYSTEM COLD-START detected.\nsubject Cloudflare Isolate status pre-warmed !!\n\nengine ready:`
      : `ZION MAINFRAME v9.1.1 (c) 2199 Nebuchadnezzar\nCONSTRUCT Broadcast Rev M S/N NX-0101-0011\n\nHacking Matrix grid nodes .............. OK\nNeural Jack 0x000-0x0FF ........... ONLINE OK\nPinging agent signatures ...... 3 found\nnav0 OPERATOR UPLINK SECURE ...... READY\nvis0 CODE RAIN DECRYPT 256bit READY\nnet0 HARDLINE CONNECTION MAX .... LINK\nred0 RED PILL EXTRACTION .... READY\nMounting /dev/mind -> ROOT: ...... OK\nLoading weapon training program .... OK\nStarting [ jmp spd str wpn ] .... OK\nLocating the Oracle sector ...... 99.9%\n\nSYSTEM ANOMALY detected.\nsubject Thomas A. Anderson status asleep zZ\n\nwake up:`;
    navigator.clipboard.writeText(transcript);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Studio Header Bar */}
      <div className="surface-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#232c3d]">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-md bg-[#0a1811] border border-[#16877e]/60 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(28,236,132,0.2)]">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-100 uppercase">
                CRT Terminal Emulator & Green Phosphor Telemetry
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                Raw WebGL + 2D Grille
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Authored 19-row boot log resolved at full backing resolution with scanlines, chromatic aberration, and tube curvature.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-md border text-xs font-mono flex items-center gap-1.5 transition-all ${
              soundEnabled
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-[0_0_10px_rgba(28,236,132,0.2)]'
                : 'bg-[#10151c] text-slate-400 border-[#293440] hover:text-slate-200'
            }`}
            title="Toggle audio feedback"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Audio On' : 'Mute'}</span>
          </button>

          <button
            onClick={handleCopyTranscript}
            className="px-3 py-2 rounded-md bg-[#10151c] hover:bg-[#18202d] border border-[#293440] text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-all active:scale-95"
            title="Copy 19-row terminal transcript"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Copied!' : 'Copy Log'}</span>
          </button>

          <button
            onClick={handleReboot}
            className="px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-xs font-mono flex items-center gap-1.5 shadow-[0_0_15px_rgba(28,236,132,0.3)] transition-all active:scale-95"
            title="Reboot CRT typing sequence"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reboot CRT</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* CRT Screen Display Frame (Left 8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl bg-[#090b0e] p-3 sm:p-5 border-2 border-[#1c2430] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)]">
            
            {/* Monitor Chassis Bezel Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1b232e] text-[11px] font-mono text-slate-400">
              <div className="flex items-center space-x-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#1cec84] animate-pulse"></span>
                  <span className="font-semibold text-slate-200">CRT-V9 // RASTER 1080p</span>
                </span>
                <span className="hidden sm:inline text-slate-600">|</span>
                <span className="hidden sm:inline text-slate-400">
                  {logMode === 'project' ? 'PROPHET-X ENGINE LOG' : 'NEBUCHADNEZZAR ZION'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#131924] border border-[#242e3f] text-slate-300 uppercase">
                  {variant}
                </span>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1 hover:text-slate-200 text-slate-400 transition-colors"
                  title="Toggle Expanded View"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Cathode Screen Canvas Container */}
            <div 
              className={`relative rounded-xl overflow-hidden transition-all duration-300 bg-[#03100a] border border-[#16877e]/30 shadow-[inset_0_0_40px_rgba(0,0,0,0.9),0_0_20px_rgba(28,236,132,0.12)] ${
                isFullscreen ? 'h-[750px]' : 'h-[440px] sm:h-[500px]'
              }`}
            >
              <Scene
                key={`${resetKey}-${variant}-${logMode}`}
                variant={variant}
                speed={speed}
                typeSpeed={typeSpeed}
                motion={motion}
                hue={hue}
                saturation={saturation}
                brightness={brightness}
                opacity={opacity}
                logMode={logMode}
                className="w-full h-full"
              />

              {/* Vintage CRT Glass Tube Glare Overlay */}
              <div 
                className="pointer-events-none absolute inset-0 rounded-xl"
                style={{
                  background: 'radial-gradient(ellipse at 50% 15%, rgba(255,255,255,0.08) 0%, transparent 60%)',
                  mixBlendMode: 'screen'
                }}
              />
            </div>

            {/* Monitor Chassis Bottom Lip / Vents */}
            <div className="mt-3.5 pt-2.5 border-t border-[#1b232e] flex items-center justify-between text-[11px] font-mono text-slate-500">
              <div className="flex items-center space-x-1.5">
                {[...Array(6)].map((_, i) => (
                  <span key={i} className="w-4 h-1 rounded-full bg-[#1b2432]"></span>
                ))}
                <span className="text-[10px] ml-2 text-slate-400">CHASSIS AIR VENT</span>
              </div>
              <div className="flex items-center space-x-2 text-[10px]">
                <span className="text-slate-400">FLYBACK: 15.75 kHz</span>
                <span>•</span>
                <span className="text-emerald-400">STATUS: SYNC OK</span>
              </div>
            </div>

          </div>

          {/* CRT Information & Technical Brief Box */}
          <div className="surface-card p-4 border border-[#232c3d] text-xs space-y-2">
            <div className="flex items-center space-x-2 text-slate-200 font-semibold font-mono">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Reference Brief & Shading Architecture</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              This component renders the authored 19-row boot log typing onto green phosphor at full backing resolution so the glyph cores stay crisp behind the grille. The fragment shader applies barrel curvature (<code className="text-slate-300">curve()</code>), phosphor halo bloom, triad grille simulation, raster scanlines, and subtle CRT cathode flicker.
            </p>
          </div>
        </div>

        {/* Tactile Control Board (Right 4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Box 1: Mode & Variant Selector */}
          <div className="surface-card p-4 border border-[#232c3d] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#232c3d]">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Tactile Control Station
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">PROPS</span>
            </div>

            {/* Boot Log Profile Toggle */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
                Boot Log Content Sequence:
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-[#0d1219] p-1 rounded-md border border-[#232c3d]">
                <button
                  onClick={() => setLogMode('project')}
                  className={`py-1.5 px-2 rounded text-[11px] font-mono font-medium transition-all ${
                    logMode === 'project'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-[0_0_10px_rgba(28,236,132,0.2)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ⚡ Engine v1.0
                </button>
                <button
                  onClick={() => setLogMode('zion')}
                  className={`py-1.5 px-2 rounded text-[11px] font-mono font-medium transition-all ${
                    logMode === 'zion'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 shadow-[0_0_10px_rgba(28,236,132,0.2)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📟 Zion Matrix
                </button>
              </div>
            </div>

            {/* Variant Selector */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
                CRT Variant (<code className="text-slate-300">variant</code>):
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['terminal', 'cinematic', 'blue-screen', 'nintendo'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVariant(v)}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-mono capitalize transition-all border ${
                      variant === v
                        ? 'bg-[#182333] text-teal-300 border-teal-500/80 shadow-[0_0_8px_rgba(69,184,170,0.25)]'
                        : 'bg-[#10151c] text-slate-400 border-[#232c3d] hover:text-slate-200 hover:bg-[#141a24]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Phosphor Color Swatches */}
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1.5">
                Phosphor Hue Preset (<code className="text-slate-300">hue</code>):
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {colorPresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setHue(preset.hue)}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-mono flex items-center space-x-2 border transition-all ${
                      hue === preset.hue
                        ? 'bg-[#141d28] text-slate-100 border-slate-500 shadow-sm'
                        : 'bg-[#0e131a] text-slate-400 border-[#232c3d] hover:text-slate-200'
                    }`}
                  >
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="truncate">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Box 2: Fine-Tuning Physical Knobs */}
          <div className="surface-card p-4 border border-[#232c3d] space-y-3.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#232c3d]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Shader Parameter Tuning
              </h3>
              <button
                onClick={() => {
                  setSpeed(1.0);
                  setTypeSpeed(1.0);
                  setMotion(1.0);
                  setHue(0);
                  setBrightness(1.0);
                  setSaturation(1.0);
                  setOpacity(1.0);
                }}
                className="text-[10px] font-mono text-slate-400 hover:text-teal-400"
              >
                Reset Defaults
              </button>
            </div>

            {/* Type Speed Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">typeSpeed</span>
                <span className="text-emerald-400 font-semibold">{typeSpeed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.05"
                value={typeSpeed}
                onChange={(e) => setTypeSpeed(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-[#10151c] cursor-pointer h-1.5 rounded-lg"
              />
            </div>

            {/* Speed Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">speed (Shader Time)</span>
                <span className="text-emerald-400 font-semibold">{speed.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-[#10151c] cursor-pointer h-1.5 rounded-lg"
              />
            </div>

            {/* Motion Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">motion (Scanline Jitter)</span>
                <span className="text-emerald-400 font-semibold">{motion.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.0"
                step="0.05"
                value={motion}
                onChange={(e) => setMotion(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-[#10151c] cursor-pointer h-1.5 rounded-lg"
              />
            </div>

            {/* Brightness Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">brightness</span>
                <span className="text-emerald-400 font-semibold">{brightness.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.0"
                step="0.05"
                value={brightness}
                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-[#10151c] cursor-pointer h-1.5 rounded-lg"
              />
            </div>

            {/* Saturation Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">saturation</span>
                <span className="text-emerald-400 font-semibold">{saturation.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.5"
                step="0.05"
                value={saturation}
                onChange={(e) => setSaturation(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-[#10151c] cursor-pointer h-1.5 rounded-lg"
              />
            </div>

            {/* Opacity Slider */}
            <div>
              <div className="flex justify-between text-[11px] font-mono mb-1">
                <span className="text-slate-400">opacity</span>
                <span className="text-emerald-400 font-semibold">{opacity.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 bg-[#10151c] cursor-pointer h-1.5 rounded-lg"
              />
            </div>

          </div>

          {/* Box 3: Quick Code Integration Snippet */}
          <div className="surface-card p-3.5 border border-[#232c3d] text-[11px] font-mono space-y-1.5 bg-[#0a0d14]">
            <div className="flex items-center space-x-1.5 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-slate-300">Exact Usage Configured:</span>
            </div>
            <pre className="text-slate-400 overflow-x-auto p-2 bg-[#06080d] rounded border border-[#1b232e] leading-snug">
{`<CrtBackground
  variant="${variant}"
  speed={${speed.toFixed(2)}}
  typeSpeed={${typeSpeed.toFixed(2)}}
  motion={${motion.toFixed(2)}}
  hue={${hue}}
  saturation={${saturation.toFixed(2)}}
  brightness={${brightness.toFixed(2)}}
  opacity={${opacity.toFixed(2)}}
/>`}
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
};

import { CRT_SCREENS, CRT_STYLES, type CrtStyle, type CrtVariant } from "./crtScreens";
import { CRT_FRAGMENT_SHADER, CRT_VERTEX_SHADER } from "./crtShaders";

export type Segment = { t: string; c: "p" | "d" | "a" | "h" };
export const segment = (text: string, color: Segment["c"] = "p"): Segment => ({ t: text, c: color });
export const dots = (count: number) => "·".repeat(count);

export const CRT_VARIANTS = ["terminal", "cinematic", "blue-screen", "nintendo"] as const;
export type CrtOptions = {
  variant: CrtVariant;
  speed: number;
  typeSpeed: number;
  motion: number;
  brightness: number;
  opacity: number;
  hue: number;
  saturation: number;
  logMode?: "project" | "zion";
  customLines?: Segment[][];
  commandPrompt?: string;
  commandInput?: string;
  version?: number;
};
export const CRT_DEFAULTS: CrtOptions = { variant: "terminal", speed: 1, typeSpeed: 1, motion: 1, brightness: 1, opacity: 1, hue: 0, saturation: 1, logMode: "project" };
export const crtStyle = (variant: CrtVariant): CrtStyle => CRT_STYLES[variant] ?? CRT_STYLES.terminal;

export const ZION_LOG: Segment[][] = [
  [segment("ZION MAINFRAME  v9.1.1"), segment("   (c) 2199 Nebuchadnezzar", "d")], [segment("CONSTRUCT Broadcast  Rev M  S/N NX-0101-0011", "d")], [],
  [segment("Hacking Matrix grid nodes "), segment(`${dots(14)} `, "d"), segment("OK", "a")], [segment("Neural Jack  0x000-0x0FF "), segment(`${dots(11)} `, "d"), segment("ONLINE "), segment("OK", "a")], [segment("Pinging agent signatures "), segment(`${dots(6)} `, "d"), segment("3 found")],
  [segment("nav0  OPERATOR UPLINK SECURE ", "d"), segment(`${dots(6)} `, "d"), segment("READY", "a")], [segment("vis0  CODE RAIN DECRYPT 256bit ", "d"), segment("READY", "a")], [segment("net0  HARDLINE CONNECTION MAX ", "d"), segment(`${dots(4)} `, "d"), segment("LINK", "a")], [segment("red0  RED PILL EXTRACTION ", "d"), segment(`${dots(4)} `, "d"), segment("READY", "a")],
  [segment("Mounting /dev/mind -> ROOT: "), segment(`${dots(6)} `, "d"), segment("OK", "a")], [segment("Loading weapon training program "), segment(`${dots(4)} `, "d"), segment("OK", "a")], [segment("Starting [ jmp spd str wpn ] "), segment(`${dots(4)} `, "d"), segment("OK", "a")], [segment("Locating the Oracle sector "), segment(`${dots(6)} `, "d"), segment("99.9%")], [],
  [segment("SYSTEM ANOMALY  "), segment("detected.", "h")], [segment("subject Thomas A. Anderson   status asleep ", "d"), segment("z", "d"), segment("Z", "d")], [], [segment("wake up: ")],
];

export const PREWARMING_LOG: Segment[][] = [
  [segment("PRE-WARMING ENGINE  v1.0.0"), segment("   (c) 2026 Cloudflare Edge", "d")], [segment("CONSTRUCT Broadcast  Rev M  S/N CF-8787-8789", "d")], [],
  [segment("Hacking Cold Starts "), segment(`${dots(18)} `, "d"), segment("OK", "a")], [segment("V8 Isolate Pool  0x000-0x0FF "), segment(`${dots(11)} `, "d"), segment("ONLINE "), segment("OK", "a")], [segment("Pinging engine signatures "), segment(`${dots(6)} `, "d"), segment("3 found")],
  [segment("nav0  TARGET WORKER PORT :8787 ", "d"), segment(`${dots(3)} `, "d"), segment("READY", "a")], [segment("vis0  ONNX PREDICTOR PORT :8788 ", "d"), segment("READY", "a")], [segment("net0  WARMUP DISPATCHER PORT :8789 ", "d"), segment("LINK", "a")], [segment("red0  NET EFFICIENCY 1.0x OPTIMAL ", "d"), segment("READY", "a")],
  [segment("Mounting /dev/workers-kv -> ROOT: "), segment(`${dots(3)} `, "d"), segment("OK", "a")], [segment("Loading RandomForest edge trees "), segment(`${dots(4)} `, "d"), segment("OK", "a")], [segment("Starting [ none naive predict ] "), segment(`${dots(4)} `, "d"), segment("OK", "a")], [segment("Locating the spike horizon "), segment(`${dots(6)} `, "d"), segment("99.9%")], [],
  [segment("SYSTEM COLD-START  "), segment("eliminated.", "h")], [segment("subject Cloudflare Isolate   status pre-warmed ", "d"), segment("!", "a"), segment("!", "a")], [], [segment("engine ready: type 'help' or enter commands below")],
];

const COLORS = { p: { fill: "#8df0b4", glow: "rgba(28,236,132,0.95)" }, d: { fill: "#4f9a76", glow: "rgba(28,236,132,0.45)" }, a: { fill: "#ffba5e", glow: "rgba(255,150,52,0.95)" }, h: { fill: "#eafff3", glow: "rgba(120,255,190,0.95)" } };
const lineLength = (line: Segment[]) => line.reduce((total, item) => total + item.t.length, 0);
/* backing-store ceiling: the composite is one triangle, so the cost that matters is
   the 2D screen redraw and its upload, not the fragment pass */
const MAX_BUFFER_WIDTH = 1920, MIN_BUFFER_WIDTH = 640, MAX_BUFFER_PIXELS = 2_400_000;
function compile(gl: WebGLRenderingContext, type: number, source: string) { const shader = gl.createShader(type); if (!shader) throw new Error("Unable to create CRT shader"); gl.shaderSource(shader, source); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "CRT shader compilation failed"); return shader; }

export function createCrtRenderer(host: HTMLElement, canvas: HTMLCanvasElement, getOptions: () => CrtOptions) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, premultipliedAlpha: false }); if (!gl) throw new Error("CRT requires WebGL"); const textCanvas = document.createElement("canvas"), textContext = textCanvas.getContext("2d"); if (!textContext) throw new Error("CRT text canvas unavailable");
  const vertex = compile(gl, gl.VERTEX_SHADER, CRT_VERTEX_SHADER), fragment = compile(gl, gl.FRAGMENT_SHADER, CRT_FRAGMENT_SHADER), program = gl.createProgram(); if (!program) throw new Error("Unable to create CRT program"); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "CRT link failed"); gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); const position = gl.getAttribLocation(program, "aPos"); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const uTexture = uniform("uTex"), uResolution = uniform("uRes"), uTime = uniform("uTime"), uMotion = uniform("uMotion"), uCurve = uniform("uCurve"), uScan = uniform("uScan"), uScanDepth = uniform("uScanDepth"), uTriad = uniform("uTriad"), uGrille = uniform("uGrille"), uChroma = uniform("uChroma"), uBar = uniform("uBar"), uFlicker = uniform("uFlicker"), uGrain = uniform("uGrain"), uNoise = uniform("uNoise"), uVignette = uniform("uVignette"), uMono = uniform("uMono"), uGain = uniform("uGain"), uHalo = uniform("uHalo"), uSheen = uniform("uSheen"), uRoom = uniform("uRoom");
  const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.uniform1i(uTexture, 0);
  let currentLogMode = getOptions().logMode ?? "project";
  let LOG = currentLogMode === "zion" ? ZION_LOG : PREWARMING_LOG;
  let TOTAL = LOG.reduce((total, line) => total + lineLength(line), 0);
  let MAX_CHARS = Math.max(...LOG.map(lineLength));
  let lastCustomVersion = -1;
  let lastCommandInput = "";
  let width = 1, height = 1, cssWidth = 1, cssHeight = 1, fontSize = 14, lineHeight = 20, startY = 0, charWidth = 8, caretX = 0, caretY = 0, typed = 0, done = false, textDirty = true, lastTextAt = 0, lastReveal = -1, lastBlink = -1, variant: CrtVariant = "terminal", style = crtStyle(variant); const startedAt = performance.now();
  const applyStyle = () => { gl.useProgram(program); gl.uniform2f(uCurve, style.curve[0], style.curve[1]); gl.uniform1f(uScanDepth, style.scanDepth); gl.uniform1f(uGrille, style.grille); gl.uniform1f(uChroma, style.chroma); gl.uniform1f(uBar, style.bar); gl.uniform1f(uFlicker, style.flicker); gl.uniform1f(uGrain, style.grain); gl.uniform1f(uNoise, style.noise); gl.uniform1f(uVignette, style.vignette); gl.uniform1f(uMono, style.mono); gl.uniform1f(uGain, style.gain); gl.uniform1f(uHalo, style.halo); gl.uniform3f(uSheen, style.sheen[0], style.sheen[1], style.sheen[2]); gl.uniform3f(uRoom, style.room[0], style.room[1], style.room[2]); const filter = style.filtering === "nearest" ? gl.NEAREST : gl.LINEAR; gl.bindTexture(gl.TEXTURE_2D, texture); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter); };
  const layout = () => {
    const opts = getOptions();
    const effectiveLines = opts.customLines ?? LOG;
    TOTAL = effectiveLines.reduce((total, line) => total + lineLength(line), 0);
    MAX_CHARS = Math.max(38, ...effectiveLines.map(lineLength));
    const count = Math.max(14, effectiveLines.length + (opts.commandPrompt ? 1 : 0));
    startY = height * 0.07;
    lineHeight = Math.max(13, (height * 0.86) / Math.min(count, 22));
    fontSize = Math.max(8, Math.min(lineHeight * 0.76, (width * 0.90) / (MAX_CHARS * 0.62)));
    textContext.font = `600 ${fontSize.toFixed(2)}px ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace`;
    charWidth = textContext.measureText("M").width || fontSize * 0.6;
  };
  const setStyle = (key: Segment["c"], glow: boolean) => { const color = COLORS[key]; textContext.fillStyle = color.fill; textContext.shadowColor = glow ? color.glow : "transparent"; textContext.shadowBlur = glow ? fontSize * 0.38 : 0; };
  /* two passes per glyph: a soft phosphor halo, then the same glyph re-filled with
     the shadow off so the stroke core stays crisp at any backing resolution */
  const drawScreen = (reveal: number) => {
    textContext.setTransform(1, 0, 0, 1, 0, 0);
    textContext.fillStyle = "#03100a";
    textContext.fillRect(0, 0, width, height);
    textContext.textAlign = "left";
    textContext.textBaseline = "top";
    textContext.font = `600 ${fontSize.toFixed(2)}px ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace`;

    const opts = getOptions();
    let displayLines: Segment[][];
    const isCustom = Array.isArray(opts.customLines);

    if (isCustom) {
      displayLines = [...opts.customLines!];
      if (opts.commandPrompt !== undefined) {
        displayLines.push([
          segment(opts.commandPrompt, "p"),
          segment(opts.commandInput ?? "", "h")
        ]);
      }
      const maxRows = Math.max(8, Math.floor((height * 0.86) / lineHeight));
      if (displayLines.length > maxRows) {
        displayLines = displayLines.slice(-maxRows);
      }
    } else {
      displayLines = LOG;
    }

    let remaining = isCustom ? Infinity : reveal;
    let y = startY;
    const marginX = Math.floor(width * 0.05);
    caretX = marginX;
    caretY = startY;

    for (const line of displayLines) {
      const length = lineLength(line);
      const visible = remaining === Infinity ? Infinity : Math.min(remaining, length);
      let x = marginX;
      let drawn = 0;
      for (const item of line) {
        let text = item.t;
        if (visible !== Infinity) {
          const left = visible - drawn;
          if (left <= 0) break;
          if (left < text.length) text = text.slice(0, left);
        }
        if (text.length) {
          setStyle(item.c, true);
          textContext.fillText(text, x, y);
          setStyle(item.c, false);
          textContext.fillText(text, x, y);
          x += charWidth * text.length;
        }
        drawn += item.t.length;
        if (visible !== Infinity && drawn >= visible) break;
      }
      caretX = x;
      caretY = y;
      if (visible !== Infinity) remaining -= visible;
      y += lineHeight;
      if (visible !== Infinity && remaining <= 0) break;
    }
  };
  const drawCursor = () => { textContext.shadowColor = COLORS.p.glow; textContext.shadowBlur = fontSize * 0.42; textContext.fillStyle = "#bdf8d2"; textContext.fillRect(caretX, caretY + fontSize * 0.06, Math.max(charWidth * 0.92, 4), fontSize * 0.96); textContext.shadowBlur = 0; textContext.fillRect(caretX, caretY + fontSize * 0.06, Math.max(charWidth * 0.92, 4), fontSize * 0.96); };
  const uploadTexture = () => { gl.bindTexture(gl.TEXTURE_2D, texture); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); textDirty = false; };
  const resize = () => { const bounds = host.getBoundingClientRect(); cssWidth = Math.max(1, bounds.width); cssHeight = Math.max(1, bounds.height); const density = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, 2); let nextWidth = Math.max(MIN_BUFFER_WIDTH, Math.round(Math.min(cssWidth * density, MAX_BUFFER_WIDTH))), nextHeight = Math.max(1, Math.round(nextWidth * cssHeight / cssWidth)); if (nextWidth * nextHeight > MAX_BUFFER_PIXELS) { const fit = Math.sqrt(MAX_BUFFER_PIXELS / (nextWidth * nextHeight)); nextWidth = Math.round(nextWidth * fit); nextHeight = Math.round(nextHeight * fit); }
    const surface = style.surface, screenWidth = surface.mode === "fixed" ? surface.width : surface.mode === "cap" ? Math.min(nextWidth, surface.width) : nextWidth, screenHeight = surface.mode === "fixed" ? surface.height : Math.max(1, Math.round(screenWidth * nextHeight / nextWidth));
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) { canvas.width = nextWidth; canvas.height = nextHeight; }
    if (textCanvas.width !== screenWidth || textCanvas.height !== screenHeight) { textCanvas.width = screenWidth; textCanvas.height = screenHeight; width = screenWidth; height = screenHeight; layout(); lastReveal = -1; lastBlink = -1; lastTextAt = 0; textDirty = true; }
    gl.useProgram(program); gl.viewport(0, 0, nextWidth, nextHeight); gl.uniform2f(uResolution, nextWidth, nextHeight); gl.uniform1f(uScan, Math.max(120, Math.min(cssHeight * style.scanDensity, 900))); gl.uniform1f(uTriad, Math.max(2, style.triadCss * nextWidth / cssWidth)); };
  const maybeRedrawText = (now: number) => { const reveal = done ? Infinity : Math.floor(typed), blink = Math.floor((now - startedAt) / 420) % 2 === 0 ? 1 : 0, due = !done ? now - lastTextAt > 42 : blink !== lastBlink; if (reveal === lastReveal && blink === lastBlink && !due) return; if (!done && now - lastTextAt <= 42 && reveal === lastReveal && blink === lastBlink) return; drawScreen(reveal); if (blink) drawCursor(); lastTextAt = now; lastReveal = reveal; lastBlink = blink; textDirty = true; };
  applyStyle();
  return {
    resize,
    render(now: number) {
      const options = getOptions(), requested = CRT_STYLES[options.variant] ? options.variant : "terminal";
      const reqLog = options.logMode ?? "project";
      const currentVersion = options.version ?? 0;
      const currentInput = options.commandInput ?? "";

      if (currentVersion !== lastCustomVersion || currentInput !== lastCommandInput) {
        lastCustomVersion = currentVersion;
        lastCommandInput = currentInput;
        layout();
        textDirty = true;
      }

      if (reqLog !== currentLogMode) {
        currentLogMode = reqLog;
        LOG = currentLogMode === "zion" ? ZION_LOG : PREWARMING_LOG;
        typed = 0;
        done = false;
        lastReveal = -1;
        lastBlink = -1;
        lastTextAt = 0;
        layout();
        textDirty = true;
      }
      if (requested !== variant) { variant = requested; style = crtStyle(variant); applyStyle(); typed = 0; done = false; lastReveal = -1; lastBlink = -1; lastTextAt = 0; resize(); }
      const seconds = (now - startedAt) * 0.001 * options.speed;
      if (variant === "terminal") {
        if (options.customLines) {
          done = true;
          typed = Infinity;
        } else if (!done) {
          typed += 4.4 * options.typeSpeed;
          if (typed >= TOTAL) { typed = TOTAL; done = true; }
        }
        maybeRedrawText(now);
      }
      else if (now - lastTextAt >= style.redrawMs || textDirty) { CRT_SCREENS[variant](textContext, width, height, seconds); lastTextAt = now; textDirty = true; }
      if (textDirty) uploadTexture();
      gl.useProgram(program); gl.uniform1f(uTime, seconds); gl.uniform1f(uMotion, options.motion); gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() { gl.deleteBuffer(buffer); gl.deleteTexture(texture); gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); },
  };
}

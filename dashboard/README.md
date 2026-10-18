# ProphetX Interactive Dashboard & Telemetry Studio

This directory contains the **Phase 10** interactive dashboard for the **Adaptive Serverless Pre-Warming Engine (ProphetX)**. It combines a WebGL-powered retro CRT terminal shader, a deterministic 3-mode serverless isolate simulation engine, and an empirical benchmark telemetry studio.

---

## Getting Started

From the `dashboard` directory:

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production & verify TypeScript types
npm run build
```

Open your browser to: **`http://localhost:5173`**

---

## Architectural Highlights

### 1. Retro CRT Shader Terminal (`src/Scene.tsx`, `src/shaders/crt/`)
- Powered by a dual-pass WebGL phosphor scanline shader (`crtRenderer.ts`, `crtShaders.ts`, `crtScreens.ts`).
- Supports both the Zion Matrix 19-row boot sequence and the custom ProphetX edge engine sequence.
- Interactive chassis equipped with real-time tactile dials for:
  - Text typing speed (`typeSpeed`)
  - Scanline motion jitter (`motion`)
  - Phosphor glow hue (`hue`)
  - Brightness, saturation, and opacity
  - One-click reboot button

### 2. Multi-Mode Serverless Simulator (`src/components/SimulationVisualizer.tsx`)
- **Deterministic Scheduling (`simulationEngine.ts`)**: Generates an identical sequence of arrival intervals and burst timings across all 3 strategies:
  1. **None**: Baseline with zero synthetic pre-warming (suffers cold boots on every >3.5s idle gap).
  2. **Naive**: Blind 2.0s periodic cron warmer (reduces cold starts, but wastes ~80% of pings).
  3. **ProphetX**: Edge ML-guided adaptive warmer (fires surgical pings right before isolate eviction or spike surge; ~0% cold starts, 1.0x efficiency).
- **Descriptive Visualization Tabs**:
  - **Comparative Analysis**: Multi-series synchronized latency trajectory, cold vs. warm stacked breakdown, synthetic ping utility (useful vs. wasted), and P50/P95/P99 latency SLA percentiles.
  - **Strategy Deep-Dives**: Dedicated single-strategy timelines, 6-KPI metrics row, live V8 Isolate Fleet Tracker with individual status indicators (`WARM`, `COLD_START`, `EVICTED`), and filterable raw telemetry tables.

### 3. Workload Ingestion Engine (`src/components/TrafficControls.tsx`)
- **Workload Profiles**:
  - `Diurnal Seasonality`: 24-hour load curve with 4.4s off-peak lull intervals.
  - `Transient Spike Cluster`: 10x traffic surges (40ms gaps) evaluating edge detector responsiveness.
  - `Intermittent Bursts`: Clustered request bursts with variable 4.5s idle timeouts.
  - `Extended Idle (>3.5s)`: Long inactivity pauses that trigger Cloudflare V8 isolate reclamation.
- **Interactive Triggers**:
  - One-click **"⚡ Simulate All 3 Modes"** benchmark button.
  - Quick volume presets: `15`, `30`, `44`, `60`, and `100` invocations.
  - Live failure injection: ⚡ 10x Spike Surge & ❄️ Force Eviction (>3.5s).

### 4. Empirical Benchmark Matrix (`src/components/MetricsComparison.tsx`)
- Displays real experimental measurements recorded on Cloudflare Workers edge runtime during Phase 9.
- Independently-scaled horizontal cards for Cold Start Rate, Cold Starts Avoided, P95 Tail Latency, Synthetic Pings Issued, Wasted Redundant Pings, and Wasted Warmup Rate.
- Multi-mode comparison matrix with empirical advantage badges.

### 5. Edge ONNX Inspector (`src/components/OnnxInspector.tsx`)
- Real-time feature vector tuner allowing custom simulation of:
  - Hour of day (diurnal factor)
  - Rolling 1-minute and 5-minute request counts
  - Idle gap seconds
  - Traffic derivative ($dReq/dt$)
- Direct confidence score evaluation and sub-millisecond edge decision verification.

---

## Tech Stack
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Vanilla CSS + Tailored HSL Dark Theme + Phosphor CRT Glow
- **Charts:** Chart.js 4.5 + React-Chartjs-2
- **Shaders:** WebGL 1.0 Dual-Pass Fragment Shaders
- **Icons:** Lucide React

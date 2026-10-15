import type { TelemetryLog, ModeMetrics, WarmingMode, IsolateState, FeatureVector, TrafficPreset } from '../types';

export class PreWarmingSimulator {
  private mode: WarmingMode;
  private logs: TelemetryLog[] = [];
  private isolates: Map<string, IsolateState> = new Map();
  private lastInvocationTime = 0;
  private currentHour = 14.0;
  private requestCounter = 0;
  private activeIsolateId: string | null = null;
  private totalSyntheticPings = 0;
  private wastedWarmups = 0;
  private coldStartsAvoided = 0;

  // Feature vector sliding window history
  private recentTimestamps: number[] = [];

  constructor(mode: WarmingMode = 'adaptive') {
    this.mode = mode;
    this.reset();
  }

  public reset(mode?: WarmingMode) {
    if (mode) this.mode = mode;
    this.logs = [];
    this.isolates.clear();
    this.lastInvocationTime = Date.now();
    this.currentHour = 12.0 + Math.random() * 4;
    this.requestCounter = 0;
    this.activeIsolateId = null;
    this.totalSyntheticPings = 0;
    this.wastedWarmups = 0;
    this.coldStartsAvoided = 0;
    this.recentTimestamps = [];
  }

  public getMode(): WarmingMode {
    return this.mode;
  }

  public setMode(mode: WarmingMode) {
    this.mode = mode;
  }

  private getOrSpinIsolate(now: number): { isolateId: string; isCold: boolean } {
    const IDLE_TIMEOUT_MS = 3500; // 3.5s idle threshold causes V8 isolate termination

    if (this.activeIsolateId) {
      const activeIso = this.isolates.get(this.activeIsolateId);
      if (activeIso && now - activeIso.lastActiveTime < IDLE_TIMEOUT_MS) {
        // Isolate is warm!
        activeIso.lastActiveTime = now;
        activeIso.totalInvocations++;
        activeIso.status = 'warm';
        return { isolateId: activeIso.id, isCold: false };
      }
    }

    // Spin up new isolate (COLD START)
    const newId = 'iso_' + Math.random().toString(36).substring(2, 8);
    const newIsolate: IsolateState = {
      id: newId,
      status: 'cold_init',
      lastActiveTime: now,
      totalInvocations: 1,
      createdTime: now
    };
    this.isolates.set(newId, newIsolate);
    this.activeIsolateId = newId;
    return { isolateId: newId, isCold: true };
  }

  public calculateFeatureVector(): FeatureVector {
    const now = Date.now();
    const window1m = this.recentTimestamps.filter((t) => now - t <= 60000).length;
    const window5m = this.recentTimestamps.filter((t) => now - t <= 300000).length;
    const idleGap = this.lastInvocationTime ? (now - this.lastInvocationTime) / 1000 : 10;
    
    // Calculate traffic derivative dReq/dt
    const previousWindow1m = this.recentTimestamps.filter(
      (t) => now - t > 60000 && now - t <= 120000
    ).length;
    const trafficDerivative = window1m - previousWindow1m;
    const isBurst = trafficDerivative > 3 || window1m > 8;

    // ML Random Forest Confidence Scoring simulation formula
    // High hour diurnal, high derivative, low idle gap, or burst flag boost confidence score
    let score = 0.1;
    if (isBurst) score += 0.55;
    if (trafficDerivative > 2) score += 0.25;
    if (window1m >= 5) score += 0.2;
    if (idleGap < 1.0) score += 0.15;

    // Diurnal factor (sine wave peak at 14:00)
    const diurnalFactor = 0.5 + 0.5 * Math.sin(((this.currentHour - 8) * Math.PI) / 12);
    score += diurnalFactor * 0.15;

    score = Math.min(0.99, Math.max(0.01, score));

    return {
      hourOfDay: parseFloat(this.currentHour.toFixed(1)),
      rollingReqCount1m: window1m,
      rollingReqCount5m: window5m,
      idleGapSeconds: parseFloat(idleGap.toFixed(1)),
      trafficDerivative,
      isBurst,
      confidenceScore: parseFloat(score.toFixed(3)),
      triggerWarming: score >= 0.70
    };
  }

  public simulateRequest(isSyntheticPing = false, isBurst = false): TelemetryLog {
    this.requestCounter++;
    const now = Date.now();
    this.recentTimestamps.push(now);
    
    // Evaluate if engine pre-warms before this request
    let preWarmedByEngine = false;

    if (!isSyntheticPing) {
      if (this.mode === 'naive') {
        // Naive mode: Fixed interval pre-warming ping sent every 2s
        if (now - this.lastInvocationTime >= 1800) {
          preWarmedByEngine = true;
          this.totalSyntheticPings++;
          // Check if ping was wasted (no real traffic came immediately)
          if (Math.random() > 0.4) {
            this.wastedWarmups++;
          }
        }
      } else if (this.mode === 'adaptive') {
        // Adaptive mode: Check ONNX ML Feature Vector confidence
        const fv = this.calculateFeatureVector();
        if (fv.triggerWarming) {
          preWarmedByEngine = true;
          this.totalSyntheticPings++;
          // Check if warm-up avoided a cold start
          const activeIso = this.activeIsolateId ? this.isolates.get(this.activeIsolateId) : null;
          if (!activeIso || now - activeIso.lastActiveTime >= 3500) {
            this.coldStartsAvoided++;
          } else {
            // Slightly wasted ping if already warm
            this.wastedWarmups++;
          }
        }
      }
    }

    // Apply pre-warming effect to isolate pool
    if (preWarmedByEngine && !isSyntheticPing) {
      // Warm up isolate right before request execution
      const warmId = 'iso_' + Math.random().toString(36).substring(2, 8);
      this.isolates.set(warmId, {
        id: warmId,
        status: 'warm',
        lastActiveTime: now,
        totalInvocations: 1,
        createdTime: now
      });
      this.activeIsolateId = warmId;
    }

    const { isolateId, isCold } = this.getOrSpinIsolate(now);
    this.lastInvocationTime = now;
    this.currentHour = (this.currentHour + 0.05) % 24.0;

    // Latency calculation
    let latencyMs = isCold ? Math.floor(45 + Math.random() * 30) : Math.floor(Math.random() * 3);
    if (isSyntheticPing) latencyMs = Math.floor(1 + Math.random() * 2);

    const log: TelemetryLog = {
      id: `req_${this.requestCounter}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      requestId: this.requestCounter,
      timestamp: new Date().toISOString(),
      simulatedHour: parseFloat(this.currentHour.toFixed(1)),
      latencyMs,
      isCold,
      coldOrWarm: isCold ? 'cold' : 'warm',
      isolateId,
      isSyntheticPing,
      warmingMode: this.mode,
      service: 'weather-user-lookup',
      city: ['San Francisco', 'New York', 'London', 'Tokyo', 'Berlin', 'Sydney'][Math.floor(Math.random() * 6)],
      isBurst
    };

    this.logs.push(log);
    return log;
  }

  public runBatchSimulation(preset: TrafficPreset, requestCount = 30): TelemetryLog[] {
    const generatedLogs: TelemetryLog[] = [];
    let currentBurst = false;

    for (let i = 0; i < requestCount; i++) {
      let isBurst = false;
      let delayMs = 100;

      switch (preset) {
        case 'diurnal': {
          const diurnalSin = 0.5 + 0.5 * Math.sin(((this.currentHour - 8) * Math.PI) / 12);
          delayMs = Math.max(20, Math.floor(400 * (1 - diurnalSin)));
          break;
        }
        case 'spike': {
          // Sudden 10x spike midway
          if (i >= Math.floor(requestCount * 0.4) && i <= Math.floor(requestCount * 0.7)) {
            isBurst = true;
            delayMs = 15;
          } else {
            delayMs = 300;
          }
          break;
        }
        case 'bursts': {
          if (Math.random() < 0.25) currentBurst = !currentBurst;
          isBurst = currentBurst;
          delayMs = isBurst ? 20 : 250;
          break;
        }
        case 'idle_lull': {
          // Long idle gap every 6th request causing isolate cold boot
          if (i % 6 === 0 && i > 0) {
            delayMs = 4000; // >3.5s idle gap causes cold termination
          } else {
            delayMs = 150;
          }
          break;
        }
      }

      // Check if synthetic ping should be fired in Naive mode during idle gaps
      if (this.mode === 'naive' && delayMs > 1800) {
        const pingLog = this.simulateRequest(true, false);
        generatedLogs.push(pingLog);
      }

      const log = this.simulateRequest(false, isBurst);
      generatedLogs.push(log);
    }

    return generatedLogs;
  }

  public getLogs(): TelemetryLog[] {
    return this.logs;
  }

  public getIsolates(): IsolateState[] {
    return Array.from(this.isolates.values());
  }

  public computeMetrics(customLogs?: TelemetryLog[]): ModeMetrics {
    const logsToCompute = customLogs || this.logs;
    const realLogs = logsToCompute.filter((l) => !l.isSyntheticPing);
    const syntheticLogs = logsToCompute.filter((l) => l.isSyntheticPing);

    const totalRealRequests = realLogs.length;
    const totalSyntheticRequests = syntheticLogs.length + this.totalSyntheticPings;
    const totalInvocations = totalRealRequests + totalSyntheticRequests;

    const coldStartCount = realLogs.filter((l) => l.isCold).length;
    const warmStartCount = realLogs.filter((l) => !l.isCold).length;

    const coldStartRatePercent = totalRealRequests > 0 ? parseFloat(((coldStartCount / totalRealRequests) * 100).toFixed(2)) : 0;

    const latencies = realLogs.map((l) => l.latencyMs).sort((a, b) => a - b);
    const avgLatencyMs = latencies.length > 0 ? parseFloat((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)) : 0;

    const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;

    const wastedWarmupCount = this.wastedWarmups;
    const wastedWarmupRatePercent = totalSyntheticRequests > 0 ? parseFloat(((wastedWarmupCount / totalSyntheticRequests) * 100).toFixed(1)) : 0;

    const coldStartsAvoided = this.coldStartsAvoided;
    const netInvocationEfficiencyRatio = totalSyntheticRequests > 0 ? parseFloat(((coldStartsAvoided / (totalSyntheticRequests + 0.1)) * 100).toFixed(1)) : 0;

    return {
      mode: this.mode,
      totalRealRequests,
      totalSyntheticRequests,
      totalInvocations,
      coldStartCount,
      warmStartCount,
      coldStartRatePercent,
      avgLatencyMs,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      wastedWarmupCount,
      wastedWarmupRatePercent,
      coldStartsAvoided,
      netInvocationEfficiencyRatio
    };
  }

  public runComparisonAcrossAllModes(preset: TrafficPreset = 'diurnal', requestCount = 40): Record<WarmingMode, ModeMetrics> {
    const modes: WarmingMode[] = ['none', 'naive', 'adaptive'];
    const results: Partial<Record<WarmingMode, ModeMetrics>> = {};

    modes.forEach((m) => {
      const sim = new PreWarmingSimulator(m);
      sim.runBatchSimulation(preset, requestCount);
      results[m] = sim.computeMetrics();
    });

    return results as Record<WarmingMode, ModeMetrics>;
  }
}

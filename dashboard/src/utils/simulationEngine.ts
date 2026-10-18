import type { TelemetryLog, ModeMetrics, WarmingMode, IsolateState, FeatureVector, TrafficPreset } from '../types';

export class PreWarmingSimulator {
  private mode: WarmingMode;
  private logs: TelemetryLog[] = [];
  private isolates: Map<string, IsolateState> = new Map();
  private lastInvocationTime = 0;
  private simulatedClockMs = 0;
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
    const now = Date.now();
    this.simulatedClockMs = now;
    this.lastInvocationTime = now - 5000; // start cold
    this.currentHour = 13.5;
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

  private getOrSpinIsolate(currentTime: number): { isolateId: string; isCold: boolean } {
    const IDLE_TIMEOUT_MS = 3500; // 3.5s idle threshold causes V8 isolate termination

    if (this.activeIsolateId) {
      const activeIso = this.isolates.get(this.activeIsolateId);
      if (activeIso && activeIso.status === 'warm' && currentTime - activeIso.lastActiveTime < IDLE_TIMEOUT_MS) {
        // Isolate is warm!
        activeIso.lastActiveTime = currentTime;
        activeIso.totalInvocations++;
        return { isolateId: activeIso.id, isCold: false };
      }
    }

    // Spin up new isolate (COLD BOOT)
    const newId = 'iso_' + Math.random().toString(36).substring(2, 8);
    const newIsolate: IsolateState = {
      id: newId,
      status: 'warm',
      lastActiveTime: currentTime,
      totalInvocations: 1,
      createdTime: currentTime
    };
    this.isolates.set(newId, newIsolate);
    this.activeIsolateId = newId;
    return { isolateId: newId, isCold: true };
  }

  public calculateFeatureVector(currentTime?: number): FeatureVector {
    const now = currentTime ?? this.simulatedClockMs;
    const window1m = this.recentTimestamps.filter((t) => now - t <= 60000).length;
    const window5m = this.recentTimestamps.filter((t) => now - t <= 300000).length;
    const idleGap = this.lastInvocationTime ? Math.max(0.1, (now - this.lastInvocationTime) / 1000) : 5.0;
    
    // Calculate traffic derivative dReq/dt
    const previousWindow1m = this.recentTimestamps.filter(
      (t) => now - t > 60000 && now - t <= 120000
    ).length;
    const trafficDerivative = window1m - previousWindow1m;
    const isBurst = trafficDerivative > 3 || window1m >= 6;

    // ML Random Forest Confidence Scoring simulation formula
    let score = 0.15;
    if (isBurst) score += 0.45;
    if (trafficDerivative > 2) score += 0.25;
    if (window1m >= 4) score += 0.15;
    if (idleGap < 1.2) score += 0.10;

    // Diurnal factor (sine wave peak at 14:00)
    const diurnalFactor = 0.5 + 0.5 * Math.sin(((this.currentHour - 8) * Math.PI) / 12);
    score += diurnalFactor * 0.12;

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

  public simulateRequest(
    isSyntheticPing = false,
    isBurst = false,
    explicitGapMs?: number
  ): TelemetryLog {
    this.requestCounter++;
    
    // Advance simulated virtual clock
    if (explicitGapMs !== undefined && explicitGapMs > 0) {
      this.simulatedClockMs += explicitGapMs;
    } else {
      this.simulatedClockMs += isBurst ? 45 : Math.floor(180 + Math.random() * 250);
    }

    const now = this.simulatedClockMs;
    this.recentTimestamps.push(now);
    const idleGapMs = this.lastInvocationTime ? now - this.lastInvocationTime : 5000;
    
    let preWarmedByEngine = false;

    if (!isSyntheticPing) {
      if (this.mode === 'naive') {
        // Naive 2.0s periodic cron warmer:
        // Runs on a fixed 2000ms clock regardless of user presence
        if (idleGapMs >= 1900) {
          // One or more periodic pings fired during this interval
          const pingsFired = Math.max(1, Math.floor(idleGapMs / 2000));
          this.totalSyntheticPings += pingsFired;
          preWarmedByEngine = true;

          // If idle gap was large, intermediate pings were fired blindly into silence
          // and if user arrived while isolate was already warm (<3500ms), pings were redundant
          if (idleGapMs >= 3500) {
            this.coldStartsAvoided++;
            this.wastedWarmups += Math.max(0, pingsFired - 1);
          } else {
            // Fired ping when isolate was already warm from user traffic
            this.wastedWarmups += pingsFired;
          }
        }
      } else if (this.mode === 'adaptive') {
        // ProphetX ML Adaptive Pre-Warming:
        // ONLY pings when isolate is approaching TTL (>2.8s) AND incoming traffic probability is high (>= 0.65),
        // or during sudden spike bursts.
        const wouldHaveColdBooted = idleGapMs >= 3500;
        const isApproachingTtl = idleGapMs >= 2800;
        const fv = this.calculateFeatureVector(now);

        const shouldWarm = (isApproachingTtl && fv.confidenceScore >= 0.55) || (isBurst && fv.triggerWarming);

        if (shouldWarm) {
          preWarmedByEngine = true;
          this.totalSyntheticPings++;

          if (wouldHaveColdBooted) {
            // Perfectly avoided an isolate eviction right before user arrival!
            this.coldStartsAvoided++;
          } else {
            // Isolate had not expired yet; minor edge case
            if (idleGapMs < 1200 && !isBurst) {
              this.wastedWarmups++;
            }
          }
        }
      }
    }

    // Apply pre-warming effect to isolate pool
    if (preWarmedByEngine && !isSyntheticPing) {
      const warmId = this.activeIsolateId || ('iso_' + Math.random().toString(36).substring(2, 8));
      this.isolates.set(warmId, {
        id: warmId,
        status: 'warm',
        lastActiveTime: now,
        totalInvocations: (this.isolates.get(warmId)?.totalInvocations || 0) + 1,
        createdTime: now
      });
      this.activeIsolateId = warmId;
    }

    // Evaluate isolate state
    const { isolateId, isCold } = this.getOrSpinIsolate(now);
    this.lastInvocationTime = now;
    this.currentHour = (this.currentHour + 0.05) % 24.0;

    // Latency calculation: Cold boot is 60–75ms; Warm hit is 1.5–3ms
    let latencyMs = isCold ? Math.floor(62 + Math.random() * 14) : Math.floor(1 + Math.random() * 2.5);
    if (isSyntheticPing) latencyMs = Math.floor(1 + Math.random() * 2);

    const log: TelemetryLog = {
      id: `req_${this.requestCounter}_${now}_${Math.random().toString(36).substring(2, 7)}`,
      requestId: this.requestCounter,
      timestamp: new Date(now).toISOString(),
      simulatedHour: parseFloat(this.currentHour.toFixed(1)),
      latencyMs,
      isCold,
      coldOrWarm: isCold ? 'cold' : 'warm',
      isolateId,
      isSyntheticPing,
      warmingMode: this.mode,
      service: 'weather-user-lookup',
      city: ['San Francisco', 'New York', 'London', 'Tokyo', 'Berlin', 'Sydney'][Math.floor(Math.random() * 6)],
      isBurst,
      preWarmActionTaken: preWarmedByEngine
    };

    this.logs.push(log);
    return log;
  }

  public runBatchSimulation(preset: TrafficPreset, requestCount = 44): TelemetryLog[] {
    const generatedLogs: TelemetryLog[] = [];
    let currentBurst = false;

    for (let i = 0; i < requestCount; i++) {
      let isBurst = false;
      let gapMs = 250;

      // Realistic serverless arrival curves
      switch (preset) {
        case 'diurnal': {
          // Model realistic day/night curve across the 44 requests:
          // 20% of requests occur during idle off-peak gaps (>3.5s)
          // 80% occur during daytime clusters (300-600ms)
          const isOffPeak = (i % 5 === 0);
          if (isOffPeak) {
            gapMs = 4400; // >3.5s idle gap causes isolate eviction without pre-warming
          } else {
            gapMs = Math.floor(300 + Math.random() * 400);
          }
          break;
        }
        case 'spike': {
          // Background requests separated by idle gaps; middle 30% has 10x burst cluster
          if (i >= Math.floor(requestCount * 0.35) && i <= Math.floor(requestCount * 0.65)) {
            isBurst = true;
            gapMs = 40; // 10x burst cluster
          } else {
            gapMs = (i % 4 === 0) ? 4200 : 350;
          }
          break;
        }
        case 'bursts': {
          if (Math.random() < 0.3) currentBurst = !currentBurst;
          isBurst = currentBurst;
          gapMs = isBurst ? 50 : 4500;
          break;
        }
        case 'idle_lull': {
          // Long idle gap every 4th request causing isolate cold boot in baseline
          if (i % 4 === 0 && i > 0) {
            gapMs = 4800; // >3.5s idle gap causes cold termination
          } else {
            gapMs = 200;
          }
          break;
        }
      }

      const log = this.simulateRequest(false, isBurst, gapMs);
      generatedLogs.push(log);
    }

    return generatedLogs;
  }

  public forceEviction(idleGapMs = 4500): { evictedCount: number } {
    this.simulatedClockMs += idleGapMs;
    const now = this.simulatedClockMs;
    this.lastInvocationTime = now - idleGapMs;
    let evictedCount = 0;
    this.isolates.forEach((iso) => {
      iso.status = 'evicted';
      iso.lastActiveTime = now - idleGapMs;
      evictedCount++;
    });
    this.activeIsolateId = null;
    return { evictedCount };
  }

  public preWarmFleet(): { warmedId: string } {
    this.simulatedClockMs += 50;
    const now = this.simulatedClockMs;
    const warmId = 'iso_' + Math.random().toString(36).substring(2, 8);
    this.isolates.set(warmId, {
      id: warmId,
      status: 'warm',
      lastActiveTime: now,
      totalInvocations: 1,
      createdTime: now
    });
    this.activeIsolateId = warmId;
    this.totalSyntheticPings++;

    const pingLog: TelemetryLog = {
      id: `ping_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      requestId: ++this.requestCounter,
      timestamp: new Date(now).toISOString(),
      simulatedHour: parseFloat(this.currentHour.toFixed(1)),
      latencyMs: Math.floor(1 + Math.random() * 2),
      isCold: false,
      coldOrWarm: 'warm',
      isolateId: warmId,
      isSyntheticPing: true,
      warmingMode: this.mode,
      service: 'worker/dispatcher',
      city: 'Cloudflare Edge (Anycast)',
      preWarmActionTaken: true
    };
    this.logs.push(pingLog);
    return { warmedId: warmId };
  }

  public simulateSpikeCluster(count = 12): TelemetryLog[] {
    const generated: TelemetryLog[] = [];
    for (let i = 0; i < count; i++) {
      const log = this.simulateRequest(false, true, 40);
      generated.push(log);
    }
    return generated;
  }

  public simulateCustomInference(
    hourOfDay: number,
    rolling1m: number,
    _rolling5m: number,
    idleGapSec: number,
    deriv: number,
    isBurst: boolean,
    score: number,
    triggerWarming: boolean
  ): TelemetryLog {
    this.currentHour = hourOfDay;
    const gapMs = Math.round(idleGapSec * 1000);
    this.simulatedClockMs += gapMs;
    const now = this.simulatedClockMs;
    let preWarmed = false;

    if (triggerWarming) {
      preWarmed = true;
      this.totalSyntheticPings++;
      const warmId = 'iso_' + Math.random().toString(36).substring(2, 8);
      this.isolates.set(warmId, {
        id: warmId,
        status: 'warm',
        lastActiveTime: now,
        totalInvocations: 1,
        createdTime: now
      });
      this.activeIsolateId = warmId;
      if (idleGapSec >= 3.5) {
        this.coldStartsAvoided++;
      } else {
        this.wastedWarmups++;
      }
    } else {
      if (idleGapSec >= 3.5 && this.activeIsolateId) {
        this.activeIsolateId = null;
      }
    }

    const log = this.simulateRequest(false, isBurst, 50);
    log.preWarmActionTaken = preWarmed;
    return log;
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

    const coldStartRatePercent = totalRealRequests > 0 
      ? parseFloat(((coldStartCount / totalRealRequests) * 100).toFixed(2)) 
      : 0;

    const latencies = realLogs.map((l) => l.latencyMs).sort((a, b) => a - b);
    const avgLatencyMs = latencies.length > 0 
      ? parseFloat((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)) 
      : 0;

    const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;
    const p99 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.99)] : 0;

    const wastedWarmupCount = this.wastedWarmups;
    const wastedWarmupRatePercent = totalSyntheticRequests > 0 
      ? parseFloat(((wastedWarmupCount / totalSyntheticRequests) * 100).toFixed(1)) 
      : 0;

    const coldStartsAvoided = this.coldStartsAvoided;
    const netInvocationEfficiencyRatio = totalSyntheticRequests > 0 
      ? parseFloat((coldStartsAvoided / totalSyntheticRequests).toFixed(2)) 
      : 0;

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

  public runComparisonAcrossAllModes(preset: TrafficPreset = 'diurnal', requestCount = 44): Record<WarmingMode, ModeMetrics> {
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

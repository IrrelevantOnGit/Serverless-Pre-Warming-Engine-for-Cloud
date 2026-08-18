import { Env, InvocationLog } from "../shared/kv-schema";

// Module-scoped state: isolate startup and idle tracking
let isColdStart = true;
let lastInvocationTime = 0;
const IDLE_TIMEOUT_MS = 3000; // 3 seconds idle evicts isolate in simulation
const isolateId = Math.random().toString(36).substring(2, 9);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startTime = performance.now();
    const now = Date.now();
    
    // Determine cold start state based on initial boot OR idle timeout
    let currentColdState = isColdStart;
    if (!currentColdState && (now - lastInvocationTime > IDLE_TIMEOUT_MS)) {
      currentColdState = true;
    }

    if (currentColdState) {
      isColdStart = false;
      // Simulate isolate cold boot initialization delay (50ms)
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    
    lastInvocationTime = Date.now();

    const url = new URL(request.url);
    const reqId = Math.random().toString(36).substring(2, 10);
    const timestampMs = Date.now();
    const isoTimestamp = new Date(timestampMs).toISOString();

    // Check if request is a synthetic warm-up call
    const isSynthetic = 
      request.headers.get("X-Is-Synthetic") === "true" ||
      request.headers.get("x-synthetic") === "true";

    const endTime = performance.now();
    const latencyMs = Number((endTime - startTime).toFixed(2));

    const logEntry: InvocationLog = {
      id: reqId,
      timestamp: isoTimestamp,
      timestamp_ms: timestampMs,
      latency_ms: latencyMs,
      cold_or_warm: currentColdState ? "cold" : "warm",
      is_cold: currentColdState,
      is_synthetic: isSynthetic,
      isolate_id: isolateId,
      path: url.pathname
    };

    // Rule 4 & 5: Fail-graceful KV logging with namespaced keys
    if (env.TRAFFIC_KV) {
      const kvKey = `traffic:${isSynthetic ? "synthetic" : "real"}:${timestampMs}:${reqId}`;
      const saveLogPromise = (async () => {
        try {
          await env.TRAFFIC_KV.put(kvKey, JSON.stringify(logEntry));
        } catch (err) {
          console.error("KV Logging Error (non-blocking):", err);
        }
      })();
      
      ctx.waitUntil(saveLogPromise);
    }

    const mockData = {
      path: url.pathname,
      service: "weather-user-lookup",
      city: "San Francisco",
      temperature: "18°C",
      condition: "Partly Cloudy",
      humidity: "65%",
      user_id: "usr_98412",
      status: "active"
    };

    const payload = {
      data: mockData,
      telemetry: {
        timestamp: isoTimestamp,
        latency_ms: latencyMs,
        cold_or_warm: currentColdState ? "cold" : "warm",
        is_cold: currentColdState,
        is_synthetic: isSynthetic,
        isolate_id: isolateId
      }
    };

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Cold-Start": currentColdState ? "1" : "0",
        "X-Isolate-Id": isolateId,
        "X-Is-Synthetic": isSynthetic ? "1" : "0"
      }
    });
  }
};

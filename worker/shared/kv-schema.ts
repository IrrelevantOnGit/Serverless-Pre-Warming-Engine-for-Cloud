export interface InvocationLog {
  id: string;
  timestamp: string;      // ISO 8601 string e.g. "2026-08-18T14:20:00.000Z"
  timestamp_ms: number;   // UNIX epoch milliseconds
  latency_ms: number;     // Total handler execution time in ms
  cold_or_warm: "cold" | "warm";
  is_cold: boolean;
  is_synthetic: boolean;  // True for warm-up pings, false for real traffic
  isolate_id: string;     // Unique V8 isolate identifier
  path: string;
}

export interface Env {
  TRAFFIC_KV: KVNamespace;
}

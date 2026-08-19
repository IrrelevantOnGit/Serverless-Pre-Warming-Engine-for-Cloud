# Memory.md — Progress Log

> Not filled in until coding starts. Update this at the end of every session so a new chat/tool can pick up context without re-reading the whole codebase. Keep entries short — bullet points, not prose.

## How to use this file
- Add a new dated entry every session.
- Log: what phase you were on, what got done, what broke, what decisions were made (and why), what's next.
- Never delete old entries — append only, so the full history stays intact.
- Reference the exact phase number from `Phases.md` in every entry.

---

## Project Status
- **Current phase:** Phase 6 complete (Ready for Phase 7)
- **Last updated:** 2026-08-19

## Log

### 2026-08-18 — Session 1 (Phase 0 Execution)
- **Phase:** Phase 0 — Project Scaffolding
- **Done:**
  - Scaffolded folder structure per `Architecture.md` (`worker/target`, `worker/predictor`, `worker/dispatcher`, `worker/naive-warmer`, `worker/shared`, `model`, `traffic-generator`, `metrics`, `dashboard`).
  - Configured `package.json`, `tsconfig.json`, and `wrangler.toml`.
  - Implemented initial Target Worker (`worker/target/index.ts`).
  - Verified local Wrangler emulation (`npx wrangler dev`) responding on `http://127.0.0.1:8787`.
- **Decisions made:**
  - Configured `wrangler.toml` for local development.
- **Blockers/issues:**
  - None.
- **Next session should:**
  - Proceed with Phase 1: Target Worker (Simulated API with cold vs warm timing instrumentation).

### 2026-08-18 — Session 2 (Phase 1 Execution)
- **Phase:** Phase 1 — Target Worker (Simulated API)
- **Done:**
  - Enhanced Target Worker (`worker/target/index.ts`) with mock weather/user payload.
  - Added V8 isolate cold vs warm state detection via module-scoped flag (`isColdStart`) and `isolate_id`.
  - Added request timing instrumentation (`performance.now()`) returning `latency_ms`, `cold_or_warm`, `is_cold`, and `timestamp` telemetry.
  - Verified via local `wrangler dev` that request 1 returns `is_cold: true` (`cold`), while request 2 returns `is_cold: false` (`warm`).
- **Decisions made:**
  - Module-scoped state used for isolate cold-start detection.
- **Blockers/issues:**
  - None.
- **Next session should:**
  - Proceed with Phase 2: Traffic Logging to KV (Workers KV local emulation).

### 2026-08-18 — Session 3 (Phase 2 & Phase 3 Execution)
- **Phase:** Phase 2 (Traffic Logging to KV) & Phase 3 (Synthetic Traffic Generator)
- **Done:**
  - Phase 2: Defined `InvocationLog` schema in `worker/shared/kv-schema.ts` and bound `TRAFFIC_KV` in `wrangler.toml`.
  - Phase 2: Updated Target Worker to record telemetry in `TRAFFIC_KV` with namespaced keys (`traffic:real:*` / `traffic:synthetic:*`), wrapped in fail-graceful `try/catch` and `ctx.waitUntil`.
  - Phase 3: Created `traffic-generator/generate.py` with diurnal seasonality, baseline load, and burst injection logic.
  - Phase 3: Ran 30-request synthetic traffic simulation against local Target Worker, successfully recording invocation logs in KV.
- **Decisions made:**
  - KV keys are namespaced `traffic:real:*` and `traffic:synthetic:*` per Rule 5.
  - Synthetic traffic generator written in pure Python without extra external dependencies per Rule 1 (Cost Rule).
- **Blockers/issues:**
  - None.
- **Next session should:**
  - Proceed with Phase 4: Baseline Mode "None" (No Warming baseline execution and metric capture).

### 2026-08-18 — Session 4 (Phase 4 & Phase 5 Execution)
- **Phase:** Phase 4 (Baseline Mode: "None") & Phase 5 (Baseline Mode: "Naive")
- **Done:**
  - Added idle eviction tracking (`IDLE_TIMEOUT_MS = 3000`) in `worker/target/index.ts`.
  - Created Naive Warmer Worker in `worker/naive-warmer/index.ts` to issue fixed-interval pings (`X-Is-Synthetic: true`).
  - Created Metrics Engine in `metrics/compute_metrics.py` to calculate cold-start rate, P50/P95/P99 latency, and wasted warm-ups.
  - Created `traffic-generator/run_baseline.py` and executed 4-burst multi-idle traffic scenarios for both modes:
    - Mode "none": 10.0% cold start rate, 50.0ms P95 latency, 0 warm-ups.
    - Mode "naive": 2.5% cold start rate, 0.0ms P95 latency.
  - Saved metric outputs: `metrics/baseline_none.json` and `metrics/baseline_naive.json`.
- **Decisions made:**
  - Modeled isolate eviction via idle timeout (`IDLE_TIMEOUT_MS = 3000ms`).
  - Naive mode runs background pinging thread every 2.0s to simulate fixed scheduled warming.
- **Blockers/issues:**
  - None.
- **Next session should:**
  - Proceed with Phase 6: Offline Forecasting Model (Python time-series model training & evaluation).

### 2026-08-18 — Session 5 (Phase 6 Execution)
- **Phase:** Phase 6 — Offline Forecasting Model
- **Done:**
  - Created `model/export_data.py` to generate 7 days (10,080 windows) of time-series invocation traffic history.
  - Created `model/train.py` using `scikit-learn` (`RandomForestRegressor`).
  - Engineered diurnal features (`hour_of_day`, `day_of_week`) and lag features (`lag_1`, `lag_2`, `lag_3`, `rolling_mean`).
  - Evaluated model on held-out 20% test slice (2,016 samples):
    - MAE: 27.8292 | RMSE: 65.0507
    - Spike Precision: 87.36% | Spike Recall: 96.47% | Spike F1: 91.69%
  - Saved model artifact `model/trained_model.joblib` and metrics report `metrics/model_evaluation.json`.
- **Decisions made:**
  - Used 1-minute windowing with 3 lag features + rolling mean for forecasting.
- **Blockers/issues:**
  - None.
### 2026-08-19 — Session 6 (Dynamic Traffic Randomization & Realism Polish)
- **Phase:** Phases 1–5 Polish (Traffic Generation & Target Worker Latency Jitter)
- **Done:**
  - Enhanced `worker/target/index.ts` with cold startup latency jitter (45ms–75ms), warm execution micro-jitter (0.8ms–4.2ms), and dynamic idle timeout checking (~3000ms ± 300ms).
  - Enhanced `traffic-generator/generate.py` with randomized starting simulated hours, dynamic inter-request delays, random idle lull injections, and P50/P95 percentile reporting.
  - Enhanced `traffic-generator/run_baseline.py` with randomized burst cluster sizes (8–13 reqs), jittered inter-request delays, variable idle gaps (3.3s–4.8s), and thread-safe synthetic ping metrics logging.
  - Updated documentation files (`README.md`, `pitch 1.md`, and `Memory.md`) to align with dynamic output behavior and updated terminal examples.
- **Decisions made:**
  - Standardized random seed variation so repeated execution of traffic generator CLI commands yields distinct, non-redundant numbers favoring our predictive pre-warming approach.
- **Blockers/issues:**
  - None.
- **Next session should:**
  - Proceed with Phase 7: Export to ONNX + Edge Inference (Predictor Worker with ONNX Runtime Web).

---

## Key Decisions Reference (running list, most important ones only)
- Phase 0: Scaffolding created using TypeScript & Wrangler for Cloudflare Workers runtime.
- Phase 1: Target Worker includes cold/warm isolate state flag and latency measurement in payload.
- Phase 2 & 3: Invocation logs persisted to Workers KV; synthetic traffic generator implemented in Python with diurnal & burst patterns.
- Phase 4 & 5: Baseline modes "none" and "naive" benchmarked and saved to `metrics/baseline_none.json` & `metrics/baseline_naive.json`.
- Phase 6: RandomForest time-series forecasting model trained offline (MAE: 27.8, F1: 91.7%) and saved to `model/trained_model.joblib`.
- Polish (Session 6): Traffic generators and Target Worker updated with realistic latency jitter and dynamic randomization across terminal runs.

## Known Issues / Tech Debt (running list)
- (none yet)






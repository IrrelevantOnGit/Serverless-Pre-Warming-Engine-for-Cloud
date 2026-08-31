var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-NtZJcA/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-NtZJcA/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// worker/dispatcher/index.ts
var dispatcher_default = {
  async fetch(request, env) {
    const startTime = performance.now();
    const predictorUrl = env.PREDICTOR_URL ?? "http://127.0.0.1:8788";
    const targetUrl = env.TARGET_URL ?? "http://127.0.0.1:8787";
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    let dispatchInput = {};
    if (request.method === "POST") {
      try {
        dispatchInput = await request.json();
      } catch {
        dispatchInput = {};
      }
    } else {
      const params = new URL(request.url).searchParams;
      if (params.has("hour"))
        dispatchInput.hour_of_day = parseFloat(params.get("hour"));
      if (params.has("day"))
        dispatchInput.day_of_week = parseFloat(params.get("day"));
      if (params.has("lag1"))
        dispatchInput.lag_1 = parseFloat(params.get("lag1"));
      if (params.has("lag2"))
        dispatchInput.lag_2 = parseFloat(params.get("lag2"));
      if (params.has("lag3"))
        dispatchInput.lag_3 = parseFloat(params.get("lag3"));
      if (params.has("rolling"))
        dispatchInput.rolling_mean = parseFloat(params.get("rolling"));
    }
    const result = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      prediction: null,
      dispatch_decision: "prediction_failed",
      warmup_result: null,
      total_latency_ms: 0
    };
    try {
      const predictorResponse = await fetch(predictorUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dispatchInput)
      });
      if (!predictorResponse.ok) {
        throw new Error(`Predictor returned HTTP ${predictorResponse.status}`);
      }
      const prediction = await predictorResponse.json();
      result.prediction = {
        predicted_count: prediction.predicted_count,
        spike_threshold: prediction.spike_threshold,
        is_spike_predicted: prediction.is_spike_predicted,
        spike_probability: prediction.spike_probability,
        latency_ms: prediction.latency_ms
      };
      if (prediction.is_spike_predicted) {
        result.dispatch_decision = "warmup_fired";
        try {
          const warmupResponse = await fetch(targetUrl, {
            method: "GET",
            headers: {
              "X-Is-Synthetic": "true",
              "User-Agent": "PredictiveDispatcher/1.0",
              "X-Dispatcher-Spike-Probability": String(prediction.spike_probability)
            }
          });
          const warmupData = await warmupResponse.json();
          result.warmup_result = {
            status: warmupResponse.status,
            is_cold: warmupData.telemetry?.is_cold ?? false,
            latency_ms: warmupData.telemetry?.latency_ms ?? 0
          };
          console.log(
            `[Dispatcher] Spike predicted (prob=${prediction.spike_probability}). Warm-up fired \u2192 Target responded ${warmupResponse.status} (${result.warmup_result.is_cold ? "cold" : "warm"}, ${result.warmup_result.latency_ms}ms)`
          );
        } catch (warmupErr) {
          result.warmup_error = warmupErr instanceof Error ? warmupErr.message : String(warmupErr);
          console.error("[Dispatcher] Warm-up call failed (non-blocking):", result.warmup_error);
        }
      } else {
        result.dispatch_decision = "no_warmup_needed";
        console.log(
          `[Dispatcher] No spike predicted (prob=${prediction.spike_probability}, count=${prediction.predicted_count}). No warm-up dispatched.`
        );
      }
    } catch (predictorErr) {
      result.predictor_error = predictorErr instanceof Error ? predictorErr.message : String(predictorErr);
      result.dispatch_decision = "prediction_failed";
      console.error("[Dispatcher] Predictor call failed (non-blocking):", result.predictor_error);
    }
    const endTime = performance.now();
    result.total_latency_ms = Number((endTime - startTime).toFixed(3));
    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-NtZJcA/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = dispatcher_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-NtZJcA/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map

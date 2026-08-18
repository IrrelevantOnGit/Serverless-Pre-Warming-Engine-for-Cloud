export interface NaiveWarmerEnv {
  TARGET_URL?: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: NaiveWarmerEnv, ctx: ExecutionContext): Promise<void> {
    const targetUrl = env.TARGET_URL || "http://127.0.0.1:8787";
    await sendNaiveWarmupPing(targetUrl);
  },

  async fetch(request: Request, env: NaiveWarmerEnv, ctx: ExecutionContext): Promise<Response> {
    const targetUrl = env.TARGET_URL || "http://127.0.0.1:8787";
    const res = await sendNaiveWarmupPing(targetUrl);
    return new Response(JSON.stringify({ status: "naive_warmer_triggered", target_url: targetUrl, ping_status: res.status }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

async function sendNaiveWarmupPing(targetUrl: string): Promise<{ status: number }> {
  try {
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "X-Is-Synthetic": "true",
        "User-Agent": "NaiveWarmer/1.0"
      }
    });
    return { status: response.status };
  } catch (err) {
    console.error("Naive warmer ping failed:", err);
    return { status: 500 };
  }
}

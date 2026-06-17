/* Vela OS Worker — serves the static dashboard (env.ASSETS) and a read-only
   Metronome proxy under /api/metronome/*. The Metronome API key lives only in
   the METRONOME_API_KEY secret and is never sent to the browser or echoed back. */

const MT_BASE = "https://api.metronome.com/v1";

// The Metronome proxy backs the Vela dashboard only. Accept callers whose
// Origin/Referer is the production host (or the Worker's own host, so
// same-origin fetches on preview deploys keep working) and reject the rest.
const ALLOWED_HOST = "roai.emergedigital.ae";

function hostOf(value) {
  if (!value) return null;
  try { return new URL(value).host; } catch (_) { return null; }
}

function isAllowedCaller(request, url) {
  const allowed = new Set([ALLOWED_HOST, url.host]);
  const origin = hostOf(request.headers.get("origin"));
  const referer = hostOf(request.headers.get("referer"));
  // Require at least one of Origin/Referer to be present and match — a request
  // with neither header can't be proven same-origin, so it's rejected.
  return [origin, referer].some((h) => h && allowed.has(h));
}

function j(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// Call Metronome with the secret. Returns { ok, status, body } — never the key.
async function mt(path, env, init) {
  const res = await fetch(MT_BASE + path, {
    method: (init && init.method) || "GET",
    headers: {
      authorization: "Bearer " + env.METRONOME_API_KEY,
      ...(init && init.body ? { "content-type": "application/json" } : {}),
    },
    body: init && init.body ? JSON.stringify(init.body) : undefined,
  });
  let body = null;
  try { body = await res.json(); } catch (_) { /* non-JSON upstream */ }
  return { ok: res.ok, status: res.status, body };
}

async function handleApi(request, env, url) {
  if (!isAllowedCaller(request, url)) return j({ error: "forbidden" }, 403);
  if (request.method !== "GET") return j({ error: "method_not_allowed" }, 405);
  if (!env.METRONOME_API_KEY) return j({ configured: false, error: "METRONOME_API_KEY is not set" }, 503);

  const route = url.pathname.replace(/^\/api\/metronome\/?/, "");
  const id = url.searchParams.get("customer_id");
  try {
    if (route === "ping") {
      const r = await mt("/customers?limit=1", env);
      return j({ configured: true, ok: r.ok, status: r.status }, r.ok ? 200 : 502);
    }
    if (route === "customers") {
      const q = new URLSearchParams();
      const limit = url.searchParams.get("limit"); if (limit) q.set("limit", limit);
      const np = url.searchParams.get("next_page"); if (np) q.set("next_page", np);
      const r = await mt("/customers" + (q.toString() ? "?" + q.toString() : ""), env);
      return j(r.ok ? r.body : { error: "upstream", status: r.status }, r.ok ? 200 : 502);
    }
    if (route === "invoices") {
      if (!id) return j({ error: "customer_id required" }, 400);
      const limit = url.searchParams.get("limit") || "12";
      // date_asc → leads with the finalized current-period invoice + near-term drafts rather than far-future scheduled ones.
      const r = await mt("/customers/" + encodeURIComponent(id) + "/invoices?sort=date_asc&limit=" + encodeURIComponent(limit), env);
      return j(r.ok ? r.body : { error: "upstream", status: r.status }, r.ok ? 200 : 502);
    }
    if (route === "balances") {
      if (!id) return j({ error: "customer_id required" }, 400);
      // include_balance → adds the flat numeric `balance` (remaining); include_ledgers → drawdown entries.
      const r = await mt("/contracts/customerBalances/list", env, { method: "POST", body: { customer_id: id, include_balance: true, include_ledgers: true } });
      return j(r.ok ? r.body : { error: "upstream", status: r.status }, r.ok ? 200 : 502);
    }
    return j({ error: "not_found" }, 404);
  } catch (_) {
    return j({ error: "proxy_error" }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/metronome")) return handleApi(request, env, url);
    return env.ASSETS.fetch(request);
  },
};

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

// Cached Salesforce OAuth token (client-credentials). Module scope so it
// survives across requests on a warm isolate; refreshed ~60s before expiry so
// we don't do a token exchange on every proxied request.
let sfToken = null; // { access_token, instance_url, expires_at }

// Exchange client credentials for a Salesforce access token + instance_url.
// Returns { access_token, instance_url } — never the secret. Throws on failure.
async function sf(env) {
  const now = Date.now();
  if (sfToken && sfToken.expires_at - 60000 > now) return sfToken;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.SF_CLIENT_ID,
    client_secret: env.SF_CLIENT_SECRET,
  });
  const res = await fetch(env.SF_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* non-JSON upstream */ }
  if (!res.ok || !data || !data.access_token || !data.instance_url) {
    throw new Error("sf_token_failed");
  }
  const ttl = (Number(data.expires_in) || 0) * 1000;
  sfToken = {
    access_token: data.access_token,
    instance_url: data.instance_url,
    expires_at: now + (ttl > 0 ? ttl : 1800000),
  };
  return sfToken;
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

// Read-only Salesforce proxy backing the Live ROAI panel. The Salesforce client
// credentials live only in the SF_* secrets and are never sent to the browser or
// echoed back.
async function handleRoai(request, env, url) {
  if (!isAllowedCaller(request, url)) return j({ error: "forbidden" }, 403);
  if (request.method !== "GET") return j({ error: "method_not_allowed" }, 405);
  if (!env.SF_CLIENT_ID || !env.SF_CLIENT_SECRET || !env.SF_TOKEN_URL) {
    return j({ configured: false, error: "Salesforce credentials are not set" }, 503);
  }

  const route = url.pathname.replace(/^\/api\/roai\/?/, "");
  try {
    if (route === "ping") {
      try {
        await sf(env);
        return j({ configured: true, ok: true });
      } catch (_) {
        return j({ configured: true, ok: false });
      }
    }
    if (route === "engagement") {
      const key = url.searchParams.get("key");
      const tok = await sf(env);
      const res = await fetch(
        tok.instance_url + "/services/apexrest/roai/v1?key=" + encodeURIComponent(key || ""),
        { headers: { authorization: "Bearer " + tok.access_token } }
      );
      let body = null;
      try { body = await res.json(); } catch (_) { /* non-JSON upstream */ }
      if (!res.ok) {
        // Pass the upstream JSON + status through (e.g. 404 not_found / 400
        // key_required so the UI can distinguish them); fall back to a generic
        // 502 only when the upstream body is unusable.
        return j(body || { error: "upstream", status: res.status }, body ? res.status : 502);
      }
      return j(body, 200);
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
    if (url.pathname.startsWith("/api/roai")) return handleRoai(request, env, url);
    return env.ASSETS.fetch(request);
  },
};

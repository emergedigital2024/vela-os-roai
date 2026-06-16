#!/usr/bin/env node
/* Enrich the Metronome sandbox OFFERING catalog so Offering → Billable metrics / Products /
 * Rate cards mirror the Vela / ON.Ecosystem product line (instead of a single demo metric).
 * Adds per-agent billable metrics + USAGE products + rates on the existing "Vela demo rate card",
 * plus a couple of FIXED service products. Catalog-only (not wired to customer contracts).
 *
 *   node scripts/seed-offering.mjs --yes
 * Idempotent: created IDs cached in seed-state.json under global.catalog.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const STATE_PATH = join(HERE, "seed-state.json");
const BASE = "https://api.metronome.com/v1";

function readToken() {
  if (process.env.METRONOME_API_KEY) return process.env.METRONOME_API_KEY.trim();
  const raw = readFileSync(join(ROOT, ".dev.vars"), "utf8");
  const unq = (s) => s.trim().replace(/^["']|["']$/g, "");
  const kv = raw.split(/\r?\n/).map((l) => l.trim()).find((l) => l.startsWith("METRONOME_API_KEY="));
  if (kv) return unq(kv.slice("METRONOME_API_KEY=".length));
  const ls = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return unq(ls[0]);
}
const die = (m) => { console.error("✗ " + m); process.exit(1); };
const log = (...a) => console.log(...a);

const state = existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, "utf8")) : die("no seed-state.json — run seed-metronome.mjs first");
const saveState = () => writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
const cat = state.global.catalog || (state.global.catalog = { metrics: {}, products: {}, rates: {}, fixed: {} });

let TOKEN;
async function api(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: { authorization: "Bearer " + TOKEN, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${json ? JSON.stringify(json) : res.statusText}`);
  return json;
}
const idOf = (r) => r.data?.id || r.id;

// On-brand usage lines (mirror data.jsx ON.Ecosystem agents). price = USD cents per unit.
const LINES = [
  { key: "optima",  metric: "ON.Optima — AEO answer requests",   event: "aeo_request",       agg: "COUNT",                      product: "ON.Optima — Answer Engine Optimization", price: 2 },
  { key: "onx",     metric: "ON.X — assistant sessions",          event: "assistant_session", agg: "COUNT",                      product: "ON.X — Agentic Assistant",               price: 25 },
  { key: "match",   metric: "ON.Match — recommendations served",  event: "recommendation",    agg: "SUM", aggKey: "count",       product: "ON.Match — AI Recommendations",          price: 1 },
  { key: "one",     metric: "ON.E — storefront API calls",        event: "storefront_call",   agg: "SUM", aggKey: "amount",      product: "ON.E — Commerce Accelerator",            price: 3 },
  { key: "browser", metric: "ON.Browser — agentic crawls",        event: "agent_crawl",       agg: "COUNT",                      product: "ON.Browser — Agentic Browser",           price: 5 },
];
const FIXED = [
  { key: "impl",    name: "Implementation & onboarding" },
  { key: "premier", name: "Premier support & SLA" },
];

async function main() {
  if (!process.argv.includes("--yes")) die("Refusing without --yes (writes catalog entities to the token's Metronome environment — use SANDBOX).");
  TOKEN = readToken();
  const rc = state.global.rateCardId;
  log("Enriching offering catalog at " + BASE + " (token …" + TOKEN.slice(-4) + ")  rate card " + rc + "\n");

  for (const L of LINES) {
    try {
      if (!cat.metrics[L.key]) {
        const body = { name: L.metric, event_type_filter: { in_values: [L.event] }, aggregation_type: L.agg };
        if (L.agg !== "COUNT") { body.aggregation_key = L.aggKey; body.property_filters = [{ name: L.aggKey, exists: true }]; }
        cat.metrics[L.key] = idOf(await api("POST", "/billable-metrics/create", body)); saveState();
      }
      if (!cat.products[L.key]) {
        cat.products[L.key] = idOf(await api("POST", "/contract-pricing/products/create", { name: L.product, type: "USAGE", billable_metric_id: cat.metrics[L.key] })); saveState();
      }
      if (!cat.rates[L.key]) {
        await api("POST", "/contract-pricing/rate-cards/addRate", { rate_card_id: rc, product_id: cat.products[L.key], starting_at: "2026-01-01T00:00:00.000Z", entitled: true, rate_type: "FLAT", price: L.price });
        cat.rates[L.key] = true; saveState();
      }
      log(`✓ ${L.product.padEnd(38)} metric+product+rate ($${(L.price / 100).toFixed(2)}/unit)`);
    } catch (e) { console.error(`✗ ${L.key}: ${e.message}`); }
  }
  for (const F of FIXED) {
    try {
      if (!cat.fixed[F.key]) { cat.fixed[F.key] = idOf(await api("POST", "/contract-pricing/products/create", { name: F.name, type: "FIXED" })); saveState(); }
      log(`✓ ${F.name.padEnd(38)} FIXED product`);
    } catch (e) { console.error(`✗ ${F.key}: ${e.message}`); }
  }
  log("\nDone. Offering catalog: " + (Object.keys(cat.metrics).length) + " new metrics, " + (Object.keys(cat.products).length + Object.keys(cat.fixed).length) + " new products, " + Object.keys(cat.rates).length + " new rates on the rate card.");
}
main().catch((e) => die(e.message));

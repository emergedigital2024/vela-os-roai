#!/usr/bin/env node
/* Seed a Metronome SANDBOX environment with Vela OS demo data so the Live panel populates.
 *
 *   1) Put a SANDBOX token in ../.dev.vars  →  METRONOME_API_KEY=mt_sandbox_...
 *   2) node scripts/seed-metronome.mjs --yes
 *
 * Idempotent: customers are found-or-created by ingest alias; created resource IDs are cached in
 * scripts/seed-state.json and skipped on re-run; usage events dedupe on transaction_id (Metronome,
 * 34-day window). Money is in USD cents. Read-only against production — this only writes to whatever
 * environment the token in .dev.vars belongs to, so use a sandbox token.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const STATE_PATH = join(HERE, "seed-state.json");
const BASE = "https://api.metronome.com/v1";

// ---- token from .dev.vars (never hard-coded / committed) ----
function readToken() {
  if (process.env.METRONOME_API_KEY) return process.env.METRONOME_API_KEY.trim();
  const p = join(ROOT, ".dev.vars");
  if (!existsSync(p)) die("No token: set METRONOME_API_KEY in .dev.vars or the environment.");
  const raw = readFileSync(p, "utf8");
  const unquote = (s) => s.trim().replace(/^["']|["']$/g, "");
  const kv = raw.split(/\r?\n/).map((l) => l.trim()).find((l) => l.startsWith("METRONOME_API_KEY="));
  if (kv) return unquote(kv.slice("METRONOME_API_KEY=".length));
  // fallback: a single bare token line (no key=value)
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 1 && !lines[0].includes("=")) return unquote(lines[0]);
  die("METRONOME_API_KEY not found in .dev.vars (use METRONOME_API_KEY=<token> or a single bare token line)");
}

function die(msg) { console.error("✗ " + msg); process.exit(1); }
const log = (...a) => console.log(...a);

// ---- state cache ----
const state = existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, "utf8")) : { global: {}, clients: {} };
const saveState = () => writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");

let TOKEN;
async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { authorization: "Bearer " + TOKEN, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (_) { /* some endpoints return empty */ }
  if (!res.ok) {
    const detail = json ? JSON.stringify(json) : res.statusText;
    throw new Error(`${method} ${path} → ${res.status} ${detail}`);
  }
  return json;
}

// ---- demo clients (mirror data.jsx CLIENTS); amounts in USD cents; usage in metric units ----
const SEED = [
  { slug: "northwind", name: "Northwind Retail",   commit: 12_000_00,  usage: [4200, 3100, 5200] },
  { slug: "verdano",   name: "Verdano Foods",      commit: 300_000_00,                usage: [9800, 11200, 8700] },
  { slug: "atelier",   name: "Atelier Noir",       credit: 30_000_00,  usage: [2600, 3300, 2900] },
  { slug: "madinat",   name: "Madinat Estates",    commit: 500_000_00,                usage: [14200, 12800, 15600] },
  { slug: "brightside",name: "Brightside Media",   credit: 20_000_00,  usage: [3400, 2800, 3900] },
  { slug: "aurora",    name: "Aurora Beauty",      credit: 18_000_00,  commit: 6_000_00, usage: [2100, 2500, 1900] },
  { slug: "meridian",  name: "Meridian Travel",    commit: 8_000_00,   usage: [1600, 1400, 1800] },
];

const WIN = { starting_at: "2026-06-01T00:00:00.000Z", ending_before: "2026-12-01T00:00:00.000Z" };
const CONTRACT_START = "2026-06-01T00:00:00.000Z"; // backdated to current month → DRAFT invoice auto-exists
const USAGE_DAYS = ["2026-06-08", "2026-06-11", "2026-06-14"];

async function ensureGlobals() {
  const g = state.global;
  if (!g.metricId) {
    const r = await api("POST", "/billable-metrics/create", {
      name: "Vela demo · API usage",
      event_type_filter: { in_values: ["api_call"] },
      aggregation_type: "SUM",
      aggregation_key: "amount",
      property_filters: [{ name: "amount", exists: true }], // aggregation_key must be a declared property filter
    });
    g.metricId = r.data?.id || r.id; saveState(); log("• billable metric", g.metricId);
  }
  if (!g.productId) {
    const r = await api("POST", "/contract-pricing/products/create", { name: "AI usage credits", type: "USAGE", billable_metric_id: g.metricId });
    g.productId = r.data?.id || r.id; saveState(); log("• product (USAGE)", g.productId);
  }
  if (!g.commitProductId) {
    const r = await api("POST", "/contract-pricing/products/create", { name: "Committed spend", type: "FIXED" });
    g.commitProductId = r.data?.id || r.id; saveState(); log("• product (FIXED, for commits/credits)", g.commitProductId);
  }
  if (!g.rateCardId) {
    const r = await api("POST", "/contract-pricing/rate-cards/create", { name: "Vela demo rate card" });
    g.rateCardId = r.data?.id || r.id; saveState(); log("• rate card", g.rateCardId);
  }
  if (!g.rateAdded) {
    await api("POST", "/contract-pricing/rate-cards/addRate", {
      rate_card_id: g.rateCardId, product_id: g.productId,
      starting_at: "2026-01-01T00:00:00.000Z", entitled: true, rate_type: "FLAT", price: 5,
    });
    g.rateAdded = true; saveState(); log("• rate added ($0.05/unit)");
  }
}

async function findCustomerByAlias(alias) {
  const r = await api("GET", "/customers?ingest_alias=" + encodeURIComponent(alias));
  const list = (r && r.data) || [];
  return list[0] ? (list[0].id || list[0].customer_id || (list[0].customer && list[0].customer.id)) : null;
}

async function seedClient(c) {
  const st = state.clients[c.slug] || (state.clients[c.slug] = {});
  const alias = "vela-" + c.slug;
  // customer (find-or-create)
  if (!st.customerId) st.customerId = await findCustomerByAlias(alias);
  if (!st.customerId) {
    const r = await api("POST", "/customers", { name: c.name, ingest_aliases: [alias] });
    st.customerId = r.data?.id || r.id; saveState();
  }
  const cid = st.customerId;
  // contract
  if (!st.contractId) {
    const r = await api("POST", "/contracts/create", { customer_id: cid, starting_at: CONTRACT_START, rate_card_id: state.global.rateCardId });
    st.contractId = r.data?.id || r.id; saveState();
  }
  // commit (must reference a FIXED product)
  if (c.commit && !st.commitId) {
    const r = await api("POST", "/contracts/customerCommits/create", {
      customer_id: cid, type: "prepaid", priority: 100, product_id: state.global.commitProductId,
      access_schedule: { schedule_items: [{ amount: c.commit, ...WIN }] },
    });
    st.commitId = r.data?.id || r.id; saveState();
  }
  // credit (must reference a FIXED product)
  if (c.credit && !st.creditId) {
    const r = await api("POST", "/contracts/customerCredits/create", {
      customer_id: cid, priority: 100, product_id: state.global.commitProductId,
      access_schedule: { schedule_items: [{ amount: c.credit, ...WIN }] },
    });
    st.creditId = r.data?.id || r.id; saveState();
  }
  // usage (idempotent via transaction_id)
  const events = c.usage.map((amt, i) => ({
    transaction_id: `${alias}-${USAGE_DAYS[i]}-1`, customer_id: alias, event_type: "api_call",
    timestamp: USAGE_DAYS[i] + "T12:00:00Z", properties: { amount: String(amt), region: ["us-east", "eu-west", "ap-south"][i % 3] },
  }));
  await api("POST", "/ingest", events);
  // read back balance
  let bal = "n/a";
  try { const b = await api("POST", "/contracts/customerBalances/list", { customer_id: cid }); bal = (b && b.data ? b.data.length : 0) + " balance(s)"; } catch (_) {}
  log(`✓ ${c.name.padEnd(18)} cust=${cid}  ${st.commitId ? "commit " : ""}${st.creditId ? "credit " : ""}usage×${events.length}  → ${bal}`);
}

async function main() {
  if (!process.argv.includes("--yes")) die("Refusing to run without --yes (this WRITES to the token's Metronome environment — use a SANDBOX token).");
  TOKEN = readToken();
  log("Seeding Metronome at " + BASE + " with token …" + TOKEN.slice(-6));
  // safety: show what already exists before writing
  try { const r = await api("GET", "/customers?limit=100"); log("Account currently has " + ((r && r.data && r.data.length) || 0) + " customer(s).\n"); }
  catch (e) { die("Auth/connectivity check failed: " + e.message); }
  await ensureGlobals();
  log("");
  for (const c of SEED) {
    try { await seedClient(c); } catch (e) { console.error(`✗ ${c.name}: ${e.message}`); }
  }
  log("\nDone. seed-state.json updated. Re-runs are idempotent.");
}

main().catch((e) => die(e.message));

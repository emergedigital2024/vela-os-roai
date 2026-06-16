#!/usr/bin/env node
/* READ-ONLY inspector for the Metronome environment behind the token in ../.dev.vars.
 * Prints a full topology + populated-data report. NEVER prints the token.
 *   node scripts/inspect-metronome.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const BASE = "https://api.metronome.com/v1";

function readToken() {
  if (process.env.METRONOME_API_KEY) return process.env.METRONOME_API_KEY.trim();
  const p = join(ROOT, ".dev.vars");
  if (!existsSync(p)) die("No token: set METRONOME_API_KEY in .dev.vars or the environment.");
  const raw = readFileSync(p, "utf8");
  const unquote = (s) => s.trim().replace(/^["']|["']$/g, "");
  const kv = raw.split(/\r?\n/).map((l) => l.trim()).find((l) => l.startsWith("METRONOME_API_KEY="));
  if (kv) return unquote(kv.slice("METRONOME_API_KEY=".length));
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 1 && !lines[0].includes("=")) return unquote(lines[0]);
  die("METRONOME_API_KEY not found in .dev.vars");
}
function die(m) { console.error("✗ " + m); process.exit(1); }
const money = (cents) => cents == null ? "—" : "$" + (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let TOKEN;
async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { authorization: "Bearer " + TOKEN, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null; try { json = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${json ? JSON.stringify(json) : res.statusText}`);
  return json;
}
const tryList = async (method, path, body) => { try { return await api(method, path, body); } catch (e) { return { __err: e.message }; } };

async function main() {
  TOKEN = readToken();
  console.log("Inspecting " + BASE + "  (token …" + TOKEN.slice(-4) + ")\n");

  // ---- globals ----
  const metrics = await tryList("POST", "/billable-metrics/list", {});
  const products = await tryList("POST", "/contract-pricing/products/list", {});
  const rateCards = await tryList("POST", "/contract-pricing/rate-cards/list", {});
  console.log("GLOBALS");
  console.log("  billable metrics :", metrics.__err ? "(err) " + metrics.__err : (metrics.data || []).map((m) => m.name).join(", ") || "0");
  console.log("  products         :", products.__err ? "(err) " + products.__err : (products.data || []).map((p) => `${p.name}[${p.type || p.current?.type || "?"}]`).join(", ") || "0");
  console.log("  rate cards       :", rateCards.__err ? "(err) " + rateCards.__err : (rateCards.data || []).map((r) => r.name).join(", ") || "0");

  // ---- customers ----
  const custs = await api("GET", "/customers?limit=100");
  const list = custs.data || [];
  console.log(`\nCUSTOMERS (${list.length})\n`);
  let grandInvoiced = 0, grandCommit = 0;
  for (const c of list) {
    const id = c.id;
    const inv = await tryList("GET", `/customers/${id}/invoices`);
    const invoices = inv.__err ? [] : (inv.data || []);
    const byStatus = {};
    let total = 0;
    for (const v of invoices) { byStatus[v.status] = (byStatus[v.status] || 0) + 1; total += v.total || 0; }
    grandInvoiced += total;
    const bal = await tryList("POST", "/contracts/customerBalances/list", { customer_id: id });
    const balances = bal.__err ? [] : (bal.data || []);
    let balTotal = 0;
    for (const b of balances) {
      const incl = b.access_schedule?.schedule_items || [];
      for (const si of incl) balTotal += si.amount || 0;
    }
    grandCommit += balTotal;
    const statusStr = Object.entries(byStatus).map(([s, n]) => `${n} ${s}`).join(", ") || "no invoices";
    console.log(`  ${(c.name || id).padEnd(20)} ${id}`);
    console.log(`      invoices: ${statusStr}; total ${money(total)} | balances: ${balances.length} (${money(balTotal)} granted)`);
    if (inv.__err) console.log("      invoices err:", inv.__err);
    if (bal.__err) console.log("      balances err:", bal.__err);
  }
  console.log(`\nTOTALS: invoiced ${money(grandInvoiced)} across ${list.length} customers; ${money(grandCommit)} commit/credit granted`);
}
main().catch((e) => die(e.message));

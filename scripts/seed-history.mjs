#!/usr/bin/env node
/* Load RETROSPECTIVE billing history into the Metronome sandbox so the console's revenue
 * dashboard (which counts FINALIZED invoices and is time-gated ~1 month after the first one)
 * populates now. Per client we add a SECOND, non-overlapping "prior term" contract
 * (2026-01-01 → 2026-06-01) carrying a monthly scheduled charge. Those months are closed, so
 * Metronome auto-finalizes them within ~1–2 min → 5 months of finalized revenue history.
 *
 * Historical USAGE cannot be backfilled (Metronome rejects ingest events older than ~34 days),
 * so this is scheduled-charge (subscription/installment) revenue only — no retro usage drawdown.
 *
 *   node scripts/seed-history.mjs --yes
 * Idempotent: each client's prior-term contract id is cached in seed-state (historyContractId).
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
  const p = join(ROOT, ".dev.vars");
  const raw = readFileSync(p, "utf8");
  const unq = (s) => s.trim().replace(/^["']|["']$/g, "");
  const kv = raw.split(/\r?\n/).map((l) => l.trim()).find((l) => l.startsWith("METRONOME_API_KEY="));
  if (kv) return unq(kv.slice("METRONOME_API_KEY=".length));
  const ls = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (ls.length === 1 && !ls[0].includes("=")) return unq(ls[0]);
  die("METRONOME_API_KEY not found in .dev.vars");
}
const die = (m) => { console.error("✗ " + m); process.exit(1); };
const log = (...a) => console.log(...a);

const state = existsSync(STATE_PATH) ? JSON.parse(readFileSync(STATE_PATH, "utf8")) : die("no seed-state.json — run seed-metronome.mjs first");
const saveState = () => writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");

let TOKEN;
async function api(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: { authorization: "Bearer " + TOKEN, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${json ? JSON.stringify(json) : res.statusText}`);
  return json;
}

// monthly scheduled charge (USD cents) — mirrors seed-metronome.mjs `fee`/`feeLabel`
const HIST = {
  northwind:  { fee: 1_000_00,  label: "Committed spend — monthly installment (prior term)" },
  verdano:    { fee: 25_000_00, label: "Committed spend — monthly installment (prior term)" },
  atelier:    { fee: 2_500_00,  label: "Platform subscription (prior term)" },
  madinat:    { fee: 41_667_00, label: "Committed spend — monthly installment (prior term)" },
  brightside: { fee: 2_000_00,  label: "Platform subscription (prior term)" },
  aurora:     { fee: 2_200_00,  label: "Platform subscription (prior term)" },
  meridian:   { fee: 667_00,    label: "Committed spend — monthly installment (prior term)" },
};
const WIN = { starting_at: "2026-01-01T00:00:00.000Z", ending_before: "2026-06-01T00:00:00.000Z" }; // Jan–May, abuts the live contract

async function main() {
  if (!process.argv.includes("--yes")) die("Refusing without --yes (this WRITES backdated contracts to the token's Metronome environment — use the SANDBOX token).");
  TOKEN = readToken();
  log("Loading retrospective history at " + BASE + " (token …" + TOKEN.slice(-4) + ")\n");
  for (const [slug, h] of Object.entries(HIST)) {
    const st = state.clients[slug];
    if (!st || !st.customerId) { log(`• ${slug}: no seeded customer, skipping`); continue; }
    if (st.historyContractId) { log(`• ${slug}: prior-term contract already present, skipping`); continue; }
    try {
      const r = await api("POST", "/contracts/create", {
        customer_id: st.customerId, ...WIN,
        scheduled_charges: [{
          product_id: state.global.feeProductId, name: h.label,
          schedule: { recurring_schedule: { frequency: "MONTHLY", amount_distribution: "EACH", ...WIN, quantity: 1, unit_price: h.fee } },
        }],
      });
      st.historyContractId = r.data?.id || r.id; saveState();
      log(`✓ ${slug.padEnd(11)} prior-term contract ${st.historyContractId}  (5 × $${(h.fee / 100).toLocaleString()} Jan–May → finalizes in ~1–2 min)`);
    } catch (e) { console.error(`✗ ${slug}: ${e.message}`); }
  }
  log("\nDone. Finalization is async (Metronome's engine) — re-check invoices in a minute.");
}
main().catch((e) => die(e.message));

#!/usr/bin/env node
/* Tidy the Metronome sandbox "Packages" tab: archive the two throwaway "Starter" packages created
 * during schema discovery (targeted by exact id), then create a clean tiered package set.
 * User-authorized cleanup of self-created discovery artifacts. Reads token from .dev.vars. Requires --yes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
const ROOT = process.cwd();
const BASE = "https://api.metronome.com/v1";

function readToken() {
  if (process.env.METRONOME_API_KEY) return process.env.METRONOME_API_KEY.trim();
  const raw = readFileSync(join(ROOT, ".dev.vars"), "utf8");
  const unq = (s) => s.trim().replace(/^["']|["']$/g, "");
  const kv = raw.split(/\r?\n/).map((l) => l.trim()).find((l) => l.startsWith("METRONOME_API_KEY="));
  if (kv) return unq(kv.slice("METRONOME_API_KEY=".length));
  return unq(raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0]);
}
const die = (m) => { console.error("✗ " + m); process.exit(1); };
let TOKEN;
async function api(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: { authorization: "Bearer " + TOKEN, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch (_) {}
  return { status: res.status, ok: res.ok, json };
}

// exact ids of the two junk "Starter" packages created during discovery (safe, targeted cleanup)
const JUNK_IDS = ["1d7d7c76-72e9-4b03-b9d7-50d1df7a176c", "fe7bfe41-6247-4857-b0e9-734293c47036"];
const TIERS = [
  { name: "Starter",    description: "Entry tier — single-agent pilots and AEO visibility (ON.Optima)." },
  { name: "Growth",     description: "Multi-agent CX with usage-based scaling across the funnel." },
  { name: "Scale",      description: "Full ON.Ecosystem with committed volume and priority support." },
  { name: "Enterprise", description: "Custom commercial terms, governance, and dedicated success." },
];

async function main() {
  if (!process.argv.includes("--yes")) die("Refusing without --yes.");
  TOKEN = readToken();
  console.log("Tidying packages at " + BASE + " (token …" + TOKEN.slice(-4) + ")\n");

  // 1) archive the two junk packages by exact id
  for (const id of JUNK_IDS) {
    const r = await api("POST", "/packages/archive", { package_id: id });
    console.log(`archive junk ${id} → ${r.status} ${r.ok ? "ok" : JSON.stringify(r.json).slice(0, 160)}`);
  }

  // 2) create the tier set (idempotent: skip names that already exist among active packages)
  const list = await api("POST", "/packages/list", {});
  const existing = new Set((list.json?.data || []).map((p) => p.name));
  for (const t of TIERS) {
    if (existing.has(t.name)) { console.log(`• ${t.name}: already exists, skipping`); continue; }
    let r = await api("POST", "/packages/create", { name: t.name, description: t.description });
    if (!r.ok) r = await api("POST", "/packages/create", { name: t.name }); // fall back if description not accepted
    console.log(`create tier ${t.name.padEnd(11)} → ${r.status} ${r.ok ? "id=" + (r.json.data?.id || r.json.id) : JSON.stringify(r.json).slice(0, 160)}`);
  }

  // 3) final list
  const after = await api("POST", "/packages/list", {});
  console.log("\nPackages now: " + (after.json?.data || []).map((p) => p.name).join(", "));
}
main().catch((e) => die(e.message));

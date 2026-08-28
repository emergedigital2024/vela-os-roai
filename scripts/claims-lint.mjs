#!/usr/bin/env node
/**
 * claims-lint.mjs — claims-hygiene gate for vela.emergedigital.com.
 *
 * Fails if the repo ships language the claims register killed:
 *   1. FPT identity claims ("Powered by FPT", "part of FPT CX Services", …) — the MoU
 *      is Nuummite × FPT; Emerge may not claim membership pending a written credential
 *      grant (settled position 2026-07-27).
 *   2. FPT ON.* product names — those marks are FPT's.
 *   3. Bare "FPT" outside the attributed public forms (FPT Corporation, FPT Software,
 *      FPT-delivered, FPT's public …, FPT × Salesforce, FPT PARTNERS).
 *   4. "Platform X" — partner-confidential, nothing public ever.
 *   5. Ecosystem figures that drifted from public/canonical-facts.json. Every
 *      `ecosystem_figures` entry marked published must appear in its published_in
 *      files; every entry marked published:false must appear in NO scanned file.
 *      Scoped to files rather than routes because this app ships .jsx directly —
 *      see the note at the check itself for why "renders nowhere" was never the
 *      same thing as "ships nowhere".
 *
 * WHY THIS EXISTS SEPARATELY FROM emerge-digital-website's compliance-lint:
 * that one scopes to ITS OWN dist/. It has never been able to see this repo. The
 * 2026-07-27 de-brand swept the hub and the one-pager but missed public/guide.html,
 * and the miss sat live for three weeks because nothing here was checking.
 *
 * WHY IT LINTS video/ TOO — this is the important part:
 * a hyperframes composition becomes burned-in PIXELS and a synthesized VOICEOVER.
 * No HTML linter, no page audit and no amount of reading the deployed site can see
 * inside an MP4. The scene deck and voiceover script are the ONLY text-shaped
 * artifacts in that chain, so they are the only place a claim can be caught before it
 * is rendered into something unreadable. The Vela OS explainer shipped
 * "Powered by FPT CX Services" in both pixels and audio for three weeks precisely
 * because nothing linted these two files.
 *
 * Accepting an intentional hit means adding it to ALLOW below in the same PR — the
 * allowlist is code review, not a side channel.
 *
 * SEVERITY:
 *   FATAL   killed phrases, ON.* marks — zero tolerance, no legitimate use exists.
 *   WARNING bare "FPT" outside an attributed form — reported, does not fail the build.
 *           In .jsx/.json this rule fires overwhelmingly on code (`FPT.revenue`,
 *           `window.AGENCY.FPT`) and on comments that exist to *describe* the
 *           attribution rule. Gating on it would mean either a permanent allowlist
 *           or a build nobody can green, and both teach people to ignore the gate.
 *           It stays visible so a human can scan it; it does not block.
 *
 * Usage: node scripts/claims-lint.mjs [--json]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

// Text-shaped things that either ship to the browser or become video.
const SCAN = [
  { dir: "public", exts: new Set([".html", ".txt", ".xml", ".json", ".jsx", ".js", ".md"]) },
  // Dashboard source lives under app/ (public/index.html + public/assets/ are build output).
  { dir: "app", exts: new Set([".html", ".js", ".jsx"]) },
  { dir: "video", exts: new Set([".html", ".md"]) },
  // scripts/ generates the downloadable collateral. The PDF and PPTX are binaries this
  // lint cannot read, so the generator is the only text-shaped place their copy exists —
  // exactly the same reason video/ is scanned. It is not hypothetical: the 2026-07-27
  // de-brand updated build-explainers.py for the one-pager (#52) but hand-edited the deck
  // BINARY for the deck (#53, "0 insertions, 0 deletions"), so source and artifact drifted
  // and 10 killed ON.* marks survived in BOTH downloads for three weeks.
  // The .txt transcripts build-explainers.py now emits are picked up by the public/ rule
  // above, so the shipped copy is linted too, not just its source.
  { dir: "scripts", exts: new Set([".py", ".mjs", ".js"]) },
];

// Never scan build output, deps, or render scratch.
const SKIP_DIRS = new Set(["node_modules", "renders", "qa", "bin", "assets", ".git", "_capture", "models"]);

const KILLED_PHRASES = [
  "powered by fpt",
  "backed by fpt",
  "part of fpt",
  "fpt cx services",
  "fpt cx suite",
  "joint venture with fpt",
  "strategic joint venture",
  "platform x",
];

const ON_MARKS = /\bON\.(?:Optima|X|Match|Browser|Ecosystem|E)\b/g;

/**
 * Bare "FPT" is permitted only where the sentence attributes the thing TO FPT.
 * Wider than emerge-digital-website's list because canonical-facts.json blesses
 * "a 'real FPT outcomes behind the demo' heading" as the attribution pattern for
 * FPT-delivered case results, and a possessive ("FPT's actual engagements") is
 * attributive by construction. Too narrow a rule here produces so many false
 * positives on correct copy that the real hits stop being visible.
 */
const FPT_ATTRIBUTED =
  /FPT(?: Corporation| Software|-delivered|['’]s | × Salesforce| PARTNERS| outcomes| engagements| has delivered| Enablement)/;
const FPT_BARE = /\bFPT\b/g;

/**
 * Intentional, reviewed exceptions. Each needs a reason. Keep this list short —
 * a long allowlist means the gate has stopped gating.
 * { file: <repo-relative path>, rule: 'killed'|'on-marks'|'bare-fpt', why: '…' }
 */
const ALLOW = [
  {
    file: "scripts/claims-lint.mjs",
    rule: "*",
    why: "this file necessarily contains the patterns it searches for",
  },
];

const allowed = (file, rule) =>
  ALLOW.some((a) => a.file === file && (a.rule === "*" || a.rule === rule));

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const findings = []; // fatal
const warnings = []; // advisory — see SEVERITY note below

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

for (const { dir, exts } of SCAN) {
  for (const full of walk(join(ROOT, dir))) {
    if (!exts.has(extname(full))) continue;
    const rel = relative(ROOT, full);
    const text = readFileSync(full, "utf8");
    const lower = text.toLowerCase();

    if (!allowed(rel, "killed")) {
      for (const phrase of KILLED_PHRASES) {
        let i = lower.indexOf(phrase);
        while (i !== -1) {
          findings.push({ file: rel, line: lineOf(text, i), rule: "killed", match: text.slice(i, i + phrase.length) });
          i = lower.indexOf(phrase, i + phrase.length);
        }
      }
    }

    if (!allowed(rel, "on-marks")) {
      for (const m of text.matchAll(ON_MARKS)) {
        findings.push({ file: rel, line: lineOf(text, m.index), rule: "on-marks", match: m[0] });
      }
    }

    if (!allowed(rel, "bare-fpt")) {
      for (const m of text.matchAll(FPT_BARE)) {
        // allow if this occurrence sits inside an attributed form
        const win = text.slice(m.index, m.index + 24);
        if (FPT_ATTRIBUTED.test(win)) continue;
        warnings.push({ file: rel, line: lineOf(text, m.index), rule: "bare-fpt", match: text.slice(m.index, m.index + 40).split("\n")[0] });
      }
    }
  }
}

// --- 5. canonical figure registry vs what actually ships --------------------
// public/canonical-facts.json calls itself the single source of truth, but until
// emerge-future #57 / this change nothing read it. Its twin now enforces the same
// contract (compliance-lint rule 7) against built routes; here the unit is FILES,
// because this app ships .jsx to the browser instead of building HTML.
//
// The asymmetry that motivated this: FPT.agentforceArrNote rendered nowhere on
// screen, so it looked deleted-by-neglect — but /data.jsx is served (HTTP 200,
// ~39KB), so its unsourced figures reached every visitor in view-source. "Not
// rendered" is not "not published". Hence: a withheld figure must be absent from
// every scanned file, not merely absent from the UI.
const FACTS_REL = "public/canonical-facts.json";
let facts = null;
try {
  facts = JSON.parse(readFileSync(join(ROOT, FACTS_REL), "utf8"));
} catch (e) {
  findings.push({ file: FACTS_REL, line: 0, rule: "registry", match: `unreadable (${e.message})` });
}

// Every text-shaped file the SCAN rules already cover — the registry file itself
// is exempt from the absence check, since recording a withheld figure is its job.
function scannedFiles() {
  const out = [];
  for (const { dir, exts } of SCAN) {
    for (const full of walk(join(ROOT, dir))) {
      if (exts.has(extname(full))) out.push(relative(ROOT, full));
    }
  }
  return out;
}

if (facts?.ecosystem_figures?.figures) {
  const all = scannedFiles();
  for (const fig of facts.ecosystem_figures.figures) {
    if (fig.published) {
      const where = fig.published_in ?? [];
      if (!where.length) {
        findings.push({ file: FACTS_REL, line: 0, rule: "registry", match: `${fig.id}: published:true with empty published_in — unenforceable` });
      }
      for (const rel of where) {
        let text;
        try {
          text = readFileSync(join(ROOT, rel), "utf8");
        } catch {
          findings.push({ file: FACTS_REL, line: 0, rule: "registry", match: `${fig.id}: published_in file ${rel} does not exist` });
          continue;
        }
        // overview.jsx renders {FPT.revenue}, so accept either the literal value or
        // the data.jsx binding that supplies it — the point is that the file is the
        // one actually responsible for showing the figure.
        const binding = fig.id.startsWith("fpt_") ? `FPT.${fig.id.slice(4)}` : null;
        if (!text.includes(fig.value) && !(binding && text.includes(binding))) {
          findings.push({ file: rel, line: 0, rule: "registry", match: `${fig.id} = "${fig.value}" is registered as published here but neither the value nor its binding appears — update canonical-facts.json in the same PR, or set published:false` });
        }
      }
    } else {
      for (const rel of all) {
        if (rel === FACTS_REL) continue;
        const text = readFileSync(join(ROOT, rel), "utf8");
        let i = text.indexOf(fig.value);
        while (i !== -1) {
          findings.push({ file: rel, line: lineOf(text, i), rule: "registry", match: `"${fig.value}" (${fig.id}) is marked published:false in canonical-facts.json — this file ships, so any occurrence is published` });
          i = text.indexOf(fig.value, i + fig.value.length);
        }
      }
    }
  }
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ ok: findings.length === 0, findings, warnings }, null, 2));
  process.exit(findings.length ? 1 : 0);
}

const showWarnings = () => {
  if (!warnings.length) return;
  console.error(`\nclaims-lint: ${warnings.length} advisory bare-"FPT" warning(s) — review, not a gate:`);
  for (const w of warnings.slice(0, 40)) console.error(`  ${w.file}:${w.line}  ${w.match}`);
  if (warnings.length > 40) console.error(`  … and ${warnings.length - 40} more`);
};

if (findings.length === 0) {
  console.log("claims-lint: clean — 0 fatal findings across public/ and video/");
  showWarnings();
  process.exit(0);
}

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

console.error(`claims-lint: ${findings.length} finding(s) in ${byFile.size} file(s)\n`);
for (const [file, list] of [...byFile].sort()) {
  console.error(`  ${file}`);
  for (const f of list) console.error(`    ${String(f.line).padStart(5)}  [${f.rule}]  ${f.match}`);
  console.error("");
}
console.error("These claims are killed pending a written credential grant (emerge-fpt-strategy).");
console.error("Fix them, or add a reviewed entry to ALLOW in scripts/claims-lint.mjs in the same PR.");
showWarnings();
process.exit(1);

# S1 · Canonical proof/brand facts — DECISION PROPOSAL (issue #5)

> **Status: PROPOSED — pending Rami sign-off.** Nothing here is wired into the app, and no
> live proof number in `public/data.jsx` or `public/guide.html` has been changed. This is the
> draft single source of truth for review. Once approved, the resolved values get committed to
> **both** repos (Vela `public/`, `future` `data/`) and **A3 + B3** unblock.

Proposed canonical file: [`canonical-facts.proposed.json`](./canonical-facts.proposed.json)

## TL;DR — what needs a decision

`future` and Vela publish numbers at **different scopes**, not (mostly) different facts. The
big one: Vela's headline credential total counts *all* CX-practice partners; `future`'s counts
*Salesforce only* — and Vela's own Salesforce line (330+/770+) is essentially the same
population `future` headlines (340+/760+). So the fix is usually "label the scope," not "pick a
winner." Six fields below need your call.

## Side-by-side

| Field | Vela (current, in repo) | `future` (per issue #5) | Recommended canonical |
|---|---|---|---|
| **Credentials headline** | 1,000+ engineers · 1,500+ certs (all partners) | 340+ certified experts · 760+ certs (Salesforce) | Publish **both, scoped**: headline `1,000+ engineers · 1,500+ certs`, Salesforce sub-stat `340+ experts · 760+ certs` |
| **FPT parent facts** | *absent* | $2.47B revenue · 80k employees · $1.4B Agentforce ARR (330% YoY) | Include $2.47B + 80k. **Verify/relabel the $1.4B ARR** (looks like Salesforce global, not FPT) |
| **ROAI definition** | two forms in `data.jsx` (multiple + %), a third phrasing in README | — | One headline: **`ROAI = Value delivered ÷ AI cost`** (multiple), keep % as a derived view |
| **Pricing tiers** | Metronome: Starter/Growth/Scale/Enterprise; client plans: Growth/Scale/Enterprise | Discovery / Pilot / Enterprise | **Discovery / Pilot / Enterprise** (then remap Metronome seed + plan labels — A3/B3 follow-up) |
| **Case studies** | 4 cases (AEO +200% CTR; 120+ markets; KSA MVP 2mo; ASEAN CoE weeks→min) | "different case framing" | Adopt the **Vela set of 4**; reconcile any future-side variants |
| **Methodology / lifecycle** | 6 CX pillars + ON.Ecosystem stages (Attract→Discover→Engage→Convert→Optimize) | — | Adopt **Vela pillars + stages** as canonical |

## Conflicts that are actually fact discrepancies (need a real choice)

1. **Credential scope.** 1,000+/1,500+ (all partners) vs 340+/760+ (Salesforce). Not
   contradictory once scoped — but the public headline must pick one and label it, or the two
   numbers read as a contradiction across the two sites.
2. **$1.4B Agentforce ARR @ 330% YoY.** This matches Salesforce's *global* Agentforce
   reporting, not an FPT-owned metric. Quoting it as an FPT proof point is the highest-risk
   claim here. Confirm attribution + source, label it precisely, or drop it.
3. **Tier vocabulary.** Three different ladders exist today. Whichever wins, the Metronome
   package seed (`scripts/seed-packages.mjs`) and client `plan` labels in `data.jsx` must be
   remapped to match — that remap is part of A3/B3, not this decision.

## What I need from you (Rami)

Resolve the six `decision_needed` blocks in the JSON (the recommendations above are pre-filled).
Reply with edits or an OK, and I'll collapse the options to final values and prepare the
canonical commit for both repos.

## Verification notes

- The local `emerge-future` checkout on this machine is a *different* (Emerge AI automation)
  site and does **not** contain these FPT figures, so the `future` numbers were taken from the
  issue text as the authoritative reference. Worth confirming which `future` deliverable owns
  the canonical FPT figures.
- Every Vela figure above is cited to its line in `public/data.jsx` / `guide.html` inside the
  JSON `source` fields.

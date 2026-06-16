# S1 · Canonical proof/brand facts — DECISION RECORD (issue #5)

> **Status: RESOLVED — signed off by Rami, 2026-06-16.** The canonical single source of truth now
> lives at [`public/canonical-facts.json`](../public/canonical-facts.json). This file records how
> each contested field was decided. **A3 + B3 are unblocked.**

## Decisions

| Field | Decision | Rationale |
|---|---|---|
| **Credentials** | Publish **both, scoped**: headline `1,000+ engineers · 1,500+ certs` (all partners) + `340+ experts · 760+ certs` Salesforce sub-stat | The two numbers were never contradictory — different scope. Showing both, labeled, ends the confusion. |
| **ROAI definition** | Headline = the **multiple** (`Value delivered ÷ AI cost`); `%` kept as a derived secondary view | One canonical headline string everywhere; % still available where useful. |
| **FPT parent facts** | Include `$2.47B` FPT revenue + `80,000+` employees | Adopted from `future`; absent in Vela before. |
| **$1.4B Agentforce ARR (330% YoY)** | Include, **relabeled as Salesforce global** Agentforce ARR (ecosystem context, not an FPT result) | Number is real but Salesforce-wide; must never read as an FPT-owned metric. |
| **Pricing tiers** | **Starter / Growth / Scale / Enterprise** | Matches Vela's existing Metronome packages + client plans — no remap of live billing data needed. |
| **Case studies** | Adopt the **Vela set of 4** (AEO +200% CTR · 120+ markets · KSA MVP 2mo · ASEAN CoE weeks→min) | Already deck-sourced and in the app. |
| **Methodology / lifecycle** | Adopt Vela's **6 CX pillars + ON.Ecosystem stages** (Attract→Discover→Engage→Convert→Optimize) | Existing canonical vocabulary in `data.jsx`. |

## Mirror to the `future` repo

The issue calls for this JSON in **both** repos (Vela `public/`, `future` `data/`). It is committed
here to Vela `public/canonical-facts.json`. The `future`-side copy is **not** included in this PR
because the local `emerge-future` checkout is a different (Emerge AI automation) site that does not
hold the FPT figures — the correct `future` deliverable/repo needs to be confirmed before mirroring.
**Follow-up:** copy `public/canonical-facts.json` to `future` `data/canonical-facts.json` once the
right repo is identified.

## Provenance

Every Vela figure is sourced from `public/data.jsx` / `public/guide.html`; the `future` figures
(FPT parent, Salesforce credentials, ARR) came from issue #5.

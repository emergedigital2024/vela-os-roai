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
| **$1.4B Agentforce ARR (330% YoY)** | Include, **relabeled as Salesforce global** Agentforce ARR (ecosystem context, not an FPT result) | Number is real but Salesforce-wide; must never read as an FPT-owned metric. **⚠️ See Amendment 1 — partially superseded 2026-08-28.** |
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

## Amendment 1 — 2026-08-28 (UNRATIFIED, pending Rami)

The Agentforce ARR row above is **partially deviated from**, and this section exists so the
record does not silently disagree with what the two surfaces actually publish.

| Surface | `$1.4B` | `330% YoY` |
|---|---|---|
| `future` homepage | published, labelled Salesforce-global | **withheld** (emerge-future #56) |
| Vela app | not published (never rendered) | **withheld** |

**What changed and why.** The decision's own rationale — *"must never read as an FPT-owned
metric"* — was being undercut by the layout: on `future` the ARR sat as the third tile of a
three-tile grid headed *"FPT Corporation public figures"*, so the tile had to carry a caption
disclaiming the heading above it. #56 moved it out of the grid into its own attributed line,
which serves this decision better than the original layout did. Withholding the `330%`
multiplier goes further than the decision says, and is the part needing ratification.

**Provenance, traced 2026-08-28 — it is circular.** This record sources the figure to issue #5;
issue #5 sources it to the `future` site; `future` carried it in raw HTML with no citation.
*"Number is real"* rests on no external source at any point in the chain. That is not evidence
the figure is wrong — it is the absence of evidence that it is right, and a growth multiplier is
the shape most likely to be wrong (cf. the `+54%` / `+41%` pair hub PR #95 retracted as invented,
which reached this repo's sibling and stayed live four weeks).

**To ratify the withholding:** nothing to do; the registry and both lints already enforce it.
**To reverse it:** cite a Salesforce release in `ecosystem_figures.salesforce_agentforce_arr_yoy.source_url`,
flip `published`, and restore the figure to both surfaces in one change.

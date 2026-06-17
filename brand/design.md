# Emerge Digital — Design Spec (`design.md`)

The canonical brand spec for the 3-site ecosystem (**vision** · **future** · **roai/Vela OS**) and for Hyperframes video. Machine-readable values live in [`design-tokens.json`](./design-tokens.json); video translation in [`frame.md`](./frame.md); product/proof facts in [`../public/canonical-facts.json`](../public/canonical-facts.json). Tokens are extracted verbatim from `emerge-digital-website` (the most complete system) — when a site drifts, it conforms to this file, not the reverse.

## Why this exists
The three sites run different stacks (Astro/Tailwind, static HTML, no-build React) and each re-declared tokens independently, so they drifted. This file is the shared source of truth so the funnel reads as one brand. It cannot be a shared code import (incompatible stacks) — it's a shared **spec** that humans/agents apply per stack.

## Color
- **Dark surfaces:** navy `#0A1F3D` (primary), ink `#06122A` / `#03081A` (deepest, hero base). Canonical over `future`'s `#020202` and roai's `#08080b` — drift toward pure black is off-brand.
- **Accent:** **teal `#00C2C7`** (primary + CTA) → hover teal-600 `#00A8AD`; secondary cyan `#3DDCE3`; glow `#00F5FF`.
  - **DECIDED (Rami, 2026-06-17): teal is the accent on _every_ surface, including the roai product UI.** roai's legacy indigo `#4f46e5` is being migrated to teal — there is no indigo product-UI exception.
- **Light surfaces:** platinum `#E8EEF5` / offwhite `#F7F9FC`; body text on light = slate `#1F2A3C`; muted = cool `#7E8CA3`.
- **Semantic:** success `#3FCF8E`, warning `#FFB547`, danger `#E5484D`.
- **CTA rule:** primary buttons use the teal/accent fill with **navy ink text** — never low-contrast white-on-teal for the CTA label.

## Type
- **Lexend** — body, UI, headings (`font-sans` / `font-display`).
- **Lexend Zetta** — oversized display + the wordmark only (`font-wide`). Must be *loaded* where used (the Google-Fonts sites must include it; `future` previously declared it without loading — fix).
- **Prompt** — eyebrows, labels, small-caps (`font-label`).
- **Mono** — canonical **JetBrains Mono** for stats/code. *Open decision:* roai currently ships Geist Mono; unify later (not part of the accent-recolor pass).
- **No stray families.** `future`'s mega-menu uses Space Grotesk — remove it; headings use Prompt/Lexend.
- Type scale, weights, and tracking: see `design-tokens.json → typography.scale` (display-2xl…eyebrow). Eyebrows are uppercase, `0.18em` tracking.

## Surface, depth, motion
- **Radii:** cards `1.25rem` (`card`) / `1.75rem` (`card-lg`); pills `9999px`.
- **Elevation:** prefer the teal-tinted glow/elevated shadows (`design-tokens.json → shadow`) over flat drop shadows; hairline borders `rgba(255,255,255,0.06)` on dark.
- **Motion language:** five brand easings — `out-expo`, `out-quint`, `out-back`, `in-out-quart`, `spring`. Default entrance = `fade-up 0.9s out-expo`; default pop = `scale-in 0.6s out-expo`; scroll reveals cascade at 80/160/240/320/400ms. Signature effects: shimmer sheen, beam-sweep, glow-pulse, line-draw/`data-flow`, counter-in. This is the motion vocabulary `frame.md` maps onto video.

## Layout
8px base grid. Section padding `py-section` 8rem / `py-section-sm` 4rem. Content max-width `max-w-section` 80rem.

## Per-site application notes
- **vision** (Astro/Tailwind) — the reference. Tokens in `tailwind.config.mjs` + `src/styles/global.css`; keep both in sync.
- **future** (static HTML/Tailwind) — CSS vars in `index.html`; load Lexend Zetta or drop `.font-zetta`; remove Space Grotesk from `css/shared-nav.css`.
- **roai/Vela OS** (no-build React) — CSS vars in `public/index.html` `:root` + inline `tailwind.config`. Migrate the indigo accent vars → teal (see `frame.md` is video-only; the recolor mapping is in the rollout plan). Keep Vela OS's layout/identity — accent recolor only.

## Brand mark
Recoloured Emerge Digital icon — teal→navy gradient tile (`#00C2C7`→`#0A1F3D`) with the white "ED" form. Wordmark: "Emerge **Digital**" (Digital in teal). Legal entity: **Emerge Digital IT Solutions LLC**.

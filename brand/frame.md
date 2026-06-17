# Emerge Digital — Frame Spec (`frame.md`)

The video translation of [`design.md`](./design.md): the same brand tokens, re-expressed for the **16:9 motion frame** (canvas, pacing, scale, motion). This is what a Hyperframes composition (`video/*/index.html` `:root` + GSAP timeline) consumes. Read alongside `design-tokens.json`.

## Canvas
- **1920×1080, 30fps**, 16:9. Safe area: keep text within the central ~85% (≈144px side / 81px top-bottom padding). Render colorspace sRGB on the navy base.
- `:root` for a composition is filled directly from `design-tokens.json`:
  ```css
  :root{
    --bg:#06122A; --bg-deep:#03081A; --surface:#0A1F3D;
    --ink:#F7F9FC; --muted:#9FAFC2;
    --accent:#00C2C7; --accent-2:#3DDCE3; --accent-glow:#00F5FF;
    --font-display:"Lexend"; --font-wide:"Lexend Zetta"; --font-label:"Prompt"; --font-mono:"JetBrains Mono";
  }
  ```
- Background = the brand hero gradient (navy→ink with a top-right teal radial). Never a flat pure-black frame.

## Type in-frame (px at 1080p)
Web `clamp()` scales collapse to fixed sizes for the frame:
- Hero/title (`font-wide` or `font-display`): **96–140px**, weight 700, tracking −0.03em.
- Scene headline (`font-display`): **56–72px**, 700.
- Body/supporting: **28–34px**, 400, line-height 1.4.
- Eyebrow/label (`font-label`, uppercase, 0.18em): **20–24px**.
- Data/stat (`font-mono`): **40–64px** for hero numbers.
Minimum on-screen text ≈ 24px — nothing smaller survives compression/social.

## Pacing & dwell
- **Per scene 4–7s.** A headline + one supporting line needs ≥4s of dwell *after* its entrance settles; a stat reveal ≥3s held.
- Entrances start **0.1–0.3s into** the scene (never at 0 — let the cut breathe).
- No exit tweens except the final scene; scenes tile end-to-end (`data-start`/`data-duration`, no gaps).
- Target total for the Vela OS explainer: **~45s** (open + 7 walkthrough beats + close).

## Motion mapping (design easings → GSAP)
- Default entrance: `fade-up` → `gsap.from({opacity:0, y:48, duration:0.7, ease:"expo.out"})` (= brand `out-expo`).
- Emphasis pop: `scale-in` → `{scale:0.94→1, opacity:0→1, ease:"expo.out", duration:0.6}`.
- Playful accent (badges, chips): brand `out-back` → `ease:"back.out(1.6)"`.
- Stat counters: `counter-in` + number tween, `ease:"power2.out"`, ~1.2s.
- Lines/connectors (data-viz scenes): `data-flow` → `strokeDashoffset` draw, `ease:"none"`, 1–1.5s.
- Brand sheen on the logo/CTA: `shimmer` / `beam-sweep` once per appearance (no infinite loops in a finite render).
- Scene transitions: hard cuts by default; reserve 2–3 shader/cross transitions for major beats (open→content, portal switch, close).
- **No** `repeat:-1`, `Math.random()`, or `Date.now()` (non-deterministic renders break frame capture).

## Scale & composition
- One idea per scene. Large type + generous negative space (mirror the sites' `py-section` rhythm).
- Accent usage sparing: teal for the one thing that matters per scene (a number, a CTA, a highlight) on the navy field — not everywhere.
- Logo: bottom-left or center on open/close; small persistent wordmark optional in a corner.

## Proof discipline (frame is outward-facing)
The video is public. Show the **product UI + canonical proof only** (ROAI framework, real catalog, +200% CTR / KSA PIF / ASEAN CoE / FPT scale per `canonical-facts.json`). **Do NOT** animate the demo dashboard's sample-client metrics (3.82× portfolio, the 7 named accounts) as real results, and never put confidential financials in a frame.

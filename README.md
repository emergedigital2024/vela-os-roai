# Vela OS · FPT CX Services — ROAI Analytics

A high-fidelity, dual-mode (Agency ↔ Client) B2B dashboard demo for an AI-native CX
practice, themed around **FPT's Digital Commerce & Experience (DCX) offering** and the
**ON.Ecosystem** agentic suite. Built as a single-page prototype and deployed to
Cloudflare Workers static assets.

> Portfolio/per-client figures are modelled for the demo; case-study results and partner
> credentials are real FPT proof points drawn from the CX decks.

## What's inside

- **Agency view** — portfolio ROAI hero, KPI cards, trend chart, sortable client
  leaderboard, top/at-risk rails, "Proof in the field" case studies, and a Partners &
  credentials band.
- **Client deep dive** — ROAI formula, **Proven results** panel (real outcome per
  account), metric cards, cost-vs-value chart, **Value by CX service pillar**, billing &
  contract (hybrid seat-based ↔ enterprise commit, Metronome alerts), and recommendations.
- **Client portal** (morphing sidebar) — ROAI Center, Active Projects, AI Marketplace
  (full 6-pillar CX catalog + ON.Ecosystem accelerators + Sales-Enablement packages),
  Usage & Billing, Insights & Reports.

## Tech

Vanilla React 18 + Babel (in-browser) + Tailwind via CDN — no build step. Hand-built SVG
charts. Theme via CSS variables (dark default, light supported). Files are plain
`window.*`-global modules loaded in order from `public/index.html`.

```
public/
  index.html      # shell: fonts, Tailwind config, theme tokens, script order
  data.jsx        # data layer: clients, 6 CX pillars, services catalog, proof datasets
  icons.jsx       # inline stroke icon set
  ui.jsx          # primitives + SVG charts (Card, Badge, LineArea, Donut, …)
  billing.jsx     # hybrid / enterprise-commit panels + Metronome alerts
  clientviews.jsx # client sections: Projects, Marketplace, Insights
  overview.jsx    # agency overview + proof/partners
  deepdive.jsx    # client deep dive
  portal.jsx      # client portal shell/router
  app.jsx         # app shell, sidebar, topbar, routing
```

## Develop & deploy

```bash
# local preview (static assets via Wrangler)
npx wrangler dev --port 8788

# deploy to Cloudflare (Emerge Digital account)
npx wrangler deploy
```

Live: https://vela-os-roai.emerge-digital.workers.dev

# Vela OS · FPT CX Services — ROAI Analytics

A high-fidelity, **dual-mode (Agency ↔ Client)** B2B dashboard demo for an AI-native CX
practice, themed around **FPT's Digital Commerce & Experience (DCX) offering** and the
**ON.Ecosystem** agentic suite, centered on **Return on AI Investment (ROAI)**. Built as a
single-page prototype and deployed to Cloudflare Workers static assets.

**Live:** https://vela-os-roai.emerge-digital.workers.dev

> Portfolio and per-client figures are modelled for the demo. Case-study results, partner
> credentials, and market stats are real FPT proof points drawn from the CX decks.

## Highlights

- **Two modes, one prominent toggle** — switch between the internal **Agency** console and
  the customer-facing **Client** portal from the top bar; the left sidebar morphs to match.
- **Deep-linkable** — view state is encoded in query params, so any screen is shareable and
  back/forward works. Examples:
  - `?view=agency&section=billing&tab=invoices`
  - `?view=agency&client=vantage` (opens a client deep dive)
  - `?view=client&client=helios&section=marketplace`
- **ROAI everywhere** — `ROAI = (Value delivered − AI cost) ÷ AI cost`, with hover tooltips
  explaining it next to every ROAI figure.
- **Mobile-navigable** — off-canvas drawer + hamburger below `lg`, responsive layouts and
  scrollable tables; static sidebar on desktop.
- **Premium dark/light theme** — indigo + emerald accents, hand-built SVG charts.

## What's inside

### Agency (internal) view
- **Overview** — portfolio ROAI hero, KPI cards, ROAI/cost-vs-value trend, sortable client
  leaderboard, top / at-risk rails, "Proof in the field" case studies, and a Partners &
  credentials band (Adobe, Sitecore, Salesforce, Liferay, Shopify; 1,000+ engineers).
- **Clients** — directory cards (Deep dive / View as client).
- **Client deep dive** — ROAI formula strip, **Proven results** panel (real FPT outcome per
  account), metric cards, cost-vs-value chart, **Value by CX service pillar**, billing &
  contract (hybrid seat-based ↔ enterprise commit, Metronome alerts), recommendations.
- **Billing** (tabs) — **Overview** (MRR, outstanding, collection rate, aging, top clients),
  **Invoices** (filter + send / mark-paid / download), **Contracts**, **Clients** →
  full **Client Billing Profile** (terms, method, PO, contract, history, ROAI link).

### Client (customer portal) view — morphing sidebar
- **ROAI Center** — personalized return hero, trust metrics, value-vs-investment chart.
- **Active Projects** — engagement cards with progress, status, value delivered.
- **AI Marketplace** — full 6-pillar CX catalog (Experience Strategy, Design, Platform,
  Commerce, Insights, Run & Optimize) + ON.Ecosystem accelerators + AI-first Sales
  Enablement packages, with mock **Launch Agent** modal flows.
- **Billing** (tabs) — **Overview** (amount due, credits balance, next invoice, ROAI tie-in),
  **Invoices** (Pay now / Submit for approval), **Payment Methods** (card / ACH / wire /
  Government GPC / PO upload), **Usage** (hybrid breakdown + model mix).
- **Insights & Reports** — "what's working", case studies, downloadable reports.

### Billing models & data realism
Hybrid seat-based and enterprise prepaid-commit contracts; Metronome usage metering and
threshold alerts; Net 30 / Net 60, ACH, wire, corporate card, Government GPC and PO flows
(incl. PO upload and submit-for-approval for enterprise/government accounts).

## Tech

Vanilla **React 18 + Tailwind**, bundled by **esbuild**. Each component file is a
plain IIFE that registers a `window.*` global and reads the globals registered before it, so
**load order matters** (the canonical order lives in `app/entry.js`). The build concatenates
React + the 11 modules in that order, transpiles JSX (classic runtime → `React.createElement`),
and minifies everything into one content-hashed asset — there is no in-browser Babel anymore.
**Tailwind is generated at build time** (static, purged via the Tailwind CLI) into a
content-hashed stylesheet — no more render-blocking `cdn.tailwindcss.com` Play CDN.
Hand-built SVG charts. Theme via CSS variables (dark default, light supported).

```
app/                  # source (not served)
  index.html          # template — the build injects the hashed <script>/<link> at the <!-- build:js -->/<!-- build:css --> markers
  tailwind.css        # @tailwind base/components/utilities — input for the static Tailwind build
  entry.js            # import order: _globals → data → icons → … → app → _bootstrap
  _globals.js         # puts React / ReactDOM on window (the IIFEs reference a global `React`)
  _bootstrap.js       # ReactDOM.createRoot(#root).render(<App/>)  — runs last
  data.jsx            # window.AGENCY/FMT — clients, 6 CX pillars, services catalog, billing data
  icons.jsx           # window.Icon — inline stroke icon set
  ui.jsx              # window.UI — primitives + SVG charts (Card, Badge, LineArea, Donut, …)
  store.jsx           # window.Store — shared billing state (React Context)
  billing.jsx         # window.Billing — hybrid / enterprise-commit panels + Metronome alerts
  billingscreens.jsx  # window.BillingScreens — AgencyBilling + ClientBilling (lazy-loads jsPDF)
  clientviews.jsx     # window.ClientViews — Active Projects, Marketplace (Launch flow), Insights
  overview.jsx        # window.Overview — agency overview + proof / partners
  deepdive.jsx        # window.DeepDive — client deep dive + Proven results
  portal.jsx          # window.Portal — client portal shell / section router
  app.jsx             # window.App — shell, sidebar (morphing + mobile drawer), topbar, routing

public/               # served by Cloudflare — static assets + build output
  assets/vela-*.js    # generated: the hashed, minified JS bundle         (git-ignored)
  assets/vela-*.css   # generated: the hashed, purged Tailwind stylesheet (git-ignored)
  index.html          # generated from app/index.html with the hashes injected (git-ignored)
  _headers            # immutable 1-year cache on /assets/*; HTML revalidated
  og.png, guide.html, robots.txt, sitemap.xml, canonical-facts.json, downloads/

scripts/build.mjs     # the build: esbuild bundles JS + Tailwind CLI purges CSS, then renders index.html
tailwind.config.js    # Tailwind v3 config — content globs + fontFamily theme extend
src/index.js          # the Worker: serves public/ + the read-only Metronome /api proxy
```

Routing is a lightweight `URLSearchParams` + `history` sync in `app.jsx` (no router library).

## Develop & deploy

```bash
npm install          # one-time
npm run build        # build app/ → public/assets/vela-<hash>.{js,css} + public/index.html
npm run dev          # build, then `wrangler dev` (serves public/ + the /api proxy locally)
npm run deploy       # build, then `wrangler deploy`
```

`public/assets/` and `public/index.html` are **build output** — run `npm run build` before
serving or deploying. CI does this automatically: pushing to `main` triggers
`.github/workflows/deploy.yml` (`npm ci && npm run build`, then `wrangler deploy`), and every
PR gets an isolated preview version via `preview.yml`.

Config: `wrangler.toml` serves `public/` as static assets with SPA fallback
(`not_found_handling = "single-page-application"`) and routes `/api/*` to the Worker first
(`run_worker_first`), which is what makes the query-param deep links resolve on direct load.
The Metronome key lives only in the `METRONOME_API_KEY` secret.

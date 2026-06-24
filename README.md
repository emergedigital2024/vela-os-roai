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
- **Premium dark/light theme** — indigo + emerald accents, hand-built SVG charts, no build step.

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

Vanilla **React 18 + Babel (in-browser) + Tailwind via CDN** — no build step, no bundler.
Hand-built SVG charts. Theme via CSS variables (dark default, light supported). Each file is
a plain IIFE that registers a `window.*` global, loaded in order from `public/index.html`.

```
public/
  index.html        # shell: fonts, Tailwind config, theme tokens, script load order
  data.jsx          # window.AGENCY/FMT — clients, 6 CX pillars, services catalog,
                    #   proof datasets, billing mock data (acct, INVOICES, contractOf)
  icons.jsx         # window.Icon — inline stroke icon set
  ui.jsx            # window.UI — primitives + SVG charts (Card, Badge, LineArea, Donut,
                    #   Progress, Modal, Tooltip/InfoDot, ROAI tip constants, …)
  billing.jsx       # window.Billing — hybrid / enterprise-commit panels + Metronome alerts
  billingscreens.jsx# window.BillingScreens — AgencyBilling + ClientBilling (tabbed screens)
  clientviews.jsx   # window.ClientViews — Active Projects, Marketplace (Launch flow), Insights
  overview.jsx      # window.Overview — agency overview + proof / partners
  deepdive.jsx      # window.DeepDive — client deep dive + Proven results
  portal.jsx        # window.Portal — client portal shell / section router
  app.jsx           # window.App — shell, sidebar (morphing + mobile drawer), topbar,
                    #   query-param routing
```

Routing is a lightweight `URLSearchParams` + `history` sync in `app.jsx` (no router library).

## Develop & deploy

```bash
# local preview (serves public/ via Wrangler dev)
npx wrangler dev --port 8788

# deploy to Cloudflare (Emerge Digital account)
CLOUDFLARE_ACCOUNT_ID=4a75e91d6fca8bc58467fb80ce1b9c2e npx wrangler deploy
```

Config: `wrangler.toml` serves `public/` as static assets, with
`run_worker_first = ["/api/*"]` routing the API paths (`/api/metronome/*` and
`/api/roai/*`) to the Worker before static-asset handling, and
`not_found_handling = "404-page"` for everything else. The query-param deep links
still resolve on direct load because routing lives in the query string, not the path
(see above): the URL path stays `/`, so `index.html` is served directly as a static
asset — no SPA fallback is needed.

Repo: `emergedigital2024/vela-os-roai` (deploys are run manually via `wrangler deploy`;
pushing to GitHub does not auto-deploy).

## Live ROAI (Salesforce)

The Client portal's ROAI baselines can read from a live Salesforce org through a
read-only Worker proxy (`src/index.js`, `/api/roai/*`), mirroring the Metronome proxy:
the Salesforce credentials live only in Worker secrets and are never sent to the browser.
The Worker mints a token via the OAuth **client-credentials** flow, then fetches the
engagement and ROAI baselines from a custom Apex REST endpoint.

Set the three secrets (and the Metronome key, if not already set):

```bash
npx wrangler secret put SF_CLIENT_ID
npx wrangler secret put SF_CLIENT_SECRET
npx wrangler secret put SF_TOKEN_URL
npx wrangler secret put METRONOME_API_KEY   # if not already set
```

The Consumer Key / Consumer Secret come from the **Vela_ROAI_Bridge** Connected App in
the `emerge-onboarding-sfdx` Salesforce org (`SF_CLIENT_ID` = Consumer Key,
`SF_CLIENT_SECRET` = Consumer Secret). `SF_TOKEN_URL` is that org's OAuth token endpoint.
For local `wrangler dev`, mirror the same names in `.dev.vars` (see `.dev.vars.example`).

Verify the proxy is configured and can reach Salesforce:

```bash
curl -H "Origin: https://roai.emergedigital.ae" \
  https://roai.emergedigital.ae/api/roai/ping
# -> {"configured":true,"ok":true}
```

> **Scope:** this is a **read-only, demo-data-only** loop — it surfaces the fictional
> **Masar** engagement and its ROAI baselines for the prototype. Real client data is out of
> scope pending the UAE/KSA data-residency decision.

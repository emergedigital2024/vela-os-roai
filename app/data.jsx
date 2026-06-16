/* =====================================================================
   FPT CX Services — data layer
   Portfolio figures are modelled; case-study results & credentials are real.
   ROAI (multiple) = ValueDelivered / AICost
   ROAI %          = (ValueDelivered - AICost) / AICost * 100
   Net Value       = ValueDelivered - AICost
   Margin %        = (ValueDelivered - AICost) / ValueDelivered * 100  (gross)
   ===================================================================== */
(function () {
  const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];

  // helper to build a plausible rising cost/value monthly series
  function series(costEnd, valueEnd, volatility, seed) {
    let rnd = seed;
    const rand = () => {
      rnd = (rnd * 9301 + 49297) % 233280;
      return rnd / 233280;
    };
    return MONTHS.map((m, i) => {
      const t = (i + 1) / MONTHS.length;
      const ease = Math.pow(t, 0.85);
      const wobble = 1 + (rand() - 0.5) * volatility;
      const cost = Math.round(((costEnd * 0.45) + costEnd * 0.55 * ease) * wobble);
      const vWobble = 1 + (rand() - 0.5) * volatility;
      const value = Math.round(((valueEnd * 0.4) + valueEnd * 0.6 * ease) * vWobble);
      return { month: m, cost, value };
    });
  }

  // service value split — fractions of cost and value across the 6 CX service pillars
  function svc(cost, value, splits) {
    const cats = ["Experience Strategy", "Experience Design", "Experience Platform", "Commerce Platform", "Experience Insights", "Run & Optimize"];
    return cats.map((name, i) => ({
      name,
      cost: Math.round(cost * splits.cost[i]),
      value: Math.round(value * splits.value[i]),
    }));
  }

  // splits order: [Experience Strategy, Experience Design, Experience Platform, Commerce Platform, Experience Insights, Run & Optimize]
  const RAW = [
    {
      id: "northwind", name: "Northwind Retail", short: "NW", industry: "Retail & e-commerce",
      cost: 42000, value: 248000, health: 92, renewal: "Sep 2026", tenure: "2.3 yrs",
      hoursSaved: 3120, revenueUplift: 162000, plan: "Scale", mrr: 18000,
      credits: { used: 840000, included: 1000000, tokensM: 412, topupSuggest: false },
      models: [["Claude Opus 4", 0.34], ["Claude Sonnet 4", 0.46], ["Claude Haiku", 0.14], ["Embeddings", 0.06]],
      splitsSeed: 7, volatility: 0.10,
      splits: { cost: [0.08, 0.14, 0.22, 0.34, 0.14, 0.08], value: [0.06, 0.14, 0.22, 0.38, 0.14, 0.06] },
      recs: [
        { kind: "grow", title: "Scale ON.E storefront components", body: "ON.E composable commerce is your highest-ROAI line at 6.4x. Roll the checkout module to the 4,200 unindexed SKUs.", impact: "+$38k value / qtr" },
        { kind: "upsell", title: "Pre-empt a credit top-up", body: "Tracking to 96% of included credits by month 2. Offer a 500k credit pack at the current rate.", impact: "+$4.5k MRR" },
      ],
    },
    {
      id: "helios", name: "Verdano Foods", short: "VF", industry: "Food & beverage (CPG)",
      cost: 65000, value: 392000, health: 88, renewal: "Nov 2026", tenure: "1.8 yrs",
      hoursSaved: 5400, revenueUplift: 188000, plan: "Enterprise", mrr: 31000,
      credits: { used: 1480000, included: 1500000, tokensM: 690, topupSuggest: true },
      models: [["Claude Opus 4", 0.41], ["Claude Sonnet 4", 0.39], ["Claude Haiku", 0.12], ["Embeddings", 0.08]],
      splitsSeed: 13, volatility: 0.09,
      splits: { cost: [0.10, 0.12, 0.40, 0.14, 0.18, 0.06], value: [0.08, 0.12, 0.44, 0.12, 0.18, 0.06] },
      recs: [
        { kind: "warn", title: "Credits near cap", body: "98.7% of included credits consumed with 6 days left in cycle. Auto top-up is OFF.", impact: "Risk: throttled agents" },
        { kind: "grow", title: "ON.Optima drives the value", body: "AEO content regeneration lifted AI-answer visibility +30% across 120 markets. Extend to the nutrition knowledge hub.", impact: "+$52k value / qtr" },
      ],
    },
    {
      id: "cobalt", name: "Atelier Noir", short: "AN", industry: "Fashion & apparel",
      cost: 37000, value: 226000, health: 90, renewal: "Jul 2026", tenure: "1.1 yrs",
      hoursSaved: 2480, revenueUplift: 151000, plan: "Scale", mrr: 16500,
      credits: { used: 612000, included: 800000, tokensM: 298, topupSuggest: false },
      models: [["Claude Opus 4", 0.28], ["Claude Sonnet 4", 0.52], ["Claude Haiku", 0.14], ["Embeddings", 0.06]],
      splitsSeed: 21, volatility: 0.12,
      splits: { cost: [0.08, 0.26, 0.14, 0.36, 0.10, 0.06], value: [0.06, 0.26, 0.14, 0.40, 0.08, 0.06] },
      recs: [
        { kind: "grow", title: "StyleMaestro under-deployed", body: "ON.Match's outfit recommender runs on only 41% of eligible journeys. Strong ROAI headroom on the new-arrivals feed.", impact: "+$29k value / qtr" },
        { kind: "upsell", title: "Renewal in 27 days", body: "Health 90, ROAI 6.1x. Move from Scale to Enterprise for SSO + priority models.", impact: "+$14.5k MRR" },
      ],
    },
    {
      id: "vantage", name: "Madinat Estates", short: "MD", industry: "Real estate & construction",
      cost: 88000, value: 357000, health: 79, renewal: "Aug 2026", tenure: "2.0 yrs",
      hoursSaved: 4100, revenueUplift: 141000, plan: "Enterprise", mrr: 34000,
      credits: { used: 1720000, included: 2000000, tokensM: 805, topupSuggest: false },
      models: [["Claude Opus 4", 0.48], ["Claude Sonnet 4", 0.34], ["Claude Haiku", 0.10], ["Embeddings", 0.08]],
      splitsSeed: 33, volatility: 0.11,
      splits: { cost: [0.10, 0.10, 0.24, 0.40, 0.10, 0.06], value: [0.08, 0.10, 0.24, 0.44, 0.08, 0.06] },
      recs: [
        { kind: "warn", title: "Opus-heavy mix inflating cost", body: "48% of spend is on Opus 4. Route catalog-enrichment tasks to Sonnet 4 — quality holds.", impact: "-$11k cost / qtr" },
        { kind: "grow", title: "ON.E marketplace outperforming", body: "The composable B2B marketplace cut build time 55%. Package supplier onboarding as a standalone module.", impact: "+$22k value / qtr" },
      ],
    },
    {
      id: "brightside", name: "Brightside Media", short: "BS", industry: "Media & publishing",
      cost: 54000, value: 173000, health: 74, renewal: "Oct 2026", tenure: "1.4 yrs",
      hoursSaved: 2960, revenueUplift: 78000, plan: "Scale", mrr: 15000,
      credits: { used: 705000, included: 900000, tokensM: 340, topupSuggest: false },
      models: [["Claude Opus 4", 0.22], ["Claude Sonnet 4", 0.50], ["Claude Haiku", 0.20], ["Embeddings", 0.08]],
      splitsSeed: 41, volatility: 0.14,
      splits: { cost: [0.10, 0.14, 0.36, 0.08, 0.24, 0.08], value: [0.08, 0.14, 0.40, 0.06, 0.24, 0.08] },
      recs: [
        { kind: "grow", title: "Shift volume to Haiku", body: "Editorial tagging runs on Sonnet but tolerates Haiku. Cuts unit cost ~62%.", impact: "+0.9x ROAI" },
        { kind: "upsell", title: "Add ON.Browser agent-readiness", body: "No agentic-browser integration live yet. NLWeb + MCP exposure is the obvious next deploy.", impact: "+$18k value / qtr" },
      ],
    },
    {
      id: "aurora", name: "Aurora Beauty", short: "AB", industry: "Beauty & cosmetics",
      cost: 49000, value: 142000, health: 68, renewal: "Jul 2026", tenure: "0.9 yrs",
      hoursSaved: 1880, revenueUplift: 61000, plan: "Growth", mrr: 9500,
      credits: { used: 388000, included: 600000, tokensM: 181, topupSuggest: false },
      models: [["Claude Opus 4", 0.19], ["Claude Sonnet 4", 0.49], ["Claude Haiku", 0.24], ["Embeddings", 0.08]],
      splitsSeed: 55, volatility: 0.15,
      splits: { cost: [0.08, 0.24, 0.14, 0.30, 0.16, 0.08], value: [0.06, 0.24, 0.14, 0.34, 0.16, 0.06] },
      recs: [
        { kind: "warn", title: "Adoption stalling", body: "Active agent-hours down 12% MoM. Only 2 of 5 deployed agents used last week.", impact: "Risk: churn signal" },
        { kind: "grow", title: "ON.Match bundle recommender", body: "Cross-sell bundles are the strongest performer — expand to the skincare & fragrance lines.", impact: "+$16k value / qtr" },
      ],
    },
    {
      id: "meridian", name: "Meridian Travel", short: "ME", industry: "Travel & hospitality",
      cost: 71000, value: 119000, health: 51, renewal: "Jul 2026", tenure: "1.6 yrs",
      hoursSaved: 1620, revenueUplift: 41000, plan: "Scale", mrr: 14000,
      credits: { used: 1000000, included: 1000000, tokensM: 451, topupSuggest: true },
      models: [["Claude Opus 4", 0.52], ["Claude Sonnet 4", 0.30], ["Claude Haiku", 0.10], ["Embeddings", 0.08]],
      splitsSeed: 67, volatility: 0.16,
      splits: { cost: [0.22, 0.28, 0.14, 0.12, 0.10, 0.14], value: [0.24, 0.30, 0.12, 0.10, 0.10, 0.14] },
      recs: [
        { kind: "warn", title: "ROAI below 2.0x threshold", body: "Lowest in portfolio at 1.68x. Cost is up 19% QoQ while value is flat. Schedule a QBR.", impact: "Churn risk: HIGH" },
        { kind: "warn", title: "Model mix is the culprit", body: "52% Opus 4 on tasks Sonnet handles well. Re-routing alone lifts ROAI to ~2.3x.", impact: "-$14k cost / qtr" },
        { kind: "grow", title: "ON.X assistant barely deployed", body: "The agentic trip-planning assistant is 8% of value vs 28% portfolio avg — the biggest untapped lever.", impact: "+$34k value / qtr" },
      ],
    },
  ];

  function tierOf(mult) {
    if (mult >= 5) return "Elite";
    if (mult >= 3.5) return "Strong";
    if (mult >= 2) return "Stable";
    return "At risk";
  }

  // active top-up packs (1-yr expiry, payment-gated) keyed by client id
  const TOPUPS = {
    cobalt: [{ credits: 250000, remaining: 182000, purchased: "May 12, 2026", expires: "May 12, 2027", pricePaid: 1500 }],
    helios: [{ credits: 500000, remaining: 96000, purchased: "Apr 30, 2026", expires: "Apr 30, 2027", pricePaid: 2800 }],
  };

  // ---- HYBRID (seat-based) billing model ----
  // seats x credits/seat = pooled monthly credits (use-it-or-lose-it), plus optional top-up packs.
  function buildHybrid(c) {
    const creditsPerSeat = 20000;
    const included = c.credits.included;
    const seats = Math.round(included / creditsPerSeat);
    const used = Math.min(c.credits.used, included);
    const monthlyRemaining = Math.max(0, included - used);
    const topups = TOPUPS[c.id] || [];
    const topupTotal = topups.reduce((s, t) => s + t.remaining, 0);
    const pct = (used / included) * 100;
    const gated = monthlyRemaining <= 0 && topupTotal <= 0;
    const monthlyCost = c.cost / 3;
    const ratePer1k = monthlyCost / (used / 1000 || 1);
    return {
      model: "hybrid", creditsPerSeat, seats, included, used, monthlyRemaining,
      topups, topupTotal, totalAvailable: monthlyRemaining + topupTotal,
      pct, gated, resetDate: "Jul 1, 2026", ratePer1k, tokensM: c.credits.tokensM,
    };
  }

  // ---- ENTERPRISE COMMIT billing model ----
  // multi-year prepaid commitment with ramped allotment, installment invoicing,
  // negotiated discounts, rollover on renewal, and scheduled one-time charges.
  const MO12 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function buildCommit(c, categories) {
    const annual = c.cost * 4;
    const r = (x) => Math.round(x / 1000) * 1000;
    const y1 = r(annual * 0.7), y2 = r(annual * 1.0), y3 = r(annual * 1.25);
    const total = y1 + y2 + y3;
    const inst1 = r(total * 0.5), inst2 = total - inst1;
    const elapsedPct = 0.42 + (c.splitsSeed % 6) * 0.025;
    const allotment = y2;
    const speed = c.roai < 2 ? 1.6 : c.roai > 5 ? 0.82 : 1.05;
    const burnRate = (allotment / 12) * speed;
    const elapsedMonths = Math.max(1, Math.round(12 * elapsedPct));
    const consumedToDate = Math.round(burnRate * elapsedMonths);
    const projectedExhaust = burnRate > 0 ? allotment / burnRate : 99;
    const willOverage = projectedExhaust < 12;
    const projectedYearEnd = Math.round(burnRate * 12);
    const projectedUnused = Math.max(0, allotment - projectedYearEnd);
    const rolloverFraction = 0.25;
    const rolloverEligible = Math.round(Math.min(projectedUnused, allotment) * rolloverFraction);
    const burn = MO12.map((m, i) => ({
      month: m,
      actual: i < elapsedMonths ? Math.round(burnRate * (i + 1)) : null,
      projected: Math.round(burnRate * (i + 1)),
    }));
    const topCat = [...categories].sort((a, b) => b.cost - a.cost)[0].name;
    const discounts = [{ tag: topCat, pct: c.plan === "Enterprise" ? 0.2 : 0.15, scope: "Year 2 onward" }];
    if (c.id === "vantage") discounts.push({ tag: "Commerce Platform", pct: 0.15, scope: "Year 2 onward" });
    const scheduledCharges = [{ label: "Onboarding & enablement", amount: r(annual * 0.06), when: "Month 2", status: "paid" }];
    if (c.id === "helios") scheduledCharges.push({ label: "Multi-market content audit", amount: 9000, when: "Month 1", status: "paid" });
    const exhaustMonthLabel = willOverage ? MO12[Math.min(11, Math.max(0, Math.floor(projectedExhaust)))] : null;
    return {
      model: "commit", commitType: "prepaid", termLabel: "3-year", termStart: "Jan 2025", termEnd: "Jan 2028", total,
      accessSchedule: [
        { label: "Year 1", amount: y1, status: "complete" },
        { label: "Year 2", amount: y2, status: "current" },
        { label: "Year 3", amount: y3, status: "upcoming" },
      ],
      invoiceSchedule: [
        { label: "Signing installment", amount: inst1, when: "Jan 2025", status: "paid" },
        { label: "Year 3 installment", amount: inst2, when: "Jan 2027", status: "scheduled" },
      ],
      currentPeriod: { label: "Year 2", allotment, consumedToDate, elapsedMonths, pct: (consumedToDate / allotment) * 100 },
      burn, projectedExhaust, willOverage, exhaustMonthLabel, projectedYearEnd, projectedUnused,
      rolloverFraction, rolloverEligible, discounts, scheduledCharges,
    };
  }

  // ---- FPT CX services marketplace (client-facing catalog) ----
  // Full offering across the 6 CX pillars. onEco = ON.Ecosystem agentic accelerator (+ funnel stage);
  // package = AI-first Sales Enablement ready-to-use package.
  const SERVICES = [
    // Experience Strategy
    { id: "dxma", name: "Experience Maturity Assessment", pillar: "Experience Strategy", icon: "gauge", tagline: "Know where you stand", blurb: "DXMM-based assessment of CX maturity across vision, people, MarTech and data — with a roadmap to the next level.", priceLabel: "fixed scope", typicalRoai: 3.4 },
    { id: "cx-marketecture", name: "CX & Marketecture Assessment", pillar: "Experience Strategy", icon: "target", tagline: "Align ambition with architecture", blurb: "Map target CX to the marketecture capabilities needed, and the gaps between ambition and execution.", priceLabel: "fixed scope", typicalRoai: 3.1 },
    { id: "journey-analysis", name: "Journey & Behavior Analysis", pillar: "Experience Strategy", icon: "pulse", tagline: "AI-assisted journey insight", blurb: "AI-assisted analysis of journeys and behavior to prioritize the highest-impact personalization moves.", priceLabel: "from $3k/mo", typicalRoai: 3.8 },
    // Experience Design
    { id: "ux-research", name: "UX Research & Journey Mapping", pillar: "Experience Design", icon: "users", tagline: "Insight-driven research", blurb: "Personas, empathy maps, journey maps and competitor analysis grounded in rigorous user research.", priceLabel: "from $4k/mo", typicalRoai: 3.6 },
    { id: "ui-design-system", name: "Adaptive UI & Design Systems", pillar: "Experience Design", icon: "sparkles", tagline: "Scalable, on-brand design", blurb: "High-fidelity, accessible UI and robust design systems with clean developer hand-off.", priceLabel: "from $5k/mo", typicalRoai: 3.9, popular: true },
    { id: "usability-testing", name: "Usability Testing & Reviews", pillar: "Experience Design", icon: "checkCircle", tagline: "Validate before you build", blurb: "Moderated and unmoderated testing plus expert design reviews with prioritized, actionable fixes.", priceLabel: "fixed scope", typicalRoai: 3.2 },
    // Experience Platform
    { id: "dxp-build", name: "DXP Build & Re-platform", pillar: "Experience Platform", icon: "layers", tagline: "AEM · Sitecore · Liferay", blurb: "CMS build, upgrade and headless/hybrid re-platforming on cloud-native, API-first architectures.", priceLabel: "project", typicalRoai: 4.1, popular: true },
    { id: "martech", name: "MarTech Implementation", pillar: "Experience Platform", icon: "settings", tagline: "Orchestrate the stack", blurb: "Marketing automation, journey orchestration and activation across your experience platforms.", priceLabel: "from $6k/mo", typicalRoai: 4.0 },
    { id: "dx-engineering", name: "DX Engineering (Web, Mobile, Apps)", pillar: "Experience Platform", icon: "cpu", tagline: "Build any surface", blurb: "Web and mobile apps (native, cross-platform, low-code), smart apps and AR/VR/MR experiences.", priceLabel: "project", typicalRoai: 3.7 },
    { id: "on-optima", name: "ON.Optima", pillar: "Experience Platform", onEco: true, stage: "Attract", icon: "search", tagline: "Answers Engine Optimization", blurb: "Get your brand cited by AI answer engines — regenerate, enrich and structure content for GenAI visibility.", priceLabel: "from $6k/mo", typicalRoai: 5.4, popular: true },
    { id: "on-x", name: "ON.X", pillar: "Experience Platform", onEco: true, stage: "Engage", icon: "sparkles", tagline: "Agentic Assistant", blurb: "An autonomous assistant that unifies fragmented journeys and acts on your customers' behalf in real time.", priceLabel: "from $7k/mo", typicalRoai: 4.7, popular: true },
    // Commerce Platform
    { id: "commerce-build", name: "Commerce Build & Re-platform", pillar: "Commerce Platform", icon: "grid", tagline: "Adobe Commerce · Shopify · OrderCloud", blurb: "Composable, cloud-ready commerce build, re-platforming and migration with performance and security built in.", priceLabel: "project", typicalRoai: 4.3, popular: true },
    { id: "b2b-b2c", name: "B2B / B2C Implementation", pillar: "Commerce Platform", icon: "building", tagline: "Catalog, pricing, orders", blurb: "Product, pricing, promotion and inventory integrations across CRM, CDP and analytics.", priceLabel: "project", typicalRoai: 4.0 },
    { id: "on-e", name: "ON.E", pillar: "Commerce Platform", onEco: true, stage: "Convert", icon: "grid", tagline: "Supercharged Commerce", blurb: "Composable, template-driven commerce accelerator — launch storefronts up to 55% cheaper and 30% faster.", priceLabel: "from $9k/mo", typicalRoai: 6.1, popular: true },
    { id: "on-match", name: "ON.Match", pillar: "Commerce Platform", onEco: true, stage: "Optimize", icon: "target", tagline: "AI-Driven Recommendation", blurb: "Multi-agent hyper-personalization — trend, profiler and recommendation agents lift conversion 15–20%.", priceLabel: "usage-based", typicalRoai: 5.2 },
    { id: "on-browser", name: "ON.Browser", pillar: "Commerce Platform", onEco: true, stage: "Discover", icon: "layers", tagline: "Agentic Browser Integration", blurb: "Make your site agent-ready for AI browsers via NLWeb, MCP and SDK — up to +45% AI search visibility.", priceLabel: "from $5k/mo", typicalRoai: 3.8, isNew: true },
    // Experience Insights (incl. AI-first Sales Enablement packages)
    { id: "cdp-360", name: "CDP & Customer 360", pillar: "Experience Insights", icon: "users", tagline: "One unified profile", blurb: "CDP-enabled unification and activation of customer data into a single, real-time Customer 360.", priceLabel: "project", typicalRoai: 4.2 },
    { id: "data-analytics", name: "Data Engineering & Analytics", pillar: "Experience Insights", icon: "chart", tagline: "Foundations for AI", blurb: "Data integration and scalable foundations for analytics, activation and AI-driven insight.", priceLabel: "from $6k/mo", typicalRoai: 3.9 },
    { id: "data-portal", name: "Data Analytics Portal", pillar: "Experience Insights", package: true, icon: "chart", tagline: "Conversational analytics hub", blurb: "AI-enhanced analytics hub with unified dashboards, predictive insights and conversational analytics.", priceLabel: "from $5k/mo", typicalRoai: 4.6, popular: true },
    { id: "sales-portal", name: "Sales & Service Consultant Portal", pillar: "Experience Insights", package: true, icon: "briefcase", tagline: "AI workspace for sales & service", blurb: "AI workspace for relationship managers with knowledge grounding, product matching and real-time interaction support.", priceLabel: "from $7k/mo", typicalRoai: 4.8, popular: true, isNew: true },
    { id: "ai-agent-sales", name: "AI Agent for Sales & Service", pillar: "Experience Insights", package: true, icon: "sparkles", tagline: "Agentic sales & service", blurb: "Agentic assistants trained on enterprise knowledge for instant, context-aware sales and service responses.", priceLabel: "usage-based", typicalRoai: 5.0, isNew: true },
    // Run & Optimize
    { id: "ams", name: "Application Maintenance (L1–L3)", pillar: "Run & Optimize", icon: "settings", tagline: "Keep it healthy", blurb: "L1, L2 and L3 application maintenance and support with stable, predictable SLAs.", priceLabel: "from $4k/mo", typicalRoai: 2.8 },
    { id: "monitoring", name: "24×7 Monitoring & SRE", pillar: "Run & Optimize", icon: "pulse", tagline: "Always-on reliability", blurb: "24×7 monitoring, incident response and bug-fixing across your digital estate.", priceLabel: "from $3k/mo", typicalRoai: 2.9 },
    { id: "ops-support", name: "Production & Marketing Ops", pillar: "Run & Optimize", icon: "refresh", tagline: "Run campaigns & releases", blurb: "Production and marketing operation support plus ongoing system enhancement and upgrades.", priceLabel: "from $4k/mo", typicalRoai: 3.0 },
  ];

  // which services each client already has live (the rest show as "available")
  const ACTIVE_SERVICES = {
    northwind: ["commerce-build", "on-e", "on-match", "on-x", "data-portal"],
    helios: ["dxp-build", "on-optima", "martech", "data-analytics", "ai-agent-sales"],
    cobalt: ["commerce-build", "on-match", "ui-design-system", "on-x"],
    vantage: ["commerce-build", "b2b-b2c", "on-e", "cdp-360", "ai-agent-sales"],
    brightside: ["dxp-build", "on-optima", "on-browser", "data-analytics"],
    aurora: ["commerce-build", "on-match", "ui-design-system"],
    meridian: ["dxma", "on-x", "ams"],
  };

  // ---- Active projects (engagements) per client ----
  const LEADS = ["Mara Lindqvist", "Devin Okafor", "Priya Nair", "Theo Marchetti", "Sofia Reyes"];
  const PROJECT_NAMES = {
    "Experience Strategy": ["CX maturity assessment", "Marketecture roadmap", "Journey analysis & prioritization", "Personalization strategy"],
    "Experience Design": ["UX research & journey mapping", "Design system build", "Adaptive UI redesign", "Usability testing program"],
    "Experience Platform": ["DXP re-platform", "AEO content rollout (ON.Optima)", "Agentic assistant rollout (ON.X)", "MarTech integration"],
    "Commerce Platform": ["Composable storefront MVP", "B2B marketplace build (ON.E)", "Recommendation engine (ON.Match)", "Agent-ready browser (ON.Browser)"],
    "Experience Insights": ["CDP & Customer 360 build", "Data Analytics Portal", "AI Agent for Sales & Service", "Sales & Service Portal rollout"],
    "Run & Optimize": ["AMS L1–L3 transition", "24×7 monitoring setup", "Production ops support", "Platform upgrade"],
  };
  const MILESTONES = {
    "Experience Strategy": "Next: present the maturity roadmap",
    "Experience Design": "Next: design review with your team",
    "Experience Platform": "Next: expand to the next channel",
    "Commerce Platform": "Next: add the supplier-onboarding module",
    "Experience Insights": "Next: activate the next data source",
    "Run & Optimize": "Next: quarterly reliability review",
  };
  function buildProjects(c, categories) {
    let rnd = c.splitsSeed * 7 + 3;
    const rand = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
    const cats = [...categories].sort((a, b) => b.value - a.value); // strongest first = marquee project
    return cats.map((cat, i) => {
      let progress = Math.round(42 + rand() * 58);
      if (i === 0) progress = Math.max(progress, 80);
      progress = Math.min(progress, 100);
      const status = progress >= 100 ? "delivered" : progress >= 72 ? "review" : "active";
      const names = PROJECT_NAMES[cat.name];
      return {
        name: names[(c.splitsSeed + i) % names.length],
        service: cat.name,
        status, progress,
        valueDelivered: Math.round(cat.value * (status === "delivered" ? 1 : progress / 100)),
        lead: LEADS[(c.splitsSeed + i) % LEADS.length],
        nextMilestone: status === "delivered" ? "Wrapped — results in your latest report" : MILESTONES[cat.name],
        updated: ["today", "yesterday", "2 days ago", "5 days ago", "1 week ago"][(c.splitsSeed + i) % 5],
      };
    });
  }

  // ---- Reports & client-safe insights ----
  function buildReports() {
    return [
      { title: "Q2 2026 Business Review", kind: "QBR", period: "Apr – Jun 2026", date: "Jun 12, 2026", format: "PDF" },
      { title: "ROAI Summary", kind: "ROAI summary", period: "Q2 2026", date: "Jun 10, 2026", format: "PDF" },
      { title: "AI Usage Statement", kind: "Usage statement", period: "May 2026", date: "Jun 1, 2026", format: "PDF" },
      { title: "Q1 2026 Business Review", kind: "QBR", period: "Jan – Mar 2026", date: "Mar 14, 2026", format: "PDF" },
    ];
  }
  function buildInsights(c, categories) {
    const topCat = [...categories].sort((a, b) => (b.value / b.cost) - (a.value / a.cost))[0];
    const topRoai = (topCat.value / topCat.cost).toFixed(1) + "x";
    const grow = c.recs.find((r) => r.kind === "grow");
    return [
      { tone: "win", icon: "trendUp", title: `${topCat.name} is your standout`, body: `Your ${topCat.name} work is returning ${topRoai} — the strongest line in your account. A great place to lean in further.` },
      { tone: "win", icon: "clock", title: `${c.hoursSaved.toLocaleString()} hours given back`, body: `That's time your team reinvested into higher-value work this quarter, handled quietly by your AI agents.` },
      { tone: "tip", icon: "sparkles", title: grow ? grow.title : "New agents available", body: "A fresh opportunity is ready to deploy on your account. Your strategist can have it live within a week.", cta: "Explore marketplace" },
    ];
  }

  // ---- Specific, real FPT results attached to the matching account (shown on the deep dive) ----
  const CLIENT_CASES = {
    northwind: { solution: "Data & AI · Salesforce", icon: "chart", headline: "Campaign cycles: weeks → minutes",
      blurb: "Reusable Data & AI accelerators across Sales, Service, Marketing, Data Cloud and Agentforce collapsed campaign launch from weeks to minutes.",
      metrics: [["Launch cycles", "Weeks → min"], ["Personalization", "At scale"], ["CoE", "First in ASEAN"]] },
    helios: { solution: "ON.Optima · AEO", icon: "search", headline: "Cited across 120+ markets",
      blurb: "AEO won AI answer-box citations across 120+ markets and cut acquisition cost — with no cannibalization of Google traffic.",
      metrics: [["Markets", "120+"], ["AI answer boxes", "Consistent"], ["Acquisition cost", "Reduced"]] },
    vantage: { solution: "ON.E · Commerce", icon: "grid", headline: "MVP in 2 months, not 10",
      blurb: "Composable B2B marketplace for a Vision-2030 megaproject, delivered end-to-end against a critical timeline.",
      metrics: [["Time to MVP", "2 mo (vs 10)"], ["Build time", "−55%"], ["Requirements", "−40%"]] },
    brightside: { solution: "ON.Optima · AEO", icon: "search", headline: "+200% click-through rate",
      blurb: "Regenerated and restructured the corporate site for AI-driven visibility — measured 7 weeks after deployment.",
      metrics: [["Site ranking", "#6 (+18)"], ["Click-through", "3.2% (+200%)"], ["Featured snippets", "30%"]] },
  };

  // ---- Billing: account profiles, payment methods, terms (incl. enterprise/government) ----
  const ACCT = {
    northwind:  { type: "Enterprise", netTerms: "Net 30", methods: [{ kind: "card", label: "Corporate Card", detail: "Visa •••• 4421", default: true }, { kind: "ach", label: "ACH transfer", detail: "Chase •••• 8830" }] },
    helios:     { type: "Enterprise", netTerms: "Net 30", poNumber: "VF-2026-114", methods: [{ kind: "ach", label: "ACH transfer", detail: "HSBC •••• 2261", default: true }, { kind: "po", label: "Purchase order", detail: "PO #VF-2026-114" }] },
    cobalt:     { type: "Standard", netTerms: "Net 30", methods: [{ kind: "card", label: "Corporate Card", detail: "Amex •••• 1007", default: true }] },
    vantage:    { type: "Government", netTerms: "Net 60", poNumber: "PIF-MD-2026-009", methods: [{ kind: "wire", label: "Bank wire", detail: "SNB •••• 4490", default: true }, { kind: "po", label: "Purchase order", detail: "PO #PIF-MD-2026-009" }, { kind: "gpc", label: "Government GPC", detail: "GPC •••• 6628" }] },
    brightside: { type: "Standard", netTerms: "Net 30", methods: [{ kind: "card", label: "Corporate Card", detail: "Visa •••• 9912", default: true }] },
    aurora:     { type: "Standard", netTerms: "Net 30", methods: [{ kind: "card", label: "Corporate Card", detail: "Mastercard •••• 7745", default: true }] },
    meridian:   { type: "Enterprise", netTerms: "Net 30", methods: [{ kind: "card", label: "Corporate Card", detail: "Visa •••• 3380", default: true }, { kind: "ach", label: "ACH transfer", detail: "Barclays •••• 5501" }] },
  };
  const INV_BASE = { northwind: 1010, helios: 1110, cobalt: 1210, vantage: 1310, brightside: 1410, aurora: 1510, meridian: 1610 };
  const NEXT1 = { Feb: "Mar", Mar: "Apr", Apr: "May", May: "Jun", Jun: "Jul", Jul: "Aug" };
  const NEXT2 = { Feb: "Apr", Mar: "May", Apr: "Jun", May: "Jul", Jun: "Aug", Jul: "Sep" };
  function dueLabel(m, days) { return (days >= 60 ? NEXT2[m] : days >= 30 ? NEXT1[m] : m) + " 1, 2026"; }
  function buildInvoices(c) {
    const acct = ACCT[c.id] || { netTerms: "Net 30", methods: [] };
    const monthly = c.mrr + Math.round(c.cost / 3);
    let rnd = c.splitsSeed * 11 + 5;
    const rand = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
    const defMethod = (acct.methods.find((m) => m.default) || acct.methods[0] || { label: "Card" }).label;
    const dueDays = acct.netTerms === "Net 60" ? 60 : acct.netTerms === "Net 30" ? 30 : 0;
    const rows = [
      { m: "Feb", issued: "Feb 1, 2026", status: "paid" },
      { m: "Mar", issued: "Mar 1, 2026", status: "paid" },
      { m: "Apr", issued: "Apr 1, 2026", status: "paid" },
      { m: "May", issued: "May 1, 2026", status: "paid" },
      { m: "Jun", issued: "Jun 1, 2026", status: "sent" },
      { m: "Jul", issued: "Jul 1, 2026", status: "draft" },
    ];
    if (c.id === "meridian") { rows[3].status = "partial"; rows[4].status = "overdue"; }
    return rows.map((r, i) => {
      const amount = Math.round(monthly * (1 + (rand() - 0.5) * 0.12));
      const paid = r.status === "paid" ? amount : r.status === "partial" ? Math.round(amount * 0.5) : 0;
      return {
        id: c.id + "-" + r.m, clientId: c.id, number: "INV-2026-" + (INV_BASE[c.id] + i),
        period: r.m + " 2026", issued: r.issued, due: dueLabel(r.m, dueDays),
        amount, paid, status: r.status, method: defMethod, terms: acct.netTerms,
      };
    });
  }

  const CLIENTS = RAW.map((c) => {
    const mult = c.value / c.cost;
    const net = c.value - c.cost;
    const margin = net / c.value;
    const categories = svc(c.cost, c.value, c.splits);
    const model = c.plan === "Enterprise" ? "commit" : "hybrid";
    return {
      ...c,
      roai: mult,
      roaiPct: (mult - 1) * 100,
      net,
      margin,
      tier: tierOf(mult),
      trend: series(c.cost, c.value, c.volatility, c.splitsSeed),
      categories,
      billingModel: model,
      billing: { model, hybrid: buildHybrid(c), commit: buildCommit(c, categories) },
      projects: buildProjects(c, categories),
      activeServiceIds: ACTIVE_SERVICES[c.id] || [],
      reports: buildReports(),
      clientInsights: buildInsights(c, categories),
      caseStudy: CLIENT_CASES[c.id] || null,
      acct: ACCT[c.id] || { type: "Standard", netTerms: "Net 30", methods: [{ kind: "card", label: "Corporate Card", detail: "Card on file", default: true }] },
      invoices: buildInvoices(c),
    };
  });
  const INVOICES = CLIENTS.flatMap((c) => c.invoices);

  // contract summary derived from the existing hybrid/commit billing model
  function contractOf(c) {
    const isCommit = c.billing.model === "commit";
    const h = c.billing.hybrid, cm = c.billing.commit;
    return {
      type: isCommit ? "Enterprise commit" : "Hybrid (seat-based)",
      term: isCommit ? cm.termLabel : "Monthly rolling",
      value: isCommit ? cm.total : c.mrr * 12,
      seats: h.seats, credits: h.included, commit: isCommit ? cm.total : null,
      renewal: c.renewal, netTerms: c.acct.netTerms,
      method: c.acct.methods[0] ? c.acct.methods[0].label : "Card", plan: c.plan,
    };
  }

  // ---- portfolio rollups ----
  const totalCost = CLIENTS.reduce((s, c) => s + c.cost, 0);
  const totalValue = CLIENTS.reduce((s, c) => s + c.value, 0);
  const totalHours = CLIENTS.reduce((s, c) => s + c.hoursSaved, 0);
  const totalMRR = CLIENTS.reduce((s, c) => s + c.mrr, 0);
  const portMult = totalValue / totalCost;

  // portfolio monthly trend = sum of client trends
  const MONTHS_T = CLIENTS[0].trend.map((p, i) => {
    const cost = CLIENTS.reduce((s, c) => s + c.trend[i].cost, 0);
    const value = CLIENTS.reduce((s, c) => s + c.trend[i].value, 0);
    return { month: p.month, cost, value, roai: value / cost };
  });

  const PORTFOLIO = {
    totalCost, totalValue, totalHours, totalMRR,
    net: totalValue - totalCost,
    roai: portMult,
    roaiPct: (portMult - 1) * 100,
    margin: (totalValue - totalCost) / totalValue,
    trend: MONTHS_T,
    activeClients: CLIENTS.length,
    creditsConsumed: CLIENTS.reduce((s, c) => s + c.credits.used, 0),
    tokensM: CLIENTS.reduce((s, c) => s + c.credits.tokensM, 0),
  };

  // ---- formatters ----
  const fmtUSD = (n, opts = {}) => {
    const { compact = false, cents = false } = opts;
    if (compact) {
      if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 2) + "M";
      if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(Math.abs(n) >= 1e4 ? 0 : 1) + "k";
      return "$" + n.toLocaleString();
    }
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
  };
  const fmtMult = (m) => m.toFixed(1) + "x";
  const fmtPct = (p, d = 0) => (p >= 0 ? "" : "") + p.toFixed(d) + "%";
  const fmtNum = (n) => n.toLocaleString();
  const fmtCompact = (n) => {
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + "k";
    return "" + n;
  };

  // ---- Credible proof points (real FPT results & credentials, from the CX decks) ----
  const CASE_STUDIES = [
    { client: "Global technology leader", sector: "Technology", solution: "ON.Optima · AEO", icon: "search",
      headline: "+200% click-through rate", blurb: "Regenerated and restructured the corporate site for AI-driven visibility — measured 7 weeks after deployment.",
      metrics: [["Site ranking", "#6 (+18)"], ["Click-through", "3.2% (+200%)"], ["Featured snippets", "30%"]] },
    { client: "Global health F&B leader", sector: "Food & beverage", solution: "ON.Optima · AEO", icon: "sparkles",
      headline: "Cited across 120+ markets", blurb: "Deployed AEO to win AI answer-box citations and cut acquisition cost — with no cannibalization of Google traffic.",
      metrics: [["Markets", "120+"], ["AI answer boxes", "Consistent"], ["Acquisition cost", "Reduced"]] },
    { client: "KSA megaproject (PIF)", sector: "Real estate & construction", solution: "ON.E · Commerce", icon: "grid",
      headline: "MVP in 2 months, not 10", blurb: "Composable B2B marketplace for a Vision-2030 megaproject, delivered end-to-end against a critical timeline.",
      metrics: [["Time to MVP", "2 mo (vs 10)"], ["Build time", "−55%"], ["Requirements", "−40%"]] },
    { client: "FPT × Salesforce ASEAN CoE", sector: "Banking & cross-industry", solution: "Data & AI CoE", icon: "chart",
      headline: "Campaign cycles: weeks → minutes", blurb: "First ASEAN Salesforce Data & AI CoE — reusable accelerators across Sales, Service, Marketing, Data Cloud and Agentforce.",
      metrics: [["First in", "ASEAN"], ["Launch cycles", "Weeks → min"], ["Agentforce certs", "~100 by 2026"]] },
  ];
  const PARTNERS = [
    { name: "Adobe", tier: "Specialized partner", engineers: "200+", certs: "160+", note: "AEM Cloud migration · Commerce" },
    { name: "Sitecore", tier: "Platinum · APAC strategic", engineers: "200+", certs: "70+", note: "1st in Asia on XM Cloud · 1st Global Elite Reseller (2026)" },
    { name: "Salesforce", tier: "FDE Network Partner", engineers: "330+", certs: "770+", note: "First ASEAN Data & AI CoE" },
    { name: "Liferay", tier: "Global Platinum", engineers: "150+", certs: "180+", note: "1st in VN + Japan to Global Platinum" },
    { name: "Shopify", tier: "Shopify Plus", engineers: "200+", certs: "40+", note: "Plus · custom storefronts · migration" },
  ];
  const PARTNER_TOTALS = { engineers: "1,000+", certs: "1,500+" };
  // FPT Corporation parent-scale facts (canonical-facts.json → fpt_parent). The Agentforce ARR
  // is a Salesforce-global ecosystem figure, NOT an FPT-specific result — label it as such wherever shown.
  const FPT = { revenue: "$2.47B", employees: "80,000+", agentforceArrNote: "$1.4B Salesforce-global Agentforce ARR (+330% YoY)" };
  const MARKET_STATS = [
    { stat: "2–3×", label: "higher revenue growth for CX leaders" },
    { stat: "~70%", label: "rate experience as important as product or price" },
    { stat: "~60%", label: "of interactions span multiple channels" },
  ];

  // ---- shared billing calc helpers (take an effStatus fn so overrides are respected) ----
  const isOutstandingStatus = (s) => s === "sent" || s === "overdue" || s === "partial";
  const owedAmt = (i) => i.amount - i.paid;
  const BILL = {
    isOutstanding: isOutstandingStatus,
    owed: owedAmt,
    outstandingTotal: (invoices, eff) => invoices.filter((i) => isOutstandingStatus(eff(i))).reduce((s, i) => s + owedAmt(i), 0),
    agingBuckets: (invoices, eff) => {
      const a = { current: 0, d130: 0, d3160: 0 };
      invoices.forEach((i) => { const s = eff(i); if (isOutstandingStatus(s)) a[s === "sent" ? "current" : s === "partial" ? "d130" : "d3160"] += owedAmt(i); });
      return a;
    },
  };
  const CREDIT_PACKS = [
    { credits: 250000, price: 1500 },
    { credits: 500000, price: 2800 },
    { credits: 1000000, price: 5000 },
  ];

  window.AGENCY = { CLIENTS, PORTFOLIO, MONTHS, SERVICES, CASE_STUDIES, PARTNERS, PARTNER_TOTALS, FPT, MARKET_STATS, INVOICES, contractOf, BILL, CREDIT_PACKS };
  window.FMT = { fmtUSD, fmtMult, fmtPct, fmtNum, fmtCompact };
})();

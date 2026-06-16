/* App shell: sidebar nav, topbar, theme, agency/client toggle, filters, routing */
(function () {
  const { useState, useEffect, useMemo, useRef } = React;
  const Icon = window.Icon;
  const { CLIENTS, PORTFOLIO } = window.AGENCY;
  const { fmtUSD, fmtMult, fmtNum } = window.FMT;
  const U = window.UI;
  const { Card, Badge, TierBadge, HealthBar, Sparkline, Segmented, MetronomeBadge, InfoDot, ROAI_TIP, C, cx } = U;

  // ---- URL routing (query params on /) ----
  const AGENCY_SECTIONS = ["home", "clients", "analytics", "billing"];
  const CLIENT_SECTIONS = ["roai", "projects", "marketplace", "billing", "insights"];
  const AGENCY_BILLING_TABS = ["overview", "invoices", "contracts", "clients", "live"];
  const CLIENT_BILLING_TABS = ["overview", "invoices", "payment", "usage"];
  function parseURL() {
    const p = new URLSearchParams(window.location.search);
    const view = p.get("view"), sec = p.get("section"), tabP = p.get("tab");
    const vc = CLIENTS.find((c) => c.id === p.get("client"));
    if (view === "client") {
      const clientSection = CLIENT_SECTIONS.includes(sec) ? sec : "roai";
      return { mode: "client", selected: null, section: "home", portalId: vc ? vc.id : CLIENTS[0].id, clientSection,
        tab: clientSection === "billing" && CLIENT_BILLING_TABS.includes(tabP) ? tabP : "overview" };
    }
    const section = AGENCY_SECTIONS.includes(sec) ? sec : "home";
    return { mode: "internal", selected: vc || null, portalId: CLIENTS[0].id, clientSection: "roai", section,
      tab: section === "billing" && AGENCY_BILLING_TABS.includes(tabP) ? tabP : "overview" };
  }
  function buildURL(s) {
    const p = new URLSearchParams();
    if (s.mode === "client") {
      p.set("view", "client"); p.set("client", s.portalId); p.set("section", s.clientSection);
      if (s.clientSection === "billing") p.set("tab", s.tab);
    } else {
      p.set("view", "agency");
      if (s.selected) p.set("client", s.selected.id);
      else { p.set("section", s.section); if (s.section === "billing") p.set("tab", s.tab); }
    }
    return "?" + p.toString();
  }
  const Overview = window.Overview, DeepDive = window.DeepDive, Portal = window.Portal;

  // Outbound booking CTA — the end of the future → Vela → book funnel.
  // The base link carries Vela's own default attribution (utm_source=vela); any
  // incoming utm_* from the visit are forwarded via window.VelaUTM and take precedence,
  // so the originating campaign (e.g. the "future" site) is preserved through to booking.
  const CAL_URL = "https://cal.com/rami-alcheikh/strategy-call?utm_source=vela&utm_medium=cta";
  const bookACallHref = () => (window.VelaUTM ? window.VelaUTM.decorate(CAL_URL) : CAL_URL);

  const INDUSTRIES = ["All", ...Array.from(new Set(CLIENTS.map((c) => c.industry)))];
  const TIERS = ["All", "Elite", "Strong", "Stable", "At risk"];
  const CLIENT_TITLES = { roai: "ROAI Center", projects: "Active projects", marketplace: "AI marketplace", billing: "Billing", insights: "Insights & reports" };

  function Brand({ collapsed }) {
    return (
      <div className="flex items-center gap-2.5 px-1">
        <div className="relative flex h-9 w-9 flex-none items-center justify-center rounded-xl shadow-sm" style={{ background: "linear-gradient(140deg,#6366f1,#4f46e5)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3 L20 19 M12 3 L4 19 M7.5 13 H16.5" />
          </svg>
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight text-[var(--text)]">Vela <span className="text-[var(--accent-fg)]">OS</span></div>
            <div className="text-[11px] text-[var(--muted)]">FPT CX Services</div>
          </div>
        )}
      </div>
    );
  }

  function NavItem({ icon, label, active, onClick, badge }) {
    return (
      <button onClick={onClick}
        className={cx("group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-[var(--accent-soft)] text-[var(--accent-fg)]" : "text-[var(--muted)] hover:bg-[var(--panel-hi)] hover:text-[var(--text)]")}>
        <Icon name={icon} size={17} className={active ? "" : "text-[var(--faint)] group-hover:text-[var(--muted)]"} />
        <span className="flex-1 text-left">{label}</span>
        {badge != null && <span className="rounded-md bg-[var(--chip)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)] tabular-nums">{badge}</span>}
      </button>
    );
  }

  function Sidebar({ section, setSection, mode, setMode, clientSection, setClientSection, portalClient, setTab, navOpen, setNavOpen }) {
    const isClient = mode === "client";
    const [desktop, setDesktop] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
    useEffect(() => {
      const mq = window.matchMedia("(min-width: 1024px)");
      const on = () => setDesktop(mq.matches);
      mq.addEventListener("change", on);
      return () => mq.removeEventListener("change", on);
    }, []);
    return (
      <aside style={{ transform: desktop ? "none" : (navOpen ? "translateX(0)" : "translateX(-100%)") }}
        className="fixed inset-y-0 left-0 z-40 flex w-[244px] flex-col border-r border-[var(--border)] bg-[var(--panel-2)] transition-transform duration-200">
        <div className="flex h-16 items-center border-b border-[var(--border)] px-4"><Brand /></div>
        <nav onClick={() => setNavOpen(false)} className="flex-1 space-y-1 px-3 py-4">
          {isClient ? (
            <>
              <div className="flex items-center justify-between px-2 pb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--faint)]">Client portal</span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">Client view</span>
              </div>
              {portalClient && (
                <div className="mb-2 flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2.5">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-fg)]">{portalClient.short}</span>
                  <div className="min-w-0 leading-tight"><div className="truncate text-sm font-semibold text-[var(--text)]">{portalClient.name}</div><div className="truncate text-[11px] text-[var(--muted)]">{portalClient.plan} plan</div></div>
                </div>
              )}
              <NavItem icon="target" label="ROAI Center" active={clientSection === "roai"} onClick={() => setClientSection("roai")} />
              <NavItem icon="briefcase" label="Active projects" active={clientSection === "projects"} onClick={() => setClientSection("projects")} />
              <NavItem icon="grid" label="AI marketplace" active={clientSection === "marketplace"} onClick={() => setClientSection("marketplace")} />
              <NavItem icon="card" label="Billing" active={clientSection === "billing"} onClick={() => { setClientSection("billing"); setTab("overview"); }} />
              <NavItem icon="bulb" label="Insights & reports" active={clientSection === "insights"} onClick={() => setClientSection("insights")} />
              <div className="pt-3"><NavItem icon="arrowLeft" label="Back to Agency" onClick={() => setMode("internal")} /></div>
            </>
          ) : (
            <>
              <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--faint)]">Agency</div>
              <NavItem icon="dashboard" label="Overview" active={section === "home"} onClick={() => { setMode("internal"); setSection("home"); }} />
              <NavItem icon="users" label="Clients" badge={CLIENTS.length} active={section === "clients"} onClick={() => { setMode("internal"); setSection("clients"); }} />
              <NavItem icon="chart" label="ROAI analytics" active={section === "analytics"} onClick={() => { setMode("internal"); setSection("analytics"); }} />
              <NavItem icon="card" label="Billing" active={section === "billing"} onClick={() => { setMode("internal"); setSection("billing"); setTab("overview"); }} />
              <div className="px-2 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-wider text-[var(--faint)]">Client-facing</div>
              <NavItem icon="user" label="Customer portal" onClick={() => setMode("client")} />
            </>
          )}
        </nav>
        <div className="border-t border-[var(--border)] p-3">
          <div className="mb-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3">
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><MetronomeBadge size="sm" /></div>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
              <span className="text-xs text-[var(--muted)]">Usage syncing live</span>
            </div>
          </div>
          <button className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[var(--panel-hi)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-fg)]">JD</span>
            <div className="min-w-0 flex-1 leading-tight"><div className="truncate text-sm font-medium text-[var(--text)]">Jordan Diaz</div><div className="truncate text-xs text-[var(--muted)]">RevOps Lead</div></div>
            <Icon name="settings" size={15} className="text-[var(--faint)]" />
          </button>
          <a href="https://vision.emergedigital.ae?utm_source=vela&utm_medium=corp" target="_blank" rel="noopener"
            className="mt-2 block px-2 text-center text-[11px] text-[var(--faint)] transition-colors hover:text-[var(--accent-fg)]">
            An <span className="font-medium">Emerge Digital</span> company ↗
          </a>
        </div>
      </aside>
    );
  }

  function Topbar({ mode, setMode, theme, setTheme, filters, setFilters, section, selected, onBack, clientSection, setNavOpen }) {
    const FilterSelect = ({ value, onChange, options, label }) => (
      <label className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--chip)] px-2.5 py-1.5 text-sm">
        <span className="text-[var(--faint)]">{label}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer bg-transparent font-medium text-[var(--text)] outline-none">
          {options.map((o) => <option key={o} value={o} className="bg-[var(--panel)] text-[var(--text)]">{o}</option>)}
        </select>
      </label>
    );
    return (
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-blur)] px-4 backdrop-blur-xl sm:px-6">
        <button onClick={() => setNavOpen(true)} className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--chip)] text-[var(--muted)] transition-colors hover:text-[var(--text)] lg:hidden"><Icon name="menu" size={18} /></button>
        <div className="min-w-0">
          {mode === "client"
            ? <div className="flex items-center gap-2 text-base"><span className="font-semibold text-[var(--text)]">{CLIENT_TITLES[clientSection] || "Customer portal"}</span><span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-400">Client view</span></div>
            : selected
              ? <div className="flex items-center gap-2 text-base"><button onClick={onBack} className="font-medium text-[var(--muted)] hover:text-[var(--text)]">Clients</button><Icon name="chevronRight" size={14} className="text-[var(--faint)]" /><span className="font-semibold text-[var(--text)]">{selected.name}</span></div>
              : <h1 className="text-base font-semibold text-[var(--text)] capitalize">{section === "home" ? "Agency overview" : section === "clients" ? "Clients" : section === "analytics" ? "ROAI analytics" : "Billing"}</h1>}
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          {mode === "internal" && !selected && (section === "home" || section === "clients" || section === "analytics") && (
            <div className="hidden items-center gap-2 lg:flex">
              <FilterSelect label="Industry" value={filters.industry} onChange={(v) => setFilters((f) => ({ ...f, industry: v }))} options={INDUSTRIES} />
              <FilterSelect label="Tier" value={filters.tier} onChange={(v) => setFilters((f) => ({ ...f, tier: v }))} options={TIERS} />
            </div>
          )}
          <div className="hidden items-center rounded-xl border border-[var(--border-strong)] bg-[var(--chip)] p-1 shadow-sm sm:flex">
            <button onClick={() => setMode("internal")} className={cx("flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors", mode === "internal" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--text)]")}><Icon name="briefcase" size={15} />Agency view</button>
            <button onClick={() => setMode("client")} className={cx("flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors", mode === "client" ? "bg-[var(--accent)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--text)]")}><Icon name="user" size={15} />Client view</button>
          </div>
          <a href={bookACallHref()} target="_blank" rel="noopener" data-cta="book-a-call" className="flex items-center gap-2 rounded-lg bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]">
            <Icon name="calendar" size={15} /><span className="hidden sm:inline">Book a discovery call</span>
          </a>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--chip)] text-[var(--muted)] transition-colors hover:text-[var(--text)]">
            <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
          </button>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--chip)] text-[var(--muted)] transition-colors hover:text-[var(--text)]">
            <Icon name="bell" size={16} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-400" />
          </button>
        </div>
      </header>
    );
  }

  function ClientsDirectory({ clients, onSelect, onViewAsClient }) {
    return (
      <div>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">All clients</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">{clients.length} active engagements · click any client for the ROAI deep dive</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((c) => (
            <Card key={c.id} hover onClick={() => onSelect(c)} className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--chip)] text-sm font-bold text-[var(--text)]">{c.short}</span>
                  <div>
                    <div className="font-semibold text-[var(--text)]">{c.name}</div>
                    <div className="text-xs text-[var(--muted)]">{c.industry} · {c.plan}</div>
                  </div>
                </div>
                <TierBadge tier={c.tier} />
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-1 text-xs text-[var(--muted)]">ROAI <span onClick={(e) => e.stopPropagation()}><InfoDot label={ROAI_TIP} /></span></div>
                  <div className={cx("text-2xl font-bold tabular-nums", c.roai >= 5 ? "text-emerald-400" : c.roai >= 2 ? "text-[var(--text)]" : "text-rose-400")}>{fmtMult(c.roai)}</div>
                </div>
                <Sparkline data={c.trend.map((t) => t.value)} color={c.roai >= 2 ? C.emerald : C.rose} w={104} h={36} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-3 text-xs">
                <div><div className="text-[var(--muted)]">Value delivered</div><div className="mt-0.5 font-semibold tabular-nums text-[var(--text)]">{fmtUSD(c.value, { compact: true })}</div></div>
                <div><div className="text-[var(--muted)]">AI cost</div><div className="mt-0.5 font-semibold tabular-nums text-[var(--text)]">{fmtUSD(c.cost, { compact: true })}</div></div>
                <div><div className="text-[var(--muted)]">Health</div><div className="mt-1"><HealthBar score={c.health} showLabel={false} w={48} /></div></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <span className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--chip)] py-2 text-xs font-medium text-[var(--text)] transition-colors group-hover:bg-[var(--panel-hi)]"><Icon name="chart" size={13} /> Deep dive</span>
                <button onClick={(e) => { e.stopPropagation(); onViewAsClient(c.id); }} className="flex items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--chip)] py-2 text-xs font-medium text-[var(--text)] transition-colors hover:bg-[var(--panel-hi)]"><Icon name="user" size={13} /> View as client</button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  function BillingView({ clients }) {
    const totalMRR = clients.reduce((s, c) => s + c.mrr, 0);
    const totalCredits = clients.reduce((s, c) => s + c.credits.used, 0);
    const totalIncluded = clients.reduce((s, c) => s + c.credits.included, 0);
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-5"><div className="flex items-center gap-2 text-sm text-[var(--muted)]"><Icon name="wallet" size={15} className="text-[var(--faint)]" />Recurring revenue</div><div className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">{fmtUSD(totalMRR)}/mo</div><div className="mt-1 text-xs text-[var(--muted)]">Across {clients.length} subscriptions</div></Card>
          <Card className="p-5"><div className="flex items-center gap-2 text-sm text-[var(--muted)]"><Icon name="coins" size={15} className="text-[var(--faint)]" />Credits consumed</div><div className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">{fmtNum(totalCredits)}</div><div className="mt-1 text-xs text-[var(--muted)]">{Math.round((totalCredits / totalIncluded) * 100)}% of pooled allotment</div></Card>
          <Card className="p-5"><div className="flex items-center gap-2 text-sm text-[var(--muted)]"><MetronomeBadge size="sm" /></div><div className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">Live</div><div className="mt-1 text-xs text-emerald-400">All meters reporting</div></Card>
        </div>
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-4"><h3 className="text-base font-semibold text-[var(--text)]">Hybrid billing by client</h3><p className="mt-0.5 text-sm text-[var(--muted)]">Subscription + usage-based AI credits, metered via Metronome</p></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)]"><tr className="text-left text-xs text-[var(--muted)]">
                <th className="px-5 py-2.5 font-medium">Client</th><th className="px-4 py-2.5 font-medium">Plan</th>
                <th className="px-4 py-2.5 text-right font-medium">Subscription</th><th className="px-4 py-2.5 text-right font-medium">Credits used</th>
                <th className="px-4 py-2.5 font-medium">Utilization</th><th className="px-4 py-2.5 text-right font-medium">Status</th>
              </tr></thead>
              <tbody>
                {clients.map((c) => {
                  const pct = (c.credits.used / c.credits.included) * 100;
                  return (
                    <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-5 py-3"><div className="flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--chip)] text-[11px] font-bold text-[var(--text)]">{c.short}</span><span className="font-medium text-[var(--text)]">{c.name}</span></div></td>
                      <td className="px-4 py-3 text-[var(--muted)]">{c.plan}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--text)]">{fmtUSD(c.mrr)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--muted)]">{fmtNum(c.credits.used)}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--track)]"><div className="h-full rounded-full" style={{ width: pct + "%", background: pct > 95 ? C.rose : pct > 85 ? C.amber : C.emerald }} /></div><span className="text-xs tabular-nums text-[var(--muted)]">{pct.toFixed(0)}%</span></div></td>
                      <td className="px-4 py-3 text-right">{c.credits.topupSuggest ? <Badge tone="amber">Top-up due</Badge> : <Badge tone="emerald">Healthy</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  function App() {
    const init = useMemo(() => parseURL(), []);
    const [theme, setTheme] = useState(() => localStorage.getItem("velaos-theme") || "dark");
    const [mode, setMode] = useState(init.mode);
    const [section, setSection] = useState(init.section);
    const [selected, setSelected] = useState(init.selected);
    const [portalId, setPortalId] = useState(init.portalId);
    const [clientSection, setClientSection] = useState(init.clientSection);
    const [tab, setTab] = useState(init.tab);
    const [navOpen, setNavOpen] = useState(false);
    const [filters, setFilters] = useState({ industry: "All", tier: "All" });

    useEffect(() => {
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.classList.toggle("light", theme === "light");
      localStorage.setItem("velaos-theme", theme);
    }, [theme]);

    useEffect(() => { if (mode === "client") setSelected(null); }, [mode]);

    // ---- keep the URL in sync with view state (deep-linkable, back/forward) ----
    const firstRun = useRef(true), fromPop = useRef(false);
    useEffect(() => {
      const url = buildURL({ mode, section, selected, portalId, clientSection, tab });
      if (url !== (window.location.search || "")) {
        if (firstRun.current || fromPop.current) history.replaceState(null, "", url);
        else history.pushState(null, "", url);
      }
      firstRun.current = false; fromPop.current = false;
    }, [mode, section, selected, portalId, clientSection, tab]);

    useEffect(() => {
      const onPop = () => {
        const s = parseURL();
        fromPop.current = true;
        setMode(s.mode); setSection(s.section); setSelected(s.selected);
        setPortalId(s.portalId); setClientSection(s.clientSection); setTab(s.tab);
      };
      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }, []);

    const filtered = useMemo(() => CLIENTS.filter((c) =>
      (filters.industry === "All" || c.industry === filters.industry) &&
      (filters.tier === "All" || c.tier === filters.tier)), [filters]);

    const portalClient = CLIENTS.find((c) => c.id === portalId);
    const selectClient = (c) => { setSelected(c); window.scrollTo({ top: 0 }); };
    const viewAsClient = (id) => { setPortalId(id); setClientSection("roai"); setSelected(null); setMode("client"); window.scrollTo({ top: 0 }); };

    const BS = window.BillingScreens;
    let main;
    if (mode === "client") main = <Portal client={portalClient} section={clientSection} onPick={setPortalId} billingTab={tab} setBillingTab={setTab} />;
    else if (selected) main = <DeepDive client={selected} onBack={() => setSelected(null)} onViewAsClient={viewAsClient} />;
    else if (section === "home") main = <Overview onSelect={selectClient} filters={filters} />;
    else if (section === "clients") main = <ClientsDirectory clients={filtered} onSelect={selectClient} onViewAsClient={viewAsClient} />;
    else if (section === "analytics") main = <Overview onSelect={selectClient} filters={filters} />;
    else if (section === "billing") main = <BS.AgencyBilling tab={tab} setTab={setTab} onOpenDeepDive={selectClient} />;

    return (
      <window.Store.BillingProvider>
      <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        {navOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setNavOpen(false)} />}
        <Sidebar section={section} setSection={(s) => { setSection(s); setSelected(null); }} mode={mode} setMode={setMode} clientSection={clientSection} setClientSection={setClientSection} portalClient={portalClient} setTab={setTab} navOpen={navOpen} setNavOpen={setNavOpen} />
        <div className="lg:pl-[244px]">
          <Topbar mode={mode} setMode={setMode} theme={theme} setTheme={setTheme} filters={filters} setFilters={setFilters} section={section} selected={selected} onBack={() => setSelected(null)} clientSection={clientSection} setNavOpen={setNavOpen} />
          <main className="mx-auto max-w-[1320px] px-4 py-7 sm:px-6">{main}</main>
        </div>
      </div>
      </window.Store.BillingProvider>
    );
  }

  window.App = App;
})();

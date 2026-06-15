/* Client-facing sections: Active Projects, AI Services Marketplace, Insights & Reports.
   Warm, trust-building, emerald-success tone. Exposed as window.ClientViews. */
(function () {
  const { useState, useEffect, useRef } = React;
  const Icon = window.Icon;
  const { SERVICES, CASE_STUDIES } = window.AGENCY;
  const { fmtUSD, fmtMult, fmtNum } = window.FMT;
  const U = window.UI;
  const { Card, Badge, Progress, SectionTitle, Modal, InfoDot, ROAI_TIP_SHORT, C, cx } = U;

  // CX pillar visual maps (icon + accent), keyed by pillar name
  const PILLAR_ICON = { "Experience Strategy": "target", "Experience Design": "sparkles", "Experience Platform": "layers", "Commerce Platform": "grid", "Experience Insights": "chart", "Run & Optimize": "settings" };
  const PILLAR_COLOR = { "Experience Strategy": C.indigo, "Experience Design": C.violet, "Experience Platform": C.sky, "Commerce Platform": C.emerald, "Experience Insights": C.amber, "Run & Optimize": C.slate };

  function Avatar({ name, size = 22 }) {
    const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
    return (
      <span className="inline-flex flex-none items-center justify-center rounded-full bg-[var(--chip)] text-[10px] font-bold text-[var(--muted)]"
        style={{ width: size, height: size }}>{initials}</span>
    );
  }

  function PillarChip({ pillar, size = 36 }) {
    return (
      <span className="flex flex-none items-center justify-center rounded-xl"
        style={{ width: size, height: size, background: (PILLAR_COLOR[pillar] || C.indigo) + "1f", color: PILLAR_COLOR[pillar] || C.indigo }}>
        <Icon name={PILLAR_ICON[pillar] || "sparkles"} size={size * 0.46} />
      </span>
    );
  }

  // ============================ Active Projects ============================
  const PSTATUS = {
    active: { tone: "indigo", label: "Active", color: C.indigo },
    review: { tone: "amber", label: "In review", color: C.amber },
    delivered: { tone: "emerald", label: "Delivered", color: C.emerald },
  };

  function ProjectCard({ p }) {
    const s = PSTATUS[p.status];
    return (
      <Card className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <PillarChip pillar={p.service} />
            <div>
              <div className="font-semibold text-[var(--text)]">{p.name}</div>
              <div className="text-xs text-[var(--muted)]">{p.service}</div>
            </div>
          </div>
          <Badge tone={s.tone}>{s.label}</Badge>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-[var(--muted)]">Progress</span>
            <span className="font-semibold tabular-nums text-[var(--text)]">{p.progress}%</span>
          </div>
          <Progress pct={p.progress} tone={s.color} />
        </div>

        <div className="mt-4 flex items-end justify-between border-t border-[var(--border)] pt-3">
          <div>
            <div className="text-xs text-[var(--muted)]">Value delivered</div>
            <div className="text-lg font-bold tabular-nums text-emerald-400">{fmtUSD(p.valueDelivered, { compact: true })}</div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 text-xs text-[var(--muted)]"><Avatar name={p.lead} size={20} />{p.lead.split(" ")[0]}</div>
            <div className="mt-1 text-[11px] text-[var(--faint)]">Updated {p.updated}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-[var(--panel-2)] px-3 py-2 text-xs text-[var(--muted)]">
          <Icon name="target" size={12} className="flex-none text-[var(--faint)]" />{p.nextMilestone}
        </div>
      </Card>
    );
  }

  function ActiveProjects({ client }) {
    const [filter, setFilter] = useState("all");
    const projects = client.projects;
    const counts = {
      all: projects.length,
      active: projects.filter((p) => p.status === "active").length,
      review: projects.filter((p) => p.status === "review").length,
      delivered: projects.filter((p) => p.status === "delivered").length,
    };
    const totalValue = projects.reduce((s, p) => s + p.valueDelivered, 0);
    const shown = filter === "all" ? projects : projects.filter((p) => p.status === filter);

    const TABS = [
      { k: "all", label: "All" },
      { k: "active", label: "Active" },
      { k: "review", label: "In review" },
      { k: "delivered", label: "Delivered" },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-5"><div className="text-sm text-[var(--muted)]">In flight</div><div className="mt-1.5 text-2xl font-bold tabular-nums text-[var(--text)]">{counts.active + counts.review}</div><div className="mt-0.5 text-xs text-[var(--muted)]">active engagements</div></Card>
          <Card className="p-5"><div className="text-sm text-[var(--muted)]">Delivered</div><div className="mt-1.5 text-2xl font-bold tabular-nums text-[var(--text)]">{counts.delivered}</div><div className="mt-0.5 text-xs text-[var(--muted)]">this quarter</div></Card>
          <Card className="p-5"><div className="text-sm text-[var(--muted)]">Value delivered</div><div className="mt-1.5 text-2xl font-bold tabular-nums text-emerald-400">{fmtUSD(totalValue, { compact: true })}</div><div className="mt-0.5 text-xs text-[var(--muted)]">across all projects</div></Card>
          <Card className="p-5"><div className="text-sm text-[var(--muted)]">Your team</div><div className="mt-2 flex -space-x-1.5">{[...new Set(projects.map((p) => p.lead))].slice(0, 4).map((l) => <Avatar key={l} name={l} size={26} />)}</div><div className="mt-1 text-xs text-[var(--muted)]">strategists on your account</div></Card>
        </div>

        <div>
          <SectionTitle icon="briefcase" title="Active projects" sub="What your AI agents are working on right now"
            right={
              <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--chip)] p-0.5 text-xs">
                {TABS.map((t) => (
                  <button key={t.k} onClick={() => setFilter(t.k)}
                    className={cx("rounded-md px-2.5 py-1 font-medium transition-colors", filter === t.k ? "bg-[var(--panel)] text-[var(--text)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--text)]")}>
                    {t.label} <span className="tabular-nums opacity-60">{counts[t.k]}</span>
                  </button>
                ))}
              </div>
            } />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((p, i) => <ProjectCard key={i} p={p} />)}
          </div>
        </div>
      </div>
    );
  }

  // ============================ Marketplace ============================
  function ServiceCard({ svc, active, launched, onLaunch }) {
    const isAgent = svc.onEco || svc.package;
    return (
      <Card className="flex flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <PillarChip pillar={svc.pillar} size={40} />
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {svc.onEco && <Badge tone="indigo">ON.Ecosystem</Badge>}
            {svc.package && <Badge tone="emerald">Sales Enablement</Badge>}
            {svc.popular && !svc.onEco && !svc.package && <Badge tone="neutral">Popular</Badge>}
            {svc.isNew && <Badge tone="amber">New</Badge>}
          </div>
        </div>
        <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: PILLAR_COLOR[svc.pillar] || C.indigo }}>{svc.pillar}{svc.onEco && svc.stage ? " · " + svc.stage : ""}</div>
        <div className="mt-1 font-semibold text-[var(--text)]">{svc.name}</div>
        <div className="text-sm text-[var(--accent-fg)]">{svc.tagline}</div>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--muted)]">{svc.blurb}</p>

        <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
          <span className="flex items-center gap-1 text-[var(--muted)]">Typical return <InfoDot label={ROAI_TIP_SHORT} /></span>
          <span className="font-semibold tabular-nums text-emerald-400">{fmtMult(svc.typicalRoai)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--muted)]">Pricing</span>
          <span className="font-medium text-[var(--text)]">{svc.priceLabel}</span>
        </div>

        <div className="mt-4">
          {active || launched ? (
            <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.08] py-2.5 text-sm font-semibold text-emerald-400">
              <Icon name="checkCircle" size={15} /> {active ? "Active on your plan" : "Live"}
            </div>
          ) : (
            <button onClick={onLaunch}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]">
              <Icon name="zap" size={15} /> {isAgent ? "Launch agent" : "Launch"}
            </button>
          )}
        </div>
      </Card>
    );
  }

  // ---- Launch flow (mock provisioning) ----
  function LaunchModal({ svc, onClose, onDone }) {
    const isAgent = svc.onEco || svc.package;
    const phases = isAgent
      ? ["Provisioning workspace", "Connecting your data", "Configuring the agent", "Running first pass"]
      : ["Scoping engagement", "Provisioning environment", "Configuring", "Kickoff"];
    const [i, setI] = useState(0);
    const timer = useRef(null);
    const firedDone = useRef(false);
    const done = i >= phases.length;
    useEffect(() => {
      if (i < phases.length) {
        timer.current = setTimeout(() => setI((x) => x + 1), 850);
        return () => clearTimeout(timer.current);
      }
    }, [i]);
    useEffect(() => { if (done && !firedDone.current) { firedDone.current = true; onDone(svc.id); } }, [done]);
    const pct = Math.round((Math.min(i, phases.length) / phases.length) * 100);
    return (
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-3">
            <PillarChip pillar={svc.pillar} />
            <div><div className="font-semibold text-[var(--text)]">{svc.name}</div><div className="text-xs text-[var(--muted)]">{svc.pillar}{svc.onEco && svc.stage ? " · " + svc.stage : ""}</div></div>
          </div>
          <button onClick={onClose} className="text-[var(--faint)] transition-colors hover:text-[var(--text)]"><Icon name="x" size={18} /></button>
        </div>
        <div className="px-5 py-5">
          {!done ? (
            <>
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--text)]">{isAgent ? "Launching agent…" : "Starting engagement…"}</span>
                <span className="tabular-nums text-[var(--muted)]">{pct}%</span>
              </div>
              <Progress pct={pct} tone={C.indigo} h={8} />
              <div className="mt-4 space-y-2.5">
                {phases.map((p, idx) => {
                  const state = idx < i ? "done" : idx === i ? "active" : "pending";
                  return (
                    <div key={idx} className="flex items-center gap-2.5 text-sm">
                      <span className={cx("flex h-5 w-5 flex-none items-center justify-center rounded-full",
                        state === "done" ? "bg-emerald-500/15 text-emerald-400" : state === "active" ? "bg-[var(--accent-soft)] text-[var(--accent-fg)]" : "bg-[var(--chip)] text-[var(--faint)]")}>
                        {state === "done" ? <Icon name="check" size={12} /> : state === "active" ? <Icon name="refresh" size={12} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                      </span>
                      <span className={state === "pending" ? "text-[var(--muted)]" : "text-[var(--text)]"}>{p}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><Icon name="checkCircle" size={26} /></div>
              <div className="mt-3 text-lg font-bold text-[var(--text)]">{svc.name} is live</div>
              <p className="mx-auto mt-1 max-w-xs text-sm text-[var(--muted)]">{isAgent ? "Your agent is provisioned and running. Track it in Active projects." : "Your engagement is set up — your strategist will be in touch."}</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          {done
            ? <button onClick={onClose} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]">Done</button>
            : <button onClick={onClose} className="rounded-lg border border-[var(--border)] bg-[var(--chip)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--panel-hi)]">Cancel</button>}
        </div>
      </div>
    );
  }

  function Marketplace({ client }) {
    const [cat, setCat] = useState("All");
    const [launched, setLaunched] = useState(() => new Set());
    const [launching, setLaunching] = useState(null);
    const active = new Set(client.activeServiceIds);
    const cats = ["All", ...Array.from(new Set(SERVICES.map((s) => s.pillar)))];
    const shown = SERVICES.filter((s) => cat === "All" || s.pillar === cat);
    const markLaunched = (id) => setLaunched((prev) => { const n = new Set(prev); n.add(id); return n; });

    return (
      <div className="space-y-6">
        <Card className="relative overflow-hidden p-6" style={{ background: "var(--hero)" }}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,.20), transparent 70%)" }} />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <Badge tone="emerald" icon="sparkles" className="mb-3">FPT CX offering</Badge>
              <h2 className="text-xl font-bold text-[var(--text)]">Expand across the full CX lifecycle</h2>
              <p className="mt-1 max-w-lg text-sm text-[var(--muted)]">Six service pillars — Strategy, Design, Platform, Commerce, Insights and Run — plus the ON.Ecosystem AI accelerators and AI-first Sales Enablement packages. Delivered by your FPT team; request one and it's usually live within weeks.</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tabular-nums text-[var(--text)]">{active.size}</div>
              <div className="text-xs text-[var(--muted)]">services active</div>
            </div>
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-2">
          {cats.map((cName) => (
            <button key={cName} onClick={() => setCat(cName)}
              className={cx("rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                cat === cName ? "border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent-fg)]" : "border-[var(--border)] bg-[var(--chip)] text-[var(--muted)] hover:text-[var(--text)]")}>
              {cName}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((s) => (
            <ServiceCard key={s.id} svc={s} active={active.has(s.id)} launched={launched.has(s.id)} onLaunch={() => setLaunching(s)} />
          ))}
        </div>

        <Modal open={!!launching} onClose={() => setLaunching(null)} maxWidth={440}>
          {launching && <LaunchModal svc={launching} onClose={() => setLaunching(null)} onDone={markLaunched} />}
        </Modal>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-fg)]"><Icon name="bulb" size={17} /></span>
            <div className="text-sm"><span className="font-semibold text-[var(--text)]">Not sure what to add?</span> <span className="text-[var(--muted)]">Your strategist can recommend the highest-return next agent for your goals.</span></div>
          </div>
          <button className="flex-none rounded-lg border border-[var(--border)] bg-[var(--chip)] px-3.5 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--panel-hi)]">Talk to your strategist</button>
        </div>
      </div>
    );
  }

  // ============================ Insights & Reports ============================
  const REPORT_ICON = { QBR: "briefcase", "ROAI summary": "target", "Usage statement": "cpu" };

  function Insights({ client }) {
    const insights = client.clientInsights;
    const reports = client.reports;
    return (
      <div className="space-y-6">
        <div>
          <SectionTitle icon="bulb" title="What's working" sub="Plain-language highlights from your account this quarter" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {insights.map((ins, i) => {
              const win = ins.tone === "win";
              return (
                <Card key={i} className="p-5">
                  <span className={cx("flex h-9 w-9 items-center justify-center rounded-lg", win ? "bg-emerald-500/12 text-emerald-400" : "bg-[var(--accent-soft)] text-[var(--accent-fg)]")}>
                    <Icon name={ins.icon} size={17} />
                  </span>
                  <div className="mt-3 font-semibold text-[var(--text)]">{ins.title}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{ins.body}</p>
                  {ins.cta && <div className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-fg)]">{ins.cta} <Icon name="chevronRight" size={14} /></div>}
                </Card>
              );
            })}
          </div>
        </div>

        <div>
          <SectionTitle icon="trendUp" title="How others succeeded" sub="Results FPT has delivered with these solutions" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {CASE_STUDIES.map((cs, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-fg)]"><Icon name={cs.icon} size={17} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[var(--text)]">{cs.headline}</div>
                    <div className="text-xs text-[var(--muted)]">{cs.client} · {cs.sector}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{cs.blurb}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-3">
                  {cs.metrics.map((m, j) => (
                    <div key={j}><div className="text-sm font-bold tabular-nums text-emerald-400">{m[1]}</div><div className="mt-0.5 text-[11px] leading-tight text-[var(--muted)]">{m[0]}</div></div>
                  ))}
                </div>
                <div className="mt-3"><Badge tone="indigo">{cs.solution}</Badge></div>
              </Card>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-2 font-semibold text-[var(--text)]"><Icon name="receipt" size={16} className="text-[var(--muted)]" /> Reports & statements</div>
            <Badge tone="neutral">{reports.length} available</Badge>
          </div>
          <div>
            {reports.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-3.5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[var(--chip)] text-[var(--muted)]"><Icon name={REPORT_ICON[r.kind] || "receipt"} size={16} /></span>
                  <div>
                    <div className="text-sm font-medium text-[var(--text)]">{r.title}</div>
                    <div className="text-xs text-[var(--muted)]">{r.kind} · {r.period} · {r.date}</div>
                  </div>
                </div>
                <button className="flex flex-none items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--chip)] px-3 py-1.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--panel-hi)]">
                  <Icon name="download" size={14} /> {r.format}
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  window.ClientViews = { ActiveProjects, Marketplace, Insights };
})();

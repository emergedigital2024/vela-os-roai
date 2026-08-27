/* Client Deep Dive */
(function () {
  const { useState, useEffect } = React;
  const Icon = window.Icon;
  const { fmtUSD, fmtMult, fmtPct, fmtNum, fmtCompact } = window.FMT;
  const U = window.UI;
  const { Card, Badge, TierBadge, DeltaPill, HealthBar, LineArea, CategoryBars, Donut, Progress, Ring, SectionTitle, MetronomeBadge, InfoDot, ROAI_TIP, C, cx } = U;

  const MODEL_COLORS = [C.indigoDeep || "#008A8E", C.indigo, C.sky, C.slate];

  function MetricCard({ label, value, sub, tone, icon, tip, foot }) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          {icon && <Icon name={icon} size={15} className="text-[var(--faint)]" />}{label}
          {tip && <InfoDot label={tip} />}
        </div>
        <div className="mt-2.5 text-[28px] font-bold leading-none tracking-tight tabular-nums" style={{ color: tone || "var(--text)" }}>{value}</div>
        {sub && <div className="mt-1.5 text-xs text-[var(--muted)]">{sub}</div>}
        {foot && <div className="mt-3 border-t border-[var(--border)] pt-3">{foot}</div>}
      </Card>
    );
  }

  const RecIcon = { grow: "trendUp", upsell: "sparkles", warn: "alert" };
  const RecTone = {
    grow: "border-emerald-500/20 bg-emerald-500/[0.06]",
    upsell: "border-[var(--accent-line)] bg-[var(--accent-soft)]",
    warn: "border-amber-500/20 bg-amber-500/[0.06]",
  };
  const RecIconTone = { grow: "text-emerald-400 bg-emerald-500/12", upsell: "text-[var(--accent-fg)] bg-[var(--accent-soft)]", warn: "text-amber-400 bg-amber-500/12" };

  function Recommendation({ rec }) {
    return (
      <div className={cx("rounded-xl border p-4", RecTone[rec.kind])}>
        <div className="flex items-start gap-3">
          <span className={cx("flex h-8 w-8 flex-none items-center justify-center rounded-lg", RecIconTone[rec.kind])}>
            <Icon name={RecIcon[rec.kind]} size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-[var(--text)]">{rec.title}</h4>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{rec.body}</p>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className={cx("text-xs font-semibold", rec.kind === "warn" ? "text-amber-400" : "text-emerald-400")}>{rec.impact}</span>
              <button className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-fg)] hover:gap-1.5 transition-all">
                {rec.kind === "warn" ? "Open playbook" : "Apply"} <Icon name="chevronRight" size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function DeepDive({ client, onBack, onViewAsClient }) {
    const [chartMode, setChartMode] = useState("cv");
    const [billingMode, setBillingMode] = useState(client.billing.model);
    useEffect(() => { setBillingMode(client.billing.model); }, [client.id]);
    const c = client;
    const creditPct = (c.credits.used / c.credits.included) * 100;
    const models = c.models.map((m, i) => ({ label: m[0], value: m[1], color: MODEL_COLORS[i % MODEL_COLORS.length] }));
    const { AlertBanner, BillingSection } = window.Billing;

    return (
      <div className="space-y-6">
        {/* back */}
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          <Icon name="arrowLeft" size={15} /> Back to portfolio
        </button>

        {/* header */}
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-5 p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-[var(--chip)] text-lg font-bold text-[var(--text)]">{c.short}</span>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-2xl font-bold tracking-tight text-[var(--text)]">{c.name}</h2>
                  <TierBadge tier={c.tier} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
                  <span className="flex items-center gap-1.5"><Icon name="building" size={13} />{c.industry}</span>
                  <span className="text-[var(--faint)]">·</span>
                  <span className="flex items-center gap-1.5"><Icon name="briefcase" size={13} />{c.plan} plan</span>
                  <span className="text-[var(--faint)]">·</span>
                  <span className="flex items-center gap-1.5"><Icon name="clock" size={13} />Client {c.tenure}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="text-right">
                <div className="text-xs text-[var(--muted)]">Health score</div>
                <div className="mt-1.5 flex items-center gap-2"><HealthBar score={c.health} w={72} /></div>
              </div>
              <div className="h-10 w-px bg-[var(--border)]" />
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-xs text-[var(--muted)]"><Icon name="calendar" size={12} />Next renewal</div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">{c.renewal}</div>
              </div>
              <div className="h-10 w-px bg-[var(--border)]" />
              <div className="text-right">
                <div className="text-xs text-[var(--muted)]">ROAI</div>
                <div className="mt-0.5 text-2xl font-bold tabular-nums text-emerald-400">{fmtMult(c.roai)}</div>
              </div>
              <button onClick={() => onViewAsClient && onViewAsClient(c.id)} className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]">
                <Icon name="user" size={15} /> View as client
                <Icon name="arrowUpRight" size={14} />
              </button>
            </div>
          </div>

          {/* ROAI formula strip */}
          <div className="border-t border-[var(--border)] bg-[var(--panel-2)] px-6 py-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--faint)]">How ROAI is calculated</span>
              <div className="flex flex-wrap items-center gap-2.5 font-mono text-sm">
                <span className="rounded-md bg-[var(--accent-soft)] px-2.5 py-1.5 font-semibold text-[var(--accent-fg)]">ROAI</span>
                <span className="text-[var(--faint)]">=</span>
                <span className="flex flex-col items-center">
                  <span className="flex items-center gap-1.5 border-b border-[var(--border-strong)] px-2 pb-1.5">
                    <span className="rounded bg-emerald-500/12 px-2 py-1 text-emerald-400">{fmtUSD(c.value, { compact: true })}</span>
                    <span className="text-[var(--faint)]">−</span>
                    <span className="rounded bg-amber-500/12 px-2 py-1 text-amber-400">{fmtUSD(c.cost, { compact: true })}</span>
                  </span>
                  <span className="pt-1.5"><span className="rounded bg-amber-500/12 px-2 py-1 text-amber-400">{fmtUSD(c.cost, { compact: true })}</span></span>
                </span>
                <span className="text-[var(--faint)]">=</span>
                <span className="rounded-md bg-emerald-500/12 px-2.5 py-1.5 font-semibold text-emerald-400">{c.roaiPct.toFixed(0)}%</span>
                <span className="text-[var(--faint)]">≈</span>
                <span className="rounded-md bg-emerald-500/12 px-2.5 py-1.5 font-semibold text-emerald-400">{fmtMult(c.roai)} return</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Metronome threshold alert (reflects selected billing model) */}
        <AlertBanner client={c} model={billingMode} />

        {/* Proven results — specific, real FPT outcome for this account */}
        {c.caseStudy && (
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-400"><Icon name={c.caseStudy.icon} size={16} /></span>
                <div><div className="text-sm font-semibold text-[var(--text)]">Proven results</div><div className="text-xs text-[var(--muted)]">{c.caseStudy.solution}</div></div>
              </div>
              <span className="text-lg font-bold leading-tight text-emerald-400">{c.caseStudy.headline}</span>
            </div>
            <div className="grid grid-cols-1 gap-4 px-6 pt-5 sm:grid-cols-3">
              {c.caseStudy.metrics.map((m, i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4 text-center">
                  <div className="text-2xl font-bold tabular-nums text-emerald-400">{m[1]}</div>
                  <div className="mt-1 text-xs text-[var(--muted)]">{m[0]}</div>
                </div>
              ))}
            </div>
            <p className="px-6 pb-5 pt-3 text-sm leading-relaxed text-[var(--muted)]">{c.caseStudy.blurb}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="AI cost" icon="cpu" value={fmtUSD(c.cost)} sub="This quarter · billed via Metronome"
            foot={<div className="flex items-center justify-between text-xs"><span className="text-[var(--muted)]">{c.credits.tokensM}M tokens</span><DeltaPill value={4.3} /></div>} />
          <MetricCard label="Value delivered" icon="dollar" value={fmtUSD(c.value)} tone="var(--text)"
            foot={
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between"><span className="text-[var(--muted)]">Hours saved</span><span className="font-medium tabular-nums text-[var(--text)]">{fmtNum(c.hoursSaved)} hrs</span></div>
                <div className="flex items-center justify-between"><span className="text-[var(--muted)]">Revenue uplift</span><span className="font-medium tabular-nums text-[var(--text)]">{fmtUSD(c.revenueUplift, { compact: true })}</span></div>
              </div>} />
          <MetricCard label="ROAI" icon="target" tip={ROAI_TIP} value={c.roaiPct.toFixed(0) + "%"} tone="#34d399" sub={`Net ${fmtUSD(c.net, { compact: true })} created`}
            foot={<div className="flex items-center justify-between text-xs"><span className="text-[var(--muted)]">{fmtMult(c.roai)} gross return</span><DeltaPill value={c.roai >= 3 ? 8.6 : -5.2} /></div>} />
          <MetricCard label="Margin" icon="gauge" value={Math.round(c.margin * 100) + "%"} sub="Gross delivery margin"
            foot={<Progress pct={c.margin * 100} tone={c.margin > 0.6 ? C.emerald : C.amber} />} />
        </div>

        {/* charts row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="p-5 lg:col-span-7">
            <SectionTitle title={chartMode === "cv" ? "Cost vs value over time" : "ROAI trajectory"}
              sub="Trailing 8 months"
              right={<U.Segmented size="sm" options={[{ value: "cv", label: "Cost vs Value" }, { value: "roai", label: "ROAI" }]} value={chartMode} onChange={setChartMode} />} />
            {chartMode === "cv"
              ? <LineArea data={c.trend} height={244} formatY={(v) => fmtUSD(v, { compact: true })} formatTip={(v) => fmtUSD(v)}
                  series={[{ key: "value", label: "Value delivered", color: C.emerald, area: true }, { key: "cost", label: "AI cost", color: C.amber, area: true }]} />
              : <LineArea data={c.trend.map(t => ({ ...t, roai: t.value / t.cost }))} height={244} formatY={(v) => v.toFixed(1) + "x"} formatTip={(v) => v.toFixed(2) + "x"} yPad={1.2}
                  series={[{ key: "roai", label: "ROAI", color: C.indigo, area: true }]} />}
          </Card>

          <Card className="p-5 lg:col-span-5">
            <SectionTitle icon="layers" title={<span className="inline-flex items-center gap-1.5">Value by CX service pillar <InfoDot label={ROAI_TIP} /></span>} sub="Delivered value & ROAI per pillar" />
            <CategoryBars categories={c.categories} />
          </Card>
        </div>

        {/* billing & contract — toggle hybrid seat-based / enterprise commit */}
        <BillingSection client={c} model={billingMode} setModel={setBillingMode} />

        {/* recommendations */}
        <Card className="p-5">
          <SectionTitle icon="bulb" title="Recommended actions" sub={`${c.recs.length} opportunities flagged by the ROAI engine`} />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {c.recs.map((r, i) => <Recommendation key={i} rec={r} />)}
          </div>
        </Card>
      </div>
    );
  }

  window.DeepDive = DeepDive;
})();

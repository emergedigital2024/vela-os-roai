/* Agency Overview Dashboard (Home) */
(function () {
  const { useState, useMemo } = React;
  const Icon = window.Icon;
  const { CLIENTS, PORTFOLIO, CASE_STUDIES, PARTNERS, PARTNER_TOTALS, MARKET_STATS } = window.AGENCY;
  const { fmtUSD, fmtMult, fmtPct, fmtNum, fmtCompact } = window.FMT;
  const U = window.UI;
  const { Card, Badge, TierBadge, DeltaPill, HealthBar, Sparkline, LineArea, Segmented, SectionTitle, MetronomeBadge, InfoDot, ROAI_TIP, C, cx } = U;

  function KPI({ label, value, sub, delta, spark, sparkColor, accent, icon, tip }) {
    return (
      <Card className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            {icon && <span className={accent ? "text-[var(--accent-fg)]" : "text-[var(--faint)]"}><Icon name={icon} size={15} /></span>}
            {label}
            {tip && <InfoDot label={tip} />}
          </div>
          {delta != null && <DeltaPill value={delta} />}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <div className="text-[30px] font-bold leading-none tracking-tight text-[var(--text)] tabular-nums">{value}</div>
            {sub && <div className="mt-1.5 text-xs text-[var(--muted)]">{sub}</div>}
          </div>
          {spark && <Sparkline data={spark} color={sparkColor || C.indigo} w={92} h={34} />}
        </div>
      </Card>
    );
  }

  function ClientMiniCard({ client, rank, onSelect, variant }) {
    const good = variant === "top";
    return (
      <button onClick={() => onSelect(client)}
        className="group flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 text-left transition-all hover:border-[var(--border-strong)] hover:bg-[var(--panel-hi)]">
        <span className={cx("flex h-9 w-9 flex-none items-center justify-center rounded-lg text-xs font-bold",
          good ? "bg-emerald-500/12 text-emerald-400" : "bg-rose-500/12 text-rose-400")}>{client.short}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-[var(--text)]">{client.name}</span>
          </div>
          <div className="truncate text-xs text-[var(--muted)]">{client.industry} · {fmtUSD(client.net, { compact: true })} net</div>
        </div>
        <div className="text-right">
          <div className={cx("text-sm font-bold tabular-nums", good ? "text-emerald-400" : "text-rose-400")}>{fmtMult(client.roai)}</div>
          <div className="text-[10px] uppercase tracking-wide text-[var(--faint)]">ROAI</div>
        </div>
        <Icon name="chevronRight" size={15} className="text-[var(--faint)] transition-transform group-hover:translate-x-0.5" />
      </button>
    );
  }

  const SORTS = [
    { key: "roai", label: "ROAI" },
    { key: "cost", label: "AI Spend" },
    { key: "value", label: "Value Delivered" },
    { key: "margin", label: "Margin" },
  ];

  function Leaderboard({ clients, onSelect }) {
    const [sort, setSort] = useState("roai");
    const [dir, setDir] = useState("desc");
    const sorted = useMemo(() => {
      const s = [...clients].sort((a, b) => b[sort] - a[sort]);
      return dir === "asc" ? s.reverse() : s;
    }, [clients, sort, dir]);

    const Th = ({ k, children, right }) => (
      <th className={cx("px-4 py-2.5 text-xs font-medium text-[var(--muted)]", right && "text-right")}>
        {k ? (
          <button onClick={() => { if (sort === k) setDir(dir === "desc" ? "asc" : "desc"); else { setSort(k); setDir("desc"); } }}
            className={cx("inline-flex items-center gap-1 hover:text-[var(--text)] transition-colors", right && "flex-row-reverse", sort === k && "text-[var(--text)]")}>
            {children}
            <Icon name={sort === k ? (dir === "desc" ? "arrowDown" : "arrowUp") : "chevronDown"} size={12}
              className={sort === k ? "opacity-100" : "opacity-30"} />
          </button>
        ) : children}
      </th>
    );

    return (
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--text)]">Client leaderboard</h3>
            <p className="mt-0.5 text-sm text-[var(--muted)]">{clients.length} active engagements · ranked by {SORTS.find(s => s.key === sort).label}</p>
          </div>
          <Segmented size="sm" options={SORTS.map(s => ({ value: s.key, label: s.label }))} value={sort} onChange={(v) => { setSort(v); setDir("desc"); }} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="border-b border-[var(--border)]">
              <tr className="text-left">
                <Th>#</Th>
                <Th>Client</Th>
                <Th>Tier</Th>
                <Th k="cost" right>AI Spend</Th>
                <Th k="value" right>Value</Th>
                <Th k="roai" right><span className="inline-flex items-center gap-1">ROAI <span onClick={(e) => e.stopPropagation()}><InfoDot label={ROAI_TIP} /></span></span></Th>
                <Th k="margin" right>Margin</Th>
                <Th right>Health</Th>
                <Th right>8-mo trend</Th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => (
                <tr key={c.id} onClick={() => onSelect(c)}
                  className="group cursor-pointer border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--panel-hi)]">
                  <td className="px-4 py-3 text-xs font-medium text-[var(--faint)] tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[var(--chip)] text-xs font-bold text-[var(--text)]">{c.short}</span>
                      <div>
                        <div className="font-semibold text-[var(--text)]">{c.name}</div>
                        <div className="text-xs text-[var(--muted)]">{c.industry}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><TierBadge tier={c.tier} /></td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--muted)]">{fmtUSD(c.cost, { compact: true })}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--text)]">{fmtUSD(c.value, { compact: true })}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cx("font-bold tabular-nums", c.roai >= 5 ? "text-emerald-400" : c.roai >= 2 ? "text-[var(--text)]" : "text-rose-400")}>{fmtMult(c.roai)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--muted)]">{Math.round(c.margin * 100)}%</td>
                  <td className="px-4 py-3"><div className="flex justify-end"><HealthBar score={c.health} /></div></td>
                  <td className="px-4 py-3"><div className="flex justify-end"><Sparkline data={c.trend.map(t => t.value)} color={c.roai >= 2 ? C.emerald : C.rose} w={80} h={26} fill={false} /></div></td>
                  <td className="px-2"><Icon name="chevronRight" size={15} className="text-[var(--faint)] transition-transform group-hover:translate-x-0.5" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  function Overview({ onSelect, filters }) {
    const [chartMode, setChartMode] = useState("roai");
    const [period, setPeriod] = useState("8mo");

    const filtered = useMemo(() => CLIENTS.filter((c) =>
      (filters.industry === "All" || c.industry === filters.industry) &&
      (filters.tier === "All" || c.tier === filters.tier)
    ), [filters]);

    const periodN = { "3mo": 3, "6mo": 6, "8mo": 8 }[period];
    const trend = PORTFOLIO.trend.slice(-periodN);

    const top = [...filtered].sort((a, b) => b.roai - a.roai).slice(0, 5);
    const bottom = [...filtered].sort((a, b) => a.roai - b.roai).slice(0, 5);

    // simulated period deltas
    const roaiSpark = PORTFOLIO.trend.map(t => t.roai);
    const valueSpark = PORTFOLIO.trend.map(t => t.value);
    const costSpark = PORTFOLIO.trend.map(t => t.cost);

    return (
      <div className="space-y-6">
        {/* hero / portfolio summary */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="relative overflow-hidden p-6 lg:col-span-5" style={{ background: "var(--hero)" }}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,.28), transparent 70%)" }} />
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--accent-fg)]">
              <Icon name="sparkles" size={15} /> Portfolio Return on AI Investment <InfoDot label={ROAI_TIP} />
            </div>
            <div className="mt-4 flex items-end gap-4">
              <div className="text-[64px] font-bold leading-[0.9] tracking-tight text-[var(--text)] tabular-nums">{fmtMult(PORTFOLIO.roai)}</div>
              <div className="mb-2"><DeltaPill value={11.4} /><div className="mt-1 text-xs text-[var(--muted)]">vs last quarter</div></div>
            </div>
            <p className="mt-3 max-w-sm text-sm text-[var(--muted)]">
              Every $1 of AI cost returned <span className="font-semibold text-[var(--text)]">{fmtMult(PORTFOLIO.roai)}</span> in delivered value across {PORTFOLIO.activeClients} clients on the FPT CX suite this quarter.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-5">
              <div>
                <div className="text-xs text-[var(--muted)]">Value delivered</div>
                <div className="mt-1 text-lg font-bold tabular-nums text-[var(--text)]">{fmtUSD(PORTFOLIO.totalValue, { compact: true })}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">AI cost</div>
                <div className="mt-1 text-lg font-bold tabular-nums text-[var(--text)]">{fmtUSD(PORTFOLIO.totalCost, { compact: true })}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--muted)]">Net value</div>
                <div className="mt-1 text-lg font-bold tabular-nums text-emerald-400">{fmtUSD(PORTFOLIO.net, { compact: true })}</div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-7">
            <KPI label="Value delivered" icon="dollar" value={fmtUSD(PORTFOLIO.totalValue, { compact: true })} sub={`${fmtNum(PORTFOLIO.totalHours)} hrs saved + revenue uplift`} delta={9.2} spark={valueSpark} sparkColor={C.emerald} tip="Hours saved (valued at blended rate) plus measured revenue uplift attributed to AI agents." />
            <KPI label="AI cost" icon="cpu" value={fmtUSD(PORTFOLIO.totalCost, { compact: true })} sub={`${PORTFOLIO.tokensM.toLocaleString()}M tokens · billed via Metronome`} delta={4.1} spark={costSpark} sparkColor={C.amber} tip="Total AI credit consumption across all clients, metered and billed through Metronome." />
            <KPI label="Net value created" icon="trendUp" value={fmtUSD(PORTFOLIO.net, { compact: true })} sub={`${Math.round(PORTFOLIO.margin * 100)}% blended margin`} delta={13.7} accent spark={valueSpark.map((v, i) => v - costSpark[i])} sparkColor={C.indigo} />
            <KPI label="Recurring revenue" icon="wallet" value={fmtUSD(PORTFOLIO.totalMRR, { compact: true }) + "/mo"} sub="Subscriptions + usage commitments" delta={6.8} spark={roaiSpark} sparkColor={C.violet} tip="Hybrid billing: base subscription plus usage-based AI credit commitments." />
          </div>
        </div>

        {/* trend + top/bottom */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="p-5 lg:col-span-7">
            <SectionTitle
              title={chartMode === "roai" ? "Portfolio ROAI over time" : "AI cost vs value delivered"}
              sub={chartMode === "roai" ? "Blended multiple across all active engagements" : "Monthly delivered value against AI credit cost"}
              right={
                <div className="flex items-center gap-2">
                  <Segmented size="sm" options={[{ value: "roai", label: "ROAI" }, { value: "cv", label: "Cost vs Value" }]} value={chartMode} onChange={setChartMode} />
                </div>
              } />
            {chartMode === "roai"
              ? <LineArea data={trend} height={236} formatY={(v) => v.toFixed(1) + "x"} formatTip={(v) => v.toFixed(2) + "x"} yPad={1.15}
                  series={[{ key: "roai", label: "Portfolio ROAI", color: C.indigo, area: true }]} />
              : <LineArea data={trend} height={236} formatY={(v) => fmtUSD(v, { compact: true })} formatTip={(v) => fmtUSD(v)}
                  series={[{ key: "value", label: "Value delivered", color: C.emerald, area: true }, { key: "cost", label: "AI cost", color: C.amber, area: false }]} />}
            <div className="mt-2 flex items-center gap-2 border-t border-[var(--border)] pt-3">
              <MetronomeBadge size="sm" />
              <span className="text-xs text-[var(--muted)]">Usage metered in real time</span>
              <div className="ml-auto flex items-center gap-3 text-xs">
                <Segmented size="sm" options={[{ value: "3mo", label: "3M" }, { value: "6mo", label: "6M" }, { value: "8mo", label: "8M" }]} value={period} onChange={setPeriod} />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:col-span-5">
            <Card className="p-5">
              <SectionTitle icon="trendUp" title="Top performers" sub="Highest ROAI this quarter" />
              <div className="space-y-2">
                {top.map((c, i) => <ClientMiniCard key={c.id} client={c} rank={i + 1} onSelect={onSelect} variant="top" />)}
              </div>
            </Card>
          </div>
        </div>

        {/* bottom performers full row */}
        <Card className="p-5">
          <SectionTitle icon="alert" title="Needs attention" sub="Lowest ROAI — candidates for re-routing, QBRs, or model-mix optimization"
            right={<Badge tone="amber" icon="alert">{bottom.filter(c => c.roai < 2).length} below 2.0x threshold</Badge>} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {bottom.map((c, i) => <ClientMiniCard key={c.id} client={c} rank={i + 1} onSelect={onSelect} variant="bottom" />)}
          </div>
        </Card>

        {/* leaderboard */}
        <Leaderboard clients={filtered} onSelect={onSelect} />

        {/* featured case studies — real FPT results */}
        <div>
          <SectionTitle icon="trendUp" title="Proof in the field" sub="Outcomes FPT has delivered with the CX offering"
            right={<div className="hidden items-center gap-4 text-xs text-[var(--muted)] sm:flex">{MARKET_STATS.map((m, i) => <span key={i} className="flex items-center gap-1.5"><span className="font-bold text-[var(--text)]">{m.stat}</span>{m.label}</span>)}</div>} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {CASE_STUDIES.map((cs, i) => (
              <Card key={i} className="flex flex-col p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-fg)]"><Icon name={cs.icon} size={17} /></span>
                  <div className="min-w-0"><div className="truncate text-sm font-semibold text-[var(--text)]">{cs.client}</div><div className="truncate text-[11px] text-[var(--muted)]">{cs.sector}</div></div>
                </div>
                <div className="mt-3 text-lg font-bold leading-tight text-emerald-400">{cs.headline}</div>
                <p className="mt-2 flex-1 text-xs leading-relaxed text-[var(--muted)]">{cs.blurb}</p>
                <div className="mt-3 border-t border-[var(--border)] pt-2.5"><Badge tone="indigo">{cs.solution}</Badge></div>
              </Card>
            ))}
          </div>
        </div>

        {/* partners & credentials */}
        <Card className="p-5">
          <SectionTitle icon="briefcase" title="Partners & credentials"
            sub={`${PARTNER_TOTALS.engineers} engineers · ${PARTNER_TOTALS.certs} certifications across the CX practice`} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {PARTNERS.map((p, i) => (
              <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--text)]">{p.name}</span>
                  <Badge tone="emerald">{p.tier.split(" · ")[0]}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-[var(--muted)]">
                  <span><span className="font-semibold text-[var(--text)] tabular-nums">{p.engineers}</span> eng</span>
                  <span><span className="font-semibold text-[var(--text)] tabular-nums">{p.certs}</span> certs</span>
                </div>
                <div className="mt-2 text-[11px] leading-snug text-[var(--faint)]">{p.note}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  window.Overview = Overview;
})();

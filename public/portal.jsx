/* Customer Portal — client-facing shell + section router.
   Sections: roai (ROAI Center) · projects · marketplace · billing (Usage & Billing) · insights.
   Warm, trust-building tone; internal margins/net never shown. */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const { CLIENTS } = window.AGENCY;
  const { fmtUSD, fmtMult, fmtPct, fmtNum } = window.FMT;
  const U = window.UI;
  const { Card, Badge, Progress, LineArea, Donut, MetronomeBadge, SectionTitle, InfoDot, ROAI_TIP_SHORT, C, cx } = U;

  // ------------------------------- Header -------------------------------
  function PortalHeader({ client, clients, onPick }) {
    const h = client.billing.hybrid;
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-fg)]">{client.short}</span>
          <div>
            <div className="text-sm text-[var(--muted)]">Welcome back,</div>
            <div className="text-lg font-bold text-[var(--text)]">{client.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {h.gated
            ? <Badge tone="rose" icon="alert">AI paused</Badge>
            : h.pct >= 88
              ? <Badge tone="amber" icon="alert">Credits low</Badge>
              : <Badge tone="emerald" icon="checkCircle">Account healthy</Badge>}
          <button className="hidden items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--chip)] px-3 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--panel-hi)] sm:flex">
            <Icon name="share" size={14} className="text-[var(--muted)]" /> Share
          </button>
          <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--chip)] px-3 py-2 text-sm">
            <span className="text-[var(--muted)]">Viewing as</span>
            <select value={client.id} onChange={(e) => onPick(e.target.value)}
              className="cursor-pointer bg-transparent font-medium text-[var(--text)] outline-none">
              {clients.map((c) => <option key={c.id} value={c.id} className="bg-[var(--panel)] text-[var(--text)]">{c.name}</option>)}
            </select>
          </label>
        </div>
      </div>
    );
  }

  // ----------------------------- ROAI Center ----------------------------
  function ROAICenter({ client }) {
    const c = client;
    return (
      <div className="space-y-6">
        {/* hero ROAI statement */}
        <Card className="relative overflow-hidden p-8 text-center" style={{ background: "var(--hero)" }}>
          <div className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-48 w-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,.22), transparent 70%)" }} />
          <div className="relative">
            <Badge tone="emerald" icon="sparkles" className="mb-5">Q2 2026 results</Badge>
            <h2 className="text-xl font-semibold text-[var(--muted)]">Your AI investment delivered</h2>
            <div className="my-2 text-[88px] font-bold leading-[0.9] tracking-tight text-[var(--text)] tabular-nums">
              {fmtMult(c.roai)}
            </div>
            <h2 className="text-2xl font-semibold text-[var(--text)]">return this quarter</h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-[var(--muted)]">
              For every <span className="font-semibold text-[var(--text)]">$1</span> invested in AI, your agents created
              <span className="font-semibold text-emerald-400"> {fmtUSD(c.roai, { cents: true })}</span> in measurable value.
            </p>
            <div className="mx-auto mt-7 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Value delivered", value: fmtUSD(c.value, { compact: true }), icon: "dollar" },
                { label: "Hours saved", value: fmtNum(c.hoursSaved), icon: "clock" },
                { label: "Revenue uplift", value: fmtUSD(c.revenueUplift, { compact: true }), icon: "trendUp" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
                  <Icon name={s.icon} size={16} className="mx-auto text-[var(--accent-fg)]" />
                  <div className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">{s.value}</div>
                  <div className="mt-0.5 text-xs text-[var(--muted)]">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* value vs investment + simple explainer */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="p-6 lg:col-span-8">
            <SectionTitle icon="chart" title={<span className="inline-flex items-center gap-1.5">Value vs. your AI investment <InfoDot label={ROAI_TIP_SHORT} /></span>} sub="Delivered value compared with what you spent on AI, month by month" />
            <LineArea data={c.trend} height={244} formatY={(v) => fmtUSD(v, { compact: true })} formatTip={(v) => fmtUSD(v)}
              series={[{ key: "value", label: "Value delivered", color: C.emerald, area: true }, { key: "cost", label: "Your AI investment", color: C.amber, area: false }]} />
          </Card>

          <Card className="flex flex-col justify-center p-6 lg:col-span-4">
            <div className="text-sm font-medium text-[var(--text)]">How your return is measured</div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              We add up the <span className="font-medium text-emerald-400">value your agents created</span> — hours saved plus revenue uplift — and compare it to your AI investment. Nothing estimated; every figure traces back to metered usage.
            </p>
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <span className="text-sm text-[var(--muted)]">Value delivered</span>
                <span className="font-semibold tabular-nums text-emerald-400">{fmtUSD(c.value, { compact: true })}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3">
                <span className="flex items-center gap-1.5 text-sm text-[var(--muted)]">Your AI investment <MetronomeBadge size="sm" /></span>
                <span className="font-semibold tabular-nums text-[var(--text)]">{fmtUSD(c.cost, { compact: true })}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
                <span className="text-sm font-medium text-[var(--text)]">Net value created</span>
                <span className="font-bold tabular-nums text-emerald-400">{fmtUSD(c.net, { compact: true })}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ------------------------------- Router -------------------------------
  function Portal({ client, section = "roai", onPick, billingTab, setBillingTab }) {
    const c = client;
    const { AlertBanner } = window.Billing;
    const { ActiveProjects, Marketplace, Insights } = window.ClientViews;
    const { ClientBilling } = window.BillingScreens;

    let body;
    if (section === "projects") body = <ActiveProjects client={c} />;
    else if (section === "marketplace") body = <Marketplace client={c} />;
    else if (section === "billing") body = <ClientBilling client={c} tab={billingTab} setTab={setBillingTab} />;
    else if (section === "insights") body = <Insights client={c} />;
    else body = <ROAICenter client={c} />;

    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <PortalHeader client={c} clients={CLIENTS} onPick={onPick} />
        {section !== "billing" && <AlertBanner client={c} model="hybrid" />}
        {body}
        <p className="pb-2 text-center text-xs text-[var(--faint)]">Questions about your results? Your strategist is one message away.</p>
      </div>
    );
  }

  window.Portal = Portal;
})();

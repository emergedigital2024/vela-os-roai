/* Billing Management screens — Agency (internal) and Customer (portal).
   Exposed as window.BillingScreens = { AgencyBilling, ClientBilling }.
   Reuses window.Billing panels (CommitPanel/HybridCreditPanel/AlertBanner) + window.UI primitives. */
(function () {
  const { useState } = React;
  const Icon = window.Icon;
  const { CLIENTS, PORTFOLIO, INVOICES, contractOf } = window.AGENCY;
  const { fmtUSD, fmtMult, fmtNum } = window.FMT;
  const U = window.UI;
  const { Card, Badge, Progress, LineArea, Modal, InfoDot, SectionTitle, MetronomeBadge, C, cx, ROAI_TIP, ROAI_TIP_SHORT } = U;

  const HYBRID_TIP = "Hybrid billing = a fixed subscription plus usage-based AI credits, metered in real time by Metronome. Seats set the pooled monthly credit allotment; top-ups and overages bill on top.";
  const ST = {
    paid: { tone: "emerald", label: "Paid" }, sent: { tone: "indigo", label: "Sent" },
    overdue: { tone: "rose", label: "Overdue" }, partial: { tone: "amber", label: "Partial" },
    draft: { tone: "neutral", label: "Draft" }, submitted: { tone: "indigo", label: "Submitted" },
  };
  const METHOD_ICON = { card: "card", ach: "building", wire: "building", po: "receipt", gpc: "wallet" };
  const StatusBadge = ({ s }) => <Badge tone={(ST[s] || ST.draft).tone}>{(ST[s] || ST.draft).label}</Badge>;
  const owed = (i) => i.amount - i.paid;
  const isOutstanding = (s) => s === "sent" || s === "overdue" || s === "partial";

  function Tabs({ tabs, value, onChange }) {
    return (
      <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-0.5">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => onChange(t.k)}
            className={cx("flex-none rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              value === t.k ? "bg-[var(--accent-soft)] text-[var(--accent-fg)]" : "text-[var(--muted)] hover:bg-[var(--panel-hi)] hover:text-[var(--text)]")}>
            {t.label}
          </button>
        ))}
      </div>
    );
  }

  function StatCard({ label, value, sub, tone, tip }) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-1.5 text-sm text-[var(--muted)]">{label}{tip && <InfoDot label={tip} />}</div>
        <div className="mt-2 text-2xl font-bold tabular-nums" style={{ color: tone || "var(--text)" }}>{value}</div>
        {sub && <div className="mt-1 text-xs text-[var(--muted)]">{sub}</div>}
      </Card>
    );
  }

  // ============================================================ AGENCY ============================================================
  function AgencyOverview({ eff }) {
    const outstandingList = INVOICES.filter((i) => isOutstanding(eff(i)));
    const collected = INVOICES.reduce((s, i) => s + (eff(i) === "paid" ? i.amount : eff(i) === "partial" ? i.paid : 0), 0);
    const outstandingTotal = outstandingList.reduce((s, i) => s + owed(i), 0);
    const rate = collected + outstandingTotal > 0 ? (collected / (collected + outstandingTotal)) * 100 : 100;
    const aging = { current: 0, d130: 0, d3160: 0 };
    outstandingList.forEach((i) => { const s = eff(i); aging[s === "sent" ? "current" : s === "partial" ? "d130" : "d3160"] += owed(i); });
    const agingMax = Math.max(aging.current, aging.d130, aging.d3160, 1);
    const mrrTrend = PORTFOLIO.trend.map((t, i) => ({ month: t.month, mrr: Math.round(PORTFOLIO.totalMRR * (0.78 + 0.22 * (i / (PORTFOLIO.trend.length - 1)))) }));
    const top = [...CLIENTS].map((c) => ({ c, spend: c.mrr + Math.round(c.cost / 3) })).sort((a, b) => b.spend - a.spend).slice(0, 5);
    const topMax = top[0].spend;
    const AGE = [["Current", aging.current, C.emerald], ["1–30 days", aging.d130, C.amber], ["31–60 days", aging.d3160, C.rose]];
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Recurring revenue" value={fmtUSD(PORTFOLIO.totalMRR) + "/mo"} sub={`${CLIENTS.length} active contracts`} />
          <StatCard label="Outstanding" value={fmtUSD(outstandingTotal, { compact: true })} sub={`${outstandingList.length} open invoices`} tone={outstandingTotal > 0 ? "#f59e0b" : "var(--text)"} />
          <StatCard label="Collection rate" value={Math.round(rate) + "%"} sub="Collected vs billed" tone="#34d399" />
          <StatCard label="Metered usage" value={PORTFOLIO.tokensM.toLocaleString() + "M"} sub="tokens this quarter" tip={HYBRID_TIP} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="p-5 lg:col-span-7">
            <SectionTitle icon="chart" title="Recurring revenue trend" sub="Monthly recurring revenue across the portfolio" right={<MetronomeBadge />} />
            <LineArea data={mrrTrend} height={224} formatY={(v) => fmtUSD(v, { compact: true })} formatTip={(v) => fmtUSD(v)}
              series={[{ key: "mrr", label: "MRR", color: C.indigo, area: true }]} />
          </Card>
          <Card className="p-5 lg:col-span-5">
            <SectionTitle icon="receipt" title="Invoice aging" sub="Outstanding balance by age" />
            <div className="space-y-4">
              {AGE.map(([label, val, color]) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm"><span className="text-[var(--muted)]">{label}</span><span className="font-semibold tabular-nums text-[var(--text)]">{fmtUSD(val, { compact: true })}</span></div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[var(--track)]"><div className="h-full rounded-full" style={{ width: (val / agingMax) * 100 + "%", background: color }} /></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <Card className="p-5">
          <SectionTitle icon="trendUp" title="Top clients by spend" sub="Subscription + metered usage this cycle" />
          <div className="space-y-3">
            {top.map(({ c, spend }) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[var(--chip)] text-[11px] font-bold text-[var(--text)]">{c.short}</span>
                <span className="w-40 flex-none truncate text-sm font-medium text-[var(--text)]">{c.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--track)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: (spend / topMax) * 100 + "%" }} /></div>
                <span className="w-20 flex-none text-right text-sm font-semibold tabular-nums text-[var(--text)]">{fmtUSD(spend, { compact: true })}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  function AgencyInvoices({ eff, act, onOpen }) {
    const [status, setStatus] = useState("All");
    const [client, setClient] = useState("All");
    const [q, setQ] = useState("");
    const rows = INVOICES.filter((i) => (status === "All" || eff(i) === status) && (client === "All" || i.clientId === client) && (q === "" || i.number.toLowerCase().includes(q.toLowerCase())));
    const nameOf = (id) => CLIENTS.find((c) => c.id === id).name;
    const Sel = ({ value, onChange, children }) => (
      <select value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--chip)] px-2.5 py-1.5 text-sm font-medium text-[var(--text)] outline-none">{children}</select>
    );
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-4">
          <div className="mr-auto text-sm font-semibold text-[var(--text)]">{rows.length} invoices</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search #" className="w-28 rounded-lg border border-[var(--border)] bg-[var(--chip)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]" />
          <Sel value={status} onChange={setStatus}><option value="All">All statuses</option>{["paid", "sent", "overdue", "partial", "draft"].map((s) => <option key={s} value={s}>{ST[s].label}</option>)}</Sel>
          <Sel value={client} onChange={setClient}><option value="All">All clients</option>{CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Sel>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)]"><tr className="text-left text-xs text-[var(--muted)]">
              <th className="px-4 py-2.5 font-medium">Invoice</th><th className="px-4 py-2.5 font-medium">Client</th><th className="px-4 py-2.5 font-medium">Issued</th><th className="px-4 py-2.5 font-medium">Due</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((i) => {
                const s = eff(i);
                return (
                  <tr key={i.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[var(--text)]">{i.number}</td>
                    <td className="px-4 py-3"><button onClick={() => onOpen(i.clientId)} className="font-medium text-[var(--text)] hover:text-[var(--accent-fg)]">{nameOf(i.clientId)}</button></td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{i.issued}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{i.due}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--text)]">{fmtUSD(i.amount)}</td>
                    <td className="px-4 py-3"><StatusBadge s={s} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {s === "draft" && <button onClick={() => act(i, "sent")} className="rounded-md border border-[var(--border)] bg-[var(--chip)] px-2 py-1 text-xs font-medium text-[var(--text)] hover:bg-[var(--panel-hi)]">Send</button>}
                        {isOutstanding(s) && <button onClick={() => act(i, "paid")} className="rounded-md border border-emerald-500/25 bg-emerald-500/[0.08] px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/15">Mark paid</button>}
                        <button className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--chip)] px-2 py-1 text-xs font-medium text-[var(--text)] hover:bg-[var(--panel-hi)]"><Icon name="download" size={12} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  function AgencyContracts({ onOpen }) {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4"><h3 className="text-base font-semibold text-[var(--text)]">Active contracts <InfoDot label={HYBRID_TIP} /></h3><p className="mt-0.5 text-sm text-[var(--muted)]">Hybrid seat-based and enterprise prepaid commit agreements</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)]"><tr className="text-left text-xs text-[var(--muted)]">
              <th className="px-5 py-2.5 font-medium">Client</th><th className="px-4 py-2.5 font-medium">Model</th><th className="px-4 py-2.5 font-medium">Term</th>
              <th className="px-4 py-2.5 text-right font-medium">Contract value</th><th className="px-4 py-2.5 text-right font-medium">Seats</th><th className="px-4 py-2.5 font-medium">Renewal</th><th className="px-4 py-2.5 font-medium">Terms</th><th className="px-2"></th>
            </tr></thead>
            <tbody>
              {CLIENTS.map((c) => {
                const ct = contractOf(c);
                return (
                  <tr key={c.id} onClick={() => onOpen(c.id)} className="group cursor-pointer border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--panel-hi)]">
                    <td className="px-5 py-3"><div className="flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--chip)] text-[11px] font-bold text-[var(--text)]">{c.short}</span><span className="font-medium text-[var(--text)]">{c.name}</span></div></td>
                    <td className="px-4 py-3"><Badge tone={ct.type.startsWith("Enterprise") ? "indigo" : "neutral"}>{ct.type}</Badge></td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{ct.term}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--text)]">{fmtUSD(ct.value, { compact: true })}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--muted)]">{ct.seats}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{ct.renewal}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{ct.netTerms}</td>
                    <td className="px-2"><Icon name="chevronRight" size={15} className="text-[var(--faint)] transition-transform group-hover:translate-x-0.5" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  function AgencyClients({ eff, onOpen }) {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4"><h3 className="text-base font-semibold text-[var(--text)]">Client billing</h3><p className="mt-0.5 text-sm text-[var(--muted)]">Open a client for their full billing profile</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)]"><tr className="text-left text-xs text-[var(--muted)]">
              <th className="px-5 py-2.5 font-medium">Client</th><th className="px-4 py-2.5 font-medium">Account</th><th className="px-4 py-2.5 text-right font-medium">MRR</th>
              <th className="px-4 py-2.5 text-right font-medium">Outstanding</th><th className="px-4 py-2.5 font-medium">Terms</th><th className="px-4 py-2.5 font-medium">Method</th><th className="px-2"></th>
            </tr></thead>
            <tbody>
              {CLIENTS.map((c) => {
                const out = c.invoices.filter((i) => isOutstanding(eff(i))).reduce((s, i) => s + owed(i), 0);
                const m = c.acct.methods[0];
                return (
                  <tr key={c.id} onClick={() => onOpen(c.id)} className="group cursor-pointer border-b border-[var(--border)] last:border-0 transition-colors hover:bg-[var(--panel-hi)]">
                    <td className="px-5 py-3"><div className="flex items-center gap-2.5"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--chip)] text-[11px] font-bold text-[var(--text)]">{c.short}</span><div><div className="font-medium text-[var(--text)]">{c.name}</div><div className="text-xs text-[var(--muted)]">{c.plan}</div></div></div></td>
                    <td className="px-4 py-3"><Badge tone={c.acct.type === "Government" ? "amber" : c.acct.type === "Enterprise" ? "indigo" : "neutral"}>{c.acct.type}</Badge></td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--text)]">{fmtUSD(c.mrr)}</td>
                    <td className="px-4 py-3 text-right tabular-nums" style={{ color: out > 0 ? "#f59e0b" : "var(--muted)" }}>{out > 0 ? fmtUSD(out, { compact: true }) : "—"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{c.acct.netTerms}</td>
                    <td className="px-4 py-3"><span className="flex items-center gap-1.5 text-[var(--muted)]"><Icon name={METHOD_ICON[m.kind] || "card"} size={13} />{m.label}</span></td>
                    <td className="px-2"><Icon name="chevronRight" size={15} className="text-[var(--faint)] transition-transform group-hover:translate-x-0.5" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    );
  }

  function ClientBillingProfile({ client, eff, onBack, onOpenDeepDive }) {
    const c = client, ct = contractOf(c);
    const { CommitPanel, HybridCreditPanel } = window.Billing;
    const out = c.invoices.filter((i) => isOutstanding(eff(i))).reduce((s, i) => s + owed(i), 0);
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--text)]"><Icon name="arrowLeft" size={15} /> Back to billing</button>
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-[var(--chip)] text-base font-bold text-[var(--text)]">{c.short}</span>
              <div>
                <div className="flex items-center gap-2"><h2 className="text-xl font-bold text-[var(--text)]">{c.name}</h2><Badge tone={c.acct.type === "Government" ? "amber" : c.acct.type === "Enterprise" ? "indigo" : "neutral"}>{c.acct.type}</Badge></div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
                  <span>{c.plan} plan</span><span className="text-[var(--faint)]">·</span><span>{c.acct.netTerms}</span><span className="text-[var(--faint)]">·</span>
                  <span className="flex items-center gap-1.5"><Icon name={METHOD_ICON[c.acct.methods[0].kind] || "card"} size={13} />{c.acct.methods[0].detail}</span>
                  {c.acct.poNumber && <><span className="text-[var(--faint)]">·</span><span>PO {c.acct.poNumber}</span></>}
                </div>
              </div>
            </div>
            <button onClick={() => onOpenDeepDive(c)} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--chip)] px-3.5 py-2 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[var(--panel-hi)]"><Icon name="chart" size={15} /> Open ROAI deep dive</button>
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="MRR" value={fmtUSD(c.mrr)} sub="subscription" />
          <StatCard label="Outstanding" value={out > 0 ? fmtUSD(out, { compact: true }) : "$0"} tone={out > 0 ? "#f59e0b" : "#34d399"} sub={out > 0 ? "due" : "all settled"} />
          <StatCard label="ROAI" value={fmtMult(c.roai)} tone="#34d399" tip={ROAI_TIP} sub="this quarter" />
          <StatCard label="Contract" value={fmtUSD(ct.value, { compact: true })} sub={ct.type} />
        </div>
        <Card className="p-5">
          <SectionTitle icon="card" title="Contract & usage" sub={ct.type} right={<MetronomeBadge />} />
          {c.billing.model === "commit" ? <CommitPanel client={c} /> : <HybridCreditPanel client={c} />}
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-4"><h3 className="text-base font-semibold text-[var(--text)]">Billing history</h3></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-[var(--border)]"><tr className="text-left text-xs text-[var(--muted)]"><th className="px-5 py-2.5 font-medium">Invoice</th><th className="px-4 py-2.5 font-medium">Period</th><th className="px-4 py-2.5 text-right font-medium">Amount</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 font-medium">Due</th></tr></thead>
            <tbody>{c.invoices.map((i) => <tr key={i.id} className="border-b border-[var(--border)] last:border-0"><td className="px-5 py-3 font-mono text-xs text-[var(--text)]">{i.number}</td><td className="px-4 py-3 text-[var(--muted)]">{i.period}</td><td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--text)]">{fmtUSD(i.amount)}</td><td className="px-4 py-3"><StatusBadge s={eff(i)} /></td><td className="px-4 py-3 text-[var(--muted)]">{i.due}</td></tr>)}</tbody>
          </table></div>
        </Card>
      </div>
    );
  }

  function AgencyBilling({ tab, setTab, onOpenDeepDive }) {
    const [profileId, setProfileId] = useState(null);
    const [override, setOverride] = useState({});
    const eff = (i) => override[i.id] || i.status;
    const act = (i, status) => setOverride((p) => ({ ...p, [i.id]: status }));
    if (profileId) return <ClientBillingProfile client={CLIENTS.find((c) => c.id === profileId)} eff={eff} onBack={() => setProfileId(null)} onOpenDeepDive={onOpenDeepDive} />;
    const TABS = [{ k: "overview", label: "Overview" }, { k: "invoices", label: "Invoices" }, { k: "contracts", label: "Contracts" }, { k: "clients", label: "Clients" }];
    return (
      <div className="space-y-6">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        {tab === "invoices" ? <AgencyInvoices eff={eff} act={act} onOpen={setProfileId} />
          : tab === "contracts" ? <AgencyContracts onOpen={setProfileId} />
          : tab === "clients" ? <AgencyClients eff={eff} onOpen={setProfileId} />
          : <AgencyOverview eff={eff} />}
      </div>
    );
  }

  // ============================================================ CUSTOMER ============================================================
  function AddMethodModal({ client, onClose, onAdd }) {
    const gov = client.acct.type === "Government";
    const [kind, setKind] = useState(gov ? "po" : "card");
    const KINDS = gov ? [["po", "Purchase order"], ["gpc", "Government GPC"], ["wire", "Bank wire"]] : [["card", "Card"], ["ach", "ACH"]];
    const Field = ({ label, ph }) => (<label className="block"><span className="text-xs text-[var(--muted)]">{label}</span><input placeholder={ph} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]" /></label>);
    return (
      <div>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div className="font-semibold text-[var(--text)]">Add payment method</div><button onClick={onClose} className="text-[var(--faint)] hover:text-[var(--text)]"><Icon name="x" size={18} /></button></div>
        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-wrap gap-1.5">{KINDS.map(([k, l]) => <button key={k} onClick={() => setKind(k)} className={cx("rounded-lg border px-3 py-1.5 text-sm font-medium", kind === k ? "border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent-fg)]" : "border-[var(--border)] bg-[var(--chip)] text-[var(--muted)]")}>{l}</button>)}</div>
          {kind === "card" && <><Field label="Card number" ph="4242 4242 4242 4242" /><div className="grid grid-cols-2 gap-3"><Field label="Expiry" ph="12 / 28" /><Field label="CVC" ph="123" /></div></>}
          {kind === "ach" && <><Field label="Account holder" ph="Company name" /><div className="grid grid-cols-2 gap-3"><Field label="Routing" ph="•••• ••••" /><Field label="Account" ph="•••• ••••" /></div></>}
          {kind === "wire" && <><Field label="Bank name" ph="Bank" /><Field label="IBAN / SWIFT" ph="•••• ••••" /></>}
          {kind === "gpc" && <><Field label="GPC card number" ph="Government purchase card" /><Field label="Agency / unit" ph="Procuring unit" /></>}
          {kind === "po" && <>
            <Field label="PO number" ph="PO #2026-XXX" />
            <label className="block"><span className="text-xs text-[var(--muted)]">Upload PO document</span>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--panel-2)] px-3 py-3 text-sm text-[var(--muted)]"><Icon name="download" size={15} className="rotate-180" /> Drop a PDF or <span className="text-[var(--accent-fg)]">browse</span><input type="file" className="hidden" /></div>
            </label>
            <div className="flex items-start gap-2 rounded-lg bg-[var(--panel-2)] p-3 text-xs text-[var(--muted)]"><Icon name="info" size={13} className="mt-0.5 flex-none text-[var(--faint)]" /> Government & enterprise orders are invoiced on {client.acct.netTerms} and released against the approved PO.</div>
          </>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-[var(--border)] bg-[var(--chip)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--panel-hi)]">Cancel</button>
          <button onClick={() => { onAdd({ kind, label: (KINDS.find(([k]) => k === kind) || [, "Method"])[1], detail: "Added just now" }); onClose(); }} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">Add method</button>
        </div>
      </div>
    );
  }

  function ClientOverview({ client, eff }) {
    const c = client, h = c.billing.hybrid;
    const { AlertBanner } = window.Billing;
    const due = c.invoices.filter((i) => isOutstanding(eff(i))).reduce((s, i) => s + owed(i), 0);
    const credits = h.monthlyRemaining + h.topupTotal;
    return (
      <div className="space-y-6">
        <AlertBanner client={c} model="hybrid" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-6"><div className="text-sm text-[var(--muted)]">Amount due</div><div className="mt-2 text-3xl font-bold tabular-nums" style={{ color: due > 0 ? "var(--text)" : "#34d399" }}>{fmtUSD(due)}</div><div className="mt-1 text-xs text-[var(--muted)]">{due > 0 ? "Due " + c.acct.netTerms : "You're all settled"}</div></Card>
          <Card className="p-6"><div className="flex items-center gap-1.5 text-sm text-[var(--muted)]">Credits balance <InfoDot label={HYBRID_TIP} /></div><div className="mt-2 text-3xl font-bold tabular-nums text-[var(--text)]">{fmtNum(credits)}</div><div className="mt-1 text-xs text-[var(--muted)]">monthly + top-up, resets {h.resetDate}</div></Card>
          <Card className="p-6"><div className="text-sm text-[var(--muted)]">Next invoice</div><div className="mt-2 text-3xl font-bold text-[var(--text)]">Jul 1</div><div className="mt-1 text-xs text-[var(--muted)]">est. {fmtUSD(c.mrr + Math.round(c.cost / 3), { compact: true })}</div></Card>
        </div>
        <Card className="relative overflow-hidden p-6" style={{ background: "var(--hero)" }}>
          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(16,185,129,.18), transparent 70%)" }} />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">Your AI is paying for itself <InfoDot label={ROAI_TIP_SHORT} /></div>
              <p className="mt-1 max-w-lg text-sm text-[var(--muted)]">Every $1 you invested in AI returned <span className="font-semibold text-[var(--text)]">{fmtUSD(c.roai, { cents: true })}</span> in measured value this quarter — your spend is funded by the value it creates.</p>
            </div>
            <div className="text-right"><div className="text-4xl font-bold tabular-nums text-emerald-400">{fmtMult(c.roai)}</div><div className="text-xs text-[var(--muted)]">return on AI investment</div></div>
          </div>
        </Card>
      </div>
    );
  }

  function ClientInvoices({ client, eff, act }) {
    const c = client, enterprise = c.acct.type !== "Standard";
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div className="flex items-center gap-2 font-semibold text-[var(--text)]"><Icon name="receipt" size={16} className="text-[var(--muted)]" /> Invoices</div><Badge tone="neutral">{c.invoices.length}</Badge></div>
        <div>
          {c.invoices.map((i) => {
            const s = eff(i);
            return (
              <div key={i.id} className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-5 py-3.5 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">{i.number} <StatusBadge s={s} /></div>
                  <div className="text-xs text-[var(--muted)]">{i.period} · due {i.due} · {i.terms}</div>
                </div>
                <div className="text-right text-sm font-semibold tabular-nums text-[var(--text)]">{fmtUSD(i.amount)}</div>
                <div className="flex items-center gap-1.5">
                  <button className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--chip)] px-2.5 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--panel-hi)]"><Icon name="download" size={13} /> PDF</button>
                  {isOutstanding(s) && (enterprise
                    ? <button onClick={() => act(i, "submitted")} className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]">Submit for approval</button>
                    : <button onClick={() => act(i, "paid")} className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]">Pay now</button>)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  function ClientPaymentMethods({ client }) {
    const [methods, setMethods] = useState(client.acct.methods);
    const [adding, setAdding] = useState(false);
    return (
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div className="font-semibold text-[var(--text)]">Payment methods</div><button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"><Icon name="plus" size={14} /> Add method</button></div>
          <div>
            {methods.map((m, idx) => (
              <div key={idx} className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3.5 last:border-0">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[var(--chip)] text-[var(--muted)]"><Icon name={METHOD_ICON[m.kind] || "card"} size={16} /></span>
                <div className="min-w-0 flex-1"><div className="text-sm font-medium text-[var(--text)]">{m.label}</div><div className="text-xs text-[var(--muted)]">{m.detail}</div></div>
                {m.default ? <Badge tone="emerald">Default</Badge> : <button onClick={() => setMethods((ms) => ms.map((x, i) => ({ ...x, default: i === idx })))} className="text-xs font-medium text-[var(--accent-fg)] hover:underline">Make default</button>}
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--muted)]"><Icon name="info" size={13} className="mt-0.5 flex-none text-[var(--faint)]" /> Billed on {client.acct.netTerms}{client.acct.poNumber ? ` against PO ${client.acct.poNumber}` : ""}. {client.acct.type === "Government" ? "Government orders support GPC and PO with compliance documentation." : "Usage is metered by Metronome and invoiced monthly."}</div>
        </Card>
        <Modal open={adding} onClose={() => setAdding(false)} maxWidth={420}>
          {adding && <AddMethodModal client={client} onClose={() => setAdding(false)} onAdd={(m) => setMethods((ms) => [...ms, m])} />}
        </Modal>
      </div>
    );
  }

  function ClientUsage({ client }) {
    const { HybridCreditPanel } = window.Billing;
    return (
      <Card className="p-5">
        <SectionTitle icon="cpu" title="Usage & credits" sub="Seats, pooled credits, and where your AI spend went" right={<MetronomeBadge />} />
        <HybridCreditPanel client={client} />
        <div className="mt-4 flex items-start gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]"><Icon name="info" size={13} className="mt-0.5 flex-none text-[var(--faint)]" /> Usage is metered in real time and tied to delivered value — your account is returning <span className="font-semibold text-emerald-400">&nbsp;{fmtMult(client.roai)}</span>&nbsp; on AI investment.</div>
      </Card>
    );
  }

  function ClientBilling({ client, tab, setTab }) {
    const [override, setOverride] = useState({});
    const eff = (i) => override[i.id] || i.status;
    const act = (i, status) => setOverride((p) => ({ ...p, [i.id]: status }));
    const TABS = [{ k: "overview", label: "Overview" }, { k: "invoices", label: "Invoices" }, { k: "payment", label: "Payment methods" }, { k: "usage", label: "Usage" }];
    return (
      <div className="space-y-6">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        {tab === "invoices" ? <ClientInvoices client={client} eff={eff} act={act} />
          : tab === "payment" ? <ClientPaymentMethods client={client} />
          : tab === "usage" ? <ClientUsage client={client} />
          : <ClientOverview client={client} eff={eff} />}
      </div>
    );
  }

  window.BillingScreens = { AgencyBilling, ClientBilling };
})();

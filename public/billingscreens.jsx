/* Billing Management screens — Agency (internal) and Customer (portal).
   Exposed as window.BillingScreens = { AgencyBilling, ClientBilling }.
   Shared state via window.Store; reuses window.Billing panels + window.UI primitives. */
(function () {
  const { useState, useEffect, useRef } = React;
  const Icon = window.Icon;
  const { CLIENTS, PORTFOLIO, contractOf, BILL, CREDIT_PACKS } = window.AGENCY;
  const { fmtUSD, fmtMult, fmtNum } = window.FMT;
  const U = window.UI;
  const { Card, Badge, Progress, LineArea, Modal, InfoDot, SectionTitle, MetronomeBadge, C, cx, ROAI_TIP, ROAI_TIP_SHORT } = U;
  const useBilling = window.Store.useBilling;
  const { isOutstanding, owed, outstandingTotal, agingBuckets } = BILL;

  const HYBRID_TIP = "Hybrid billing = a fixed subscription plus usage-based AI credits, metered in real time by Metronome. Seats set the pooled monthly credit allotment; top-ups and overages bill on top.";
  const NET_TIP = "Net 30 / Net 60 = payment is due 30 / 60 days after the invoice date. Enterprise and government accounts typically run longer net terms.";
  const COMMIT_TIP = "Enterprise commit = a prepaid multi-year spend commitment drawn down by usage, with negotiated rates and rollover — distinct from month-to-month hybrid billing.";
  const TRUEUP_TIP = "True-up = a periodic reconciliation invoice for usage above the committed/included amount, billed at the contracted overage rate.";
  const TOPUP_TIP = "Top-up = a one-off credit pack added on top of your monthly allotment. Released once payment confirms and valid for a full year.";

  const ST = {
    paid: { tone: "emerald", label: "Paid" }, sent: { tone: "indigo", label: "Sent" },
    overdue: { tone: "rose", label: "Overdue" }, partial: { tone: "amber", label: "Partial" },
    draft: { tone: "neutral", label: "Draft" }, submitted: { tone: "indigo", label: "Submitted" },
  };
  const METHOD_ICON = { card: "card", ach: "building", wire: "building", po: "receipt", gpc: "wallet" };
  const StatusBadge = ({ s }) => <Badge tone={(ST[s] || ST.draft).tone}>{(ST[s] || ST.draft).label}</Badge>;
  const nameOf = (id) => CLIENTS.find((c) => c.id === id).name;
  const clientOf = (id) => CLIENTS.find((c) => c.id === id);
  let GEN_SEQ = 9001;

  // ---- export helpers (mock PDF via jsPDF if present, CSV via Blob) ----
  function downloadBlob(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function lineItems(inv, client) {
    if (String(inv.id).startsWith("gen-")) return [["Usage-based AI credits (Metronome)", inv.amount]];
    const sub = Math.min(client.mrr, inv.amount);
    return [["Subscription — " + client.plan + " plan", sub], ["Usage-based AI credits (Metronome)", Math.max(0, inv.amount - sub)]];
  }
  function exportInvoicesCSV(rows, eff) {
    const head = ["Invoice", "Client", "Period", "Issued", "Due", "Amount", "Paid", "Status", "Terms"];
    const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const lines = rows.map((i) => [i.number, nameOf(i.clientId), i.period, i.issued, i.due, i.amount, i.paid, eff(i), i.terms].map(esc).join(","));
    downloadBlob("vela-invoices.csv", [head.join(","), ...lines].join("\n"), "text/csv");
  }
  function downloadInvoicePDF(inv, client, eff) {
    const J = window.jspdf && window.jspdf.jsPDF;
    if (!J) { window.print(); return; }
    const doc = new J({ unit: "pt", format: "a4" });
    let y = 56;
    doc.setFontSize(18); doc.text("Vela OS · FPT CX Services", 40, y); y += 24;
    doc.setFontSize(10); doc.setTextColor(120);
    doc.text("Invoice " + inv.number, 40, y); y += 15;
    doc.text(client.name + "  ·  " + client.acct.type + (client.acct.poNumber ? "  ·  PO " + client.acct.poNumber : ""), 40, y); y += 15;
    doc.text("Period " + inv.period + "    Issued " + inv.issued + "    Due " + inv.due + "    " + inv.terms, 40, y); y += 26;
    doc.setTextColor(20); doc.setFontSize(11);
    lineItems(inv, client).forEach(([label, amt]) => { doc.text(label, 40, y); doc.text("$" + amt.toLocaleString(), 430, y); y += 18; });
    y += 4; doc.setFontSize(13); doc.text("Total", 40, y); doc.text("$" + inv.amount.toLocaleString(), 430, y); y += 22;
    doc.setFontSize(10); doc.setTextColor(120); doc.text("Status: " + eff(inv), 40, y);
    doc.save(inv.number + ".pdf");
  }

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

  // ---- shared invoice PDF preview ----
  function InvoicePreview({ inv, client, eff, onClose }) {
    return (
      <div>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2 font-semibold text-[var(--text)]"><Icon name="receipt" size={16} className="text-[var(--muted)]" /> {inv.number}</div>
          <button onClick={onClose} className="text-[var(--faint)] hover:text-[var(--text)]"><Icon name="x" size={18} /></button>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-start justify-between">
            <div><div className="text-sm font-bold text-[var(--text)]">Vela OS · FPT CX Services</div><div className="text-xs text-[var(--muted)]">billing@vela-os.fpt</div></div>
            <div className="text-right"><StatusBadge s={eff(inv)} /></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4 text-sm">
            <div><div className="text-xs text-[var(--muted)]">Billed to</div><div className="font-medium text-[var(--text)]">{client.name}</div><div className="text-xs text-[var(--muted)]">{client.acct.type}{client.acct.poNumber ? " · PO " + client.acct.poNumber : ""}</div></div>
            <div className="text-right"><div className="text-xs text-[var(--muted)]">{inv.period}</div><div className="text-xs text-[var(--muted)]">Issued {inv.issued}</div><div className="text-xs text-[var(--muted)]">Due {inv.due} · {inv.terms}</div></div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {lineItems(inv, client).map(([label, amt], i) => (
              <div key={i} className="flex items-center justify-between"><span className="text-[var(--muted)]">{label}</span><span className="font-medium tabular-nums text-[var(--text)]">{fmtUSD(amt)}</span></div>
            ))}
            <div className="my-1 border-t border-dashed border-[var(--border)]" />
            <div className="flex items-center justify-between"><span className="font-semibold text-[var(--text)]">Total</span><span className="text-lg font-bold tabular-nums text-[var(--text)]">{fmtUSD(inv.amount)}</span></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-[var(--border)] bg-[var(--chip)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--panel-hi)]">Close</button>
          <button onClick={() => downloadInvoicePDF(inv, client, eff)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"><Icon name="download" size={14} /> Download PDF</button>
        </div>
      </div>
    );
  }

  // ============================================================ AGENCY ============================================================
  function AgencyOverview() {
    const B = useBilling();
    const all = B.allInvoices();
    const outstandingList = all.filter((i) => isOutstanding(B.effStatus(i)));
    const collected = all.reduce((s, i) => s + (B.effStatus(i) === "paid" ? i.amount : B.effStatus(i) === "partial" ? i.paid : 0), 0);
    const outTotal = outstandingList.reduce((s, i) => s + owed(i), 0);
    const rate = collected + outTotal > 0 ? (collected / (collected + outTotal)) * 100 : 100;
    const aging = agingBuckets(all, B.effStatus);
    const agingMax = Math.max(aging.current, aging.d130, aging.d3160, 1);
    const mrrTrend = PORTFOLIO.trend.map((t, i) => ({ month: t.month, mrr: Math.round(PORTFOLIO.totalMRR * (0.78 + 0.22 * (i / (PORTFOLIO.trend.length - 1)))) }));
    const top = [...CLIENTS].map((c) => ({ c, spend: c.mrr + Math.round(c.cost / 3) })).sort((a, b) => b.spend - a.spend).slice(0, 5);
    const topMax = top[0].spend;
    const AGE = [["Current", aging.current, C.emerald], ["1–30 days", aging.d130, C.amber], ["31–60 days", aging.d3160, C.rose]];
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Recurring revenue" value={fmtUSD(PORTFOLIO.totalMRR) + "/mo"} sub={`${CLIENTS.length} active contracts`} />
          <StatCard label="Outstanding" value={fmtUSD(outTotal, { compact: true })} sub={`${outstandingList.length} open invoices`} tone={outTotal > 0 ? "#f59e0b" : "var(--text)"} />
          <StatCard label="Collection rate" value={Math.round(rate) + "%"} sub="Collected vs billed" tone="#34d399" />
          <StatCard label="Metered usage" value={PORTFOLIO.tokensM.toLocaleString() + "M"} sub="tokens this quarter" tip={HYBRID_TIP} />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card className="p-5 lg:col-span-7">
            <SectionTitle icon="chart" title="Recurring revenue trend" sub="Monthly recurring revenue across the portfolio" right={<MetronomeBadge />} />
            <LineArea data={mrrTrend} height={224} formatY={(v) => fmtUSD(v, { compact: true })} formatTip={(v) => fmtUSD(v)} series={[{ key: "mrr", label: "MRR", color: C.indigo, area: true }]} />
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

  function GenerateInvoiceModal({ onClose, onCreate }) {
    const [cid, setCid] = useState(CLIENTS[0].id);
    const c = clientOf(cid);
    const events = c.models.map(([name, frac]) => ({ name, tokensM: Math.round(c.credits.tokensM * frac), amount: Math.round((c.cost / 3) * frac) }));
    const amount = events.reduce((s, e) => s + e.amount, 0);
    return (
      <div>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div className="flex items-center gap-2 font-semibold text-[var(--text)]"><Icon name="zap" size={16} className="text-[var(--accent-fg)]" /> Generate invoice from usage</div><button onClick={onClose} className="text-[var(--faint)] hover:text-[var(--text)]"><Icon name="x" size={18} /></button></div>
        <div className="px-5 py-5">
          <label className="block text-sm"><span className="text-xs text-[var(--muted)]">Client</span>
            <select value={cid} onChange={(e) => setCid(e.target.value)} className="mt-1 w-full cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 font-medium text-[var(--text)] outline-none">{CLIENTS.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          </label>
          <div className="mt-4 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-[var(--faint)]">Metered usage events <MetronomeBadge size="sm" /></div>
          <div className="mt-2 space-y-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3 text-sm">
            {events.map((e, i) => (
              <div key={i} className="flex items-center justify-between"><span className="text-[var(--muted)]">{e.name} · {e.tokensM}M tokens</span><span className="font-medium tabular-nums text-[var(--text)]">{fmtUSD(e.amount)}</span></div>
            ))}
            <div className="my-1 border-t border-dashed border-[var(--border)]" />
            <div className="flex items-center justify-between"><span className="font-semibold text-[var(--text)]">Invoice total</span><span className="font-bold tabular-nums text-[var(--text)]">{fmtUSD(amount)}</span></div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-[var(--border)] bg-[var(--chip)] px-4 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--panel-hi)]">Cancel</button>
          <button onClick={() => {
            const num = GEN_SEQ++;
            onCreate({ id: "gen-" + cid + "-" + num, clientId: cid, number: "INV-2026-" + num, period: "Jul 2026", issued: "Jul 1, 2026", due: c.acct.netTerms === "Net 60" ? "Sep 1, 2026" : "Aug 1, 2026", amount, paid: 0, status: "draft", method: c.acct.methods[0].label, terms: c.acct.netTerms });
            onClose();
          }} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]">Create invoice</button>
        </div>
      </div>
    );
  }

  function AgencyInvoices({ onOpen }) {
    const B = useBilling();
    const [status, setStatus] = useState("All");
    const [client, setClient] = useState("All");
    const [q, setQ] = useState("");
    const [preview, setPreview] = useState(null);
    const [gen, setGen] = useState(false);
    const eff = B.effStatus;
    const rows = B.allInvoices().filter((i) => (status === "All" || eff(i) === status) && (client === "All" || i.clientId === client) && (q === "" || i.number.toLowerCase().includes(q.toLowerCase())));
    const Sel = ({ value, onChange, children }) => (
      <select value={value} onChange={(e) => onChange(e.target.value)} className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--chip)] px-2.5 py-1.5 text-sm font-medium text-[var(--text)] outline-none">{children}</select>
    );
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] p-4">
          <div className="mr-auto text-sm font-semibold text-[var(--text)]">{rows.length} invoices</div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search #" className="w-24 rounded-lg border border-[var(--border)] bg-[var(--chip)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--faint)]" />
          <Sel value={status} onChange={setStatus}><option value="All">All statuses</option>{["paid", "sent", "overdue", "partial", "draft", "submitted"].map((s) => <option key={s} value={s}>{ST[s].label}</option>)}</Sel>
          <Sel value={client} onChange={setClient}><option value="All">All clients</option>{CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Sel>
          <button onClick={() => setGen(true)} className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--chip)] px-2.5 py-1.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--panel-hi)]"><Icon name="zap" size={13} /> Generate from usage</button>
          <button onClick={() => exportInvoicesCSV(rows, eff)} className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--chip)] px-2.5 py-1.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--panel-hi)]"><Icon name="download" size={13} /> Export all</button>
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
                        {s === "draft" && <button onClick={() => B.setStatus(i.id, "sent")} className="rounded-md border border-[var(--border)] bg-[var(--chip)] px-2 py-1 text-xs font-medium text-[var(--text)] hover:bg-[var(--panel-hi)]">Send</button>}
                        {isOutstanding(s) && <button onClick={() => B.setStatus(i.id, "paid")} className="rounded-md border border-emerald-500/25 bg-emerald-500/[0.08] px-2 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/15">Mark paid</button>}
                        <button onClick={() => setPreview(i)} className="rounded-md border border-[var(--border)] bg-[var(--chip)] px-2 py-1 text-xs font-medium text-[var(--text)] hover:bg-[var(--panel-hi)]">View</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Modal open={!!preview} onClose={() => setPreview(null)} maxWidth={460}>{preview && <InvoicePreview inv={preview} client={clientOf(preview.clientId)} eff={eff} onClose={() => setPreview(null)} />}</Modal>
        <Modal open={gen} onClose={() => setGen(false)} maxWidth={460}>{gen && <GenerateInvoiceModal onClose={() => setGen(false)} onCreate={B.addGenInvoice} />}</Modal>
      </Card>
    );
  }

  function AgencyContracts({ onOpen }) {
    return (
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4"><h3 className="text-base font-semibold text-[var(--text)]">Active contracts <InfoDot label={COMMIT_TIP} /></h3><p className="mt-0.5 text-sm text-[var(--muted)]">Hybrid seat-based and enterprise prepaid commit agreements</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--border)]"><tr className="text-left text-xs text-[var(--muted)]">
              <th className="px-5 py-2.5 font-medium">Client</th><th className="px-4 py-2.5 font-medium">Model</th><th className="px-4 py-2.5 font-medium">Term</th>
              <th className="px-4 py-2.5 text-right font-medium">Contract value</th><th className="px-4 py-2.5 text-right font-medium">Seats</th><th className="px-4 py-2.5 font-medium">Renewal</th>
              <th className="px-4 py-2.5 font-medium"><span className="inline-flex items-center gap-1">Terms <InfoDot label={NET_TIP} /></span></th><th className="px-2"></th>
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

  function AgencyClients({ onOpen }) {
    const B = useBilling();
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
                const out = outstandingTotal(B.invoicesFor(c.id), B.effStatus);
                const m = B.methodsFor(c)[0];
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

  function ClientBillingProfile({ client, onBack, onOpenDeepDive }) {
    const B = useBilling();
    const c = client, ct = contractOf(c);
    const { CommitPanel, HybridCreditPanel } = window.Billing;
    const invoices = B.invoicesFor(c.id);
    const out = outstandingTotal(invoices, B.effStatus);
    const [preview, setPreview] = useState(null);
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
                  <span>{c.plan} plan</span><span className="text-[var(--faint)]">·</span><span className="inline-flex items-center gap-1">{c.acct.netTerms} <InfoDot label={NET_TIP} /></span><span className="text-[var(--faint)]">·</span>
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
          <StatCard label="Contract" value={fmtUSD(ct.value, { compact: true })} sub={ct.type} tip={ct.type.startsWith("Enterprise") ? COMMIT_TIP : HYBRID_TIP} />
        </div>
        <Card className="p-5">
          <SectionTitle icon="card" title="Contract & usage" sub={ct.type} right={<MetronomeBadge />} />
          {c.billing.model === "commit" ? <CommitPanel client={c} /> : <HybridCreditPanel client={c} />}
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-4"><h3 className="text-base font-semibold text-[var(--text)]">Billing history</h3></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-[var(--border)]"><tr className="text-left text-xs text-[var(--muted)]"><th className="px-5 py-2.5 font-medium">Invoice</th><th className="px-4 py-2.5 font-medium">Period</th><th className="px-4 py-2.5 text-right font-medium">Amount</th><th className="px-4 py-2.5 font-medium">Status</th><th className="px-4 py-2.5 text-right font-medium">Actions</th></tr></thead>
            <tbody>{invoices.map((i) => <tr key={i.id} className="border-b border-[var(--border)] last:border-0"><td className="px-5 py-3 font-mono text-xs text-[var(--text)]">{i.number}</td><td className="px-4 py-3 text-[var(--muted)]">{i.period}</td><td className="px-4 py-3 text-right font-semibold tabular-nums text-[var(--text)]">{fmtUSD(i.amount)}</td><td className="px-4 py-3"><StatusBadge s={B.effStatus(i)} /></td><td className="px-4 py-3 text-right"><button onClick={() => setPreview(i)} className="rounded-md border border-[var(--border)] bg-[var(--chip)] px-2 py-1 text-xs font-medium text-[var(--text)] hover:bg-[var(--panel-hi)]">View</button></td></tr>)}</tbody>
          </table></div>
        </Card>
        <Modal open={!!preview} onClose={() => setPreview(null)} maxWidth={460}>{preview && <InvoicePreview inv={preview} client={c} eff={B.effStatus} onClose={() => setPreview(null)} />}</Modal>
      </div>
    );
  }

  // ---- live Metronome (via the Worker proxy at /api/metronome/*) ----
  async function mt(path) {
    try {
      const res = await fetch("/api/metronome/" + path);
      const data = await res.json().catch(() => null);
      return { ok: res.ok, status: res.status, data };
    } catch (_) { return { ok: false, status: 0, data: null }; }
  }
  // Metronome amounts are in USD cents; fmtUSD expects dollars → divide by 100.
  const num = (v) => (typeof v === "number" ? fmtUSD(Math.round(v) / 100) : v != null ? String(v) : "—");

  function MetronomeLive() {
    const [conn, setConn] = useState("loading"); // loading | connected | notconfigured | error
    const [customers, setCustomers] = useState(null);
    const [sel, setSel] = useState(null);
    const [detail, setDetail] = useState(null);
    useEffect(() => {
      let alive = true;
      (async () => {
        const p = await mt("ping");
        if (!alive) return;
        if (p.status === 503) return setConn("notconfigured");
        if (!p.ok || !p.data || !p.data.ok) return setConn("error");
        setConn("connected");
        const cs = await mt("customers?limit=100");
        if (!alive) return;
        setCustomers(cs.ok && cs.data && Array.isArray(cs.data.data) ? cs.data.data : []);
      })();
      return () => { alive = false; };
    }, []);
    const open = async (c) => {
      setSel(c); setDetail({ loading: true });
      const [inv, bal] = await Promise.all([mt("invoices?customer_id=" + c.id), mt("balances?customer_id=" + c.id)]);
      setDetail({ loading: false, invoices: (inv.ok && inv.data && inv.data.data) || [], balances: (bal.ok && bal.data && bal.data.data) || [] });
    };
    const badge = conn === "connected" ? <Badge tone="emerald" icon="checkCircle">Connected</Badge>
      : conn === "notconfigured" ? <Badge tone="amber" icon="alert">Not configured</Badge>
      : conn === "error" ? <Badge tone="rose" icon="alert">Unreachable</Badge>
      : <Badge tone="neutral">Connecting…</Badge>;
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2"><MetronomeBadge /><span className="text-base font-semibold text-[var(--text)]">Live billing data</span></div>
          {badge}
        </div>
        {conn === "notconfigured" && (
          <div className="px-5 py-8 text-center text-sm text-[var(--muted)]">
            <Icon name="alert" size={22} className="mx-auto text-amber-400" />
            <div className="mt-2 font-medium text-[var(--text)]">Metronome key not set</div>
            <div className="mt-1">Add it as a Worker secret, then this panel goes live:</div>
            <code className="mt-2 inline-block rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 font-mono text-xs text-[var(--text)]">npx wrangler secret put METRONOME_API_KEY</code>
          </div>
        )}
        {conn === "error" && <div className="px-5 py-8 text-center text-sm text-[var(--muted)]"><Icon name="alert" size={22} className="mx-auto text-rose-400" /><div className="mt-2 text-[var(--text)]">Couldn't reach Metronome. Check the key and try again.</div></div>}
        {conn === "loading" && <div className="px-5 py-8 text-center text-sm text-[var(--muted)]">Connecting to Metronome…</div>}
        {conn === "connected" && !sel && (
          customers == null ? <div className="px-5 py-8 text-center text-sm text-[var(--muted)]">Loading customers…</div>
          : customers.length === 0 ? <div className="px-5 py-8 text-center text-sm text-[var(--muted)]">No customers in this Metronome account yet.</div>
          : <div>
              {customers.map((c) => (
                <button key={c.id} onClick={() => open(c)} className="flex w-full items-center gap-3 border-b border-[var(--border)] px-5 py-3.5 text-left transition-colors last:border-0 hover:bg-[var(--panel-hi)]">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[var(--chip)] text-[11px] font-bold text-[var(--text)]">{(c.name || "?").slice(0, 2).toUpperCase()}</span>
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-[var(--text)]">{c.name || c.id}</div><div className="truncate font-mono text-[11px] text-[var(--muted)]">{c.external_id || c.id}</div></div>
                  <Icon name="chevronRight" size={15} className="text-[var(--faint)]" />
                </button>
              ))}
            </div>
        )}
        {conn === "connected" && sel && (
          <div className="px-5 py-4">
            <button onClick={() => { setSel(null); setDetail(null); }} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--text)]"><Icon name="arrowLeft" size={15} /> All customers</button>
            <div className="mb-3 text-base font-semibold text-[var(--text)]">{sel.name || sel.id}</div>
            {detail && detail.loading ? <div className="py-6 text-center text-sm text-[var(--muted)]">Loading…</div> : detail && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--faint)]">Invoices ({detail.invoices.length})</div>
                  <div className="space-y-1.5">
                    {detail.invoices.length === 0 ? <div className="text-sm text-[var(--muted)]">No invoices.</div> : detail.invoices.slice(0, 10).map((iv) => {
                      const date = (iv.issued_at || iv.start_timestamp || "").slice(0, 10);
                      const tone = iv.status === "FINALIZED" ? "emerald" : iv.status === "VOID" ? "rose" : "amber";
                      const kind = iv.type === "USAGE" ? "Usage" : iv.type === "SCHEDULED" ? "Subscription" : (iv.type ? iv.type[0] + iv.type.slice(1).toLowerCase() : "Invoice");
                      return (
                        <div key={iv.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <Badge tone={tone}>{iv.status || "—"}</Badge>
                            <span className="min-w-0 truncate text-[var(--muted)]">{kind}{date ? " · " + date : ""}</span>
                          </span>
                          <span className="flex-none font-semibold tabular-nums text-[var(--text)]">{num(iv.total)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--faint)]">Balances ({detail.balances.length})</div>
                  <div className="space-y-1.5">
                    {detail.balances.length === 0 ? <div className="text-sm text-[var(--muted)]">No active commits or credits.</div> : detail.balances.slice(0, 10).map((b, i) => {
                      // v1 returns `balance` as a flat cents number (remaining); fall back to legacy object/total shapes.
                      const remaining = typeof b.balance === "number" ? b.balance
                        : b.balance && b.balance.excluding_pending != null ? b.balance.excluding_pending
                        : b.balance && b.balance.including_pending != null ? b.balance.including_pending
                        : b.total;
                      const granted = b.access_schedule && Array.isArray(b.access_schedule.schedule_items)
                        ? b.access_schedule.schedule_items.reduce((s, it) => s + (it.amount || 0), 0) : null;
                      const pct = granted ? Math.max(0, Math.min(100, Math.round((remaining / granted) * 100))) : null;
                      const tone = b.type === "PREPAID" ? "indigo" : "emerald";
                      return (
                        <div key={i} className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 text-[var(--muted)]"><Badge tone={tone}>{b.type === "PREPAID" ? "Commit" : b.type === "CREDIT" ? "Credit" : (b.type || "Balance")}</Badge><span className="truncate">{(b.product && b.product.name) || b.name || ""}</span></span>
                            <span className="flex-none font-semibold tabular-nums text-[var(--text)]">{num(remaining)}</span>
                          </div>
                          {granted != null && granted > 0 && (
                            <div className="mt-1.5">
                              <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--chip)]"><div className="h-full rounded-full bg-emerald-400" style={{ width: (pct == null ? 0 : pct) + "%" }} /></div>
                              <div className="mt-1 text-[11px] text-[var(--faint)]">{num(remaining)} remaining of {num(granted)}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--muted)]"><Icon name="info" size={13} className="flex-none text-[var(--faint)]" /> Live, read-only data from your connected Metronome account — separate from the modelled demo numbers.</div>
      </Card>
    );
  }

  function AgencyBilling({ tab, setTab, onOpenDeepDive }) {
    const [profileId, setProfileId] = useState(null);
    if (profileId) return <ClientBillingProfile client={clientOf(profileId)} onBack={() => setProfileId(null)} onOpenDeepDive={onOpenDeepDive} />;
    const TABS = [{ k: "overview", label: "Overview" }, { k: "invoices", label: "Invoices" }, { k: "contracts", label: "Contracts" }, { k: "clients", label: "Clients" }, { k: "live", label: "Live" }];
    return (
      <div className="space-y-6">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        {tab === "invoices" ? <AgencyInvoices onOpen={setProfileId} />
          : tab === "contracts" ? <AgencyContracts onOpen={setProfileId} />
          : tab === "clients" ? <AgencyClients onOpen={setProfileId} />
          : tab === "live" ? <MetronomeLive />
          : <AgencyOverview />}
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

  function ClientOverview({ client }) {
    const B = useBilling();
    const c = client, h = c.billing.hybrid;
    const { AlertBanner } = window.Billing;
    const due = outstandingTotal(B.invoicesFor(c.id), B.effStatus);
    const credits = h.monthlyRemaining + h.topupTotal + B.topupFor(c.id);
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

  function ClientInvoices({ client }) {
    const B = useBilling();
    const c = client, enterprise = c.acct.type !== "Standard";
    const [preview, setPreview] = useState(null);
    return (
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div className="flex items-center gap-2 font-semibold text-[var(--text)]"><Icon name="receipt" size={16} className="text-[var(--muted)]" /> Invoices</div><Badge tone="neutral">{B.invoicesFor(c.id).length}</Badge></div>
        <div>
          {B.invoicesFor(c.id).map((i) => {
            const s = B.effStatus(i);
            return (
              <div key={i.id} className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-5 py-3.5 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">{i.number} <StatusBadge s={s} /></div>
                  <div className="text-xs text-[var(--muted)]">{i.period} · due {i.due} · {i.terms}</div>
                </div>
                <div className="text-right text-sm font-semibold tabular-nums text-[var(--text)]">{fmtUSD(i.amount)}</div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPreview(i)} className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--chip)] px-2.5 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--panel-hi)]"><Icon name="receipt" size={13} /> PDF</button>
                  {isOutstanding(s) && (enterprise
                    ? <button onClick={() => B.setStatus(i.id, "submitted")} className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]">Submit for approval</button>
                    : <button onClick={() => B.setStatus(i.id, "paid")} className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]">Pay now</button>)}
                </div>
              </div>
            );
          })}
        </div>
        <Modal open={!!preview} onClose={() => setPreview(null)} maxWidth={460}>{preview && <InvoicePreview inv={preview} client={c} eff={B.effStatus} onClose={() => setPreview(null)} />}</Modal>
      </Card>
    );
  }

  function ClientPaymentMethods({ client }) {
    const B = useBilling();
    const [defaultIdx, setDefaultIdx] = useState(0);
    const [adding, setAdding] = useState(false);
    const methods = B.methodsFor(client);
    return (
      <div className="space-y-4">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div className="font-semibold text-[var(--text)]">Payment methods</div><button onClick={() => setAdding(true)} className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"><Icon name="plus" size={14} /> Add method</button></div>
          <div>
            {methods.map((m, idx) => (
              <div key={idx} className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3.5 last:border-0">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[var(--chip)] text-[var(--muted)]"><Icon name={METHOD_ICON[m.kind] || "card"} size={16} /></span>
                <div className="min-w-0 flex-1"><div className="text-sm font-medium text-[var(--text)]">{m.label}</div><div className="text-xs text-[var(--muted)]">{m.detail}</div></div>
                {idx === defaultIdx ? <Badge tone="emerald">Default</Badge> : <button onClick={() => setDefaultIdx(idx)} className="text-xs font-medium text-[var(--accent-fg)] hover:underline">Make default</button>}
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--muted)]"><Icon name="info" size={13} className="mt-0.5 flex-none text-[var(--faint)]" /> Billed on <span className="inline-flex items-center gap-1">{client.acct.netTerms} <InfoDot label={NET_TIP} /></span>{client.acct.poNumber ? ` against PO ${client.acct.poNumber}` : ""}. {client.acct.type === "Government" ? "Government orders support GPC and PO with compliance documentation." : "Usage is metered by Metronome and invoiced monthly."}</div>
        </Card>
        <Modal open={adding} onClose={() => setAdding(false)} maxWidth={420}>
          {adding && <AddMethodModal client={client} onClose={() => setAdding(false)} onAdd={(m) => B.addMethod(client.id, m)} />}
        </Modal>
      </div>
    );
  }

  function TopUpModal({ client, pack, onClose, onDone }) {
    const phases = ["Authorizing payment", "Provisioning credits", "Confirming"];
    const [i, setI] = useState(0);
    const timer = useRef(null), fired = useRef(false);
    const done = i >= phases.length;
    useEffect(() => { if (i < phases.length) { timer.current = setTimeout(() => setI((x) => x + 1), 800); return () => clearTimeout(timer.current); } }, [i]);
    useEffect(() => { if (done && !fired.current) { fired.current = true; onDone(pack.credits); } }, [done]);
    const pct = Math.round((Math.min(i, phases.length) / phases.length) * 100);
    return (
      <div>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div className="flex items-center gap-2 font-semibold text-[var(--text)]"><Icon name="coins" size={16} className="text-[var(--accent-fg)]" /> Top up {(pack.credits / 1000).toFixed(0)}k credits</div><button onClick={onClose} className="text-[var(--faint)] hover:text-[var(--text)]"><Icon name="x" size={18} /></button></div>
        <div className="px-5 py-5">
          {!done ? (
            <>
              <div className="mb-3 flex items-center justify-between text-sm"><span className="font-medium text-[var(--text)]">Processing {fmtUSD(pack.price)}…</span><span className="tabular-nums text-[var(--muted)]">{pct}%</span></div>
              <Progress pct={pct} tone={C.indigo} h={8} />
              <div className="mt-4 space-y-2.5">
                {phases.map((p, idx) => {
                  const state = idx < i ? "done" : idx === i ? "active" : "pending";
                  return (
                    <div key={idx} className="flex items-center gap-2.5 text-sm">
                      <span className={cx("flex h-5 w-5 flex-none items-center justify-center rounded-full", state === "done" ? "bg-emerald-500/15 text-emerald-400" : state === "active" ? "bg-[var(--accent-soft)] text-[var(--accent-fg)]" : "bg-[var(--chip)] text-[var(--faint)]")}>
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
              <div className="mt-3 text-lg font-bold text-[var(--text)]">{(pack.credits / 1000).toFixed(0)}k credits added</div>
              <p className="mx-auto mt-1 max-w-xs text-sm text-[var(--muted)]">Valid for a full year and used after your monthly allotment runs out.</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button onClick={onClose} className={cx("rounded-lg px-4 py-2 text-sm font-semibold", done ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]" : "border border-[var(--border)] bg-[var(--chip)] text-[var(--text)] hover:bg-[var(--panel-hi)]")}>{done ? "Done" : "Cancel"}</button>
        </div>
      </div>
    );
  }

  function ClientUsage({ client }) {
    const B = useBilling();
    const { HybridCreditPanel } = window.Billing;
    const [pack, setPack] = useState(1);
    const [buying, setBuying] = useState(false);
    const added = B.topupFor(client.id);
    return (
      <div className="space-y-4">
        <Card className="p-5">
          <SectionTitle icon="cpu" title="Usage & credits" sub="Seats, pooled credits, and where your AI spend went" right={<MetronomeBadge />} />
          <HybridCreditPanel client={client} />
          <div className="mt-4 flex items-start gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]"><Icon name="info" size={13} className="mt-0.5 flex-none text-[var(--faint)]" /> Usage is metered in real time; overages reconcile as a <span className="inline-flex items-center gap-1">true-up <InfoDot label={TRUEUP_TIP} /></span> at your contracted rate. Your account is returning <span className="font-semibold text-emerald-400">&nbsp;{fmtMult(client.roai)}</span>&nbsp; on AI investment.</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 font-semibold text-[var(--text)]"><Icon name="coins" size={16} className="text-[var(--accent-fg)]" /> Buy a credit top-up <InfoDot label={TOPUP_TIP} /></div>
          {added > 0 && <div className="mt-1 text-xs text-emerald-400">{fmtNum(added)} credits added this session</div>}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {CREDIT_PACKS.map((p, i) => (
              <button key={i} onClick={() => setPack(i)} className={cx("rounded-xl border p-3 text-center transition-all", pack === i ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--panel-2)] hover:border-[var(--border-strong)]")}>
                <div className="text-sm font-bold tabular-nums text-[var(--text)]">+{(p.credits / 1000).toFixed(0)}k</div>
                <div className="mt-0.5 text-[11px] text-[var(--muted)]">{fmtUSD(p.price)}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setBuying(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]">
            <Icon name="plus" size={15} /> Buy {(CREDIT_PACKS[pack].credits / 1000).toFixed(0)}k credits · {fmtUSD(CREDIT_PACKS[pack].price)}
          </button>
        </Card>
        <Modal open={buying} onClose={() => setBuying(false)} maxWidth={420}>{buying && <TopUpModal client={client} pack={CREDIT_PACKS[pack]} onClose={() => setBuying(false)} onDone={(credits) => B.addTopup(client.id, credits)} />}</Modal>
      </div>
    );
  }

  function ClientBilling({ client, tab, setTab }) {
    const TABS = [{ k: "overview", label: "Overview" }, { k: "invoices", label: "Invoices" }, { k: "payment", label: "Payment methods" }, { k: "usage", label: "Usage" }];
    return (
      <div className="space-y-6">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        {tab === "invoices" ? <ClientInvoices client={client} />
          : tab === "payment" ? <ClientPaymentMethods client={client} />
          : tab === "usage" ? <ClientUsage client={client} />
          : <ClientOverview client={client} />}
      </div>
    );
  }

  window.BillingScreens = { AgencyBilling, ClientBilling };
})();

/* Billing & contract panels: hybrid seat-based vs enterprise prepaid commit,
   plus Metronome threshold alerts. */
(function () {
  const { useState, useEffect } = React;
  const Icon = window.Icon;
  const { fmtUSD, fmtNum, fmtCompact } = window.FMT;
  const U = window.UI;
  const { Card, Badge, Progress, Donut, Segmented, MetronomeBadge, useMeasure, C, cx } = U;

  const MODEL_COLORS = [C.indigoDeep || "#4f46e5", C.indigo, C.sky, C.slate];

  // ---- small local helpers ----
  function Stat({ label, value, sub }) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
        <div className="text-xs text-[var(--muted)]">{label}</div>
        <div className="mt-1 text-base font-bold leading-tight tabular-nums text-[var(--text)]">{value}</div>
        {sub && <div className="mt-0.5 text-[11px] text-[var(--muted)]">{sub}</div>}
      </div>
    );
  }

  // ================= Threshold alert (Metronome notification) =================
  function AlertBanner({ client, model }) {
    const h = client.billing.hybrid, cm = client.billing.commit;
    let a = null;
    if (model === "hybrid") {
      if (h.gated) a = {
        tone: "rose", title: "AI access paused — monthly credits depleted",
        body: `All ${fmtNum(h.included)} pooled credits for this cycle are consumed and no top-up packs are active. Agents are gated until a top-up is purchased or credits reset ${h.resetDate}.`,
        cta: "Purchase top-up",
      };
      else if (h.pct >= 88) a = {
        tone: "amber", title: `Low credit balance — ${Math.max(0, 100 - h.pct).toFixed(0)}% of pool remaining`,
        body: `${fmtNum(h.monthlyRemaining)} of ${fmtNum(h.included)} pooled credits left this cycle. Metronome low-balance threshold fired. Enable auto top-up to avoid an interruption.`,
        cta: "Review top-up",
      };
    } else if (cm.willOverage) a = {
      tone: "amber", title: `Commit pacing ahead — projected to exhaust in ${cm.exhaustMonthLabel}`,
      body: `${cm.currentPeriod.label} allotment of ${fmtUSD(cm.currentPeriod.allotment, { compact: true })} is ${cm.currentPeriod.pct.toFixed(0)}% drawn down by month ${cm.currentPeriod.elapsedMonths}. At the current burn rate the prepaid commit is exhausted before period end and rolls into overage.`,
      cta: "Accelerate Year 3 allotment",
    };
    if (!a) return null;
    const tone = a.tone === "rose"
      ? { wrap: "border-rose-500/30 bg-rose-500/[0.07]", ic: "text-rose-400 bg-rose-500/12", btn: "bg-rose-500 hover:bg-rose-600" }
      : { wrap: "border-amber-500/30 bg-amber-500/[0.07]", ic: "text-amber-400 bg-amber-500/12", btn: "bg-amber-500 hover:bg-amber-600" };
    return (
      <div className={cx("flex flex-wrap items-center gap-4 rounded-2xl border p-4", tone.wrap)}>
        <span className={cx("flex h-9 w-9 flex-none items-center justify-center rounded-lg", tone.ic)}><Icon name="alert" size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold text-[var(--text)]">{a.title}</span><MetronomeBadge size="sm" /></div>
          <p className="mt-0.5 text-sm leading-relaxed text-[var(--muted)]">{a.body}</p>
        </div>
        <button className={cx("flex-none rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition-colors", tone.btn)}>{a.cta}</button>
      </div>
    );
  }

  // ================= Commit burn-down chart =================
  function CommitBurnDown({ commit, height = 178 }) {
    const [ref, w] = useMeasure();
    const data = commit.burn, cap = commit.currentPeriod.allotment;
    const padL = 46, padR = 14, padT = 14, padB = 22;
    const W = Math.max(w, 220), H = height, iw = W - padL - padR, ih = H - padT - padB;
    const maxV = Math.max(cap, data[11].projected) * 1.08;
    const x = (i) => padL + (i / 11) * iw;
    const y = (v) => padT + ih - (v / maxV) * ih;
    const actualPts = data.filter((d) => d.actual != null);
    const aLine = actualPts.map((d, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(d.actual).toFixed(1)).join(" ");
    const aArea = aLine + ` L${x(actualPts.length - 1).toFixed(1)} ${padT + ih} L${x(0)} ${padT + ih} Z`;
    const pLine = data.map((d, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(d.projected).toFixed(1)).join(" ");
    const crossIdx = commit.willOverage ? Math.min(11, Math.max(0, commit.projectedExhaust - 1)) : null;
    return (
      <div ref={ref} className="relative w-full" style={{ height: H }}>
        {w > 0 && (
          <svg width={W} height={H}>
            <defs><linearGradient id="bd_grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.indigo} stopOpacity="0.26" /><stop offset="100%" stopColor={C.indigo} stopOpacity="0" /></linearGradient></defs>
            <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="var(--grid)" />
            <line x1={padL} x2={W - padR} y1={y(cap)} y2={y(cap)} stroke={C.amber} strokeDasharray="4 4" strokeWidth="1.5" opacity="0.75" />
            <text x={padL - 8} y={y(cap) + 3} textAnchor="end" fontSize="10" fill={C.amber}>{fmtCompact(cap)}</text>
            <text x={padL - 8} y={y(0) + 3} textAnchor="end" fontSize="10" fill="var(--axis)">0</text>
            {data.map((d, i) => i % 2 === 0 && <text key={i} x={x(i)} y={H - 7} textAnchor="middle" fontSize="9" fill="var(--axis)">{d.month}</text>)}
            <path d={pLine} fill="none" stroke={C.indigo} strokeWidth="1.75" strokeDasharray="4 4" opacity="0.55" />
            <path d={aArea} fill="url(#bd_grad)" />
            <path d={aLine} fill="none" stroke={C.indigo} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={x(actualPts.length - 1)} cy={y(actualPts[actualPts.length - 1].actual)} r="3.5" fill="var(--panel)" stroke={C.indigo} strokeWidth="2.5" />
            {crossIdx != null && (
              <g>
                <line x1={x(crossIdx)} x2={x(crossIdx)} y1={padT} y2={padT + ih} stroke={C.rose} strokeDasharray="3 3" strokeWidth="1" />
                <circle cx={x(crossIdx)} cy={y(cap)} r="3.5" fill={C.rose} />
              </g>
            )}
          </svg>
        )}
      </div>
    );
  }

  // ================= Allotment ramp =================
  function AllotmentRamp({ commit }) {
    const max = Math.max(...commit.accessSchedule.map((s) => s.amount));
    return (
      <div className="space-y-2.5">
        {commit.accessSchedule.map((s, i) => {
          const isCurrent = s.status === "current";
          const consumedPct = isCurrent ? commit.currentPeriod.pct : (s.status === "complete" ? 100 : 0);
          return (
            <div key={i}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text)]">{s.label}</span>
                  {isCurrent && <Badge tone="indigo">Current</Badge>}
                  {s.status === "complete" && <span className="text-[var(--faint)]">Complete</span>}
                  {s.status === "upcoming" && <span className="text-[var(--faint)]">Upcoming</span>}
                </span>
                <span className="tabular-nums text-[var(--muted)]">{fmtUSD(s.amount, { compact: true })}</span>
              </div>
              <div className="relative h-2.5 rounded-full bg-[var(--track)] overflow-hidden" style={{ width: (s.amount / max) * 100 + "%" }}>
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: consumedPct + "%", background: isCurrent ? C.indigo : C.slate, opacity: s.status === "upcoming" ? 0.25 : 0.9 }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ================= Commit panel =================
  function CommitPanel({ client }) {
    const cm = client.billing.commit, cp = cm.currentPeriod;
    return (
      <div>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Commitment" value={fmtUSD(cm.total, { compact: true })} sub="Prepaid · 3-year" />
          <Stat label="Term" value={cm.termLabel} sub={cm.termStart + " – " + cm.termEnd} />
          <Stat label="Current period" value={cp.label} sub={fmtUSD(cp.allotment, { compact: true }) + " allotment"} />
          <Stat label="Drawn down" value={cp.pct.toFixed(0) + "%"} sub={fmtUSD(cp.consumedToDate, { compact: true }) + " consumed"} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-medium text-[var(--text)]">Allotment schedule (usage ramp)</div>
              <AllotmentRamp commit={cm} />
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-[var(--text)]">Invoice schedule (installments)</div>
              <div className="space-y-2">
                {cm.invoiceSchedule.map((iv, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm">
                    <div><div className="text-[var(--text)]">{iv.label}</div><div className="text-xs text-[var(--muted)]">{iv.when}</div></div>
                    <div className="flex items-center gap-2"><span className="font-semibold tabular-nums text-[var(--text)]">{fmtUSD(iv.amount, { compact: true })}</span>{iv.status === "paid" ? <Badge tone="emerald">Paid</Badge> : <Badge tone="neutral">Scheduled</Badge>}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--text)]">{cp.label} commit burn-down</span>
              {cm.willOverage ? <Badge tone="amber" icon="alert">Exhausts ~{cm.exhaustMonthLabel}</Badge> : <Badge tone="emerald" icon="check">Under commit</Badge>}
            </div>
            <CommitBurnDown commit={cm} />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Stat label="Proj. year-end" value={fmtUSD(cm.projectedYearEnd, { compact: true })} />
              <Stat label="Proj. unused" value={fmtUSD(cm.projectedUnused, { compact: true })} />
              <Stat label="Rollover (25%)" value={fmtUSD(cm.rolloverEligible, { compact: true })} />
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-3">
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--faint)]">Negotiated discounts</div>
            <div className="space-y-1.5">
              {cm.discounts.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-sm"><Badge tone="emerald">−{Math.round(d.pct * 100)}%</Badge><span className="text-[var(--muted)]">{d.tag} · {d.scope}</span></div>
              ))}
            </div>
            <div className="mt-1.5 text-[11px] text-[var(--faint)]">Applied via rate-card overrides on product tags.</div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--faint)]">Rollover clause</div>
            <div className="text-sm text-[var(--muted)]">Up to <span className="font-semibold text-[var(--text)]">{Math.round(cm.rolloverFraction * 100)}%</span> of unused commit rolls over on on-time renewal.</div>
            <div className="mt-1 text-sm text-[var(--muted)]">Projected: <span className="font-semibold text-emerald-400">{fmtUSD(cm.rolloverEligible, { compact: true })}</span></div>
          </div>
          <div>
            <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--faint)]">Scheduled charges</div>
            <div className="space-y-1.5">
              {cm.scheduledCharges.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm"><span className="text-[var(--muted)]">{s.label} · {s.when}</span><span className="font-medium tabular-nums text-[var(--text)]">{fmtUSD(s.amount, { compact: true })}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ================= Hybrid (seat-based) panel =================
  function HybridCreditPanel({ client }) {
    const h = client.billing.hybrid;
    const models = client.models.map((m, i) => ({ label: m[0], value: m[1], color: MODEL_COLORS[i % MODEL_COLORS.length] }));
    const monthlyPct = h.included ? (h.used / h.included) * 100 : 0;
    return (
      <div>
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3 font-mono text-sm">
          <span className="rounded bg-[var(--chip)] px-2 py-1 text-[var(--text)]">{h.seats} seats</span>
          <span className="text-[var(--faint)]">×</span>
          <span className="rounded bg-[var(--chip)] px-2 py-1 text-[var(--text)]">{fmtNum(h.creditsPerSeat)} credits/seat·mo</span>
          <span className="text-[var(--faint)]">=</span>
          <span className="rounded bg-[var(--accent-soft)] px-2 py-1 font-semibold text-[var(--accent-fg)]">{fmtNum(h.included)} pooled credits / month</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-[var(--text)]">Monthly included</span><Badge tone="neutral">Use-it-or-lose-it</Badge></div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">{fmtNum(h.monthlyRemaining)}</div>
            <div className="text-xs text-[var(--muted)]">credits left of {fmtNum(h.included)}</div>
            <div className="mt-3"><Progress pct={monthlyPct} tone={monthlyPct >= 100 ? C.rose : monthlyPct > 88 ? C.amber : C.emerald} /></div>
            <div className="mt-1.5 text-xs text-[var(--muted)]">Resets {h.resetDate}</div>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-[var(--text)]">Top-up credits</span><Badge tone="indigo">1-yr · payment-gated</Badge></div>
            {h.topups.length ? (
              <>
                <div className="mt-2 text-2xl font-bold tabular-nums text-[var(--text)]">{fmtNum(h.topupTotal)}</div>
                <div className="text-xs text-[var(--muted)]">credits remaining</div>
                <div className="mt-2.5 space-y-1.5">
                  {h.topups.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-xs"><span className="text-[var(--muted)]">{fmtNum(t.credits)} pack · {t.purchased}</span><span className="text-[var(--faint)]">exp {t.expires}</span></div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-2 text-sm leading-relaxed text-[var(--muted)]">No active packs. Top-ups are released only once the Stripe payment confirms, then last a full year.</div>
            )}
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-4">
            <div className="mb-1 text-sm font-medium text-[var(--text)]">Spend by model</div>
            <Donut segments={models} size={102} thickness={13} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Pooled this cycle" value={fmtNum(h.used)} sub="credits consumed" />
          <Stat label="Contracted rate" value={fmtUSD(h.ratePer1k, { cents: true })} sub="per 1k credits" />
          <Stat label="Tokens processed" value={h.tokensM + "M"} />
          <Stat label="Provisioning" value="Automatic" sub="Prorated on seat change" />
        </div>
      </div>
    );
  }

  // ================= Section shell with model toggle =================
  function BillingSection({ client, model, setModel }) {
    const isActive = model === client.billing.model;
    return (
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--muted)]"><Icon name="card" size={16} /></span>
              <h3 className="text-base font-semibold text-[var(--text)]">Billing & contract</h3>
            </div>
            <p className="mt-0.5 text-sm text-[var(--muted)]">{model === "commit" ? "Enterprise prepaid commitment, metered against allotment" : "Hybrid subscription + usage-based AI credits"}</p>
          </div>
          <div className="flex items-center gap-2">
            <MetronomeBadge />
            <Segmented size="sm" value={model} onChange={setModel}
              options={[{ value: "hybrid", label: "Hybrid seat-based" }, { value: "commit", label: "Enterprise commit" }]} />
          </div>
        </div>

        {model === "commit" ? <CommitPanel client={client} /> : <HybridCreditPanel client={client} />}

        <div className="mt-4 flex items-start gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
          <Icon name="info" size={13} className="mt-0.5 flex-none text-[var(--faint)]" />
          <span>{isActive
            ? <><span className="font-medium text-[var(--text)]">Active model.</span> {client.name} is billed on this structure today.</>
            : <><span className="font-medium text-[var(--text)]">Preview.</span> Showing how this account would model under a {model === "commit" ? "prepaid enterprise commit" : "hybrid seat-based"} agreement — toggle back to see the live model.</>}</span>
        </div>
      </Card>
    );
  }

  window.Billing = { AlertBanner, BillingSection, CommitPanel, HybridCreditPanel };
})();

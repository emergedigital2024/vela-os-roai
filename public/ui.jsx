/* UI primitives + hand-built SVG charts. Theme via CSS vars (see index.html). */
(function () {
  const { useState, useRef, useEffect, useLayoutEffect, useCallback } = React;
  const Icon = window.Icon;
  const { fmtUSD, fmtMult, fmtPct, fmtNum, fmtCompact } = window.FMT;

  const cx = (...a) => a.filter(Boolean).join(" ");

  // chart palette
  const C = {
    indigo: "#6366f1", indigoDeep: "#4f46e5", emerald: "#10b981",
    amber: "#f59e0b", rose: "#f43f5e", sky: "#38bdf8", violet: "#a78bfa",
    slate: "#94a3b8",
  };

  // ---------- size hook ----------
  function useMeasure() {
    const ref = useRef(null);
    const [w, setW] = useState(0);
    useLayoutEffect(() => {
      if (!ref.current) return;
      const ro = new ResizeObserver((es) => setW(es[0].contentRect.width));
      ro.observe(ref.current);
      setW(ref.current.getBoundingClientRect().width);
      return () => ro.disconnect();
    }, []);
    return [ref, w];
  }

  // ---------- Card ----------
  function Card({ className, children, hover, onClick, style }) {
    return (
      <div onClick={onClick} style={style}
        className={cx("rounded-2xl border border-[var(--border)] bg-[var(--panel)]",
          hover && "transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--panel-hi)] cursor-pointer",
          className)}>
        {children}
      </div>
    );
  }

  // ---------- Badge ----------
  const BADGE = {
    indigo: "text-[var(--accent-fg)] bg-[var(--accent-soft)] border-[var(--accent-line)]",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    neutral: "text-[var(--muted)] bg-[var(--chip)] border-[var(--border)]",
  };
  function Badge({ tone = "neutral", className, children, icon }) {
    return (
      <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        BADGE[tone], className)}>
        {icon && <Icon name={icon} size={12} strokeWidth={2.4} />}
        {children}
      </span>
    );
  }

  const tierTone = (t) => ({ Elite: "indigo", Strong: "emerald", Stable: "amber", "At risk": "rose" }[t] || "neutral");

  function TierBadge({ tier }) { return <Badge tone={tierTone(tier)}>{tier}</Badge>; }

  // ROAI delta pill
  function DeltaPill({ value, suffix = "%", className }) {
    const up = value >= 0;
    return (
      <span className={cx("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        up ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10", className)}>
        <Icon name={up ? "trendUp" : "trendDown"} size={12} strokeWidth={2.6} />
        {up ? "+" : ""}{value.toFixed(1)}{suffix}
      </span>
    );
  }

  // ---------- Tooltip (hover) ----------
  function Tooltip({ label, children, side = "top" }) {
    const [show, setShow] = useState(false);
    return (
      <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
        {children}
        {show && (
          <span className={cx("absolute z-50 whitespace-nowrap rounded-lg border border-[var(--border-strong)] bg-[var(--tip)] px-2.5 py-1.5 text-xs text-[var(--text)] shadow-xl pointer-events-none",
            side === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-2",
            side === "right" && "left-full top-1/2 -translate-y-1/2 ml-2")}
            style={{ maxWidth: 260, whiteSpace: "normal" }}>
            {label}
          </span>
        )}
      </span>
    );
  }

  function InfoDot({ label }) {
    return (
      <Tooltip label={label}>
        <span className="text-[var(--faint)] hover:text-[var(--muted)] cursor-help"><Icon name="info" size={13} /></span>
      </Tooltip>
    );
  }

  // ---------- Health score bar ----------
  function HealthBar({ score, showLabel = true, w = 64 }) {
    const tone = score >= 80 ? C.emerald : score >= 65 ? C.amber : C.rose;
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 rounded-full bg-[var(--track)] overflow-hidden" style={{ width: w }}>
          <div className="h-full rounded-full" style={{ width: score + "%", background: tone }} />
        </div>
        {showLabel && <span className="text-xs font-semibold tabular-nums" style={{ color: tone }}>{score}</span>}
      </div>
    );
  }

  // ---------- Sparkline ----------
  function Sparkline({ data, color = C.indigo, h = 28, w = 88, fill = true }) {
    const vals = data;
    const max = Math.max(...vals), min = Math.min(...vals);
    const rng = max - min || 1;
    const pts = vals.map((v, i) => [(i / (vals.length - 1)) * w, h - 3 - ((v - min) / rng) * (h - 6)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = d + ` L${w} ${h} L0 ${h} Z`;
    const gid = "sp" + Math.round(min + max + vals.length);
    return (
      <svg width={w} height={h} className="overflow-visible">
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient></defs>
        {fill && <path d={area} fill={`url(#${gid})`} />}
        <path d={d} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // ---------- Line / Area chart with hover ----------
  // series: [{key,label,color,area}]
  function LineArea({ data, series, height = 220, formatY = fmtCompact, formatTip, yPad = 1.08, labelEvery = 1 }) {
    const [ref, w] = useMeasure();
    const [hi, setHi] = useState(null);
    const padL = 44, padR = 14, padT = 14, padB = 26;
    const W = Math.max(w, 200), H = height;
    const iw = W - padL - padR, ih = H - padT - padB;
    const keys = series.map((s) => s.key);
    let maxV = 0;
    data.forEach((d) => keys.forEach((k) => { if (d[k] > maxV) maxV = d[k]; }));
    maxV = maxV * yPad || 1;
    const x = (i) => padL + (i / Math.max(data.length - 1, 1)) * iw;
    const y = (v) => padT + ih - (v / maxV) * ih;
    const ticks = 4;
    const gridV = Array.from({ length: ticks + 1 }, (_, i) => (maxV / ticks) * i);

    const onMove = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const idx = Math.round(((px - padL) / iw) * (data.length - 1));
      setHi(Math.max(0, Math.min(data.length - 1, idx)));
    };

    return (
      <div ref={ref} className="relative w-full" style={{ height: H }}>
        {w > 0 && (
          <svg width={W} height={H}>
            <defs>
              {series.filter((s) => s.area).map((s) => (
                <linearGradient key={s.key} id={"g_" + s.key} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.26" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>
            {gridV.map((gv, i) => (
              <g key={i}>
                <line x1={padL} x2={W - padR} y1={y(gv)} y2={y(gv)} stroke="var(--grid)" strokeWidth="1" />
                <text x={padL - 8} y={y(gv) + 3} textAnchor="end" fontSize="10" fill="var(--axis)" className="tabular-nums">{formatY(gv)}</text>
              </g>
            ))}
            {data.map((d, i) => (i % labelEvery === 0) && (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--axis)">{d.month}</text>
            ))}
            {series.map((s) => {
              const line = data.map((d, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(d[s.key]).toFixed(1)).join(" ");
              const area = line + ` L${x(data.length - 1)} ${padT + ih} L${x(0)} ${padT + ih} Z`;
              return (
                <g key={s.key}>
                  {s.area && <path d={area} fill={`url(#g_${s.key})`} />}
                  <path d={line} fill="none" stroke={s.color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              );
            })}
            {hi != null && (
              <g>
                <line x1={x(hi)} x2={x(hi)} y1={padT} y2={padT + ih} stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="3 3" />
                {series.map((s) => <circle key={s.key} cx={x(hi)} cy={y(data[hi][s.key])} r="3.5" fill="var(--panel)" stroke={s.color} strokeWidth="2.5" />)}
              </g>
            )}
            <rect x={padL} y={padT} width={iw} height={ih} fill="transparent"
              onMouseMove={onMove} onMouseLeave={() => setHi(null)} />
          </svg>
        )}
        {hi != null && (
          <div className="pointer-events-none absolute z-20 rounded-xl border border-[var(--border-strong)] bg-[var(--tip)] px-3 py-2 shadow-xl text-xs"
            style={{ left: Math.min(Math.max(x(hi) - 60, 4), W - 150), top: 6, minWidth: 130 }}>
            <div className="mb-1 font-semibold text-[var(--text)]">{data[hi].month}</div>
            <div className="space-y-1">
              {series.map((s) => (
                <div key={s.key} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-[var(--muted)]">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.label}
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--text)]">{(formatTip || formatY)(data[hi][s.key], s)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- Service category breakdown (horizontal bars) ----------
  function CategoryBars({ categories }) {
    const max = Math.max(...categories.map((c) => c.value));
    const catColor = { "Experience Strategy": C.indigo, "Experience Design": C.violet, "Experience Platform": C.sky, "Commerce Platform": C.emerald, "Experience Insights": C.amber, "Run & Optimize": C.slate };
    return (
      <div className="space-y-4">
        {categories.map((c) => {
          const roai = c.value / c.cost;
          return (
            <div key={c.name}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-[var(--text)]">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: catColor[c.name] }} />{c.name}
                </span>
                <span className="flex items-center gap-3 tabular-nums">
                  <span className="text-[var(--muted)]">{fmtUSD(c.value, { compact: true })}</span>
                  <span className="w-10 text-right font-semibold" style={{ color: roai >= 3 ? C.emerald : roai >= 2 ? C.amber : C.rose }}>{fmtMult(roai)}</span>
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-[var(--track)] overflow-hidden">
                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: (c.value / max) * 100 + "%", background: catColor[c.name], opacity: 0.9 }} />
                <div className="absolute inset-y-0 left-0 rounded-full border-r-2 border-[var(--panel)]" style={{ width: (c.cost / max) * 100 + "%", background: catColor[c.name], opacity: 0.35 }} />
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-4 pt-1 text-xs text-[var(--muted)]">
          <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-[var(--muted)] opacity-90" />Value delivered</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-[var(--muted)] opacity-35" />AI cost</span>
        </div>
      </div>
    );
  }

  // ---------- Donut (model breakdown) ----------
  function Donut({ segments, size = 132, thickness = 16, centerLabel, centerSub }) {
    const r = (size - thickness) / 2, cxv = size / 2, cyv = size / 2;
    const circ = 2 * Math.PI * r;
    let acc = 0;
    return (
      <div className="flex items-center gap-5">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={cxv} cy={cyv} r={r} fill="none" stroke="var(--track)" strokeWidth={thickness} />
          {segments.map((s, i) => {
            const len = s.value * circ;
            const el = (
              <circle key={i} cx={cxv} cy={cyv} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
                strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-acc} strokeLinecap="butt" />
            );
            acc += len;
            return el;
          })}
        </svg>
        <div className="space-y-2">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              <span className="text-[var(--muted)]">{s.label}</span>
              <span className="font-semibold tabular-nums text-[var(--text)]">{Math.round(s.value * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Progress bar ----------
  function Progress({ pct, tone = C.indigo, h = 8 }) {
    return (
      <div className="rounded-full bg-[var(--track)] overflow-hidden" style={{ height: h }}>
        <div className="h-full rounded-full" style={{ width: Math.min(pct, 100) + "%", background: tone, transition: "width .5s ease" }} />
      </div>
    );
  }

  // ---------- Ring gauge ----------
  function Ring({ value, max, label, sub, color = C.indigo, size = 120, thickness = 11 }) {
    const r = (size - thickness) / 2, c = size / 2;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(value / max, 1);
    return (
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={c} cy={c} r={r} fill="none" stroke="var(--track)" strokeWidth={thickness} />
          <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} style={{ transition: "stroke-dashoffset .6s ease" }} />
        </svg>
        <div className="absolute text-center">
          <div className="text-xl font-bold tabular-nums text-[var(--text)] leading-none">{label}</div>
          {sub && <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--faint)]">{sub}</div>}
        </div>
      </div>
    );
  }

  // ---------- Segmented control ----------
  function Segmented({ options, value, onChange, size = "md" }) {
    return (
      <div className={cx("inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--chip)] p-0.5", size === "sm" && "text-xs")}>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const lbl = typeof o === "string" ? o : o.label;
          const active = v === value;
          return (
            <button key={v} onClick={() => onChange(v)}
              className={cx("rounded-md font-medium transition-colors", size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5 text-sm",
                active ? "bg-[var(--panel)] text-[var(--text)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--text)]")}>
              {lbl}
            </button>
          );
        })}
      </div>
    );
  }

  // ---------- Section header ----------
  function SectionTitle({ title, sub, right, icon }) {
    return (
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {icon && <span className="text-[var(--muted)]"><Icon name={icon} size={16} /></span>}
            <h3 className="text-base font-semibold text-[var(--text)]">{title}</h3>
          </div>
          {sub && <p className="mt-0.5 text-sm text-[var(--muted)]">{sub}</p>}
        </div>
        {right}
      </div>
    );
  }

  // ---------- Metronome badge ----------
  function MetronomeBadge({ size = "md" }) {
    return (
      <span className={cx("inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--chip)] font-medium text-[var(--muted)]",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs")}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M12 3 L7 21 M12 3 L17 21 M9.2 13 H14.8" />
        </svg>
        Metronome
      </span>
    );
  }

  // ---------- Modal (overlay dialog) ----------
  function Modal({ open, onClose, children, maxWidth = 460 }) {
    useEffect(() => {
      if (!open) return;
      const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
      document.addEventListener("keydown", onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
    }, [open, onClose]);
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--panel)] shadow-2xl" style={{ maxWidth }}>
          {children}
        </div>
      </div>
    );
  }

  // ---------- ROAI explainers (shared tooltip copy) ----------
  const ROAI_TIP = "ROAI = (Value delivered − AI cost) ÷ AI cost. A 5.0× ROAI means every $1 of AI spend returned $5 of measured value — hours saved plus revenue uplift.";
  const ROAI_TIP_SHORT = "Return on AI Investment — the measured value (hours saved + revenue uplift) created for every $1 invested in AI.";

  window.UI = {
    cx, C, useMeasure, Card, Badge, TierBadge, tierTone, DeltaPill, Tooltip, InfoDot,
    HealthBar, Sparkline, LineArea, CategoryBars, Donut, Progress, Ring, Segmented,
    SectionTitle, MetronomeBadge, Modal, ROAI_TIP, ROAI_TIP_SHORT,
  };
})();

/**
 * world.js — VaultOS knowledge-pipeline world + paused GSAP timeline.
 *
 * Story (8 beats, 24s): scattered internal knowledge → one governed vault
 * (E2E sync) → catalogued (BigQuery + Knowledge Catalog) → indexed for
 * grounding (904 docs) → Gemini Enterprise answers with citations →
 * constellation → write-back loop payoff at the vault → close.
 *
 * Shared by index.html (1920×1080) and variants/portrait.html (1080×1920).
 * The shell sets window.__FILM_ORIENTATION BEFORE loading this script.
 * Deterministic only — no Math.random / Date.now / network (frame capture).
 * Claims discipline: frames are typography-free; every visual maps to the
 * verified pipeline (904/0 import, KC auto-registration of the manifest
 * table, scoped fail-closed views, verified write-back round-trip).
 */
(function () {
  const film = typeof document !== "undefined" && document.getElementById && document.getElementById("film");
  if (!film || !document.body || typeof gsap === "undefined") return;

  const PORTRAIT = (window.__FILM_ORIENTATION || "landscape") === "portrait";
  const VC = PORTRAIT ? { x: 540, y: 960 } : { x: 960, y: 540 };
  document.body.dataset.orientation = PORTRAIT ? "portrait" : "landscape";

  /* ── Deterministic ambient field (VaultOS teal) ── */
  const particles = [];
  for (let i = 0; i < 40; i++) {
    const x = (i * 997 + 313) % 4200;
    const y = (i * 613 + 177) % 2100;
    const size = [4, 7, 10][i % 3];
    const op = [0.07, 0.12, 0.18][(i * 7) % 3];
    const blur = i % 4 === 0 ? "filter: blur(2px);" : "";
    particles.push(`<span class="particle" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;opacity:${op};${blur}"></span>`);
  }
  const nebulas = `
    <div class="nebula" style="left:1900px;top:200px;width:1500px;height:1200px;background:radial-gradient(circle, rgba(45,212,191,0.06), transparent 65%);"></div>
    <div class="nebula" style="left:1700px;top:1200px;width:1400px;height:1100px;background:radial-gradient(circle, rgba(94,234,212,0.05), transparent 65%);"></div>
    <div class="nebula" style="left:700px;top:800px;width:1300px;height:1100px;background:radial-gradient(circle, rgba(45,212,191,0.045), transparent 65%);"></div>`;

  const VAULT_GLYPH = `
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g stroke="#ffffff" stroke-width="3.2" stroke-linecap="round">
        <line x1="20" y1="20" x2="32" y2="44"/><line x1="44" y1="20" x2="32" y2="44"/>
        <line x1="20" y1="20" x2="44" y2="20" stroke-opacity="0.35" stroke-width="2"/>
      </g>
      <g fill="#ffffff"><circle cx="20" cy="20" r="5"/><circle cx="44" cy="20" r="5"/><circle cx="32" cy="44" r="6"/></g>
    </svg>`;

  /* ── World markup ── */
  film.innerHTML = `
    <div id="ambient" data-layout-allow-overflow>${nebulas}${particles.join("")}</div>
    <div id="world" data-layout-allow-overflow>
      <svg class="world-layer" viewBox="0 0 4200 2100" aria-hidden="true">
        <defs>
          <linearGradient id="threadGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#2dd4bf" /><stop offset="1" stop-color="#5eead4" />
          </linearGradient>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#2dd4bf" /><stop offset="0.6" stop-color="#5eead4" /><stop offset="1" stop-color="#99f6e4" />
          </linearGradient>
        </defs>
        <path id="leg1" class="thread" pathLength="1" d="M 2100 1050 C 2450 950, 2650 780, 2950 600" />
        <path id="leg2" class="thread" pathLength="1" d="M 2950 600 C 3250 800, 3150 1250, 2980 1520" />
        <path id="leg3" class="thread" pathLength="1" d="M 2980 1520 C 2760 1750, 2400 1880, 2050 1900" />
        <path class="thread-return" pathLength="1" d="M 2950 600 C 2600 800, 2350 950, 2100 1050" />
        <path class="thread-return" pathLength="1" d="M 2980 1520 C 2650 1400, 2350 1200, 2100 1050" />
        <path class="thread-return" pathLength="1" d="M 2050 1900 C 2050 1600, 2080 1300, 2100 1050" />
        <circle id="e2e-ring" class="gauge-track" pathLength="1" cx="2100" cy="1050" r="180" style="stroke: rgba(94,234,212,0.55); stroke-width: 3; stroke-dasharray: 0.02 0.013;" />
        <circle id="hub-gauge-track" class="gauge-track" cx="2100" cy="1050" r="230" />
        <circle id="hub-gauge" class="gauge-arc" pathLength="1" cx="2100" cy="1050" r="230" transform="rotate(-90 2100 1050)" style="stroke-width: 11;" />
      </svg>

      <div id="hub">
        <div class="halo" data-halo></div>
        <div class="pulse-ring" data-pulse="1"></div>
        <div class="pulse-ring" data-pulse="2"></div>
        <div class="vault-tile">${VAULT_GLYPH}</div>
        ${Array.from({ length: 12 }, (_, i) => `<div class="doc" data-doc="${i}"></div>`).join("")}
        ${[0, 1, 2].map((i) => `<div class="agent-dot" data-agent="${i}"></div>`).join("")}
      </div>

      <div id="st-catalog" class="station" style="left: 2950px; top: 600px;">
        <div class="halo"></div>
        <div class="catalog-table">
          <div class="row" data-row="0"><div class="fill"></div></div>
          <div class="row" data-row="1"><div class="fill"></div></div>
          <div class="row" data-row="2"><div class="fill"></div></div>
          <div class="row" data-row="3"><div class="fill"></div></div>
        </div>
        <div class="catalog-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3H5a2 2 0 0 0-2 2v7l9 9 9-9z" /><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
          </svg>
        </div>
      </div>

      <div id="st-index" class="station" style="left: 2980px; top: 1520px;">
        <div class="halo"></div>
        <div class="index-stack">
          <div class="plane" data-plane="0" style="top: 150px;"></div>
          <div class="plane" data-plane="1" style="top: 100px;"></div>
          <div class="plane" data-plane="2" style="top: 50px;"></div>
          <div class="plane" data-plane="3" style="top: 0px;"></div>
        </div>
        <div class="index-lens">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round">
            <circle cx="10.5" cy="10.5" r="6" /><path d="M15.5 15.5L20 20" />
          </svg>
        </div>
      </div>

      <div id="st-gemini" class="station" style="left: 2050px; top: 1900px;">
        <div class="halo"></div>
        <div class="gemini-spark">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3l2 5.5L19.5 10l-5.5 1.5L12 17l-2-5.5L4.5 10l5.5-1.5z" />
          </svg>
        </div>
        <div class="answer-card">
          <div class="aline w85" data-aline="0"></div>
          <div class="aline w72" data-aline="1"></div>
          <div class="aline w60" data-aline="2"></div>
        </div>
        <div class="cite-pip" data-pip="0" style="left: 120px; top: 60px;"></div>
        <div class="cite-pip" data-pip="1" style="left: 150px; top: 10px;"></div>
      </div>

      <div id="beam"></div>
      <div id="payoff-glow"></div>
      <div id="outro-glow"></div>
    </div>`;

  /* ── Timeline ── */
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });

  const HUB = [2100, 1050], CATALOG = [2950, 600], INDEX = [2980, 1520], GEMINI = [2050, 1900];
  const CX = 2100, CY = 1050;

  const cam = (wx, wy, z) => ({ x: VC.x - wx * z, y: VC.y - wy * z, scale: z });
  const amb = (wx, wy, z) => {
    const za = Math.pow(z, 0.88);
    return { x: VC.x - (CX + (wx - CX) * 0.85) * za, y: VC.y - (CY + (wy - CY) * 0.85) * za, scale: za };
  };
  const camSet = (wx, wy, z) => { gsap.set("#world", cam(wx, wy, z)); gsap.set("#ambient", amb(wx, wy, z)); };
  const camTo = (t, dur, target, ease) => {
    tl.to("#world", { ...cam(...target), duration: dur, ease }, t);
    tl.to("#ambient", { ...amb(...target), duration: dur, ease }, t);
  };

  /* Camera plans: beats 1–2 dwell at the vault (scatter → convergence), then
     three hops, pull-back (portrait: lateral pan), payoff home, close. */
  const C = PORTRAIT
    ? {
        open: [[...HUB, 1.3], [...HUB, 1.42]],
        zStation: 1.7, zDip: 1.15,
        b6: { from: [1500, 1300, 0.55], to: [2650, 950, 0.55] },
        payoff: [...HUB, 1.05], close: [...HUB, 1.32]
      }
    : {
        open: [[...HUB, 1.06], [...HUB, 1.18]],
        zStation: 1.5, zDip: 1.0,
        b6: { from: null, to: [...HUB, 0.42] },
        payoff: [...HUB, 0.98], close: [...HUB, 1.2]
      };

  camSet(...C.open[0]);

  const move = (t, dur, to) => {
    camTo(t, dur, [to[0], to[1], C.zStation], "power2.inOut");
    tl.to("#world", { scale: C.zDip, duration: dur * 0.5, ease: "quint.out", overwrite: false }, t);
    tl.to("#world", { scale: C.zStation, duration: dur * 0.5, ease: "quint.inOut" }, t + dur * 0.5);
  };

  // B1 (0–2.4): slow push on the dim vault amid scattered docs
  camTo(0, 2.2, C.open[1], "quint.out");
  // B2 (2.4–5.28): convergence in place — gentle continued push
  camTo(2.4, 2.6, [HUB[0], HUB[1], C.open[1][2] + 0.1], "power1.inOut");
  // B3–B5 hops
  move(5.28, 2.0, CATALOG);
  move(8.4, 2.0, INDEX);
  move(11.28, 2.0, GEMINI);
  // B6 constellation
  if (C.b6.from) {
    camTo(14.16, 1.2, C.b6.from, "power2.inOut");
    camTo(15.36, 1.7, C.b6.to, "power1.inOut");
  } else {
    camTo(14.16, 1.84, C.b6.to, "power2.inOut");
  }
  // B7 payoff home · B8 close
  camTo(17.28, 2.0, C.payoff, "power2.inOut");
  camTo(21.12, 1.48, C.close, "quint.inOut");

  const draw = (sel, t, dur, ease = "none") => {
    tl.set(sel, { strokeDasharray: 1, strokeDashoffset: 1 }, 0);
    tl.to(sel, { strokeDashoffset: 0, duration: dur, ease }, t);
  };

  /* ── B1: scattered knowledge ── */
  const SCATTER = [
    [-560, -300], [-380, -480], [-120, -560], [180, -540], [430, -420], [590, -210],
    [-620, 160], [-430, 380], [-150, 500], [160, 520], [420, 400], [600, 190]
  ];
  const ORBIT = SCATTER.map((_, i) => {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a) * 300, Math.sin(a) * 300];
  });
  SCATTER.forEach((s, i) => {
    tl.set(`#hub [data-doc="${i}"]`, { x: s[0], y: s[1], opacity: 0.4, rotate: i % 2 ? 16 : -13 }, 0);
  });
  tl.fromTo("#hub .vault-tile", { opacity: 0.4, scale: 0.9 }, { opacity: 0.55, scale: 0.94, duration: 1.2, ease: "quint.out" }, 0.15);
  tl.from("#hub [data-halo]", { opacity: 0, duration: 1.0 }, 0.2);

  /* ── B2: one governed vault — docs converge, E2E ring draws, vault wakes ── */
  ORBIT.forEach((g, i) => {
    tl.to(`#hub [data-doc="${i}"]`, { x: g[0] - 17, y: g[1] - 22, opacity: 1, rotate: 0, duration: 0.6, ease: "quint.out" }, 2.5 + i * 0.06);
  });
  tl.to("#hub .vault-tile", { opacity: 1, scale: 1, duration: 0.8, ease: "expo.out" }, 3.2);
  // Dashed sync ring fades in with a slow settle-rotation (draw() would clobber its dash pattern)
  tl.fromTo("#e2e-ring", { opacity: 0, rotate: -25, transformOrigin: "50% 50%" }, { opacity: 1, rotate: 0, duration: 1.6, ease: "quint.out" }, 2.7);
  tl.fromTo("#hub [data-pulse='1']", { opacity: 0.8, scale: 0.45 }, { opacity: 0, scale: 2.0, duration: 1.3, ease: "power2.out" }, 4.3);

  /* ── B3: Knowledge Catalog — manifest flows, rows register, tag lights ── */
  draw("#leg1", 5.2, 1.9);
  tl.from("#st-catalog .catalog-table", { opacity: 0, scale: 0.88, duration: 0.6, ease: "expo.out" }, 6.35);
  tl.from("#st-catalog .halo", { opacity: 0, duration: 0.7 }, 6.35);
  [0, 1, 2, 3].forEach((i) => {
    tl.set(`#st-catalog [data-row="${i}"] .fill`, { scaleX: 0 }, 0);
    tl.to(`#st-catalog [data-row="${i}"] .fill`, { scaleX: 1, duration: 0.45, ease: "power2.out" }, 6.75 + i * 0.28);
  });
  tl.from("#st-catalog .catalog-tag", { opacity: 0, scale: 0.6, duration: 0.5, ease: "back.out(1.6)" }, 7.7);

  /* ── B4: grounding index — planes stack, lens focuses ── */
  draw("#leg2", 8.3, 1.9);
  tl.from("#st-index .halo", { opacity: 0, duration: 0.7 }, 9.3);
  [0, 1, 2, 3].forEach((i) => {
    tl.from(`#st-index [data-plane="${i}"]`, { opacity: 0, y: 60, duration: 0.5, ease: "quint.out" }, 9.35 + i * 0.22);
  });
  tl.from("#st-index .index-lens", { opacity: 0, scale: 0.6, duration: 0.5, ease: "back.out(1.6)" }, 10.35);

  /* ── B5: Gemini Enterprise — spark, answer, citations ── */
  draw("#leg3", 11.2, 1.9);
  tl.from("#st-gemini .halo", { opacity: 0, duration: 0.7 }, 12.15);
  tl.from("#st-gemini .gemini-spark", { opacity: 0, scale: 0.6, rotate: -30, duration: 0.55, ease: "back.out(1.6)" }, 12.2);
  tl.from("#st-gemini .answer-card", { opacity: 0, scale: 0.9, duration: 0.6, ease: "expo.out" }, 12.45);
  [0, 1, 2].forEach((i) => {
    tl.from(`#st-gemini [data-aline="${i}"]`, { scaleX: 0, duration: 0.5, ease: "power2.out" }, 12.8 + i * 0.24);
  });
  tl.from("#st-gemini [data-pip='0']", { opacity: 0, scale: 0.5, duration: 0.4, ease: "back.out(1.7)" }, 13.5);
  tl.from("#st-gemini [data-pip='1']", { opacity: 0, scale: 0.5, duration: 0.4, ease: "back.out(1.7)" }, 13.68);

  /* ── B6: constellation — citations flow home, one beam ── */
  document.querySelectorAll(".thread-return").forEach((el, i) => {
    tl.set(el, { strokeDasharray: 1, strokeDashoffset: 1 }, 0);
    tl.to(el, { strokeDashoffset: 0, duration: 1.1, ease: "power1.inOut" }, 15.0 + i * 0.18);
  });
  tl.fromTo("#beam", { opacity: 0, x: -500, skewX: -10 }, { opacity: 1, x: 1200, skewX: -10, duration: 0.5, ease: "none" }, 16.2)
    .to("#beam", { x: 4400, opacity: 0, duration: 0.7, ease: "none" }, 16.7);

  /* ── B7: the loop closes — agents appear, write-back ring tracks progress ── */
  const AGENTS = [[-370, -180], [340, -240], [60, 400]];
  AGENTS.forEach((a, i) => {
    tl.set(`#hub [data-agent="${i}"]`, { x: a[0], y: a[1], opacity: 0 }, 0);
    tl.to(`#hub [data-agent="${i}"]`, { opacity: 1, scale: 1.05, duration: 0.5, ease: "back.out(1.5)" }, 18.2 + i * 0.25);
  });
  tl.from("#hub-gauge-track", { opacity: 0, duration: 0.5 }, 17.6);
  tl.set("#hub-gauge", { strokeDasharray: 1, strokeDashoffset: 1 }, 0);
  tl.to("#hub-gauge", { strokeDashoffset: 0.2, duration: 2.5, ease: "none" }, 17.7);
  tl.fromTo("#payoff-glow", { opacity: 0 }, { opacity: 1, duration: 2.2, ease: "power1.in" }, 17.9);

  /* ── B8: close ── */
  tl.to(["#hub-gauge", "#hub-gauge-track"], { opacity: 0.22, duration: 1.1, ease: "quint.inOut" }, 21.3);
  tl.to("#payoff-glow", { opacity: 0, duration: 1.0 }, 21.3);
  tl.fromTo("#outro-glow", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 1.3, ease: "power2.out" }, 21.5);
  tl.to("#hub .vault-tile", { boxShadow: "0 0 0 1px rgba(45,212,191,0.7), 0 0 120px rgba(45,212,191,0.5)", duration: 1.2, ease: "quint.out" }, 21.6);

  tl.set("#world", {}, 24);

  window.__timelines["main"] = tl;
})();

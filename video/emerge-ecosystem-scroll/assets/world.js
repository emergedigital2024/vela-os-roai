/**
 * world.js — builds the ecosystem-journey world and its paused GSAP timeline.
 *
 * Shared by index.html (1920×1080), portrait.html (1080×1920) and social.html
 * (landscape + burned captions). The shell sets window.__FILM_ORIENTATION
 * BEFORE loading this script; everything here is deterministic (no
 * Math.random / Date.now / network — frame capture depends on it).
 *
 * The camera is one transform on #world; #ambient (particles + nebulas) runs
 * a parallel transform at a slower factor for parallax depth.
 */
(function () {
  // Guard: linters/analysers may evaluate this file outside a fully-parsed page.
  const film = typeof document !== "undefined" && document.getElementById && document.getElementById("film");
  if (!film || !document.body || typeof gsap === "undefined") return;

  const PORTRAIT = (window.__FILM_ORIENTATION || "landscape") === "portrait";
  const VC = PORTRAIT ? { x: 540, y: 960 } : { x: 960, y: 540 }; // viewport center
  document.body.dataset.orientation = PORTRAIT ? "portrait" : "landscape";

  /* ── Deterministic ambient field: 40 particles + 3 nebulas ── */
  const particles = [];
  for (let i = 0; i < 40; i++) {
    const x = (i * 997 + 313) % 4200;
    const y = (i * 613 + 177) % 2100;
    const size = [4, 7, 10][i % 3];
    const op = [0.08, 0.14, 0.2][(i * 7) % 3];
    const blur = i % 4 === 0 ? "filter: blur(2px);" : "";
    particles.push(`<span class="particle" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;opacity:${op};${blur}"></span>`);
  }
  const nebulas = `
    <div class="nebula" style="left:1900px;top:200px;width:1500px;height:1200px;background:radial-gradient(circle, rgba(0,194,199,0.07), transparent 65%);"></div>
    <div class="nebula" style="left:1700px;top:1200px;width:1400px;height:1100px;background:radial-gradient(circle, rgba(61,220,227,0.055), transparent 65%);"></div>
    <div class="nebula" style="left:700px;top:800px;width:1300px;height:1100px;background:radial-gradient(circle, rgba(0,194,199,0.05), transparent 65%);"></div>`;

  /* ── World markup (identical geometry in both orientations) ── */
  film.innerHTML = `
    <div id="ambient" data-layout-allow-overflow>${nebulas}${particles.join("")}</div>
    <div id="world" data-layout-allow-overflow>
      <svg class="world-layer" viewBox="0 0 4200 2100" aria-hidden="true">
        <defs>
          <linearGradient id="threadGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#00C2C7" /><stop offset="1" stop-color="#3DDCE3" />
          </linearGradient>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#00C2C7" /><stop offset="0.6" stop-color="#3DDCE3" /><stop offset="1" stop-color="#00F5FF" />
          </linearGradient>
        </defs>
        <path id="leg1" class="thread" pathLength="1" d="M 2100 1050 C 2450 950, 2650 780, 2950 600" />
        <path id="leg2" class="thread" pathLength="1" d="M 2950 600 C 3250 800, 3150 1250, 2980 1520" />
        <path id="leg3" class="thread" pathLength="1" d="M 2980 1520 C 2760 1750, 2400 1880, 2050 1900" />
        <path id="leg4" class="thread" pathLength="1" d="M 2050 1900 C 1700 1850, 1450 1650, 1250 1420" />
        <path class="thread-return" pathLength="1" d="M 2950 600 C 2600 800, 2350 950, 2100 1050" />
        <path class="thread-return" pathLength="1" d="M 2980 1520 C 2650 1400, 2350 1200, 2100 1050" />
        <path class="thread-return" pathLength="1" d="M 2050 1900 C 2050 1600, 2080 1300, 2100 1050" />
        <path class="thread-return" pathLength="1" d="M 1250 1420 C 1550 1300, 1850 1150, 2100 1050" />
        <circle id="vela-gauge-track" class="gauge-track" cx="2980" cy="1520" r="120" />
        <circle id="vela-gauge" class="gauge-arc" pathLength="1" cx="2980" cy="1520" r="120" transform="rotate(-90 2980 1520)" />
        <path id="pods-lane" class="pods-lane" pathLength="1" d="M 1030 1420 L 1470 1420" />
        <path id="pods-branch" class="pods-branch" pathLength="1" d="M 1090 1420 C 1150 1330, 1210 1330, 1250 1330 L 1300 1330 C 1360 1330, 1400 1390, 1440 1416" />
        <path class="braid" pathLength="1" d="M 1880 830 C 1980 890, 2030 950, 2065 990" />
        <path class="braid" pathLength="1" d="M 2320 830 C 2220 890, 2170 950, 2135 990" />
        <path class="braid" pathLength="1" d="M 1860 1270 C 1970 1220, 2030 1160, 2062 1115" />
        <path class="braid" pathLength="1" d="M 2340 1270 C 2230 1220, 2170 1160, 2138 1115" />
        <circle id="hub-gauge-track" class="gauge-track" cx="2100" cy="1050" r="210" />
        <circle id="hub-gauge" class="gauge-arc" pathLength="1" cx="2100" cy="1050" r="210" transform="rotate(-90 2100 1050)" style="stroke-width: 12;" />
      </svg>
      <div id="hub">
        <div class="halo" data-halo></div>
        <div class="pulse-ring" data-pulse="1"></div>
        <div class="pulse-ring" data-pulse="2"></div>
        <div class="tile">ED</div>
      </div>
      <div id="st-af" class="station" style="left: 2950px; top: 600px;">
        <div class="halo"></div><div class="orbit"></div>
        <div class="checkpoint"><div class="checkpoint-fill"></div></div>
        <div class="st-tile"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2 5.5L19 10l-5 1.5L12 17l-2-5.5L5 10l5-1.5z" /><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" /></svg></div>
      </div>
      <div id="st-vela" class="station" style="left: 2980px; top: 1520px;">
        <div class="halo"></div>
        <div class="st-tile"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4a8 8 0 1 0 8 8" /><path d="M12 12l5.5-4" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /></svg></div>
        <div class="bars"><div class="bar value" data-bar-value></div><div class="bar cost" data-bar-cost></div></div>
      </div>
      <div id="st-vault" class="station" style="left: 2050px; top: 1900px;">
        <div class="halo"></div>
        <div class="st-tile"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2.5" /><circle cx="12" cy="12" r="3.2" /><path d="M12 8.8v-1.6M12 16.8v-1.6M8.8 12H7.2M16.8 12h-1.6" /></svg></div>
        ${Array.from({ length: 12 }, (_, i) => `<div class="doc" data-doc="${i}"></div>`).join("")}
      </div>
      <div id="st-pods" class="station" style="left: 1250px; top: 1420px;">
        <div class="halo"></div>
        <div class="gate" style="left: 45px; top: -105px;"><div class="gate-fill"></div></div>
        <div class="st-tile" style="left: -80px; top: 40px;"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="2.2" /><circle cx="6" cy="18" r="2.2" /><circle cx="18" cy="12" r="2.2" /><path d="M6 8.2v7.6M8 6.6c4 1 7.5 2.4 8 3.6M8 17.4c4-1 7.5-2.4 8-3.6" /></svg></div>
      </div>
      <div id="beam"></div>
      <div id="payoff-glow"></div>
      <div id="outro-glow"></div>
    </div>`;

  /* ── Timeline ── */
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });

  const HUB = [2100, 1050], AF = [2950, 600], VELA = [2980, 1520], VAULT = [2050, 1900], PODS = [1250, 1420];
  const CX = 2100, CY = 1050; // world center (= hub) — ambient parallax pivots here

  const cam = (wx, wy, z) => ({ x: VC.x - wx * z, y: VC.y - wy * z, scale: z });
  // Ambient: target point drawn 15% toward world center, zoom compressed — moves slower = depth.
  const amb = (wx, wy, z) => {
    const za = Math.pow(z, 0.88);
    return { x: VC.x - (CX + (wx - CX) * 0.85) * za, y: VC.y - (CY + (wy - CY) * 0.85) * za, scale: za };
  };
  const camSet = (wx, wy, z) => { gsap.set("#world", cam(wx, wy, z)); gsap.set("#ambient", amb(wx, wy, z)); };
  const camTo = (t, dur, target, ease) => {
    tl.to("#world", { ...cam(...target), duration: dur, ease }, t);
    tl.to("#ambient", { ...amb(...target), duration: dur, ease }, t);
  };

  /* Orientation-specific camera plan. Same beats, same times — different framing.
     Portrait beat 6: the 4200-wide world can't fit a 1080-wide frame, so the
     pull-back becomes a slow lateral pan across the constellation. */
  const C = PORTRAIT
    ? {
        open: [[...HUB, 1.6], [...HUB, 1.72]],
        zStation: 1.7, zDip: 1.15,
        b6: { from: [1350, 1250, 0.55], to: [2600, 950, 0.55] },
        payoff: [...HUB, 1.1], close: [...HUB, 1.4]
      }
    : {
        open: [[...HUB, 1.42], [...HUB, 1.52]],
        zStation: 1.5, zDip: 1.0,
        b6: { from: null, to: [...HUB, 0.42] },
        payoff: [...HUB, 1.02], close: [...HUB, 1.26]
      };

  camSet(...C.open[0]);

  const move = (t, dur, to) => {
    camTo(t, dur, [to[0], to[1], C.zStation], "power2.inOut");
    tl.to("#world", { scale: C.zDip, duration: dur * 0.5, ease: "quint.out", overwrite: false }, t);
    tl.to("#world", { scale: C.zStation, duration: dur * 0.5, ease: "quint.inOut" }, t + dur * 0.5);
  };

  // B1 hold + gentle push (0 – 2.4)
  camTo(0, 1.6, C.open[1], "quint.out");
  move(2.4, 2.0, AF);      // B2 → Agentforce, plateau to 5.28
  move(5.28, 2.0, VELA);   // B3 → Vela, plateau to 8.4
  move(8.4, 2.0, VAULT);   // B4 → Vault, plateau to 11.28
  move(11.28, 2.0, PODS);  // B5 → Pods, plateau to 14.16
  // B6 constellation (14.16 – 17.28): landscape pull-back / portrait lateral pan
  if (C.b6.from) {
    camTo(14.16, 1.2, C.b6.from, "power2.inOut");
    camTo(15.36, 1.7, C.b6.to, "power1.inOut");
  } else {
    camTo(14.16, 1.84, C.b6.to, "power2.inOut");
  }
  camTo(17.28, 2.0, C.payoff, "power2.inOut"); // B7 payoff push, plateau to 21.12
  camTo(21.12, 1.48, C.close, "quint.inOut");  // B8 final settle, hold to 24

  const draw = (sel, t, dur, ease = "none") => {
    tl.set(sel, { strokeDasharray: 1, strokeDashoffset: 1 }, 0);
    tl.to(sel, { strokeDashoffset: 0, duration: dur, ease }, t);
  };

  /* B1: hub ignition */
  tl.from("#hub .tile", { opacity: 0, scale: 0.82, duration: 0.7, ease: "back.out(1.5)" }, 0.15);
  tl.from("#hub [data-halo]", { opacity: 0, duration: 0.9, ease: "quint.out" }, 0.2);
  tl.fromTo("#hub [data-pulse='1']", { opacity: 0.8, scale: 0.45 }, { opacity: 0, scale: 2.1, duration: 1.4, ease: "power2.out" }, 0.9);
  tl.fromTo("#hub [data-pulse='2']", { opacity: 0.7, scale: 0.45 }, { opacity: 0, scale: 2.3, duration: 1.4, ease: "power2.out" }, 1.5);

  /* B2: Agentforce */
  draw("#leg1", 2.3, 1.9);
  tl.from("#st-af .st-tile", { opacity: 0, scale: 0.86, duration: 0.6, ease: "expo.out" }, 3.4);
  tl.from("#st-af .halo", { opacity: 0, duration: 0.7 }, 3.4);
  tl.from("#st-af .orbit", { opacity: 0, rotate: -40, duration: 1.1, ease: "quint.out" }, 3.55);
  tl.fromTo("#st-af .checkpoint-fill", { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(1.6)" }, 4.35);

  /* B3: Vela */
  draw("#leg2", 5.2, 1.9);
  tl.from("#st-vela .st-tile", { opacity: 0, scale: 0.86, duration: 0.6, ease: "expo.out" }, 6.3);
  tl.from("#st-vela .halo", { opacity: 0, duration: 0.7 }, 6.3);
  tl.set("#vela-gauge", { strokeDasharray: 1, strokeDashoffset: 1 }, 0);
  tl.to("#vela-gauge", { strokeDashoffset: 0.28, duration: 0.95, ease: "power2.out" }, 6.55);
  tl.from("#st-vela [data-bar-value]", { scaleY: 0, duration: 0.55, ease: "quint.out" }, 6.6);
  tl.from("#st-vela [data-bar-cost]", { scaleY: 0, duration: 0.45, ease: "quint.out" }, 6.8);

  /* B4: VaultOS docs snap */
  draw("#leg3", 8.3, 1.9);
  tl.from("#st-vault .st-tile", { opacity: 0, scale: 0.86, duration: 0.6, ease: "expo.out" }, 9.25);
  tl.from("#st-vault .halo", { opacity: 0, duration: 0.7 }, 9.25);
  const GRID = [
    [-150, -120], [-96, -158], [-38, -178], [38, -178], [96, -158], [150, -120],
    [-150, 46], [-96, 84], [-38, 104], [38, 104], [96, 84], [150, 46]
  ];
  const SCATTER = [
    [-320, -270], [-180, -340], [-30, -390], [130, -350], [270, -280], [360, -160],
    [-360, 120], [-240, 230], [-70, 300], [90, 310], [250, 240], [370, 130]
  ];
  GRID.forEach((g, i) => {
    const s = SCATTER[i];
    tl.set(`#st-vault [data-doc="${i}"]`, { x: s[0], y: s[1], opacity: 0.45, rotate: (i % 2 ? 14 : -12) }, 0);
    tl.to(`#st-vault [data-doc="${i}"]`, { x: g[0] - 17, y: g[1] - 22, opacity: 1, rotate: 0, duration: 0.5, ease: "quint.out" }, 9.3 + i * 0.055);
  });

  /* B5: Dev Pods */
  draw("#leg4", 11.2, 1.9);
  tl.from("#st-pods .st-tile", { opacity: 0, scale: 0.86, duration: 0.6, ease: "expo.out" }, 12.1);
  tl.from("#st-pods .halo", { opacity: 0, duration: 0.7 }, 12.1);
  draw("#pods-lane", 12.15, 0.55, "power1.out");
  draw("#pods-branch", 12.35, 0.6, "power1.out");
  tl.fromTo("#st-pods .gate-fill", { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)" }, 12.8);

  /* B6: constellation */
  document.querySelectorAll(".thread-return").forEach((el, i) => {
    tl.set(el, { strokeDasharray: 1, strokeDashoffset: 1 }, 0);
    tl.to(el, { strokeDashoffset: 0, duration: 1.1, ease: "power1.inOut" }, 15.0 + i * 0.15);
  });
  tl.fromTo("#beam", { opacity: 0, x: -500, skewX: -10 }, { opacity: 1, x: 1200, skewX: -10, duration: 0.5, ease: "none" }, 16.2)
    .to("#beam", { x: 4400, opacity: 0, duration: 0.7, ease: "none" }, 16.7);

  /* B7: payoff */
  document.querySelectorAll(".braid").forEach((el, i) => {
    tl.set(el, { strokeDasharray: 1, strokeDashoffset: 1 }, 0);
    tl.to(el, { strokeDashoffset: 0, duration: 0.8, ease: "power1.out" }, 17.5 + i * 0.12);
  });
  tl.from("#hub-gauge-track", { opacity: 0, duration: 0.5 }, 17.6);
  tl.set("#hub-gauge", { strokeDasharray: 1, strokeDashoffset: 1 }, 0);
  tl.to("#hub-gauge", { strokeDashoffset: 0.2, duration: 2.5, ease: "none" }, 17.7);
  tl.fromTo("#payoff-glow", { opacity: 0 }, { opacity: 1, duration: 2.2, ease: "power1.in" }, 17.9);

  /* B8: close */
  tl.to(["#hub-gauge", "#hub-gauge-track"], { opacity: 0.22, duration: 1.1, ease: "quint.inOut" }, 21.3);
  tl.to("#payoff-glow", { opacity: 0, duration: 1.0 }, 21.3);
  tl.fromTo("#outro-glow", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 1.3, ease: "power2.out" }, 21.5);
  tl.to("#hub .tile", { boxShadow: "0 0 0 1px rgba(0,194,199,0.7), 0 0 120px rgba(0,194,199,0.5)", duration: 1.2, ease: "quint.out" }, 21.6);

  tl.set("#world", {}, 24); // full 24s span (pure hold at the end)

  window.__timelines["main"] = tl;
})();

#!/usr/bin/env node
/**
 * export-frames.mjs — deterministic frame-sequence exporter (v2: dual orientation).
 *
 * The composition is a paused GSAP timeline (window.__timelines["main"]); every
 * frame is a pure function of time t. We serve the project over local HTTP,
 * step the timeline in headless Chrome, screenshot, then encode with sharp.
 *
 *   node export-frames.mjs landscape   # index.html → raw/ → frames/ (150 @ 1280×720)
 *   node export-frames.mjs portrait    # variants/portrait.html → raw-portrait/ → frames-portrait/ (75 @ 640×1136)
 *   node export-frames.mjs manifest    # frames/manifest.json (content-hash version, both sets)
 *   node export-frames.mjs deploy      # copy into the hub repo public/film/<version>/
 *   node export-frames.mjs all         # everything
 *
 * Budget gates: landscape ≤4.0MB, portrait ≤2.5MB (plan). Encode fails loudly over cap.
 */
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir, stat, cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const ROOT = new URL(".", import.meta.url).pathname;
const HUB_PUBLIC = "/Users/admin/Documents/vaultos-landing/film";
const HUB_MANIFEST = "/Users/admin/Documents/vaultos-landing/film/manifest.json"; // fetched at runtime (static site, no build step)
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const TIMELINE_SECONDS = 24;
const SOURCE_FPS = 30;
const SOURCE_FRAMES = TIMELINE_SECONDS * SOURCE_FPS; // 720

const SETS = {
  landscape: {
    src: "index.html", raw: "raw", out: "frames", frames: 150,
    capture: { w: 1920, h: 1080 }, encode: { w: 1280, h: 720 },
    poster: { name: "poster-2x.webp", w: 2880, h: 1620 },
    quality: 70, capBytes: 4.0 * 1024 * 1024,
    strip: { name: "preview-strip.webp", cols: 12, tw: 160, th: 90 }
  },
  portrait: {
    src: "variants/portrait.html", raw: "raw-portrait", out: "frames-portrait", frames: 75,
    capture: { w: 1080, h: 1920 }, encode: { w: 640, h: 1136 },
    poster: { name: "poster-portrait.webp", w: 1080, h: 1920 },
    quality: 70, capBytes: 2.5 * 1024 * 1024,
    strip: null
  }
};

const pad = (n) => String(n).padStart(4, "0");
const frameTime = (i, total) => (i * (SOURCE_FRAMES - 1)) / (total - 1) / SOURCE_FPS;

function serve() {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".webp": "image/webp" };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let p = path.join(ROOT, decodeURIComponent(url.pathname));
      if (url.pathname === "/") p = path.join(ROOT, "index.html");
      const body = await readFile(p);
      res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
      res.end(body);
    } catch { res.writeHead(404); res.end("not found"); }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}

async function captureSet(cfg) {
  const RAW = path.join(ROOT, cfg.raw);
  await mkdir(RAW, { recursive: true });
  const { server, port } = await serve();
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ["--force-color-profile=srgb", "--hide-scrollbars", "--no-sandbox", "--disable-gpu-vsync"]
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: cfg.capture.w, height: cfg.capture.h, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${port}/${cfg.src}`, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const t0 = performance.now();
      while (!(window.__timelines && window.__timelines["main"] && window.__timelines["main"].duration() > 0)) {
        if (performance.now() - t0 > 15_000) throw new Error("timeline_not_registered");
        await new Promise((r) => setTimeout(r, 50));
      }
      window.__timelines["main"].pause();
    });
    console.log(`[${cfg.src}] capturing ${cfg.frames} frames at ${cfg.capture.w}×${cfg.capture.h}…`);
    let captured = 0, skipped = 0;
    for (let i = 0; i < cfg.frames; i++) {
      const file = path.join(RAW, `frame-${pad(i + 1)}.png`);
      if (existsSync(file) && !process.argv.includes("--force")) { skipped++; continue; }
      const t = frameTime(i, cfg.frames);
      await page.evaluate(async (tt) => {
        window.__timelines["main"].time(tt, false);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }, t);
      await page.screenshot({ path: file, type: "png" });
      captured++;
      if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${cfg.frames} (t=${t.toFixed(2)}s)`);
    }
    // Poster: constellation money-shot for landscape (≈ t16.9, frame 106/150); t0 for portrait.
    const posterT = cfg.src === "index.html" ? frameTime(105, 150) : 0;
    await page.setViewport({ width: cfg.capture.w, height: cfg.capture.h, deviceScaleFactor: 2 });
    await page.evaluate(async (tt) => {
      window.__timelines["main"].time(tt, false);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, posterT);
    await page.screenshot({ path: path.join(RAW, "poster-raw.png"), type: "png" });
    console.log(`[${cfg.src}] capture done: ${captured} new, ${skipped} skipped`);
    await writeFile(path.join(RAW, "chrome-version.txt"), await page.browser().version());
  } finally {
    await browser.close();
    server.close();
  }
}

async function encodeSet(cfg) {
  const RAW = path.join(ROOT, cfg.raw);
  const OUT = path.join(ROOT, cfg.out);
  await mkdir(OUT, { recursive: true });
  let total = 0, prevRaw = null, maxDiff = 0, maxDiffAt = "";
  for (let i = 0; i < cfg.frames; i++) {
    const src = path.join(RAW, `frame-${pad(i + 1)}.png`);
    const dst = path.join(OUT, `frame-${pad(i + 1)}.webp`);
    await sharp(src).resize(cfg.encode.w, cfg.encode.h, { kernel: "lanczos3" }).webp({ quality: cfg.quality, effort: 5 }).toFile(dst);
    total += (await stat(dst)).size;
    const rawBuf = await sharp(src).resize(320, Math.round((320 * cfg.encode.h) / cfg.encode.w)).greyscale().raw().toBuffer();
    if (prevRaw && prevRaw.length === rawBuf.length) {
      let sum = 0;
      for (let px = 0; px < rawBuf.length; px++) sum += Math.abs(rawBuf[px] - prevRaw[px]);
      const mean = sum / rawBuf.length;
      if (mean > maxDiff) { maxDiff = mean; maxDiffAt = `frame ${i} → ${i + 1} (t≈${frameTime(i, cfg.frames).toFixed(2)}s)`; }
    }
    prevRaw = rawBuf;
  }
  await sharp(path.join(RAW, "poster-raw.png")).resize(cfg.poster.w, cfg.poster.h).webp({ quality: 80 }).toFile(path.join(OUT, cfg.poster.name));
  if (cfg.strip) {
    const thumbs = [];
    for (let i = 0; i < cfg.frames; i++) thumbs.push(await sharp(path.join(RAW, `frame-${pad(i + 1)}.png`)).resize(cfg.strip.tw, cfg.strip.th).toBuffer());
    const rows = Math.ceil(cfg.frames / cfg.strip.cols);
    await sharp({ create: { width: cfg.strip.cols * cfg.strip.tw, height: rows * cfg.strip.th, channels: 3, background: "#03081A" } })
      .composite(thumbs.map((buf, i) => ({ input: buf, left: (i % cfg.strip.cols) * cfg.strip.tw, top: Math.floor(i / cfg.strip.cols) * cfg.strip.th })))
      .webp({ quality: 55 }).toFile(path.join(OUT, cfg.strip.name));
  }
  const mb = total / 1024 / 1024;
  console.log(`[${cfg.out}] total: ${mb.toFixed(2)} MB (cap ${(cfg.capBytes / 1024 / 1024).toFixed(1)}) · max diff ${maxDiff.toFixed(1)} at ${maxDiffAt}`);
  if (total > cfg.capBytes) throw new Error(`BUDGET_EXCEEDED [${cfg.out}]: ${mb.toFixed(2)} MB — lower quality or frames`);
  if (maxDiff > 40) console.warn(`⚠ smoothness [${cfg.out}]: max diff ${maxDiff.toFixed(1)} > 40 — inspect around ${maxDiffAt}`);
}

async function manifest() {
  const hashInputs = await Promise.all(
    ["index.html", "variants/portrait.html", "assets/world.js", "assets/world.css", "assets/gsap.min.js"].map((f) => readFile(path.join(ROOT, f)))
  );
  const h = createHash("sha256");
  hashInputs.forEach((b) => h.update(b));
  const version = "v-" + h.digest("hex").slice(0, 8);
  let chrome = "";
  try { chrome = (await readFile(path.join(ROOT, "raw/chrome-version.txt"), "utf8")).trim(); } catch {}
  const setMeta = async (cfg) => ({
    dir: cfg.out,
    frameCount: (await readdir(path.join(ROOT, cfg.out))).filter((f) => f.startsWith("frame-")).length,
    width: cfg.encode.w,
    height: cfg.encode.h,
    pattern: "frame-%04d.webp",
    poster: cfg.poster.name,
    ...(cfg.strip ? { previewStrip: { file: cfg.strip.name, cols: cfg.strip.cols, thumbWidth: cfg.strip.tw, thumbHeight: cfg.strip.th } } : {})
  });
  const m = {
    version, timelineSeconds: TIMELINE_SECONDS, sourceFps: SOURCE_FPS, beats: 8, chrome,
    landscape: await setMeta(SETS.landscape),
    portrait: await setMeta(SETS.portrait)
  };
  await writeFile(path.join(ROOT, "frames/manifest.json"), JSON.stringify(m, null, 2));
  console.log(`manifest: ${version} · L${m.landscape.frameCount}/P${m.portrait.frameCount}`);
  return m;
}

async function deploy() {
  const m = JSON.parse(await readFile(path.join(ROOT, "frames/manifest.json"), "utf8"));
  const dest = path.join(HUB_PUBLIC, m.version);
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await cp(path.join(ROOT, SETS.landscape.out), path.join(dest, m.landscape.dir), { recursive: true });
  await cp(path.join(ROOT, SETS.portrait.out), path.join(dest, m.portrait.dir), { recursive: true });
  await writeFile(HUB_MANIFEST, JSON.stringify({ ...m, basePath: `/film/${m.version}` }, null, 2));
  console.log(`deployed → ${dest}`);
  console.log(`manifest → ${HUB_MANIFEST}`);
  console.log("note: keep the previous /film/<version>/ dir for one deploy cycle (open-tab protection), prune the one before it.");
}

const cmd = process.argv[2] || "all";
if (cmd === "landscape" || cmd === "all") { await captureSet(SETS.landscape); await encodeSet(SETS.landscape); }
if (cmd === "portrait" || cmd === "all") { await captureSet(SETS.portrait); await encodeSet(SETS.portrait); }
if (cmd === "manifest" || cmd === "all") await manifest();
if (cmd === "deploy" || cmd === "all") await deploy();

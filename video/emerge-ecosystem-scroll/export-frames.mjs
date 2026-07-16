#!/usr/bin/env node
/**
 * export-frames.mjs — deterministic frame-sequence exporter for the scroll film.
 *
 * The composition is a paused GSAP timeline (window.__timelines["main"]), so every
 * frame is a pure function of time t. We serve the project over a local HTTP server
 * (no file:// font ambiguity), step the timeline in headless Chrome, screenshot each
 * frame, then encode to WebP with sharp.
 *
 *   node export-frames.mjs capture     # 150 PNGs at 1920×1080 → raw/  (resumable)
 *   node export-frames.mjs encode      # raw/ → frames/*.webp 1280×720 + poster + strip
 *   node export-frames.mjs manifest    # frames/manifest.json (content-hash version)
 *   node export-frames.mjs deploy      # copy into the hub repo public/film/<version>/
 *   node export-frames.mjs all
 *
 * Budget gate (from the approved plan): total frames ≤ 4.0 MB hard, ≤ 3.0 MB target.
 * Encode fails loudly if the hard cap is exceeded (drop QUALITY, then FRAMES).
 */
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir, stat, cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const ROOT = new URL(".", import.meta.url).pathname;
const RAW = path.join(ROOT, "raw");
const OUT = path.join(ROOT, "frames");
const HUB_REPO = path.resolve(ROOT, "../../../GitHub/emerge-digital-website"); // not a real path — resolved below
const HUB_PUBLIC = "/Users/admin/Documents/GitHub/emerge-digital-website/public/film";
const HUB_MANIFEST = "/Users/admin/Documents/GitHub/emerge-digital-website/src/lib/ecosystem-film.manifest.json";

const FRAMES = 150;
const TIMELINE_SECONDS = 24;
const SOURCE_FPS = 30;
const SOURCE_FRAMES = TIMELINE_SECONDS * SOURCE_FPS; // 720
const CAPTURE_W = 1920, CAPTURE_H = 1080;
const OUT_W = 1280, OUT_H = 720;
const QUALITY = 70;
const HARD_CAP_BYTES = 4.0 * 1024 * 1024;
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const pad = (n) => String(n).padStart(4, "0");
// Frame i (0-based) maps to source frame i * (SOURCE_FRAMES-1)/(FRAMES-1), i.e. t in [0, 23.9667].
const frameTime = (i) => (i * (SOURCE_FRAMES - 1)) / (FRAMES - 1) / SOURCE_FPS;

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
    } catch {
      res.writeHead(404); res.end("not found");
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port })));
}

async function capture() {
  await mkdir(RAW, { recursive: true });
  const { server, port } = await serve();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ["--force-color-profile=srgb", "--hide-scrollbars", "--no-sandbox", "--disable-gpu-vsync"]
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: CAPTURE_W, height: CAPTURE_H, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      const t0 = Date.now();
      while (!(window.__timelines && window.__timelines["main"])) {
        if (Date.now() - t0 > 15_000) throw new Error("timeline_not_registered");
        await new Promise((r) => setTimeout(r, 50));
      }
      window.__timelines["main"].pause();
    });
    console.log(`chrome ready — capturing ${FRAMES} frames…`);
    let captured = 0, skipped = 0;
    for (let i = 0; i < FRAMES; i++) {
      const file = path.join(RAW, `frame-${pad(i + 1)}.png`);
      if (existsSync(file) && !process.argv.includes("--force")) { skipped++; continue; }
      const t = frameTime(i);
      await page.evaluate(async (tt) => {
        window.__timelines["main"].time(tt, false);
        // settle style → layout → paint
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      }, t);
      await page.screenshot({ path: file, type: "png" });
      captured++;
      if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${FRAMES} (t=${t.toFixed(2)}s)`);
    }
    // Poster: t=0 at 2× for the site's static underlay/fallback.
    await page.setViewport({ width: CAPTURE_W, height: CAPTURE_H, deviceScaleFactor: 2 });
    await page.evaluate(async () => {
      window.__timelines["main"].time(0, false);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
    await page.screenshot({ path: path.join(RAW, "poster-raw.png"), type: "png" });
    console.log(`capture done: ${captured} new, ${skipped} skipped (resumable)`);
    const version = await page.browser().version();
    await writeFile(path.join(RAW, "chrome-version.txt"), version);
  } finally {
    await browser.close();
    server.close();
  }
}

async function encode() {
  await mkdir(OUT, { recursive: true });
  let total = 0;
  let prevRaw = null;
  let maxDiff = 0, maxDiffAt = "";
  for (let i = 0; i < FRAMES; i++) {
    const src = path.join(RAW, `frame-${pad(i + 1)}.png`);
    const dst = path.join(OUT, `frame-${pad(i + 1)}.webp`);
    const img = sharp(src).resize(OUT_W, OUT_H, { kernel: "lanczos3" });
    await img.clone().webp({ quality: QUALITY, effort: 5 }).toFile(dst);
    total += (await stat(dst)).size;
    // smoothness: mean abs diff vs previous frame (catches camera-velocity strobing)
    const rawBuf = await sharp(src).resize(320, 180).greyscale().raw().toBuffer();
    if (prevRaw) {
      let sum = 0;
      for (let px = 0; px < rawBuf.length; px++) sum += Math.abs(rawBuf[px] - prevRaw[px]);
      const mean = sum / rawBuf.length;
      if (mean > maxDiff) { maxDiff = mean; maxDiffAt = `frame ${i} → ${i + 1} (t≈${frameTime(i).toFixed(2)}s)`; }
    }
    prevRaw = rawBuf;
    if ((i + 1) % 50 === 0) console.log(`  encoded ${i + 1}/${FRAMES} — ${(total / 1024 / 1024).toFixed(2)} MB so far`);
  }
  // Poster (2880×1620 from the 2× raw) + tiny blurred preview strip (12×13 grid of 160×90)
  await sharp(path.join(RAW, "poster-raw.png")).resize(2880, 1620).webp({ quality: 80 }).toFile(path.join(OUT, "poster-2x.webp"));
  const thumbs = [];
  for (let i = 0; i < FRAMES; i++) {
    thumbs.push(await sharp(path.join(RAW, `frame-${pad(i + 1)}.png`)).resize(160, 90).toBuffer());
  }
  const COLS = 12, ROWS = Math.ceil(FRAMES / COLS);
  await sharp({ create: { width: COLS * 160, height: ROWS * 90, channels: 3, background: "#03081A" } })
    .composite(thumbs.map((buf, i) => ({ input: buf, left: (i % COLS) * 160, top: Math.floor(i / COLS) * 90 })))
    .webp({ quality: 55 }).toFile(path.join(OUT, "preview-strip.webp"));

  const mb = total / 1024 / 1024;
  console.log(`frames total: ${mb.toFixed(2)} MB (cap 4.00) · max frame-to-frame diff: ${maxDiff.toFixed(1)} at ${maxDiffAt}`);
  if (total > HARD_CAP_BYTES) throw new Error(`BUDGET_EXCEEDED: ${mb.toFixed(2)} MB > 4.0 MB — lower QUALITY or FRAMES`);
  if (maxDiff > 40) console.warn(`⚠ smoothness: max diff ${maxDiff.toFixed(1)} > 40 — inspect for strobing around ${maxDiffAt}`);
}

async function manifest() {
  const idx = await readFile(path.join(ROOT, "index.html"));
  const gsap = await readFile(path.join(ROOT, "assets/gsap.min.js"));
  const version = "v-" + createHash("sha256").update(idx).update(gsap).digest("hex").slice(0, 8);
  let chrome = "";
  try { chrome = (await readFile(path.join(RAW, "chrome-version.txt"), "utf8")).trim(); } catch {}
  const files = (await readdir(OUT)).filter((f) => f.startsWith("frame-"));
  const m = {
    version,
    frameCount: files.length,
    width: OUT_W, height: OUT_H, aspect: +(OUT_W / OUT_H).toFixed(4),
    format: "webp",
    pattern: "frame-%04d.webp",
    poster: "poster-2x.webp",
    previewStrip: { file: "preview-strip.webp", cols: 12, thumbWidth: 160, thumbHeight: 90 },
    timelineSeconds: TIMELINE_SECONDS, sourceFps: SOURCE_FPS,
    beats: 8,
    chrome
  };
  await writeFile(path.join(OUT, "manifest.json"), JSON.stringify(m, null, 2));
  console.log(`manifest: ${version} · ${files.length} frames`);
  return m;
}

async function deploy() {
  const m = JSON.parse(await readFile(path.join(OUT, "manifest.json"), "utf8"));
  const dest = path.join(HUB_PUBLIC, m.version);
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  await cp(OUT, dest, { recursive: true });
  await writeFile(HUB_MANIFEST, JSON.stringify({ ...m, basePath: `/film/${m.version}` }, null, 2));
  console.log(`deployed → ${dest}`);
  console.log(`manifest → ${HUB_MANIFEST}`);
  console.log("note: keep the previous /film/<version>/ dir for one deploy cycle (open-tab protection).");
}

const cmd = process.argv[2] || "all";
if (cmd === "capture" || cmd === "all") await capture();
if (cmd === "encode" || cmd === "all") await encode();
if (cmd === "manifest" || cmd === "all") await manifest();
if (cmd === "deploy" || cmd === "all") await deploy();

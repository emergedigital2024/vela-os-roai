#!/usr/bin/env node
/** Captures og.html (1200×630) → the hub repo's public/og-default.png. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const ROOT = new URL(".", import.meta.url).pathname;
const OUT = "/Users/admin/Documents/GitHub/emerge-digital-website/public/og-default.png";
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const types = { ".html": "text/html", ".png": "image/png", ".woff2": "font/woff2", ".css": "text/css", ".js": "text/javascript" };
const server = createServer(async (req, res) => {
  try {
    const body = await readFile(path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname)));
    res.writeHead(200, { "content-type": types[path.extname(req.url)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--force-color-profile=srgb", "--hide-scrollbars", "--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/og.html`, { waitUntil: "networkidle0" });
await page.evaluate(async () => { await document.fonts.ready; });
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: OUT, type: "png" });
await browser.close();
server.close();
console.log(`✓ ${OUT}`);

#!/usr/bin/env node
/**
 * publish-video.mjs — the missing renders/ → public/downloads/ pipeline.
 *
 * Rendering is NOT publishing: a finished MP4 in video/<name>/renders/ ships
 * nowhere until it is copied into public/downloads/ and deployed. This script
 * is the one sanctioned path (rule: vault note vela-roai-video-publishing —
 * the Vela OS explainer 404'd as text/html for months because this step was
 * manual and skipped).
 *
 *   node scripts/publish-video.mjs <video-dir> <Output-Name.mp4> [render.mp4]
 *   node scripts/publish-video.mjs --verify <Output-Name.mp4>
 *
 * - Picks the NEWEST mp4 in video/<video-dir>/renders/ unless a specific
 *   render filename is given.
 * - Remuxes with `ffmpeg -c copy -movflags +faststart` (no re-encode; moves
 *   the moov atom up front so playback starts before full download).
 * - --verify HEAD-checks the live URL for `200` + `video/mp4` AFTER deploy.
 *
 * ⚠️ Cloudflare assets return no Accept-Ranges: hosted MP4s cannot be
 * scrubbed. If seeking matters, use Cloudflare Stream instead of this path.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const ORIGIN = 'https://vela.emergedigital.com';

const args = process.argv.slice(2);

if (args[0] === '--verify') {
  const name = args[1];
  if (!name) die('usage: publish-video.mjs --verify <Output-Name.mp4>');
  const url = `${ORIGIN}/downloads/${name}`;
  const head = execFileSync('curl', ['-sSI', url], { encoding: 'utf8' });
  const ok = /^HTTP\/\S+ 200/m.test(head) && /content-type:\s*video\/mp4/i.test(head);
  console.log(head.trim().split('\n').slice(0, 6).join('\n'));
  if (!ok) die(`✗ ${url} is NOT serving 200 + video/mp4 — deploy, or check the filename.`);
  console.log(`✓ ${url} serves 200 + video/mp4`);
  process.exit(0);
}

const [videoDir, outName, explicitRender] = args;
if (!videoDir || !outName || !outName.endsWith('.mp4')) {
  die('usage: publish-video.mjs <video-dir> <Output-Name.mp4> [render.mp4]\n       publish-video.mjs --verify <Output-Name.mp4>');
}

const rendersDir = join(ROOT, 'video', videoDir, 'renders');
if (!existsSync(rendersDir)) die(`no renders dir: video/${videoDir}/renders/`);

let render;
if (explicitRender) {
  render = join(rendersDir, explicitRender);
  if (!existsSync(render)) die(`render not found: ${render}`);
} else {
  const mp4s = readdirSync(rendersDir)
    .filter((f) => f.endsWith('.mp4'))
    .map((f) => ({ f, m: statSync(join(rendersDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (!mp4s.length) die(`no .mp4 renders in video/${videoDir}/renders/`);
  render = join(rendersDir, mp4s[0].f);
  console.log(`newest render: ${mp4s[0].f}`);
}

const out = join(ROOT, 'public', 'downloads', outName);
execFileSync('ffmpeg', ['-y', '-i', render, '-c', 'copy', '-movflags', '+faststart', out], {
  stdio: ['ignore', 'inherit', 'inherit'],
});
const mb = (statSync(out).size / 1e6).toFixed(1);
console.log(`\n✓ published public/downloads/${outName} (${mb} MB, faststart remux)`);
console.log(`next: commit + deploy, then verify the live asset:`);
console.log(`  node scripts/publish-video.mjs --verify ${outName}`);

function die(msg) {
  console.error(msg);
  process.exit(1);
}

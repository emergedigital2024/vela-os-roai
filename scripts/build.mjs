/* Build step for the Vela OS dashboard.

   Emits two content-hashed, immutable assets into public/assets/ and renders
   public/index.html from the app/index.html template with both wired in:

   - vela-<hash>.js  — esbuild bundles + minifies app/entry.js (React + the 11
     window.* component modules). Replaces the former in-browser @babel/standalone.
   - vela-<hash>.css — the Tailwind CLI generates a static, purged stylesheet from
     app/tailwind.css (only the classes used in app/**). Replaces the render-blocking
     cdn.tailwindcss.com Play CDN, which was forbidden in prod (FOUC + a production
     warning + an extra blocking request).

   Run by `npm run build`, and by CI (deploy.yml / preview.yml) before wrangler.
   Both public/assets/ and public/index.html are build output (.gitignore'd). */
import { build } from "esbuild";
import { readFile, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "public", "assets");
const JS_MARKER = "<!-- build:js -->";
const CSS_MARKER = "<!-- build:css -->";

// Start clean so stale content-hashed bundles never pile up in the served dir.
await rm(assetsDir, { recursive: true, force: true });

const result = await build({
  entryPoints: [path.join(root, "app", "entry.js")],
  bundle: true,
  minify: true,
  format: "esm",
  target: ["es2020"],
  // Classic JSX runtime → React.createElement, resolved against the global React
  // that app/_globals.js puts on window (same contract the old Babel build used).
  jsx: "transform",
  // Selects react.production.min over the dev build and dead-code-eliminates
  // React's development-only branches.
  define: { "process.env.NODE_ENV": '"production"' },
  entryNames: "vela-[hash]",
  outdir: assetsDir,
  metafile: true,
  legalComments: "none",
  sourcemap: false,
  logLevel: "info",
});

const outJs = Object.keys(result.metafile.outputs).find((f) => f.endsWith(".js"));
if (!outJs) throw new Error("esbuild produced no .js output");
const jsUrl = "/assets/" + path.basename(outJs);

// Generate the static, purged Tailwind stylesheet. The CLI scans tailwind.config.js's
// `content` globs, emits only the utilities the app uses, minifies, and prints to
// stdout. Content-hash it ourselves so it can be cached `immutable` like the JS.
const tailwindBin = path.join(root, "node_modules", ".bin", "tailwindcss");
const css = execFileSync(
  tailwindBin,
  [
    "--config", path.join(root, "tailwind.config.js"),
    "--input", path.join(root, "app", "tailwind.css"),
    "--minify",
  ],
  { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
);
if (!css.trim()) throw new Error("Tailwind produced empty CSS");
const cssHash = createHash("sha256").update(css).digest("hex").slice(0, 8);
const cssName = `vela-${cssHash}.css`;
await writeFile(path.join(assetsDir, cssName), css);
const cssUrl = "/assets/" + cssName;

const template = await readFile(path.join(root, "app", "index.html"), "utf8");
for (const marker of [JS_MARKER, CSS_MARKER]) {
  if (!template.includes(marker)) {
    throw new Error(`app/index.html is missing the "${marker}" marker`);
  }
}
const html = template
  .replace(CSS_MARKER, `<link rel="stylesheet" href="${cssUrl}" />`)
  .replace(JS_MARKER, `<script type="module" src="${jsUrl}"></script>`);
await writeFile(path.join(root, "public", "index.html"), html);

console.log(`✓ built ${jsUrl} + ${cssUrl} + public/index.html`);

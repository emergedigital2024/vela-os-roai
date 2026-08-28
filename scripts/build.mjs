/* Build step for the Vela OS dashboard.

   Bundles + minifies app/entry.js (React + the 11 window.* component modules) into
   a single content-hashed, immutable asset at public/assets/vela-<hash>.js, then
   renders public/index.html from the app/index.html template with the hashed bundle
   URL injected. This replaces the former in-browser @babel/standalone transpile.

   Run by `npm run build`, and by CI (deploy.yml / preview.yml) before wrangler.
   Both public/assets/ and public/index.html are build output (.gitignore'd). */
import { build } from "esbuild";
import { readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "public", "assets");
const MARKER = "<!-- build:js -->";

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
const publicUrl = "/assets/" + path.basename(outJs);

const template = await readFile(path.join(root, "app", "index.html"), "utf8");
if (!template.includes(MARKER)) {
  throw new Error(`app/index.html is missing the "${MARKER}" marker`);
}
const html = template.replace(MARKER, `<script type="module" src="${publicUrl}"></script>`);
await writeFile(path.join(root, "public", "index.html"), html);

console.log(`✓ built ${publicUrl} + public/index.html`);

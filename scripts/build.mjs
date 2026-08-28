/* Build step for the Vela OS dashboard.

   1. Bundles + minifies app/entry.js (React + the 11 window.* component modules)
      into a single content-hashed, immutable asset at public/assets/vela-<hash>.js.
      This replaced the former in-browser @babel/standalone transpile.
   2. Compiles app/tailwind.css through the Tailwind v3 CLI into a static, purged,
      minified stylesheet at public/assets/vela-<hash>.css. This replaced the
      cdn.tailwindcss.com Play CDN (render-blocking JIT + FOUC, forbidden in prod) —
      only the utility classes the app actually references survive the purge.
   3. Renders public/index.html from the app/index.html template, injecting the
      hashed <script> and <link rel="stylesheet"> in place of the build markers.

   Run by `npm run build`, and by CI (deploy.yml / preview.yml) before wrangler.
   Both public/assets/ and public/index.html are build output (.gitignore'd). */
import { build } from "esbuild";
import { readFile, writeFile, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileP = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "public", "assets");
const JS_MARKER = "<!-- build:js -->";
const CSS_MARKER = "<!-- build:css -->";

// Start clean so stale content-hashed bundles never pile up in the served dir.
await rm(assetsDir, { recursive: true, force: true });

// 1. JS bundle ---------------------------------------------------------------
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

// 2. Tailwind CSS via the v3 CLI --------------------------------------------
const cssEntry = path.join(root, "app", "tailwind.css");
const tmpCss = path.join(assetsDir, "_tailwind.css");
const tailwindCli = path.join(root, "node_modules", "tailwindcss", "lib", "cli.js");
await execFileP(process.execPath, [tailwindCli, "-i", cssEntry, "-o", tmpCss, "--minify"], {
  cwd: root,
});
const css = await readFile(tmpCss, "utf8");
await rm(tmpCss);
const cssHash = createHash("sha256").update(css).digest("hex").slice(0, 8);
const cssName = `vela-${cssHash}.css`;
await writeFile(path.join(assetsDir, cssName), css);
const cssUrl = "/assets/" + cssName;

// 3. Render index.html -------------------------------------------------------
const template = await readFile(path.join(root, "app", "index.html"), "utf8");
for (const marker of [JS_MARKER, CSS_MARKER]) {
  if (!template.includes(marker)) {
    throw new Error(`app/index.html is missing the "${marker}" marker`);
  }
}
const html = template
  .replace(CSS_MARKER, `<link rel="stylesheet" href="${cssUrl}" />`)
  .replace(JS_MARKER, `<script type="module" src="${jsUrl}"></script>`);

if (html.includes("cdn.tailwindcss.com")) {
  throw new Error("cdn.tailwindcss.com leaked into public/index.html");
}
if (/@babel\/standalone|type=["']text\/babel["']/.test(html)) {
  throw new Error("in-browser Babel leaked into public/index.html");
}
if (html.includes(JS_MARKER) || html.includes(CSS_MARKER)) {
  throw new Error("unreplaced build marker in public/index.html");
}

await writeFile(path.join(root, "public", "index.html"), html);

console.log(`✓ built ${jsUrl} + ${cssUrl} + public/index.html`);

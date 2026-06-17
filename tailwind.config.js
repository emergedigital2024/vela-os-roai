/* Tailwind config for the static, purged build (scripts/build.mjs).

   Replaces the former in-browser Tailwind Play CDN (cdn.tailwindcss.com), which
   was render-blocking, caused a FOUC, and printed a production warning. Tailwind
   scans the `content` globs for class-name tokens and emits only those utilities
   into public/assets/vela-<hash>.css.

   Pinned to Tailwind v3 to match the Play CDN's defaults (preflight + default
   theme) one-for-one, so the static stylesheet renders identically. The app's
   dynamic classes are complete literal strings inside cx()/ternaries (e.g.
   "text-emerald-400", "bg-[var(--accent)]"), which the scanner extracts as-is. */
export default {
  content: ["./app/**/*.{html,jsx}"],
  // Theming is done with CSS variables swapped by html.light / html.dark; no
  // `dark:` variants are used. Kept as "class" to mirror the old CDN config.
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
    },
  },
};

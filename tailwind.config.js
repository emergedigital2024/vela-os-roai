/* Tailwind config for the Vela OS dashboard.

   Replaces the former in-browser `tailwind.config = {…}` that paired with the
   cdn.tailwindcss.com Play CDN. scripts/build.mjs runs the Tailwind v3 CLI over
   `content` below and emits a static, purged stylesheet (public/assets/vela-<hash>.css).

   `content` must list every file that can contain class names: the component
   modules, the build entry, and the HTML template (skip-link / noscript markup).
   Font families match current main (Lexend / Lexend Zetta / Prompt / Geist Mono),
   not the Geist-sans pairing the June PR used. */
export default {
  content: ["./app/**/*.{js,jsx,html}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Lexend", "system-ui", "sans-serif"],
        display: ["Lexend Zetta", "Lexend", "system-ui", "sans-serif"],
        label: ["Prompt", "Lexend", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
    },
  },
};

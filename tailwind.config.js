/* Tailwind config for the Vela OS dashboard.

   Replaces the former in-browser `tailwind.config = {…}` that paired with the
   cdn.tailwindcss.com Play CDN. scripts/build.mjs runs Tailwind over `content`
   below and emits a static, purged stylesheet (public/assets/vela-<hash>.css) —
   only the utility classes the app actually references survive.

   `content` must list every file that can contain class names: the component
   modules, the build entry, and the HTML template (skip-link / noscript markup). */
export default {
  content: ["./app/**/*.{js,jsx,html}"],
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

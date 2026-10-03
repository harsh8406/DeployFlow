/** @type {import('tailwindcss').Config} */
// Semantic tokens live in src/index.css as CSS variables (light + dark).
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Geist Variable'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'Geist Mono Variable'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        bg: token("bg"),
        surface: token("surface"),
        raised: token("raised"),
        line: token("line"),
        fg: token("fg"),
        muted: token("muted"),
        subtle: token("subtle"),
        accent: { DEFAULT: token("accent"), fg: token("accent-fg") },
        ok: token("ok"),
        bad: token("bad"),
        warn: token("warn"),
      },
      borderRadius: { DEFAULT: "6px", md: "6px", lg: "8px" },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "stage-pulse": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.35 } },
      },
      animation: {
        shimmer: "shimmer 1.4s infinite",
        "stage-pulse": "stage-pulse 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

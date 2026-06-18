/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Archive palette (token-mapped to CSS vars in globals.css) ──────────
      colors: {
        paper: {
          DEFAULT: "var(--paper)",      // base background
          1: "var(--paper-1)",          // raised surface
          2: "var(--paper-2)",          // overlay / sheet
          3: "var(--paper-3)",          // highest elevation
        },
        ink: {
          DEFAULT: "var(--ink)",        // primary text
          2: "var(--ink-2)",            // secondary text
          3: "var(--ink-3)",            // tertiary / labels
        },
        line: {
          DEFAULT: "var(--line)",       // hairline border
          strong: "var(--line-strong)",
        },
        signal: {
          DEFAULT: "var(--signal)",     // the single accent (amber/ember)
          soft: "var(--signal-soft)",
        },
        alert: "var(--alert)",          // redaction red, used rarely
        ok: "var(--ok)",                // confirmation green, restrained
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument-serif)", "Georgia", "serif"],
        mono: ["var(--font-ibm-plex-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        label: "0.22em",   // operational mono labels
      },
      boxShadow: {
        // Subtle elevation, never glow
        raise: "0 1px 0 0 var(--line) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
        sheet: "0 -1px 0 0 var(--line-strong) inset, 0 -24px 60px -20px rgba(0,0,0,0.7)",
        dock: "0 1px 0 0 var(--line) inset, 0 12px 40px -16px rgba(0,0,0,0.7)",
      },
      keyframes: {
        // Nearly-imperceptible ambient motion only
        breathe: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.85" },
        },
        reveal: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        breathe: "breathe 7s ease-in-out infinite",
        reveal: "reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
      transitionTimingFunction: {
        // Anticipation → movement → settle
        settle: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

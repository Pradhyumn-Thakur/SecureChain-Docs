/** @type {import('tailwindcss').Config} */

// ─────────────────────────────────────────────────────────────────────
// "Digital notary" theme — calm, institutional. Light and dark.
//
// All colors resolve through CSS variables (defined in index.css), so
// the dark variant flips the palette without touching components.
// Legacy token names (surface / accent / cyber / slate) are kept and
// remapped so older components inherit the redesign:
//   surface  → paper tones
//   accent   → ledger green
//   cyber    → steel ink-blue for evidence/links
//   slate    → inverted text hierarchy (light-on-dark classes resolve
//              to the equivalent hierarchy level in both themes)
// ─────────────────────────────────────────────────────────────────────

const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const paper = {
  DEFAULT: v('paper'),
  50: v('paper-50'),
  100: v('paper-100'),
  200: v('paper-200'),
  300: v('paper-300'),
};

const ink = {
  900: v('ink-900'),
  800: v('ink-800'),
  700: v('ink-700'),
  600: v('ink-600'),
  500: v('ink-500'),
  400: v('ink-400'),
  300: v('ink-300'),
  200: v('ink-200'),
  100: v('ink-100'),
};

const accent = {
  DEFAULT: v('accent-500'),
  50: v('accent-50'),
  100: v('accent-100'),
  200: v('accent-200'),
  300: v('accent-300'),
  400: v('accent-400'),
  500: v('accent-500'),
  600: v('accent-600'),
  700: v('accent-700'),
  800: v('accent-800'),
  900: v('accent-900'),
};

const cyber = {
  DEFAULT: v('cyber-500'),
  50: v('cyber-50'),
  100: v('cyber-100'),
  200: v('cyber-200'),
  300: v('cyber-300'),
  400: v('cyber-400'),
  500: v('cyber-500'),
  600: v('cyber-600'),
  700: v('cyber-700'),
  800: v('cyber-800'),
  900: v('cyber-900'),
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper,
        ink,
        accent,
        cyber,
        // Legacy chrome tones → paper
        surface: {
          DEFAULT: v('paper'),
          50: v('paper-50'),
          100: v('paper-50'),
          200: v('paper-100'),
          300: v('paper-100'),
          400: v('paper-200'),
          500: v('paper-200'),
          600: v('paper-300'),
          700: v('paper-300'),
          800: v('paper-100'),
          900: v('paper-50'),
          950: v('paper'),
        },
        // Legacy "light text on dark" hierarchy → same hierarchy, theme-aware
        slate: {
          50: v('ink-900'),
          100: v('ink-900'),
          200: v('ink-800'),
          300: v('ink-700'),
          400: v('ink-500'),
          500: v('ink-400'),
          600: v('ink-300'),
          700: v('ink-200'),
          800: v('ink-100'),
          900: v('paper-100'),
          950: v('paper'),
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        body: ['"Public Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // One quiet elevation scale — no glows
        'card': '0 1px 2px rgba(0, 0, 0, 0.05), 0 1px 1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 2px 6px rgba(0, 0, 0, 0.07), 0 1px 2px rgba(0, 0, 0, 0.05)',
        'pop': '0 4px 16px rgba(0, 0, 0, 0.10), 0 2px 4px rgba(0, 0, 0, 0.06)',
        // Legacy glow keys neutralized so stale references degrade quietly
        'glow-amber': '0 0 0 rgba(0,0,0,0)',
        'glow-amber-lg': '0 0 0 rgba(0,0,0,0)',
        'glow-cyan': '0 0 0 rgba(0,0,0,0)',
        'glow-sm': '0 0 0 rgba(0,0,0,0)',
        'inner-glow': 'none',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({ strategy: 'class' }),
  ],
}

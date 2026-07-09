/** @type {import('tailwindcss').Config} */
// All color tokens resolve to CSS variables (RGB triplets defined per-theme in
// src/index.css under html[data-theme=...]), so the whole UI re-skins from a
// single attribute switch. <alpha-value> keeps /50-style modifiers working.
const v = (name) => `rgb(var(${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: v('--surface'),
          1: v('--surface-1'),
          2: v('--surface-2'),
          3: v('--surface-3'),
        },
        accent: {
          DEFAULT: v('--accent'),
          hover: v('--accent-hover'),
          amber: v('--accent-amber'),
          rose: v('--accent-rose'),
          violet: v('--accent-violet'),
        },
        ink: {
          DEFAULT: v('--ink'),
          soft: v('--ink-soft'),
          body: v('--ink-body'),
        },
        muted: v('--muted'),
        faint: v('--faint'),
        // Hairlines and hover fills: black-ish on light themes, white on dark —
        // replaces the old hardcoded border-black/N / bg-black/N utilities.
        line: v('--line'),
        page: v('--page'),
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        spectrum: 'var(--grad-spectrum)',
        'spectrum-warm': 'var(--grad-spectrum-warm)',
      },
    },
  },
  plugins: [],
}

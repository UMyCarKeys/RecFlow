/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm Spectrum — washed plum-slate base with multi-hue warm accents
        surface: {
          DEFAULT: '#1a1620',
          1: '#1f1a26',
          2: '#241f2b',
          3: '#2e2838',
        },
        accent: {
          DEFAULT: '#ff8a6b', // coral (primary)
          hover: '#ffa489',
          amber: '#ffc46b',
          rose: '#ff6b9d',
          violet: '#b88cff',
        },
        muted: '#9a8fa3',
        ink: '#f4ece8', // warm off-white text
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'spectrum': 'linear-gradient(135deg, #ff8a6b 0%, #ff6b9d 38%, #b88cff 100%)',
        'spectrum-warm': 'linear-gradient(135deg, #ffc46b 0%, #ff8a6b 55%, #ff6b9d 100%)',
      },
    },
  },
  plugins: [],
}

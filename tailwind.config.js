/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0d0d0f',
          1: '#141417',
          2: '#1c1c21',
          3: '#252529',
        },
        accent: {
          DEFAULT: '#7c6af0',
          hover: '#9b8ef5',
        },
        muted: '#6b6b7a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

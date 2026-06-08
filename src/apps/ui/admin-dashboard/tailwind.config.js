/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        primary: 'var(--text-h)',
        muted: 'var(--text)',
        soft: 'var(--text-soft)',
        subtle: 'var(--border)',
        accent: {
          DEFAULT: 'var(--accent)',
          bg: 'var(--accent-bg)',
          hover: 'var(--accent-hover)'
        },
        error: '#ff5c5c',
        success: '#4ade80',
        warning: '#fbbf24',
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nurse:   { DEFAULT: '#0d9488', dim: '#0f766e', bg: 'rgba(13,148,136,.12)' },
        patient: { DEFAULT: '#3b82f6', dim: '#2563eb', bg: 'rgba(59,130,246,.12)' },
        surface: { DEFAULT: '#0d1117', card: '#161b22', raised: '#1c2128', input: '#0d1117' },
        ink:     { DEFAULT: '#e6edf3', muted: '#8b949e', faint: '#484f58' },
        border:  { DEFAULT: '#30363d', light: '#21262d' },
        error:   '#f85149',
        success: '#3fb950',
        warning: '#d29922',
      },
      borderRadius: {
        lg: '16px',
        DEFAULT: '10px',
        sm: '6px',
      },
      fontWeight: {
        heavy: '800',
        black: '900',
      },
      boxShadow: {
        btn: '0 4px 0 rgba(0,0,0,.45)',
        'btn-sm': '0 3px 0 rgba(0,0,0,.4)',
        card: '0 1px 3px rgba(0,0,0,.3)',
      },
      minHeight: {
        touch: '44px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

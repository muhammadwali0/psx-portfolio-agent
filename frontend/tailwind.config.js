/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      colors: {
        surface: {
          primary: '#f5f7ff',
          card: 'rgba(255,255,255,0.72)',
          elevated: 'rgba(255,255,255,0.85)',
        },
        brand: {
          50: '#f5f7ff',
          100: '#eef2ff',
          200: '#dbeafe',
          500: '#6366f1',
          600: '#7c3aed',
          700: '#6d28d9',
          900: '#0f172a',
        },
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.04)',
        'glass-lg': '0 8px 40px rgba(0, 0, 0, 0.06)',
        'glow-sm': '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow': '0 0 40px rgba(99, 102, 241, 0.2)',
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
      },
      animation: {
        'blob': 'blob 8s infinite',
        'blob-slow': 'blob 12s infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-up': 'fadeUp 0.6s ease-out forwards',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(20px, -30px) scale(1.05)' },
          '66%': { transform: 'translate(-15px, 15px) scale(0.95)' },
          '100%': { transform: 'translate(0, 0) scale(1)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '1' },
          '80%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
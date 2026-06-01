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
        heading: ["'Plus Jakarta Sans'", 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'Menlo', 'monospace'],
      },
      colors: {
        surface: {
          primary: 'var(--color-bg-primary, #0B0B0C)',
          secondary: 'var(--color-bg-secondary, #111114)',
          tertiary: 'var(--color-bg-tertiary, #18181B)',
          card: 'var(--color-bg-card, rgba(255, 255, 255, 0.04))',
          elevated: 'var(--color-bg-elevated, rgba(255, 255, 255, 0.08))',
        },
        psx: {
          50: 'var(--color-psx-50, #F8F9FA)',
          100: 'var(--color-psx-100, #E4E4E7)',
          200: 'var(--color-psx-200, #A1A1AA)',
          300: 'var(--color-psx-300, #71717A)',
          400: 'var(--color-psx-400, #52525B)',
          500: 'var(--color-psx-500, #3F3F46)',
          600: 'var(--color-psx-600, #27272A)',
          700: 'var(--color-psx-700, #18181B)',
          800: 'var(--color-psx-800, #111114)',
          900: 'var(--color-psx-900, #0B0B0C)',
        },
        profit: {
          DEFAULT: 'var(--color-profit, #00C48C)',
          muted: 'rgba(0, 196, 140, 0.15)',
        },
        loss: {
          DEFAULT: 'var(--color-loss, #E63946)',
          muted: 'rgba(230, 57, 70, 0.15)',
        },
        shariah: {
          DEFAULT: 'var(--color-shariah, #2D9F6F)',
          light: 'var(--color-shariah-light, #4ADE80)',
          muted: 'rgba(45, 159, 111, 0.12)',
        },
        gold: {
          DEFAULT: 'var(--color-gold, #22C55E)',
          light: 'var(--color-gold-light, #4ADE80)',
          dark: '#15803D',
          muted: 'rgba(34, 197, 94, 0.15)',
          text: 'var(--color-gold, #22C55E)',
        },
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
        'glass-lg': '0 8px 40px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
        'card': '0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.08)',
        'elevated': '0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
        'modal': '0 16px 48px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.12)',
        'glow': '0 0 40px rgba(248, 249, 250, 0.04)',
        'glow-profit': '0 0 20px rgba(34, 197, 94, 0.12)',
        'glow-loss': '0 0 20px rgba(239, 68, 68, 0.12)',
        'glow-gold': '0 0 30px rgba(34, 197, 94, 0.20), 0 0 60px rgba(34, 197, 94, 0.08)',
        'gold': '0 4px 20px rgba(34, 197, 94, 0.25), 0 2px 8px rgba(34, 197, 94, 0.15)',
        'premium': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
      },
      borderRadius: {
        'xs': '6px',
        'card': '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #22C55E, #10B981, #22C55E)',
        'gradient-gold-subtle': 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(16,185,129,0.04))',
        'gradient-premium': 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'shimmer-gold': 'linear-gradient(90deg, transparent 0%, rgba(34,197,94,0.08) 30%, rgba(34,197,94,0.15) 50%, rgba(34,197,94,0.08) 70%, transparent 100%)',
      },
      animation: {
        'ticker': 'ticker 30s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'shimmer-gold': 'shimmerGold 2.5s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'marquee': 'marquee 40s linear infinite',
        'light-sweep': 'lightSweep 2s ease-in-out',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite alternate',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        shimmerGold: {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '1' },
          '80%, 100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        lightSweep: {
          '0%': { transform: 'translateX(-150%) skewX(-15deg)' },
          '100%': { transform: 'translateX(250%) skewX(-15deg)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        glowPulse: {
          '0%': { boxShadow: '0 0 20px rgba(34, 197, 94, 0.10)' },
          '100%': { boxShadow: '0 0 40px rgba(34, 197, 94, 0.25)' },
        },
      },
    },
  },
  plugins: [],
}
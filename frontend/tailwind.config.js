/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#0B1120',
          900: '#111827',
          800: '#1E293B',
          700: '#334155',
          600: '#475569',
        },
        neon: {
          DEFAULT: '#00FFB2',
          50: '#E0FFF5',
          100: '#B3FFE6',
          200: '#66FFCC',
          300: '#33FFC0',
          400: '#00FFB2',
          500: '#00E6A0',
          600: '#00CC8E',
          glow: 'rgba(0, 255, 178, 0.15)',
        },
        'neon-blue': {
          DEFAULT: '#00D4FF',
          glow: 'rgba(0, 212, 255, 0.15)',
        },
        'neon-purple': {
          DEFAULT: '#A855F7',
          glow: 'rgba(168, 85, 247, 0.15)',
        },
        danger: '#EF4444',
        success: '#00FFB2',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'ticker': 'ticker 30s linear infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 255, 178, 0.3), 0 0 10px rgba(0, 255, 178, 0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 255, 178, 0.5), 0 0 40px rgba(0, 255, 178, 0.2)' },
        },
        'glow': {
          '0%': { boxShadow: '0 0 5px rgba(0, 255, 178, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 255, 178, 0.4), 0 0 40px rgba(0, 255, 178, 0.1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'ticker': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'neon': '0 0 15px rgba(0, 255, 178, 0.3)',
        'neon-lg': '0 0 30px rgba(0, 255, 178, 0.4), 0 0 60px rgba(0, 255, 178, 0.1)',
        'neon-blue': '0 0 15px rgba(0, 212, 255, 0.3)',
        'neon-purple': '0 0 15px rgba(168, 85, 247, 0.3)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
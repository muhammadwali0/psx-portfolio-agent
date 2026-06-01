/**
 * PSX Portfolio Agent — Color Design Tokens
 * Premium fintech palette: deep black base, white clarity, profit/loss semantics.
 */

export const colors = {
  /* ── Backgrounds ─────────────────────────────── */
  bg: {
    primary: '#0B0B0C',
    secondary: '#111114',
    tertiary: '#18181B',
    card: 'rgba(255, 255, 255, 0.04)',
    cardHover: 'rgba(255, 255, 255, 0.06)',
    elevated: 'rgba(255, 255, 255, 0.08)',
    glass: 'rgba(255, 255, 255, 0.03)',
    glassStrong: 'rgba(255, 255, 255, 0.06)',
    overlay: 'rgba(0, 0, 0, 0.6)',
    input: 'rgba(255, 255, 255, 0.05)',
  },

  /* ── Text ────────────────────────────────────── */
  text: {
    primary: '#F8F9FA',
    secondary: '#A1A1AA',
    tertiary: '#71717A',
    muted: '#52525B',
    inverse: '#0B0B0C',
  },

  /* ── Borders ─────────────────────────────────── */
  border: {
    primary: 'rgba(255, 255, 255, 0.08)',
    secondary: 'rgba(255, 255, 255, 0.05)',
    focus: 'rgba(255, 255, 255, 0.20)',
    subtle: 'rgba(255, 255, 255, 0.03)',
  },

  /* ── Semantic: Profit / Loss ─────────────────── */
  profit: {
    DEFAULT: '#00C48C',
    muted: 'rgba(0, 196, 140, 0.15)',
    text: '#34D399',
    bg: 'rgba(0, 196, 140, 0.08)',
  },
  loss: {
    DEFAULT: '#E63946',
    muted: 'rgba(230, 57, 70, 0.15)',
    text: '#FB7185',
    bg: 'rgba(230, 57, 70, 0.08)',
  },
  neutral: {
    DEFAULT: '#71717A',
    muted: 'rgba(113, 113, 122, 0.15)',
    text: '#A1A1AA',
    bg: 'rgba(113, 113, 122, 0.08)',
  },

  /* ── Accent ──────────────────────────────────── */
  accent: {
    DEFAULT: '#F8F9FA',
    secondary: '#A1A1AA',
    subtle: 'rgba(248, 249, 250, 0.10)',
  },

  /* ── Gold Accent (Premium CTA) ─────────────── */
  gold: {
    DEFAULT: '#22C55E',
    light: '#4ADE80',
    dark: '#15803D',
    muted: 'rgba(34, 197, 94, 0.15)',
    bg: 'rgba(34, 197, 94, 0.08)',
    text: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.25)',
  },

  /* ── Shariah Mode ────────────────────────────── */
  shariah: {
    primary: '#2D9F6F',
    secondary: '#22C55E',
    muted: 'rgba(45, 159, 111, 0.12)',
    text: '#4ADE80',
    bg: 'rgba(45, 159, 111, 0.06)',
    accent: '#16A34A',
  },

  /* ── Status ──────────────────────────────────── */
  status: {
    info: '#60A5FA',
    infoBg: 'rgba(96, 165, 250, 0.08)',
    warning: '#FBBF24',
    warningBg: 'rgba(251, 191, 36, 0.08)',
    error: '#EF4444',
    errorBg: 'rgba(239, 68, 68, 0.08)',
    success: '#22C55E',
    successBg: 'rgba(34, 197, 94, 0.08)',
  },

  /* ── Risk levels ─────────────────────────────── */
  risk: {
    low: '#00C48C',
    lowBg: 'rgba(0, 196, 140, 0.10)',
    medium: '#FBBF24',
    mediumBg: 'rgba(251, 191, 36, 0.10)',
    high: '#E63946',
    highBg: 'rgba(230, 57, 70, 0.10)',
  },

  /* ── Gradients (CSS string tokens) ──────────── */
  gradient: {
    gold: 'linear-gradient(135deg, #22C55E 0%, #15803D 100%)',
    goldSubtle: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(21, 128, 61, 0.05) 100%)',
    premium: 'linear-gradient(135deg, #0A0F0C 0%, #060B08 50%, #020403 100%)',
    cardSheen: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
    profitGlow: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.02) 100%)',
    lossGlow: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.02) 100%)',
  },
} as const;

export type ColorTokens = typeof colors;

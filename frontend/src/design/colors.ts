/**
 * PSX Portfolio Agent — Color Design Tokens
 * Premium fintech palette: deep black base, white clarity, profit/loss semantics.
 */

export const colors = {
  /* ── Backgrounds ─────────────────────────────── */
  bg: {
    primary: 'var(--color-bg-primary, #0B1020)',
    secondary: 'var(--color-bg-secondary, #121A2B)',
    tertiary: 'var(--color-bg-tertiary, #182338)',
    card: 'var(--color-bg-card, rgba(255, 255, 255, 0.04))',
    cardHover: 'var(--glass-card-hover-bg, rgba(255, 255, 255, 0.06))',
    elevated: 'var(--color-bg-elevated, rgba(255, 255, 255, 0.08))',
    glass: 'var(--glass-bg, rgba(255, 255, 255, 0.03))',
    glassStrong: 'var(--glass-strong-bg, rgba(255, 255, 255, 0.06))',
    overlay: 'rgba(0, 0, 0, 0.6)',
    input: 'var(--color-bg-card, rgba(255, 255, 255, 0.05))',
  },

  /* ── Text ────────────────────────────────────── */
  text: {
    primary: 'var(--color-psx-50, #F8F9FA)',
    secondary: 'var(--color-psx-200, #A1A1AA)',
    tertiary: 'var(--color-psx-300, #71717A)',
    muted: 'var(--color-psx-400, #52525B)',
    inverse: 'var(--color-psx-900, #0B0B0C)',
  },

  /* ── Borders ─────────────────────────────────── */
  border: {
    primary: 'var(--glass-border, rgba(255, 255, 255, 0.08))',
    secondary: 'var(--glass-card-border, rgba(255, 255, 255, 0.05))',
    focus: 'var(--color-primary, rgba(255, 255, 255, 0.20))',
    subtle: 'var(--glass-border, rgba(255, 255, 255, 0.03))',
  },

  /* ── Semantic: Profit / Loss ─────────────────── */
  profit: {
    DEFAULT: 'var(--color-profit, #10B981)',
    muted: 'rgba(16, 185, 129, 0.15)',
    text: 'var(--color-profit, #10B981)',
    bg: 'rgba(16, 185, 129, 0.08)',
  },
  loss: {
    DEFAULT: 'var(--color-loss, #EF4444)',
    muted: 'rgba(239, 68, 68, 0.15)',
    text: 'var(--color-loss, #EF4444)',
    bg: 'rgba(239, 68, 68, 0.08)',
  },
  neutral: {
    DEFAULT: 'var(--color-psx-300, #71717A)',
    muted: 'rgba(113, 113, 122, 0.15)',
    text: 'var(--color-psx-200, #A1A1AA)',
    bg: 'rgba(113, 113, 122, 0.08)',
  },

  /* ── Accent ──────────────────────────────────── */
  accent: {
    DEFAULT: 'var(--color-primary, #3B82F6)',
    secondary: 'var(--color-secondary, #8B5CF6)',
    subtle: 'var(--color-gold-muted, rgba(248, 249, 250, 0.10))',
  },

  /* ── Gold Accent (Premium CTA) ─────────────── */
  gold: {
    DEFAULT: 'var(--color-gold, #D4AF37)',
    light: 'var(--color-gold-light, #F4D03F)',
    dark: 'var(--color-accent, #C9A227)',
    muted: 'var(--color-gold-muted, rgba(212, 175, 55, 0.15))',
    bg: 'var(--color-gold-bg, rgba(212, 175, 55, 0.08))',
    text: 'var(--color-gold, #D4AF37)',
    glow: 'rgba(212, 175, 55, 0.25)',
  },

  /* ── Shariah Mode ────────────────────────────── */
  shariah: {
    primary: 'var(--color-shariah, #D4AF37)',
    secondary: 'var(--color-shariah-light, #F4D03F)',
    muted: 'var(--color-shariah-muted, rgba(212, 175, 55, 0.12))',
    text: 'var(--color-shariah-light, #F4D03F)',
    bg: 'var(--color-shariah-bg, rgba(212, 175, 55, 0.06))',
    accent: 'var(--color-accent, #C9A227)',
  },

  /* ── Status ──────────────────────────────────── */
  status: {
    info: 'var(--color-primary, #3B82F6)',
    infoBg: 'rgba(59, 130, 246, 0.08)',
    warning: 'var(--color-warning, #F59E0B)',
    warningBg: 'rgba(245, 158, 11, 0.08)',
    error: 'var(--color-loss, #EF4444)',
    errorBg: 'rgba(239, 68, 68, 0.08)',
    success: 'var(--color-profit, #10B981)',
    successBg: 'rgba(16, 185, 129, 0.08)',
  },

  /* ── Risk levels ─────────────────────────────── */
  risk: {
    low: 'var(--color-profit, #10B981)',
    lowBg: 'rgba(16, 185, 129, 0.10)',
    medium: 'var(--color-warning, #F59E0B)',
    mediumBg: 'rgba(245, 158, 11, 0.10)',
    high: 'var(--color-loss, #EF4444)',
    highBg: 'rgba(239, 68, 68, 0.10)',
  },

  /* ── Gradients (CSS string tokens) ──────────── */
  gradient: {
    gold: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
    goldSubtle: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
    premium: 'linear-gradient(135deg, var(--color-bg-primary) 0%, var(--color-bg-secondary) 50%, var(--color-bg-tertiary) 100%)',
    cardSheen: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
    profitGlow: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.02) 100%)',
    lossGlow: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.02) 100%)',
  },
} as const;

export type ColorTokens = typeof colors;

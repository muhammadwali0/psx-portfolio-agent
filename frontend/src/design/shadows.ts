/**
 * PSX Portfolio Agent — Shadow Design Tokens
 * Subtle, premium elevation system. No harsh drop shadows.
 */

export const shadows = {
  /** Almost invisible lift */
  xs: '0 1px 2px rgba(0, 0, 0, 0.2)',
  /** Subtle card elevation */
  sm: '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)',
  /** Standard card */
  card: '0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.08)',
  /** Elevated surface */
  md: '0 8px 24px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
  /** Modal / drawer */
  lg: '0 16px 48px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.12)',
  /** Overlay */
  xl: '0 24px 64px rgba(0, 0, 0, 0.25), 0 8px 24px rgba(0, 0, 0, 0.15)',

  /** Glassmorphic shadow */
  glass: '0 4px 30px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  glassStrong: '0 8px 40px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.06)',

  /** Subtle inner glow */
  glow: '0 0 40px rgba(248, 249, 250, 0.04)',
  glowProfit: '0 0 20px rgba(0, 196, 140, 0.12)',
  glowLoss: '0 0 20px rgba(230, 57, 70, 0.12)',

  /** No shadow */
  none: 'none',
} as const;

export type ShadowTokens = typeof shadows;

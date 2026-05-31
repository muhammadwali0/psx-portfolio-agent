/**
 * PSX Portfolio Agent — Shariah Mode Theme Overrides
 * Calm, green-dominant financial tone with Islamic-inspired elegance.
 * NO literal imagery, NO mosque visuals, NO heavy symbolism.
 */

import { colors } from './colors';

export const shariahOverrides = {
  accent: {
    DEFAULT: colors.shariah.primary,
    secondary: colors.shariah.secondary,
    subtle: colors.shariah.muted,
  },
  profit: {
    DEFAULT: '#16A34A',
    muted: 'rgba(22, 163, 74, 0.15)',
    text: '#4ADE80',
    bg: 'rgba(22, 163, 74, 0.08)',
  },
  /** Softer risk messaging */
  riskLabels: {
    low: 'Stable',
    medium: 'Moderate',
    high: 'Variable',
  } as const,
  /** Muted, calmer card backgrounds */
  card: {
    bg: 'rgba(45, 159, 111, 0.03)',
    border: 'rgba(45, 159, 111, 0.08)',
  },
} as const;

/** Shariah-specific suggestion chips for AI chat */
export const shariahSuggestions = [
  'Which Shariah-compliant stocks are trending?',
  'Compare sukuk vs equity returns',
  'Best halal sectors this quarter?',
  'Explain Shariah screening criteria',
  'Islamic finance outlook for PSX',
] as const;

/** Default suggestions for conventional mode */
export const defaultSuggestions = [
  "What's moving today?",
  'Analyze OGDC fundamentals',
  'Best sectors this month?',
  'KSE-100 outlook?',
  'Compare SYS vs TRG',
] as const;

export type ShariahTheme = typeof shariahOverrides;

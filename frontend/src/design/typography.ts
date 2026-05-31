/**
 * PSX Portfolio Agent — Typography Design Tokens
 * Plus Jakarta Sans for headings, Inter for body, JetBrains Mono for data.
 */

export const fontFamily = {
  heading: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
  body: "'Inter', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
} as const;

export const fontSize = {
  '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
  xs: ['11px', { lineHeight: '16px', letterSpacing: '0.01em' }],
  sm: ['12px', { lineHeight: '16px', letterSpacing: '0.005em' }],
  base: ['13px', { lineHeight: '20px', letterSpacing: '0' }],
  md: ['14px', { lineHeight: '20px', letterSpacing: '-0.006em' }],
  lg: ['16px', { lineHeight: '24px', letterSpacing: '-0.011em' }],
  xl: ['18px', { lineHeight: '26px', letterSpacing: '-0.014em' }],
  '2xl': ['20px', { lineHeight: '28px', letterSpacing: '-0.017em' }],
  '3xl': ['24px', { lineHeight: '32px', letterSpacing: '-0.019em' }],
  '4xl': ['28px', { lineHeight: '34px', letterSpacing: '-0.021em' }],
  '5xl': ['32px', { lineHeight: '38px', letterSpacing: '-0.022em' }],
  '6xl': ['40px', { lineHeight: '46px', letterSpacing: '-0.024em' }],
} as const;

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export type TypographyTokens = {
  fontFamily: typeof fontFamily;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
};

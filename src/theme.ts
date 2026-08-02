// SkinCare design tokens — warm, calm, "clean beauty" aesthetic.

export const colors = {
  background: '#FAF6F1',
  surface: '#FFFFFF',
  surfaceAlt: '#F4EDE6',
  primary: '#B76E79',
  primaryDark: '#9A5560',
  primarySoft: '#F7E8E5',
  accent: '#7E9B8C',
  accentDark: '#5F7F6F',
  accentSoft: '#E5EDE8',
  warn: '#D98E4A',
  warnSoft: '#FAEDDE',
  danger: '#C0564B',
  dangerSoft: '#F8E4E1',
  text: '#3B302B',
  textMuted: '#8F8178',
  textFaint: '#B4A79D',
  border: '#EDE3DA',
  white: '#FFFFFF',
  overlay: 'rgba(43, 32, 27, 0.45)',
  scoreHigh: '#6E9E7A',
  scoreMid: '#D9A441',
  scoreLow: '#C0564B',
  chartGrid: '#EFE6DE',
};

export const scorePalette = {
  high: colors.scoreHigh,
  mid: colors.scoreMid,
  low: colors.scoreLow,
};

export function scoreColor(score: number): string {
  if (score >= 80) return scorePalette.high;
  if (score >= 60) return scorePalette.mid;
  return scorePalette.low;
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 65) return 'Fair';
  if (score >= 55) return 'Moderate';
  return 'Needs attention';
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const typography = {
  title: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.2 },
  h1: { fontSize: 22, fontWeight: '700' as const },
  h2: { fontSize: 18, fontWeight: '600' as const },
  h3: { fontSize: 15, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 21 },
  small: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.4 },
};

export const shadows = {
  card: {
    shadowColor: '#6B4F3F',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  subtle: {
    shadowColor: '#6B4F3F',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
};

// Design tokens — single source of truth for all visual style
// Inspired by Kalshi's bold typography, generous whitespace, and crisp contrast

export const colors = {
  // Surfaces
  bg: '#FFFFFF',
  bgSecondary: '#FAFAFA',
  bgTertiary: '#F4F4F4',

  // Text
  text: '#0A0A0A',
  textSecondary: '#737373',
  textTertiary: '#A3A3A3',
  textInverse: '#FFFFFF',

  // Lines
  border: '#EFEFEF',
  borderStrong: '#0A0A0A',

  // Actions
  accent: '#0A0A0A',
  accentPressed: '#262626',

  // Status
  success: '#0F8B4C',
  error: '#D63D3D',

  // Overlays
  scrim: 'rgba(10, 10, 10, 0.55)',
  scrimLight: 'rgba(10, 10, 10, 0.08)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const typography = {
  // Display — used sparingly for hero moments
  display: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '700',
    letterSpacing: -1.2,
  },
  // Page titles
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  // Section headers
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  // Standard body
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: -0.1,
  },
  // Small body / captions
  caption: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    letterSpacing: 0,
  },
  // Labels — small, all-caps, tracked
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // Button text
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
};

export const motion = {
  // Timings tuned to feel snappy but not abrupt
  fast: 150,
  base: 220,
  slow: 320,
};

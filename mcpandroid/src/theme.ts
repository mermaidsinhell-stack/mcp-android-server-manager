/**
 * MCP Server Manager - Soft-Editorial Brutalism Design System
 *
 * A pastel brutalist aesthetic combining soft editorial colors
 * with hard edges and bold typography.
 */

export const COLORS = {
  // Primary Palette - Soft Editorial
  primary: '#f27d9b',      // Soft pink - primary actions
  secondary: '#ba797d',    // Muted rose - secondary elements
  background: '#edd6d1',   // Warm peach - main background

  // Neutrals
  black: '#1a1a1a',        // Near black - text, borders
  white: '#ffffff',        // Pure white - cards, inputs
  gray: '#8a8a8a',         // Mid gray - disabled states
  lightGray: '#e5e5e5',    // Light gray - dividers

  // Semantic Colors
  success: '#4a9d4a',      // Forest green - running state
  error: '#d64545',        // Brick red - error state
  warning: '#d69f45',      // Amber - warning state
  info: '#457dd6',         // Steel blue - info state

  // State Colors
  running: '#4a9d4a',
  stopped: '#8a8a8a',
  starting: '#d69f45',
  error: '#d64545',
} as const;

export const FONTS = {
  // Primary - Serif for headings and emphasis
  serif: 'PlayfairDisplay_400Regular',
  serifMedium: 'PlayfairDisplay_500Medium',
  serifBold: 'PlayfairDisplay_700Bold',
  serifItalic: 'PlayfairDisplay_400Regular_Italic',

  // Secondary - Sans for body and labels
  sans: 'InterTight_400Regular',
  sansMedium: 'InterTight_500Medium',
  sansSemiBold: 'InterTight_600SemiBold',
  sansBold: 'InterTight_700Bold',
} as const;

export const TYPOGRAPHY = {
  // Headings - Playfair Display
  h1: {
    fontFamily: FONTS.serifBold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: FONTS.serifBold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: FONTS.serifMedium,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 0,
  },

  // Body - Inter Tight
  body: {
    fontFamily: FONTS.sans,
    fontSize: 16,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    lineHeight: 20,
  },

  // Labels - Inter Tight, All Caps
  label: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  labelLarge: {
    fontFamily: FONTS.sansSemiBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },

  // Buttons
  button: {
    fontFamily: FONTS.sansBold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },

  // Mono for code/technical
  mono: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BORDERS = {
  // Brutalist borders - always hard, always visible
  width: 2,
  widthThick: 3,
  radius: 0,  // Zero radius for brutalist aesthetic
  color: COLORS.black,
} as const;

export const SHADOWS = {
  // Hard shadow for brutalist depth
  hard: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  hardSmall: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
} as const;

export const BUTTONS = {
  height: 48,
  minWidth: 120,
  paddingHorizontal: SPACING.lg,
} as const;

// Common component styles
export const COMPONENTS = {
  card: {
    backgroundColor: COLORS.white,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.color,
    borderRadius: BORDERS.radius,
    padding: SPACING.md,
    ...SHADOWS.hard,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.color,
    borderRadius: BORDERS.radius,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    height: 48,
    ...TYPOGRAPHY.body,
  },
  button: {
    height: BUTTONS.height,
    minWidth: BUTTONS.minWidth,
    paddingHorizontal: BUTTONS.paddingHorizontal,
    borderWidth: BORDERS.width,
    borderColor: BORDERS.color,
    borderRadius: BORDERS.radius,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...SHADOWS.hardSmall,
  },
  buttonPrimary: {
    backgroundColor: COLORS.primary,
  },
  buttonSecondary: {
    backgroundColor: COLORS.white,
  },
} as const;

export default {
  COLORS,
  FONTS,
  TYPOGRAPHY,
  SPACING,
  BORDERS,
  SHADOWS,
  BUTTONS,
  COMPONENTS,
};

const FONT = {
  regular:   "Inter_400Regular",
  medium:    "Inter_500Medium",
  semibold:  "Inter_600SemiBold",
  bold:      "Inter_700Bold",
} as const;

export const typography = {
  display: {
    fontFamily:    FONT.bold,
    fontSize:      36,
    lineHeight:    44,
    fontWeight:    "700" as const,
    letterSpacing: -1,
  },
  h1: {
    fontFamily:    FONT.bold,
    fontSize:      28,
    lineHeight:    36,
    fontWeight:    "700" as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily:    FONT.bold,
    fontSize:      22,
    lineHeight:    30,
    fontWeight:    "700" as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily:    FONT.semibold,
    fontSize:      18,
    lineHeight:    26,
    fontWeight:    "600" as const,
  },
  title: {
    fontFamily:    FONT.semibold,
    fontSize:      15,
    lineHeight:    22,
    fontWeight:    "600" as const,
  },
  body: {
    fontFamily: FONT.regular,
    fontSize:   13,
    lineHeight: 19,
    fontWeight: "400" as const,
  },
  bodySmall: {
    fontFamily: FONT.regular,
    fontSize:   11,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  label: {
    fontFamily:    FONT.bold,
    fontSize:      10,
    lineHeight:    14,
    fontWeight:    "700" as const,
    letterSpacing: 1.2,
  },
  micro: {
    fontFamily:    FONT.bold,
    fontSize:      8,
    lineHeight:    12,
    fontWeight:    "700" as const,
    letterSpacing: 1.5,
  },
} as const;

export type Typography = typeof typography;
export type TypographyKey = keyof typeof typography;

export const font = FONT;

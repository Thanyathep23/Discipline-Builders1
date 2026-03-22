const RAW = {
  app:              "#0A0A0F",
  surface:          "#12121A",
  surfaceElevated:  "#1A1A26",
  surfaceSubtle:    "#0F0F17",
  overlay:          "rgba(0,0,0,0.72)",

  textPrimary:   "#F0F0FF",
  textSecondary: "#8888AA",
  textTertiary:  "#4A4A6A",
  textInverse:   "#0A0A0F",
  textDisabled:  "#2E2E46",

  borderSubtle:  "#16162A",
  borderDefault: "#1E1E2E",
  borderStrong:  "#2E2E44",

  accentPrimary:     "#7C5CFC",
  accentSecondary:   "#A07CFF",
  accentSuccess:     "#00E676",
  accentWarning:     "#FFB300",
  accentDanger:      "#FF3D71",
  accentPremium:     "#F5C842",
  accentProgression: "#00D4FF",

  tierStarter: "#8888AA",
  tierHustle:  "#FFB300",
  tierRising:  "#00E676",
  tierRefined: "#00D4FF",
  tierElite:   "#F5C842",

  rarityCommon:      "#9E9E9E",
  rarityUncommon:    "#4CAF50",
  rarityRare:        "#2196F3",
  rarityEpic:        "#9C27B0",
  rarityLegendary:   "#F5C842",
  rarityBreakthrough:"#FF6B35",
} as const;

export const colors = {
  bg: {
    app:             RAW.app,
    surface:         RAW.surface,
    surfaceElevated: RAW.surfaceElevated,
    surfaceSubtle:   RAW.surfaceSubtle,
    overlay:         RAW.overlay,
  },
  text: {
    primary:   RAW.textPrimary,
    secondary: RAW.textSecondary,
    tertiary:  RAW.textTertiary,
    inverse:   RAW.textInverse,
    disabled:  RAW.textDisabled,
  },
  border: {
    subtle:  RAW.borderSubtle,
    default: RAW.borderDefault,
    strong:  RAW.borderStrong,
  },
  accent: {
    primary:     RAW.accentPrimary,
    secondary:   RAW.accentSecondary,
    success:     RAW.accentSuccess,
    warning:     RAW.accentWarning,
    danger:      RAW.accentDanger,
    premium:     RAW.accentPremium,
    progression: RAW.accentProgression,
  },
  tier: {
    starter: RAW.tierStarter,
    hustle:  RAW.tierHustle,
    rising:  RAW.tierRising,
    refined: RAW.tierRefined,
    elite:   RAW.tierElite,
  },
  rarity: {
    common:      RAW.rarityCommon,
    uncommon:    RAW.rarityUncommon,
    rare:        RAW.rarityRare,
    epic:        RAW.rarityEpic,
    legendary:   RAW.rarityLegendary,
    breakthrough:RAW.rarityBreakthrough,
  },
} as const;

export type Colors = typeof colors;

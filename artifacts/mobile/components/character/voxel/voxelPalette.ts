export interface VoxelPalette {
  skinBase: string;
  skinHighlight: string;
  skinShadow: string;
  hairBase: string;
  hairHighlight: string;
  eyeColor: string;
  mouthColor: string;
  browColor: string;
  suitBase: string;
  suitMid: string;
  suitLight: string;
  suitCheck: string;
  vestBase: string;
  vestLight: string;
  shirtWhite: string;
  tieBase: string;
  tiePattern: string;
  beltColor: string;
  beltBuckle: string;
  trouserBase: string;
  trouserLight: string;
  trouserCrease: string;
  shoeBase: string;
  shoeSole: string;
  shoeHighlight: string;
  pocketSquare: string;
  lapelPin: string;
  briefcaseBase: string;
  briefcaseDark: string;
  briefcaseHardware: string;
  phoneBody: string;
  phoneScreen: string;
  docWhite: string;
  docLine: string;
  coffeeCup: string;
  coffeeLid: string;
  platformBase: string;
  platformLight: string;
}

export const SKIN_TONES: Record<string, { base: string; highlight: string; shadow: string }> = {
  light: { base: "#F5CBA7", highlight: "#FDEBD0", shadow: "#E0AC69" },
  medium: { base: "#D4A574", highlight: "#E8C9A0", shadow: "#B8814A" },
  tan: { base: "#C68642", highlight: "#D9A76A", shadow: "#A0673C" },
  brown: { base: "#8D5524", highlight: "#A67B4B", shadow: "#6B3F1A" },
  dark: { base: "#5C3310", highlight: "#784212", shadow: "#3E2108" },
};

export const HAIR_COLORS: Record<string, { base: string; highlight: string }> = {
  black: { base: "#1A1A2E", highlight: "#2C2C44" },
  dark_brown: { base: "#4A2C0A", highlight: "#6B3A2A" },
  brown: { base: "#6B4226", highlight: "#8B6240" },
  light_brown: { base: "#A0724A", highlight: "#C09060" },
  blonde: { base: "#C4A35A", highlight: "#D4C070" },
  red: { base: "#8B2500", highlight: "#A04020" },
  auburn: { base: "#6E3020", highlight: "#8E4A3A" },
  gray: { base: "#808090", highlight: "#A0A0B0" },
};

export function buildPalette(
  skinTone: string,
  hairColor: string,
  outfitTier: number,
): VoxelPalette {
  const skin = SKIN_TONES[skinTone] ?? SKIN_TONES.medium;
  const hair = HAIR_COLORS[hairColor] ?? HAIR_COLORS.dark_brown;

  const suitPalettes: Record<number, { base: string; mid: string; light: string; check: string; vest: string; vestL: string; tie: string; tieP: string; pocket: string }> = {
    1: { base: "#4A4A5A", mid: "#5A5A6A", light: "#6A6A7A", check: "#4A4A5A", vest: "#4A4A5A", vestL: "#5A5A6A", tie: "#4A4A5A", tieP: "#4A4A5A", pocket: "#4A4A5A" },
    2: { base: "#3A3A4E", mid: "#4A4A5E", light: "#5A5A6E", check: "#3A3A4E", vest: "#3A3A4E", vestL: "#4A4A5E", tie: "#3A3A4E", tieP: "#4A4A5E", pocket: "#3A3A4E" },
    3: { base: "#2A3040", mid: "#3A4050", light: "#4A5060", check: "#252B38", vest: "#2E3648", vestL: "#3A4458", tie: "#2C3E50", tieP: "#F39C12", pocket: "#F39C12" },
    4: { base: "#1C2331", mid: "#2C3E50", light: "#34495E", check: "#1A252F", vest: "#232D3F", vestL: "#2E3A4E", tie: "#2C3E50", tieP: "#F1C40F", pocket: "#F39C12" },
  };

  const s = suitPalettes[outfitTier] ?? suitPalettes[4];

  return {
    skinBase: skin.base,
    skinHighlight: skin.highlight,
    skinShadow: skin.shadow,
    hairBase: hair.base,
    hairHighlight: hair.highlight,
    eyeColor: "#1A1A2E",
    mouthColor: "#8B4513",
    browColor: hair.base,
    suitBase: s.base,
    suitMid: s.mid,
    suitLight: s.light,
    suitCheck: s.check,
    vestBase: s.vest,
    vestLight: s.vestL,
    shirtWhite: "#F0F0F4",
    tieBase: s.tie,
    tiePattern: s.tieP,
    beltColor: "#2A2A38",
    beltBuckle: "#C0C0C8",
    trouserBase: s.base,
    trouserLight: s.mid,
    trouserCrease: s.check,
    shoeBase: "#5D4037",
    shoeSole: "#3E2723",
    shoeHighlight: "#795548",
    pocketSquare: s.pocket,
    lapelPin: "#F1C40F",
    briefcaseBase: "#6D4C41",
    briefcaseDark: "#4E342E",
    briefcaseHardware: "#D4A017",
    phoneBody: "#1A1A28",
    phoneScreen: "#3498DB",
    docWhite: "#F0F0F4",
    docLine: "#BDC3C7",
    coffeeCup: "#F0F0F4",
    coffeeLid: "#8D6E63",
    platformBase: "#2A2A3A",
    platformLight: "#3A3A4E",
  };
}

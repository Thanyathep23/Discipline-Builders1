export const Colors = {
  bg: "#0A0A0F",
  bgCard: "#12121A",
  bgElevated: "#1A1A26",
  bgInput: "#0F0F17",
  border: "#1E1E2E",
  borderLight: "#16162A",

  accent: "#7C5CFC",
  accentDim: "#7C5CFC40",
  accentGlow: "#7C5CFC18",
  textAccent: "#A07CFF",

  gold: "#F5C842",
  goldDim: "#F5C84230",

  crimson: "#FF3D71",
  crimsonDim: "#FF3D7112",

  green: "#00E676",
  greenDim: "#00E67615",

  amber: "#FFB300",
  amberDim: "#FFB30012",

  cyan: "#00D4FF",
  cyanDim: "#00D4FF12",

  textPrimary: "#F0F0FF",
  textSecondary: "#8888AA",
  textMuted: "#4A4A6A",
  textOnAccent: "#FFFFFF",

  overlayHeavy: "rgba(0,0,0,0.60)",

  priorityLow: "#4A9EFF",
  priorityMedium: "#FFB300",
  priorityHigh: "#FF7043",
  priorityCritical: "#FF3D71",

  critical: "#FF3D71",
  criticalDim: "#FF3D7112",

  strictNormal: "#00E676",
  strictStrict: "#FFB300",
  strictExtreme: "#FF3D71",
};

export const RARITY_COLORS: Record<string, string> = {
  common:    "#9E9E9E",
  uncommon:  "#4CAF50",
  rare:      "#2196F3",
  epic:      "#9C27B0",
  legendary: "#F5C842",
};

export { colors as ds } from "@/design-system";

import { colors as _ds } from "@/design-system/tokens/colors";
export const semantic = _ds;

export default Colors;

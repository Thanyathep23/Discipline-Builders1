import { Platform } from "react-native";

const shadow = (
  opacity: number,
  radius: number,
  offsetY: number,
) =>
  Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
    },
    android: {
      elevation: Math.round(radius * 0.6),
    },
    default: {},
  }) ?? {};

export const elevation = {
  none:   {},
  low:    shadow(0.18, 4,  2),
  medium: shadow(0.28, 10, 4),
  hero:   shadow(0.48, 24, 8),
} as const;

export type Elevation = typeof elevation;
export type ElevationKey = keyof typeof elevation;

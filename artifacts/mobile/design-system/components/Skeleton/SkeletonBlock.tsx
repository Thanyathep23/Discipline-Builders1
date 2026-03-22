import React, { useEffect } from "react";
import { type ViewStyle, type DimensionValue } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing,
} from "react-native-reanimated";
import { colors } from "../../tokens/colors";
import { radius as radiusTokens } from "../../tokens/radius";

export interface SkeletonBlockProps {
  width?:  DimensionValue;
  height?: number;
  radius?: number;
  style?:  ViewStyle;
}

export function SkeletonBlock({
  width = "100%", height = 16, radius = radiusTokens.md, style,
}: SkeletonBlockProps) {
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius:    radius,
          backgroundColor: colors.bg.surfaceElevated,
        },
        animStyle,
        style,
      ]}
    />
  );
}

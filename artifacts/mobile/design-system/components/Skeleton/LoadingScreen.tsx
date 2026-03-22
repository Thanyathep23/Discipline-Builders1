import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, FadeIn,
} from "react-native-reanimated";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";

export interface LoadingScreenProps {
  message?: string;
  accentColor?: string;
}

export function LoadingScreen({ message, accentColor = colors.accent.primary }: LoadingScreenProps) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
    opacity.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1, true,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.screen}>
      <Animated.View style={[styles.ring, { borderColor: accentColor + "40" }, pulseStyle]}>
        <View style={[styles.innerDot, { backgroundColor: accentColor }]} />
      </Animated.View>
      {message && (
        <Text style={[typography.body, styles.message]}>{message}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.app,
    alignItems:      "center",
    justifyContent:  "center",
    gap:             spacing.xl,
  },
  ring: {
    width:        72,
    height:       72,
    borderRadius: 36,
    borderWidth:  2,
    alignItems:   "center",
    justifyContent:"center",
  },
  innerDot: {
    width:        16,
    height:       16,
    borderRadius: 8,
  },
  message: {
    color:     colors.text.secondary,
    textAlign: "center",
  },
});

import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";
import { elevation } from "../../tokens/elevation";

export interface HeroCardProps {
  children: React.ReactNode;
  accentColor?: string;
  style?: ViewStyle;
}

export function HeroCard({ children, accentColor, style }: HeroCardProps) {
  return (
    <View style={[
      styles.card,
      accentColor && { borderColor: accentColor + "30" },
      elevation.hero,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border.subtle,
    overflow:        "hidden",
  },
});

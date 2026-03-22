import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";
import { elevation } from "../../tokens/elevation";

export interface SummaryCardProps {
  title?:    string;
  eyebrow?:  string;
  children:  React.ReactNode;
  style?:    ViewStyle;
  accentColor?: string;
}

export function SummaryCard({ title, eyebrow, children, style, accentColor }: SummaryCardProps) {
  return (
    <View style={[styles.card, elevation.low, style]}>
      {(eyebrow || title) && (
        <View style={styles.header}>
          {eyebrow && (
            <Text style={[typography.label, { color: accentColor ?? colors.text.tertiary }]}>
              {eyebrow.toUpperCase()}
            </Text>
          )}
          {title && (
            <Text style={[typography.h3, { color: colors.text.primary }]}>
              {title}
            </Text>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border.default,
    padding:         spacing.base,
    gap:             spacing.md,
  },
  header: { gap: spacing.xs },
});

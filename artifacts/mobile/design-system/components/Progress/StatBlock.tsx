import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";

export interface StatBlockProps {
  label:       string;
  value:       string | number;
  subLabel?:   string;
  trend?:      "up" | "down" | "neutral";
  icon?:       string;
  accentColor?:string;
}

export function StatBlock({
  label, value, subLabel, trend, icon, accentColor = colors.accent.primary,
}: StatBlockProps) {
  const trendIcon  = trend === "up" ? "trending-up" : trend === "down" ? "trending-down" : null;
  const trendColor = trend === "up" ? colors.accent.success : trend === "down" ? colors.accent.danger : colors.text.tertiary;

  return (
    <View style={styles.wrap}>
      {icon && (
        <View style={[styles.iconBox, { backgroundColor: accentColor + "18" }]}>
          <Ionicons name={icon as any} size={14} color={accentColor} />
        </View>
      )}
      <Text style={[typography.h2, { color: colors.text.primary }]}>{value}</Text>
      <View style={styles.bottomRow}>
        <Text style={[typography.label, { color: colors.text.tertiary }]}>{label.toUpperCase()}</Text>
        {trendIcon && (
          <Ionicons name={trendIcon} size={11} color={trendColor} />
        )}
      </View>
      {subLabel && (
        <Text style={[typography.bodySmall, { color: colors.text.tertiary }]}>{subLabel}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:      { gap: spacing.xs },
  iconBox:   { width: 28, height: 28, borderRadius: radius.sm, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});

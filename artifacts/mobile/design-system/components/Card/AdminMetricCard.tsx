import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";

export interface AdminMetricCardProps {
  label:       string;
  value:       string | number;
  subValue?:   string;
  trend?:      "up" | "down" | "neutral";
  trendLabel?:  string;
  icon?:       string;
  accentColor?:string;
  alert?:      boolean;
  style?:      ViewStyle;
}

export function AdminMetricCard({
  label, value, subValue, trend, trendLabel, icon, accentColor = colors.accent.primary, alert = false, style,
}: AdminMetricCardProps) {
  const trendIcon  = trend === "up" ? "trending-up" : trend === "down" ? "trending-down" : "remove";
  const trendColor = trend === "up" ? colors.accent.success : trend === "down" ? colors.accent.danger : colors.text.tertiary;

  return (
    <View style={[
      styles.card,
      alert && { borderColor: colors.accent.danger + "50", backgroundColor: colors.accent.danger + "06" },
      style,
    ]}>
      <View style={styles.topRow}>
        {icon && (
          <View style={[styles.iconBox, { backgroundColor: accentColor + "18" }]}>
            <Ionicons name={icon as any} size={13} color={alert ? colors.accent.danger : accentColor} />
          </View>
        )}
        {trend && (
          <Ionicons name={trendIcon} size={13} color={trendColor} style={styles.trendIcon} />
        )}
      </View>
      <Text style={[typography.h2, { color: alert ? colors.accent.danger : colors.text.primary, marginTop: spacing.xs }]}>
        {value}
      </Text>
      <Text style={[typography.label, { color: colors.text.tertiary, marginTop: 2 }]}>
        {label.toUpperCase()}
      </Text>
      {(subValue || trendLabel) && (
        <Text style={[typography.bodySmall, { color: trendColor, marginTop: 2 }]}>
          {trendLabel ?? subValue}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius:    radius.md,
    borderWidth:     1,
    borderColor:     colors.border.default,
    padding:         spacing.md,
    gap:             0,
  },
  topRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBox:  { width: 26, height: 26, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  trendIcon:{ marginLeft: "auto" as any },
});

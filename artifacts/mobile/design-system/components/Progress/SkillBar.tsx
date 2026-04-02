import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";
import { ProgressBar } from "./ProgressBar";

type IconName = ComponentProps<typeof Ionicons>["name"];

export interface SkillBarProps {
  skillName:    string;
  level:        number | string;
  xpProgress:   number;
  trend?:       "up" | "down" | "neutral";
  explanation?: string;
  accentColor?: string;
  icon?:        IconName;
}

export function SkillBar({
  skillName, level, xpProgress, trend, explanation, accentColor = colors.accent.primary, icon,
}: SkillBarProps) {
  const trendIcon: IconName | null =
    trend === "up" ? "trending-up" : trend === "down" ? "trending-down" : null;
  const trendColor = trend === "up" ? colors.accent.success : trend === "down" ? colors.accent.danger : colors.text.tertiary;
  const pct = Math.max(0, Math.min(1, xpProgress));

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.leftRow}>
          {icon && <Ionicons name={icon} size={14} color={accentColor} />}
          <Text style={[typography.title, { color: colors.text.primary }]}>{skillName}</Text>
        </View>
        <View style={styles.levelRow}>
          {trendIcon && <Ionicons name={trendIcon} size={11} color={trendColor} />}
          <View style={[styles.levelPill, { backgroundColor: accentColor + "20" }]}>
            <Text style={[typography.label, { color: accentColor, fontSize: 9 }]}>LV {level}</Text>
          </View>
        </View>
      </View>
      <ProgressBar
        value={pct}
        accentColor={accentColor}
        trailingLabel={`${Math.round(pct * 100)}%`}
      />
      {explanation && (
        <Text style={[typography.bodySmall, { color: colors.text.tertiary, marginTop: 2 }]}>
          {explanation}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:      { gap: spacing.xs },
  header:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  leftRow:   { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  levelRow:  { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  levelPill: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
});

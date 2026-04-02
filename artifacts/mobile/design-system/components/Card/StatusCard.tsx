import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";
import { elevation } from "../../tokens/elevation";

type IconName = ComponentProps<typeof Ionicons>["name"];

export interface StatusCardProps {
  icon?:        IconName;
  eyebrow?:     string;
  title:        string;
  description?: string;
  accentColor?: string;
  status?:      "active" | "success" | "warning" | "danger" | "info";
  children?:    React.ReactNode;
  style?:       ViewStyle;
}

const STATUS_COLORS = {
  active:  colors.accent.primary,
  success: colors.accent.success,
  warning: colors.accent.warning,
  danger:  colors.accent.danger,
  info:    colors.accent.progression,
};

export function StatusCard({
  icon, eyebrow, title, description, accentColor, status = "active", children, style,
}: StatusCardProps) {
  const accent = accentColor ?? STATUS_COLORS[status];

  return (
    <View style={[
      styles.card,
      { borderLeftColor: accent, borderColor: accent + "30", backgroundColor: accent + "08" },
      elevation.low,
      style,
    ]}>
      <View style={styles.headerRow}>
        {icon && (
          <View style={[styles.iconBox, { backgroundColor: accent + "20" }]}>
            <Ionicons name={icon} size={16} color={accent} />
          </View>
        )}
        <View style={{ flex: 1, gap: 2 }}>
          {eyebrow && (
            <Text style={[typography.label, { color: accent }]}>{eyebrow.toUpperCase()}</Text>
          )}
          <Text style={[typography.title, { color: colors.text.primary }]}>{title}</Text>
        </View>
      </View>
      {description && (
        <Text style={[typography.body, { color: colors.text.secondary }]}>{description}</Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderLeftWidth: 3,
    padding:         spacing.base,
    gap:             spacing.md,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  iconBox:   { width: 34, height: 34, borderRadius: radius.md, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});

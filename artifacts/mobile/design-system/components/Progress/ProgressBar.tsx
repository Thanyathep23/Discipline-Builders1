import React from "react";
import { View, Text, StyleSheet, type DimensionValue } from "react-native";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";

export interface ProgressBarProps {
  value: number;
  accentColor?: string;
  label?: string;
  trailingLabel?: string;
  height?: number;
}

export function ProgressBar({
  value,
  accentColor = colors.accent.primary,
  label,
  trailingLabel,
  height = 6,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const fillWidth: DimensionValue = `${Math.round(clamped * 100)}%`;

  return (
    <View style={styles.wrap}>
      {(label || trailingLabel) && (
        <View style={styles.labelRow}>
          {label      && <Text style={styles.label}>{label}</Text>}
          {trailingLabel && <Text style={styles.trailing}>{trailingLabel}</Text>}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <View style={[styles.fill, { width: fillWidth, backgroundColor: accentColor, height }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:     { gap: spacing.xs },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label:    { ...typography.bodySmall, color: colors.text.secondary },
  trailing: { ...typography.bodySmall, color: colors.text.tertiary },
  track:    { backgroundColor: colors.bg.surfaceElevated, borderRadius: radius.full, overflow: "hidden" },
  fill:     { borderRadius: radius.full },
});

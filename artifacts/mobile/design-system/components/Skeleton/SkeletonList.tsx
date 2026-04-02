import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { colors } from "../../tokens/colors";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";
import { SkeletonBlock } from "./SkeletonBlock";

export interface SkeletonListProps {
  rows?:       number;
  showAvatar?: boolean;
  style?:      ViewStyle;
}

function SkeletonRow({ showAvatar }: { showAvatar: boolean }) {
  return (
    <View style={styles.row}>
      {showAvatar && (
        <SkeletonBlock width={40} height={40} radius={radius.md} />
      )}
      <View style={styles.rowContent}>
        <SkeletonBlock width="55%" height={13} />
        <SkeletonBlock width="80%" height={10} />
      </View>
      <SkeletonBlock width={48} height={24} radius={radius.sm} />
    </View>
  );
}

export function SkeletonList({ rows = 4, showAvatar = false, style }: SkeletonListProps) {
  return (
    <View style={[styles.wrap, style]}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} showAvatar={showAvatar} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             spacing.md,
    backgroundColor: colors.bg.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border.subtle,
    padding:         spacing.md,
  },
  rowContent: { flex: 1, gap: spacing.xs },
});

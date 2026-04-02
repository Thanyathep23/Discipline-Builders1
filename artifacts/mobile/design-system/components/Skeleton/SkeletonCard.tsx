import React from "react";
import { View, StyleSheet } from "react-native";
import { colors } from "../../tokens/colors";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";
import { SkeletonBlock } from "./SkeletonBlock";

export type SkeletonCardType = "collection" | "summary" | "hero";

export interface SkeletonCardProps {
  type?: SkeletonCardType;
}

export function SkeletonCard({ type = "summary" }: SkeletonCardProps) {
  if (type === "hero") {
    return (
      <View style={[styles.card, styles.heroCard]}>
        <SkeletonBlock height={180} radius={0} />
        <View style={styles.heroFooter}>
          <SkeletonBlock width="55%" height={20} />
          <SkeletonBlock width="35%" height={12} />
          <View style={styles.heroStatRow}>
            <SkeletonBlock width="28%" height={36} radius={radius.md} />
            <SkeletonBlock width="28%" height={36} radius={radius.md} />
            <SkeletonBlock width="28%" height={36} radius={radius.md} />
          </View>
        </View>
      </View>
    );
  }

  if (type === "collection") {
    return (
      <View style={styles.card}>
        <SkeletonBlock height={120} radius={0} />
        <View style={styles.collectionFooter}>
          <SkeletonBlock width="60%" height={14} />
          <SkeletonBlock width="40%" height={11} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.summaryCard]}>
      <SkeletonBlock width="40%" height={10} />
      <SkeletonBlock width="70%" height={18} />
      <SkeletonBlock height={8} radius={radius.full} />
      <View style={styles.summaryStatRow}>
        <SkeletonBlock width="30%" height={40} radius={radius.md} />
        <SkeletonBlock width="30%" height={40} radius={radius.md} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border.subtle,
    overflow:        "hidden",
  },
  heroCard:         {},
  heroFooter:       { padding: spacing.base, gap: spacing.md },
  heroStatRow:      { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
  collectionFooter: { padding: spacing.md, gap: spacing.sm },
  summaryCard:      { padding: spacing.base, gap: spacing.md },
  summaryStatRow:   { flexDirection: "row", gap: spacing.md },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";

export type ChipVariant =
  | "locked" | "unlockable" | "owned" | "equipped" | "displayed"
  | "featured" | "premium" | "limited" | "exclusive"
  | "active" | "completed" | "approved" | "partial" | "followup" | "rejected"
  | "common" | "rare" | "epic" | "legendary" | "breakthrough"
  | "starter" | "hustle" | "rising" | "refined" | "elite";

export interface ChipProps {
  variant: ChipVariant;
  label?: string;
  size?: "sm" | "md";
}

type ChipConfig = {
  color:   string;
  bg:      string;
  border:  string;
  icon:    string;
  label:   string;
};

const CHIP_CONFIG: Record<ChipVariant, ChipConfig> = {
  locked:    { color: colors.text.tertiary,       bg: colors.bg.surfaceElevated, border: colors.border.default, icon: "lock-closed",         label: "LOCKED" },
  unlockable:{ color: colors.accent.warning,      bg: colors.accent.warning+"15", border: colors.accent.warning+"40", icon: "lock-open-outline", label: "SOON" },
  owned:     { color: colors.accent.success,      bg: colors.accent.success+"15", border: colors.accent.success+"30", icon: "checkmark-circle",  label: "OWNED" },
  equipped:  { color: colors.accent.primary,      bg: colors.accent.primary+"18", border: colors.accent.primary+"40", icon: "flash",             label: "EQUIPPED" },
  displayed: { color: colors.accent.progression,  bg: colors.accent.progression+"15", border: colors.accent.progression+"35", icon: "eye",        label: "DISPLAYED" },
  featured:  { color: colors.accent.premium,      bg: colors.accent.premium+"18", border: colors.accent.premium+"40", icon: "star",              label: "FEATURED" },
  premium:   { color: colors.accent.premium,      bg: colors.accent.premium+"18", border: colors.accent.premium+"40", icon: "star-outline",      label: "PREMIUM" },
  limited:   { color: colors.accent.danger,       bg: colors.accent.danger+"15",  border: colors.accent.danger+"35",  icon: "time-outline",      label: "LIMITED" },
  exclusive: { color: colors.accent.premium,      bg: colors.accent.premium+"15", border: colors.accent.premium+"35", icon: "diamond-outline",   label: "EXCLUSIVE" },

  active:    { color: colors.accent.primary,      bg: colors.accent.primary+"18", border: colors.accent.primary+"40", icon: "play-circle",       label: "ACTIVE" },
  completed: { color: colors.accent.success,      bg: colors.accent.success+"15", border: colors.accent.success+"30", icon: "checkmark-done",    label: "COMPLETED" },
  approved:  { color: colors.accent.success,      bg: colors.accent.success+"15", border: colors.accent.success+"30", icon: "shield-checkmark",  label: "APPROVED" },
  partial:   { color: colors.accent.warning,      bg: colors.accent.warning+"15", border: colors.accent.warning+"35", icon: "git-compare",       label: "PARTIAL" },
  followup:  { color: colors.accent.progression,  bg: colors.accent.progression+"15", border: colors.accent.progression+"35", icon: "arrow-forward-circle", label: "FOLLOW-UP" },
  rejected:  { color: colors.accent.danger,       bg: colors.accent.danger+"15",  border: colors.accent.danger+"30",  icon: "close-circle",      label: "REJECTED" },

  common:    { color: colors.rarity.common,       bg: colors.rarity.common+"18",   border: colors.rarity.common+"35",   icon: "ellipse",           label: "COMMON" },
  rare:      { color: colors.rarity.rare,         bg: colors.rarity.rare+"18",     border: colors.rarity.rare+"35",     icon: "diamond",           label: "RARE" },
  epic:      { color: colors.rarity.epic,         bg: colors.rarity.epic+"18",     border: colors.rarity.epic+"35",     icon: "star",              label: "EPIC" },
  legendary: { color: colors.rarity.legendary,    bg: colors.rarity.legendary+"18", border: colors.rarity.legendary+"35", icon: "trophy",           label: "LEGENDARY" },
  breakthrough:{ color: colors.rarity.breakthrough, bg: colors.rarity.breakthrough+"18", border: colors.rarity.breakthrough+"35", icon: "flash",   label: "BREAKTHROUGH" },

  starter:   { color: colors.tier.starter,        bg: colors.tier.starter+"15",    border: colors.tier.starter+"35",    icon: "flag",              label: "STARTER" },
  hustle:    { color: colors.tier.hustle,         bg: colors.tier.hustle+"15",     border: colors.tier.hustle+"35",     icon: "trending-up",       label: "HUSTLE" },
  rising:    { color: colors.tier.rising,         bg: colors.tier.rising+"15",     border: colors.tier.rising+"30",     icon: "arrow-up-circle",   label: "RISING" },
  refined:   { color: colors.tier.refined,        bg: colors.tier.refined+"15",    border: colors.tier.refined+"35",    icon: "sparkles",          label: "REFINED" },
  elite:     { color: colors.tier.elite,          bg: colors.tier.elite+"15",      border: colors.tier.elite+"35",      icon: "shield-checkmark",  label: "ELITE" },
};

const SIZE_STYLES = {
  sm: { px: spacing.xs, py: 2, fontSize: 8,  iconSize: 8,  gap: 3, br: radius.sm },
  md: { px: spacing.sm, py: 3, fontSize: 9,  iconSize: 9,  gap: 4, br: radius.sm },
};

export function Chip({ variant, label, size = "md" }: ChipProps) {
  const cfg = CHIP_CONFIG[variant];
  const sz  = SIZE_STYLES[size];
  const displayLabel = label ?? cfg.label;

  return (
    <View style={[
      styles.chip,
      {
        backgroundColor:  cfg.bg,
        borderColor:      cfg.border,
        paddingHorizontal:sz.px,
        paddingVertical:  sz.py,
        borderRadius:     sz.br,
        gap:              sz.gap,
      },
    ]}>
      <Ionicons name={cfg.icon as any} size={sz.iconSize} color={cfg.color} />
      <Text style={[typography.micro, { color: cfg.color, fontSize: sz.fontSize, letterSpacing: 0.8 }]}>
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection:  "row",
    alignItems:     "center",
    borderWidth:    1,
    alignSelf:      "flex-start",
  },
});

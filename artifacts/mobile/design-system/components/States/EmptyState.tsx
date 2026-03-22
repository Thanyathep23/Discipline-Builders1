import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";
import { Button } from "../Button/Button";

export type EmptyStateInstance =
  | "no_missions" | "no_proof" | "no_purchases" | "no_room_items"
  | "no_car" | "no_chain" | "no_inventory" | "no_recommendations"
  | "admin_no_players" | "admin_no_content" | "admin_no_audit";

export interface EmptyStateProps {
  icon?:         string;
  title?:        string;
  subtitle?:     string;
  primaryLabel?: string;
  onPrimary?:    () => void;
  secondaryLabel?:string;
  onSecondary?:  () => void;
  preset?:       EmptyStateInstance;
  accentColor?:  string;
  style?:        ViewStyle;
}

const PRESETS: Record<EmptyStateInstance, {
  icon:     string;
  title:    string;
  subtitle: string;
}> = {
  no_missions: {
    icon:     "flag-outline",
    title:    "No missions yet",
    subtitle: "Your mission queue is clear. Build a routine — even one daily mission compounds into something real over time.",
  },
  no_proof: {
    icon:     "camera-outline",
    title:    "No proof submitted",
    subtitle: "Claim your work. Submit proof on your active missions and let your progress become permanent record.",
  },
  no_purchases: {
    icon:     "bag-handle-outline",
    title:    "Your inventory is empty",
    subtitle: "Everything here is earned. Head to the store to find items that match where you're headed — not where you've been.",
  },
  no_room_items: {
    icon:     "home-outline",
    title:    "Your Command Center is bare",
    subtitle: "Build an environment that reflects your ambition. Every item you place is a statement about your standards.",
  },
  no_car: {
    icon:     "car-outline",
    title:    "No vehicle in your collection",
    subtitle: "Your first car is a milestone. Unlock one and it stays on your profile as a permanent marker of your progress.",
  },
  no_chain: {
    icon:     "link-outline",
    title:    "No active streak",
    subtitle: "A chain starts with one day. Complete a mission today and lock in the first link of something consistent.",
  },
  no_inventory: {
    icon:     "cube-outline",
    title:    "Nothing in your inventory",
    subtitle: "Items you earn or purchase show up here. Start building your collection — each piece tells a story.",
  },
  no_recommendations: {
    icon:     "sparkles-outline",
    title:    "No recommendations yet",
    subtitle: "Keep completing missions and building your profile. Personalized suggestions will appear as your data grows.",
  },
  admin_no_players: {
    icon:     "people-outline",
    title:    "No players found",
    subtitle: "Try adjusting your search or filters. Player records appear here once they complete their first session.",
  },
  admin_no_content: {
    icon:     "documents-outline",
    title:    "No content items",
    subtitle: "No catalog items match the current filter. Create new content from the admin panel to populate this view.",
  },
  admin_no_audit: {
    icon:     "receipt-outline",
    title:    "No audit log entries",
    subtitle: "Audit events will appear here once admin actions are taken. All significant changes are tracked automatically.",
  },
};

export function EmptyState({
  icon, title, subtitle, primaryLabel, onPrimary, secondaryLabel, onSecondary,
  preset, accentColor = colors.accent.primary, style,
}: EmptyStateProps) {
  const p = preset ? PRESETS[preset] : null;
  const displayIcon    = icon    ?? p?.icon    ?? "help-circle-outline";
  const displayTitle   = title   ?? p?.title   ?? "Nothing here yet";
  const displaySubtitle = subtitle ?? p?.subtitle ?? "";

  return (
    <Animated.View entering={FadeIn.duration(400)} style={[styles.wrap, style]}>
      <View style={[styles.iconRing, { borderColor: accentColor + "35", backgroundColor: accentColor + "10" }]}>
        <Ionicons name={displayIcon as any} size={28} color={accentColor} />
      </View>
      <Text style={[typography.h3, styles.title]}>{displayTitle}</Text>
      {displaySubtitle ? (
        <Text style={[typography.body, styles.subtitle]}>{displaySubtitle}</Text>
      ) : null}
      {primaryLabel && onPrimary && (
        <Button
          label={primaryLabel}
          onPress={onPrimary}
          variant="primary"
          fullWidth
        />
      )}
      {secondaryLabel && onSecondary && (
        <Button
          label={secondaryLabel}
          onPress={onSecondary}
          variant="secondary"
          fullWidth
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems:    "center",
    paddingVertical:spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap:           spacing.base,
  },
  iconRing: {
    width:         72,
    height:        72,
    borderRadius:  36,
    borderWidth:   1,
    alignItems:    "center",
    justifyContent:"center",
    marginBottom:  spacing.sm,
  },
  title:    { color: colors.text.primary, textAlign: "center" },
  subtitle: { color: colors.text.secondary, textAlign: "center", lineHeight: 20 },
});

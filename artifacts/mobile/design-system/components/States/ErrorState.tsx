import React, { type ComponentProps } from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { Button } from "../Button/Button";

type IconName = ComponentProps<typeof Ionicons>["name"];

export type ErrorType = "network" | "validation" | "server" | "permission" | "not_found";

export interface ErrorStateProps {
  type?:          ErrorType;
  title?:         string;
  description?:   string;
  onRetry?:       () => void;
  retryLabel?:    string;
  onFallback?:    () => void;
  fallbackLabel?: string;
  inline?:        boolean;
  style?:         ViewStyle;
}

type TypeConfig = {
  icon:        IconName;
  title:       string;
  description: string;
  accentColor: string;
};

const TYPE_CONFIG: Record<ErrorType, TypeConfig> = {
  network: {
    icon:        "cloud-offline-outline",
    title:       "Connection lost",
    description: "We couldn't reach the server. Check your connection and try again.",
    accentColor: colors.accent.warning,
  },
  validation: {
    icon:        "alert-circle-outline",
    title:       "Something doesn't look right",
    description: "Please check the highlighted fields and correct any errors before continuing.",
    accentColor: colors.accent.danger,
  },
  server: {
    icon:        "server-outline",
    title:       "Server error",
    description: "Something went wrong on our end. We've logged the issue. Try again in a moment.",
    accentColor: colors.accent.danger,
  },
  permission: {
    icon:        "lock-closed-outline",
    title:       "Access restricted",
    description: "You don't have permission to view this. If you believe this is wrong, contact support.",
    accentColor: colors.accent.warning,
  },
  not_found: {
    icon:        "search-outline",
    title:       "Not found",
    description: "The content you're looking for doesn't exist or may have been removed.",
    accentColor: colors.text.tertiary,
  },
};

export function ErrorState({
  type = "server", title, description, onRetry, retryLabel = "Try Again",
  onFallback, fallbackLabel = "Go Back", inline = false, style,
}: ErrorStateProps) {
  const cfg = TYPE_CONFIG[type];
  const displayTitle = title       ?? cfg.title;
  const displayDesc  = description ?? cfg.description;
  const accent       = cfg.accentColor;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[inline ? styles.inlineWrap : styles.fullWrap, style]}
    >
      <View style={[styles.iconRing, { borderColor: accent + "40", backgroundColor: accent + "10" }]}>
        <Ionicons name={cfg.icon} size={inline ? 20 : 28} color={accent} />
      </View>
      <Text style={[typography.h3, styles.title]}>{displayTitle}</Text>
      <Text style={[typography.body, styles.description]}>{displayDesc}</Text>

      {(onRetry || onFallback) ? (
        <View style={styles.actions}>
          {onRetry ? (
            <Button
              label={retryLabel}
              onPress={onRetry}
              variant={type === "network" || type === "server" ? "primary" : "secondary"}
              fullWidth={!onFallback}
              iconLeft="refresh"
            />
          ) : null}
          {onFallback ? (
            <Button
              label={fallbackLabel}
              onPress={onFallback}
              variant="secondary"
            />
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fullWrap: {
    alignItems:       "center",
    paddingVertical:  spacing.xxxl,
    paddingHorizontal:spacing.xl,
    gap:              spacing.base,
    flex:             1,
    justifyContent:   "center",
  },
  inlineWrap: {
    alignItems:       "center",
    paddingVertical:  spacing.xl,
    paddingHorizontal:spacing.base,
    gap:              spacing.md,
  },
  iconRing: {
    width:          56,
    height:         56,
    borderRadius:   28,
    borderWidth:    1,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   spacing.xs,
  },
  title:       { color: colors.text.primary,   textAlign: "center" },
  description: { color: colors.text.secondary, textAlign: "center", lineHeight: 20 },
  actions:     { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm, flexWrap: "wrap", justifyContent: "center" },
});

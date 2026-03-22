import React from "react";
import {
  Pressable, Text, View, ActivityIndicator, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive" | "premium";

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: string;
  size?: "sm" | "md" | "lg";
}

const VARIANT_STYLES: Record<ButtonVariant, {
  bg: string;
  border: string;
  text: string;
  pressedBg: string;
  disabledBg: string;
  disabledText: string;
}> = {
  primary: {
    bg:          colors.accent.primary,
    border:      "transparent",
    text:        colors.text.inverse,
    pressedBg:   "#6A4CE0",
    disabledBg:  colors.accent.primary + "55",
    disabledText:colors.text.inverse + "80",
  },
  secondary: {
    bg:          "transparent",
    border:      colors.accent.primary + "60",
    text:        colors.accent.secondary,
    pressedBg:   colors.accent.primary + "18",
    disabledBg:  "transparent",
    disabledText:colors.text.disabled,
  },
  tertiary: {
    bg:          "transparent",
    border:      "transparent",
    text:        colors.accent.secondary,
    pressedBg:   colors.accent.primary + "10",
    disabledBg:  "transparent",
    disabledText:colors.text.disabled,
  },
  destructive: {
    bg:          colors.accent.danger,
    border:      "transparent",
    text:        "#FFFFFF",
    pressedBg:   "#D92B5C",
    disabledBg:  colors.accent.danger + "50",
    disabledText:"#FFFFFF80",
  },
  premium: {
    bg:          colors.accent.premium,
    border:      "transparent",
    text:        colors.text.inverse,
    pressedBg:   "#D4A820",
    disabledBg:  colors.accent.premium + "55",
    disabledText:colors.text.inverse + "80",
  },
};

const SIZE_STYLES = {
  sm: { paddingVertical: spacing.sm,   paddingHorizontal: spacing.md,   fontSize: 12, iconSize: 13, gap: spacing.xs },
  md: { paddingVertical: spacing.md,   paddingHorizontal: spacing.base, fontSize: 14, iconSize: 15, gap: spacing.sm },
  lg: { paddingVertical: spacing.base, paddingHorizontal: spacing.xl,   fontSize: 15, iconSize: 16, gap: spacing.sm },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  fullWidth = false,
  iconLeft,
  size = "md",
}: ButtonProps) {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];
  const isTertiary = variant === "tertiary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical:   s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          backgroundColor:   disabled ? v.disabledBg : pressed ? v.pressedBg : v.bg,
          borderColor:       isTertiary ? "transparent" : disabled ? v.disabledBg : v.border || v.bg,
          borderWidth:       isTertiary ? 0 : 1,
          borderRadius:      radius.md,
          alignSelf:         fullWidth ? undefined : "flex-start" as const,
          opacity:           (disabled || loading) && variant !== "primary" && variant !== "premium" && variant !== "destructive" ? 0.6 : 1,
          gap:               s.gap,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "secondary" || variant === "tertiary" ? colors.accent.secondary : v.text}
        />
      ) : (
        <>
          {iconLeft && (
            <Ionicons
              name={iconLeft as any}
              size={s.iconSize}
              color={disabled ? v.disabledText : v.text}
            />
          )}
          <Text
            style={[
              typography.title,
              {
                fontSize:  s.fontSize,
                color:     disabled ? v.disabledText : v.text,
                textAlign: "center",
              },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems:    "center",
    justifyContent:"center",
  },
});

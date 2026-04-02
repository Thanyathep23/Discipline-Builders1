import React, { useState, type ComponentProps } from "react";
import { Pressable, View, Text, StyleSheet, Image, ActivityIndicator, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";
import { elevation } from "../../tokens/elevation";

type IconName = ComponentProps<typeof Ionicons>["name"];

export interface ActionCardProps {
  eyebrow?:     string;
  title:        string;
  description?: string;
  ctaLabel?:    string;
  ctaIcon?:     IconName;
  onPress?:     () => void;
  accentColor?: string;
  icon?:        IconName;
  imageUri?:    string;
  style?:       ViewStyle;
}

export function ActionCard({
  eyebrow, title, description, ctaLabel, ctaIcon = "arrow-forward",
  onPress, accentColor = colors.accent.primary, icon, imageUri, style,
}: ActionCardProps) {
  const [imgError, setImgError]     = useState(false);
  const [imgLoading, setImgLoading] = useState(!!imageUri);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { borderColor: accentColor + "35" },
        elevation.low,
        pressed && { opacity: 0.85 },
        style,
      ]}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        {imageUri && !imgError ? (
          <View style={styles.thumbWrap}>
            <Image
              source={{ uri: imageUri }}
              style={styles.thumb}
              onLoadEnd={() => setImgLoading(false)}
              onError={() => { setImgError(true); setImgLoading(false); }}
            />
            {imgLoading && (
              <View style={styles.thumbPlaceholder}>
                <ActivityIndicator size="small" color={accentColor} />
              </View>
            )}
          </View>
        ) : icon ? (
          <View style={[styles.iconBox, { backgroundColor: accentColor + "18" }]}>
            <Ionicons name={icon} size={18} color={accentColor} />
          </View>
        ) : null}
        <View style={{ flex: 1, gap: spacing.xs }}>
          {eyebrow && (
            <Text style={[typography.label, { color: accentColor }]}>{eyebrow.toUpperCase()}</Text>
          )}
          <Text style={[typography.title, { color: colors.text.primary }]}>{title}</Text>
        </View>
      </View>
      {description && (
        <Text style={[typography.body, { color: colors.text.secondary }]}>{description}</Text>
      )}
      {ctaLabel && (
        <View style={[styles.cta, { backgroundColor: accentColor + "15", borderColor: accentColor + "35" }]}>
          <Text style={[typography.label, { color: accentColor, fontSize: 11, letterSpacing: 0 }]}>{ctaLabel}</Text>
          <Ionicons name={ctaIcon} size={12} color={accentColor} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface + "CC",
    borderRadius:    radius.lg,
    borderWidth:     1,
    padding:         spacing.base,
    gap:             spacing.md,
  },
  topRow:         { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  iconBox:        { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  thumbWrap:      { width: 48, height: 48, borderRadius: radius.md, overflow: "hidden", flexShrink: 0, backgroundColor: colors.bg.surfaceElevated },
  thumb:          { width: "100%", height: "100%", resizeMode: "cover" },
  thumbPlaceholder:{ ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  cta: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    alignSelf: "flex-start", paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2, borderRadius: radius.md, borderWidth: 1,
  },
});

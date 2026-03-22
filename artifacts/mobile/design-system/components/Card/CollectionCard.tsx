import React, { useState } from "react";
import { Pressable, View, Text, StyleSheet, Image, ViewStyle, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../tokens/colors";
import { typography } from "../../tokens/typography";
import { spacing } from "../../tokens/spacing";
import { radius } from "../../tokens/radius";
import { elevation } from "../../tokens/elevation";
import { Chip, ChipVariant } from "../Chip/Chip";

export interface CollectionCardProps {
  name:        string;
  description?:string;
  imageUri?:   string;
  icon?:       string;
  price?:      number | string;
  state?:      ChipVariant;
  accentColor?:string;
  onPress?:    () => void;
  style?:      ViewStyle;
  mediaContent?: React.ReactNode;
}

export function CollectionCard({
  name, description, imageUri, icon, price, state,
  accentColor = colors.accent.primary, onPress, style, mediaContent,
}: CollectionCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(!!imageUri);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        elevation.low,
        pressed && { opacity: 0.85 },
        style,
      ]}
      onPress={onPress}
    >
      <View style={styles.mediaArea}>
        {imageUri && !imgError ? (
          <>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              onLoadEnd={() => setImgLoading(false)}
              onError={() => { setImgError(true); setImgLoading(false); }}
            />
            {imgLoading && (
              <View style={styles.mediaPlaceholder}>
                <ActivityIndicator size="small" color={accentColor} />
              </View>
            )}
          </>
        ) : mediaContent ? (
          <View style={styles.mediaCustom}>{mediaContent}</View>
        ) : (
          <View style={[styles.mediaPlaceholder, { backgroundColor: accentColor + "15" }]}>
            <Ionicons name={(icon ?? "gift") as any} size={32} color={accentColor} />
          </View>
        )}
        {state && (
          <View style={styles.stateChipOverlay}>
            <Chip variant={state} size="sm" />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.title, { color: colors.text.primary }]} numberOfLines={1}>
            {name}
          </Text>
          {description && (
            <Text style={[typography.bodySmall, { color: colors.text.secondary, marginTop: 2 }]} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>
        {price !== undefined && (
          <View style={[styles.pricePill, { backgroundColor: accentColor + "18" }]}>
            <Ionicons name="flash" size={10} color={accentColor} />
            <Text style={[typography.label, { color: accentColor, fontSize: 11, letterSpacing: 0 }]}>
              {price === 0 ? "FREE" : typeof price === "number" ? price.toLocaleString() : price}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius:    radius.lg,
    borderWidth:     1,
    borderColor:     colors.border.default,
    overflow:        "hidden",
  },
  mediaArea:        { position: "relative", height: 120, backgroundColor: colors.bg.surfaceElevated },
  image:            { width: "100%", height: "100%", resizeMode: "cover" },
  mediaPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  mediaCustom:      { flex: 1, alignItems: "center", justifyContent: "center" },
  stateChipOverlay: { position: "absolute", top: spacing.sm, left: spacing.sm },
  footer: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    gap: spacing.sm, padding: spacing.md,
  },
  pricePill: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
  },
});

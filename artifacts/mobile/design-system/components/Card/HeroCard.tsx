import React, { useState } from "react";
import { View, Image, ActivityIndicator, StyleSheet, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../tokens/colors";
import { radius } from "../../tokens/radius";
import { elevation } from "../../tokens/elevation";

export interface HeroCardProps {
  children?:    React.ReactNode;
  accentColor?: string;
  imageUri?:    string;
  imageHeight?: number;
  style?:       ViewStyle;
}

export function HeroCard({ children, accentColor, imageUri, imageHeight = 200, style }: HeroCardProps) {
  const [imgError, setImgError]     = useState(false);
  const [imgLoading, setImgLoading] = useState(!!imageUri);

  return (
    <View style={[
      styles.card,
      accentColor && { borderColor: accentColor + "30" },
      elevation.hero,
      style,
    ]}>
      {imageUri ? (
        <View style={[styles.imageArea, { height: imageHeight }]}>
          {!imgError ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              onLoadEnd={() => setImgLoading(false)}
              onError={() => { setImgError(true); setImgLoading(false); }}
            />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: (accentColor ?? colors.accent.primary) + "10" }]}>
              <Ionicons name="image-outline" size={28} color={(accentColor ?? colors.accent.primary) + "60"} />
            </View>
          )}
          {imgLoading && !imgError && (
            <View style={styles.imagePlaceholder}>
              <ActivityIndicator size="small" color={accentColor ?? colors.accent.primary} />
            </View>
          )}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.border.subtle,
    overflow:        "hidden",
  },
  imageArea:       { position: "relative", backgroundColor: colors.bg.surfaceElevated },
  image:           { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder:{ ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});

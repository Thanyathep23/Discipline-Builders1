import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";

// ── Progression Tip ──────────────────────────────────────────────────────────

export function ProgressionTipCard({
  tip, delay = 0, onDismiss,
}: {
  tip: any; delay?: number; onDismiss?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (!tip || dismissed) return null;
  const color = tip.accentColor ?? Colors.cyan;
  const pct = Math.min(100, Math.max(0, tip.progressPct ?? 0));

  const handleDismiss = () => {
    Haptics.selectionAsync();
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[progStyles.card, { borderColor: color + "30" }]}>
      <View style={progStyles.header}>
        <View style={[progStyles.iconBox, { backgroundColor: color + "18" }]}>
          <Ionicons name={tip.icon ?? "trending-up-outline"} size={16} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={progStyles.eyebrow}>YOUR NEXT MOVE</Text>
          <Text style={progStyles.title} numberOfLines={1}>{tip.title}</Text>
        </View>
        {pct > 0 && (
          <View style={[progStyles.pctBadge, { backgroundColor: color + "20" }]}>
            <Text style={[progStyles.pctText, { color }]}>{pct}%</Text>
          </View>
        )}
        <Pressable onPress={handleDismiss} hitSlop={10} style={progStyles.dismissBtn}>
          <Ionicons name="close" size={13} color={Colors.textMuted} />
        </Pressable>
      </View>
      <Text style={progStyles.body} numberOfLines={3}>{tip.body}</Text>
      {pct > 0 && (
        <View style={progStyles.barTrack}>
          <View style={[progStyles.barFill, { width: `${pct}%` as any, backgroundColor: color }]} />
        </View>
      )}
    </Animated.View>
  );
}

const progStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF06",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  eyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.2 },
  title:   { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textPrimary, marginTop: 1 },
  body:    { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  pctBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, flexShrink: 0 },
  pctText:  { fontFamily: "Inter_700Bold", fontSize: 11 },
  barTrack:   { height: 3, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden" },
  barFill:    { height: 3, borderRadius: 2 },
  dismissBtn: { padding: 4, marginLeft: 4 },
});

// ── Store Recommendation ──────────────────────────────────────────────────────

const RARITY_COLORS: Record<string, string> = {
  common:    Colors.textMuted,
  uncommon:  Colors.green,
  rare:      "#2196F3",
  epic:      "#9C27B0",
  legendary: Colors.gold,
};

export function StoreRecommendationCard({
  rec, delay = 0, onDismiss, onCTAPress,
}: {
  rec: any; delay?: number; onDismiss?: () => void; onCTAPress?: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (!rec || dismissed) return null;
  const rarityColor = RARITY_COLORS[rec.rarity] ?? Colors.textMuted;
  const accentColor = rec.canAfford ? Colors.green : "#9C27B0";

  const handleDismiss = () => {
    Haptics.selectionAsync();
    setDismissed(true);
    onDismiss?.();
  };

  const handleCTA = () => {
    Haptics.selectionAsync();
    onCTAPress?.();
    router.push("/(tabs)/rewards");
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[storeStyles.card, { borderColor: accentColor + "28" }]}>
      <View style={storeStyles.header}>
        <View style={[storeStyles.iconBox, { backgroundColor: accentColor + "18" }]}>
          <Ionicons name={rec.icon ?? "storefront-outline"} size={16} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={storeStyles.eyebrow}>{rec.aspirational ? "ASPIRATIONAL UPGRADE" : "RECOMMENDED FOR YOU"}</Text>
          <Text style={storeStyles.name} numberOfLines={1}>{rec.name}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Text style={[storeStyles.rarity, { color: rarityColor }]}>{rec.rarity.toUpperCase()}</Text>
          <View style={storeStyles.costRow}>
            <Ionicons name="flash" size={10} color={Colors.gold} />
            <Text style={storeStyles.cost}>{rec.cost.toLocaleString()}</Text>
          </View>
        </View>
        <Pressable onPress={handleDismiss} hitSlop={10} style={storeStyles.dismissBtn}>
          <Ionicons name="close" size={13} color={Colors.textMuted} />
        </Pressable>
      </View>
      <Text style={storeStyles.why} numberOfLines={2}>{rec.why}</Text>
      <Pressable
        style={({ pressed }) => [storeStyles.cta, { backgroundColor: accentColor + "18", borderColor: accentColor + "40" }, pressed && { opacity: 0.7 }]}
        onPress={handleCTA}
      >
        <Ionicons name={rec.canAfford ? "cart-outline" : "eye-outline"} size={13} color={accentColor} />
        <Text style={[storeStyles.ctaText, { color: accentColor }]}>
          {rec.canAfford ? "Buy Now" : "View Item"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const storeStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF06",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  header:  { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  eyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.2 },
  name:    { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textPrimary, marginTop: 1 },
  rarity:  { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.8 },
  costRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  cost:    { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.gold },
  why:     { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  cta: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
  },
  ctaText:    { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  dismissBtn: { padding: 4, marginLeft: 4 },
});

// ── Recommended Mission Badge ─────────────────────────────────────────────────

export function RecommendedBadge({ why, confidence }: { why: string; confidence?: string }) {
  const color = confidence === "high" ? Colors.accent : confidence === "medium" ? Colors.cyan : Colors.textMuted;
  return (
    <View style={badgeStyles.wrap}>
      <View style={[badgeStyles.pill, { backgroundColor: color + "18", borderColor: color + "40" }]}>
        <Ionicons name="star" size={9} color={color} />
        <Text style={[badgeStyles.label, { color }]}>RECOMMENDED</Text>
      </View>
      <Text style={badgeStyles.why} numberOfLines={2}>{why}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  wrap:  { gap: 4, marginTop: 4 },
  pill:  { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  label: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1 },
  why:   { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, lineHeight: 15 },
});

// ── Secondary Action Card ─────────────────────────────────────────────────────

export function SecondaryActionCard({
  action, delay = 0, onCTAPress,
}: {
  action: any; delay?: number; onCTAPress?: () => void;
}) {
  if (!action) return null;
  const color = action.accentColor ?? Colors.accent;
  return (
    <Pressable
      style={({ pressed }) => [secStyles.card, { borderColor: color + "28" }, pressed && { opacity: 0.8 }]}
      onPress={() => { Haptics.selectionAsync(); onCTAPress?.(); router.push(action.route); }}
    >
      <View style={[secStyles.icon, { backgroundColor: color + "18" }]}>
        <Ionicons name={action.icon ?? "arrow-forward-circle-outline"} size={16} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={secStyles.title}>{action.title}</Text>
        <Text style={secStyles.body} numberOfLines={2}>{action.body}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
    </Pressable>
  );
}

const secStyles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FFFFFF05", borderRadius: 14, borderWidth: 1,
    padding: 12,
  },
  icon:  { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  body:  { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
});

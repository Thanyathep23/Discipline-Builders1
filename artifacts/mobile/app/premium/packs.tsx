import React from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery } from "@tanstack/react-query";

const PREMIUM_COLOR = "#F5C842";
const PREMIUM_DIM = "#F5C84220";
const PREMIUM_BORDER = "#F5C84240";

const CATEGORY_COLORS: Record<string, string> = {
  challenge: Colors.accent,
  prestige: Colors.gold,
  lifestyle: Colors.cyan,
  recovery: Colors.green,
};

const PACK_DETAIL: Record<string, { highlights: string[] }> = {
  "pack-focus-mastery": {
    highlights: [
      "30 curated deep-work challenge missions",
      "Unlocks Focus Shrine premium theme",
      "Elite Focus cosmetic reward",
      "Advanced distraction-resistance arc",
    ],
  },
  "pack-trading-pro": {
    highlights: [
      "Precision trading review missions",
      "Risk discipline challenge sets",
      "Unlocks Command Terminal theme access",
      "Operator Sigil reward path",
    ],
  },
  "pack-recovery-rebuild": {
    highlights: [
      "Recovery-focused mission arcs",
      "Progressive momentum rebuilding",
      "Exclusive comeback cosmetics",
      "Resilience prestige track",
    ],
  },
  "pack-prestige-sprint": {
    highlights: [
      "High-intensity prestige acceleration missions",
      "Unlocks War Room environment",
      "Prestige Seal fast-track access",
      "Elite sprint reward cosmetics",
    ],
  },
  "pack-deep-work-elite": {
    highlights: [
      "45 days of elite operator missions",
      "Exclusive showcase cosmetics",
      "Deep Work mastery prestige path",
      "All premium environments unlocked",
    ],
  },
};

function PackCard({ pack, isPremium, delay }: { pack: any; isPremium: boolean; delay: number }) {
  const accessible = pack.accessible;
  const owned = pack.owned;
  const detail = PACK_DETAIL[pack.id];
  const categoryColor = CATEGORY_COLORS[pack.category] ?? Colors.accent;

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[
      styles.packCard,
      !accessible && styles.packCardLocked,
      pack.isFeatured && styles.packCardFeatured,
    ]}>
      {pack.isFeatured && (
        <View style={styles.featuredChip}>
          <Ionicons name="star" size={9} color={PREMIUM_COLOR} />
          <Text style={styles.featuredText}>FEATURED</Text>
        </View>
      )}

      <View style={styles.packHeader}>
        <View style={[styles.packIconBox, { backgroundColor: categoryColor + "20" }]}>
          <Ionicons name={pack.icon as any} size={22} color={categoryColor} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.packTitleRow}>
            <Text style={styles.packName}>{pack.name}</Text>
            {!accessible && (
              <Ionicons name="lock-closed" size={13} color={Colors.textMuted} />
            )}
          </View>
          <Text style={styles.packTagline}>{pack.tagline}</Text>
        </View>
        {owned && (
          <View style={styles.ownedChip}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.green} />
            <Text style={styles.ownedText}>Owned</Text>
          </View>
        )}
      </View>

      <Text style={styles.packDesc}>{pack.description}</Text>

      {detail?.highlights && (
        <View style={styles.highlightsBox}>
          {detail.highlights.map((h, i) => (
            <View key={i} style={styles.highlightRow}>
              <View style={[styles.dot, { backgroundColor: accessible ? categoryColor : Colors.textMuted }]} />
              <Text style={[styles.highlightText, !accessible && { color: Colors.textMuted }]}>{h}</Text>
            </View>
          ))}
        </View>
      )}

      {!accessible && (
        <Pressable style={styles.lockCTA} onPress={() => router.push("/premium")}>
          <Ionicons name="star-outline" size={13} color={PREMIUM_COLOR} />
          <Text style={styles.lockCTAText}>Upgrade to Premium to unlock</Text>
          <Ionicons name="arrow-forward" size={12} color={PREMIUM_COLOR} />
        </Pressable>
      )}

      {accessible && !owned && (
        <View style={styles.accessRow}>
          <Ionicons name="checkmark-circle-outline" size={14} color={Colors.green} />
          <Text style={styles.accessText}>Included with your premium membership</Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function PremiumPacksScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data, isLoading } = useQuery({
    queryKey: ["premium", "packs"],
    queryFn: () => request<any>("/premium/packs"),
  });

  const isPremium = data?.isPremium ?? false;
  const packs: any[] = data?.packs ?? [];
  const featured = packs.filter(p => p.isFeatured);
  const others = packs.filter(p => !p.isFeatured);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Content Packs</Text>
        {isPremium && (
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={11} color={PREMIUM_COLOR} />
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 50 }]}
      >
        {isLoading ? (
          <ActivityIndicator color={PREMIUM_COLOR} style={{ marginTop: 60 }} />
        ) : (
          <>
            <Animated.View entering={FadeInDown.springify()} style={styles.introCard}>
              <Ionicons name="cube-outline" size={20} color={PREMIUM_COLOR} />
              <View style={{ flex: 1 }}>
                <Text style={styles.introTitle}>Premium Challenge Packs</Text>
                <Text style={styles.introDesc}>
                  Curated mission programs for elite operators. Each pack is a guided experience designed to accelerate a specific discipline arc.
                </Text>
              </View>
            </Animated.View>

            {!isPremium && (
              <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.upgradeBanner}>
                <Ionicons name="lock-closed-outline" size={16} color={PREMIUM_COLOR} />
                <Text style={styles.upgradeBannerText}>Unlock all packs with Premium</Text>
                <Pressable onPress={() => router.push("/premium")} style={styles.upgradeBannerBtn}>
                  <Text style={styles.upgradeBannerBtnText}>Upgrade</Text>
                </Pressable>
              </Animated.View>
            )}

            {featured.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Featured</Text>
                {featured.map((p, i) => (
                  <PackCard key={p.id} pack={p} isPremium={isPremium} delay={60 + i * 40} />
                ))}
              </>
            )}

            {others.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>All Packs</Text>
                {others.map((p, i) => (
                  <PackCard key={p.id} pack={p} isPremium={isPremium} delay={100 + i * 40} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 20,
    paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  premiumBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 8, backgroundColor: PREMIUM_DIM, borderWidth: 1, borderColor: PREMIUM_BORDER,
  },
  premiumBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: PREMIUM_COLOR },
  scroll: { padding: 20, gap: 16 },

  introCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: PREMIUM_BORDER, borderRadius: 12, padding: 16,
  },
  introTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, marginBottom: 4 },
  introDesc: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 18 },

  upgradeBanner: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: PREMIUM_DIM,
    borderWidth: 1, borderColor: PREMIUM_BORDER, borderRadius: 10, padding: 14,
  },
  upgradeBannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  upgradeBannerBtn: {
    backgroundColor: PREMIUM_COLOR, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  upgradeBannerBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: Colors.bg },

  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textMuted, letterSpacing: 1, textTransform: "uppercase" },

  packCard: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 14, padding: 18, gap: 12, position: "relative",
  },
  packCardLocked: { opacity: 0.75 },
  packCardFeatured: { borderColor: PREMIUM_BORDER },
  featuredChip: {
    flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start",
    backgroundColor: PREMIUM_DIM, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: -4,
  },
  featuredText: { fontSize: 9, fontFamily: "Inter_700Bold", color: PREMIUM_COLOR, letterSpacing: 0.5 },

  packHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  packIconBox: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  packTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  packName: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  packTagline: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  ownedChip: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 },
  ownedText: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.green },

  packDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 20 },

  highlightsBox: { gap: 6, backgroundColor: Colors.bgElevated, borderRadius: 8, padding: 12 },
  highlightRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  highlightText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textPrimary, flex: 1, lineHeight: 18 },

  lockCTA: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: PREMIUM_DIM,
    borderRadius: 8, padding: 10, borderWidth: 1, borderColor: PREMIUM_BORDER,
  },
  lockCTAText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: PREMIUM_COLOR },

  accessRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  accessText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.green },
});

import React from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery } from "@tanstack/react-query";

const SKILL_COLORS: Record<string, string> = {
  focus: "#7C5CFC", discipline: "#FF7043", learning: "#00D4FF",
  sleep: "#00BCD4", fitness: "#00E676", trading: "#F5C842",
};
const SKILL_LABELS: Record<string, string> = {
  focus: "Focus", discipline: "Discipline", learning: "Learning",
  sleep: "Sleep", fitness: "Fitness", trading: "Trading",
};
const RARITY_COLORS: Record<string, string> = {
  common: Colors.textSecondary, uncommon: "#00E676",
  rare: "#2196F3", epic: "#9C27B0", legendary: "#F5C842",
};

export default function ShowcaseScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data, isLoading, error } = useQuery({
    queryKey: ["showcase", userId],
    queryFn: () => request<any>(`/showcase/${userId}`),
    enabled: !!userId,
  });

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Showcase</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.errorCard}>
            <Ionicons name="lock-closed-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.errorTitle}>Not visible</Text>
            <Text style={styles.errorText}>This member hasn't shared their showcase, or you're not in a shared circle with them.</Text>
          </View>
        ) : (
          <>
            {/* Identity header */}
            <Animated.View entering={FadeInDown.springify()} style={styles.identityCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{data?.username?.[0]?.toUpperCase() ?? "?"}</Text>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.username}>{data?.username ?? "Operator"}</Text>
                {data?.activeTitle && (
                  <View style={styles.titleBadge}>
                    <Ionicons name="ribbon" size={11} color={RARITY_COLORS[data.activeTitle.rarity] ?? Colors.gold} />
                    <Text style={[styles.titleText, { color: RARITY_COLORS[data.activeTitle.rarity] ?? Colors.gold }]}>
                      {data.activeTitle.name}
                    </Text>
                  </View>
                )}
                {data?.level && (
                  <Text style={styles.levelText}>Level {data.level}</Text>
                )}
                {data?.currentArc && (
                  <View style={styles.arcPill}>
                    <Ionicons name="navigate" size={11} color={Colors.cyan} />
                    <Text style={styles.arcText}>{data.currentArc}</Text>
                  </View>
                )}
              </View>
            </Animated.View>

            {/* Top skills */}
            {data?.topSkills?.length > 0 && (
              <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.card}>
                <Text style={styles.cardTitle}>Top Skills</Text>
                <View style={{ gap: 10 }}>
                  {data.topSkills.map((s: any) => (
                    <View key={s.skillId} style={styles.skillRow}>
                      <View style={[styles.skillDot, { backgroundColor: SKILL_COLORS[s.skillId] ?? Colors.accent }]} />
                      <Text style={styles.skillLabel}>{SKILL_LABELS[s.skillId] ?? s.skillId}</Text>
                      <View style={styles.skillRight}>
                        <Text style={[styles.skillRank, { color: SKILL_COLORS[s.skillId] ?? Colors.accent }]}>
                          {s.rank}
                        </Text>
                        <Text style={styles.skillLevel}>Lv {s.level}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Recent badges */}
            {data?.recentBadges?.length > 0 && (
              <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.card}>
                <Text style={styles.cardTitle}>Recent Badges</Text>
                <View style={styles.badgeGrid}>
                  {data.recentBadges.map((b: any, i: number) => (
                    <View key={i} style={styles.badgeCard}>
                      <View style={styles.badgeIcon}>
                        <Ionicons name={b.icon as any ?? "medal"} size={20} color={RARITY_COLORS[b.rarity] ?? Colors.gold} />
                      </View>
                      <Text style={styles.badgeName} numberOfLines={2}>{b.name}</Text>
                      <Text style={[styles.badgeRarity, { color: RARITY_COLORS[b.rarity] ?? Colors.textMuted }]}>
                        {b.rarity}
                      </Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* Equipped profile items (Phase 23) */}
            {data?.equippedProfileItems?.length > 0 && (
              <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.card}>
                <Text style={styles.cardTitle}>Profile Items</Text>
                <View style={{ gap: 8 }}>
                  {data.equippedProfileItems.map((item: any) => {
                    const rarityColor = RARITY_COLORS[item.rarity] ?? Colors.textSecondary;
                    return (
                      <View key={item.id} style={styles.profileItemRow}>
                        <View style={[styles.profileItemIcon, { backgroundColor: rarityColor + "18" }]}>
                          <Ionicons name={(item.icon ?? "gift") as any} size={18} color={rarityColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.profileItemName}>{item.name}</Text>
                          <Text style={[styles.profileItemRarity, { color: rarityColor }]}>
                            {item.rarity?.toUpperCase()} {item.itemType}
                          </Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.green} />
                      </View>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* Nothing shared note */}
            {!data?.activeTitle && !data?.currentArc && !data?.topSkills?.length && !data?.recentBadges?.length && !data?.level && !data?.equippedProfileItems?.length && (
              <View style={styles.emptyCard}>
                <Ionicons name="eye-off-outline" size={28} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Nothing shared yet</Text>
                <Text style={styles.emptyText}>This member hasn't enabled any showcase items.</Text>
              </View>
            )}

            <View style={styles.privacyNote}>
              <Ionicons name="shield-checkmark-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.privacyNoteText}>Only items the member chose to share are shown here.</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  header:          { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn:         { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle:     { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  scroll:          { paddingHorizontal: 20, gap: 16 },

  errorCard:       { alignItems: "center", gap: 12, padding: 32 },
  errorTitle:      { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textSecondary },
  errorText:       { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },

  identityCard:    { flexDirection: "row", gap: 16, backgroundColor: Colors.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  avatar:          { width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  avatarText:      { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.accent },
  username:        { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  titleBadge:      { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: Colors.bgElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  titleText:       { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  levelText:       { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  arcPill:         { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", backgroundColor: Colors.cyan + "12", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  arcText:         { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.cyan },

  card:            { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  cardTitle:       { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 },

  skillRow:        { flexDirection: "row", alignItems: "center", gap: 10 },
  skillDot:        { width: 10, height: 10, borderRadius: 5 },
  skillLabel:      { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textPrimary },
  skillRight:      { flexDirection: "row", alignItems: "center", gap: 8 },
  skillRank:       { fontFamily: "Inter_700Bold", fontSize: 13 },
  skillLevel:      { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },

  badgeGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badgeCard:       { width: "30%", alignItems: "center", gap: 6, backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 12 },
  badgeIcon:       { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center" },
  badgeName:       { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textPrimary, textAlign: "center" },
  badgeRarity:     { fontFamily: "Inter_400Regular", fontSize: 10, textTransform: "capitalize" },

  profileItemRow:    { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  profileItemIcon:   { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  profileItemName:   { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  profileItemRarity: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase" },

  emptyCard:       { alignItems: "center", gap: 10, padding: 32 },
  emptyTitle:      { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textSecondary },
  emptyText:       { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center" },

  privacyNote:     { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  privacyNoteText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
});

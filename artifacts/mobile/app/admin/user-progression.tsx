import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator, TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery } from "@tanstack/react-query";

const SKILL_ICONS: Record<string, any> = {
  focus: "eye", discipline: "shield", sleep: "moon", fitness: "barbell", learning: "book", trading: "trending-up",
};

const SKILL_COLORS: Record<string, string> = {
  focus: Colors.accent, discipline: "#FF7043", sleep: Colors.cyan, fitness: Colors.green, learning: "#00D4FF", trading: Colors.gold,
};

const RANK_COLORS: Record<string, string> = {
  Gray: "#9E9E9E", Green: Colors.green, Blue: "#2196F3", Purple: Colors.accent, Gold: Colors.gold, Red: Colors.crimson,
};

const TREND_ICONS: Record<string, any> = {
  rising: "trending-up", stable: "remove", falling: "trending-down",
};

const TREND_COLORS: Record<string, string> = {
  rising: Colors.green, stable: Colors.textMuted, falling: Colors.crimson,
};

export default function AdminUserProgressionScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [userId, setUserId] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin", "progression", activeId],
    queryFn: () => request<any>(`/admin/users/${activeId}/progression`),
    enabled: !!activeId,
  });

  const handleSearch = () => {
    if (userId.trim()) {
      setActiveId(userId.trim());
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>User Progression</Text>
        {activeId && (
          <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Enter User ID..."
          placeholderTextColor={Colors.textMuted}
          value={userId}
          onChangeText={setUserId}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <Pressable style={styles.searchBtn} onPress={handleSearch}>
          <Ionicons name="search" size={18} color="#fff" />
        </Pressable>
        {activeId && (
          <Pressable style={styles.clearBtn} onPress={() => { setActiveId(null); setUserId(""); }}>
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        {!activeId ? (
          <View style={styles.placeholder}>
            <Ionicons name="person-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.placeholderText}>Enter a User ID to inspect their progression state</Text>
          </View>
        ) : isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={32} color={Colors.crimson} />
            <Text style={styles.emptyText}>User not found or error loading data</Text>
          </View>
        ) : data ? (
          <>
            {/* User Summary */}
            <Animated.View entering={FadeInDown.springify()} style={styles.userCard}>
              <View style={styles.userAvatar}>
                <Text style={styles.avatarText}>{data.user.username?.[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>{data.user.username}</Text>
                  {data.user.role === "admin" && (
                    <View style={styles.adminPill}><Text style={styles.adminPillText}>ADMIN</Text></View>
                  )}
                  {!data.user.isActive && (
                    <View style={styles.inactivePill}><Text style={styles.inactivePillText}>INACTIVE</Text></View>
                  )}
                </View>
                <Text style={styles.userEmail}>{data.user.email}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 4 }}>
                <Text style={styles.userLevel}>Lv {data.user.level}</Text>
                <Text style={styles.userXp}>{data.user.xp} XP</Text>
              </View>
            </Animated.View>

            <View style={styles.walletRow}>
              <View style={styles.walletStat}>
                <Text style={[styles.walletVal, { color: Colors.gold }]}>{data.user.coinBalance}</Text>
                <Text style={styles.walletLabel}>Coins</Text>
              </View>
              <View style={styles.walletStat}>
                <Text style={[styles.walletVal, { color: Colors.green }]}>{data.user.currentStreak}d</Text>
                <Text style={styles.walletLabel}>Streak</Text>
              </View>
              <View style={styles.walletStat}>
                <Text style={[styles.walletVal, { color: data.user.trustScore > 0.7 ? Colors.green : Colors.amber }]}>
                  {(data.user.trustScore * 100).toFixed(0)}%
                </Text>
                <Text style={styles.walletLabel}>Trust</Text>
              </View>
            </View>

            {/* Arc */}
            <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Life Arc</Text>
              <View style={styles.arcCard}>
                <View style={styles.arcHeader}>
                  <Ionicons name="git-branch" size={18} color={Colors.accent} />
                  <Text style={styles.arcName}>{data.arc.current ?? "No arc assigned"}</Text>
                </View>
                {data.arc.setAt && <Text style={styles.arcDate}>Set: {new Date(data.arc.setAt).toLocaleDateString()}</Text>}
                {data.arc.mainGoal && <Text style={styles.arcGoal}>Goal: {data.arc.mainGoal}</Text>}
                {data.arc.mainProblem && <Text style={styles.arcProblem}>Problem: {data.arc.mainProblem}</Text>}
                {data.arc.onboardingStage && (
                  <Text style={styles.arcMeta}>Onboarding: {data.arc.onboardingStage}</Text>
                )}
              </View>
            </Animated.View>

            {/* Skills */}
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>6 Core Skills</Text>
              {data.skills.length === 0 ? (
                <Text style={styles.emptyText}>No skills initialized yet</Text>
              ) : (
                data.skills.map((s: any) => (
                  <View key={s.skillId} style={styles.skillRow}>
                    <View style={[styles.skillIcon, { backgroundColor: (SKILL_COLORS[s.skillId] ?? Colors.textMuted) + "18" }]}>
                      <Ionicons name={SKILL_ICONS[s.skillId] ?? "star"} size={16} color={SKILL_COLORS[s.skillId] ?? Colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.skillNameRow}>
                        <Text style={styles.skillName}>{s.skillId.charAt(0).toUpperCase() + s.skillId.slice(1)}</Text>
                        <View style={[styles.rankPill, { backgroundColor: (RANK_COLORS[s.rank] ?? Colors.textMuted) + "20" }]}>
                          <Text style={[styles.rankText, { color: RANK_COLORS[s.rank] ?? Colors.textMuted }]}>{s.rank}</Text>
                        </View>
                        <View style={styles.trendPill}>
                          <Ionicons name={TREND_ICONS[s.currentTrend] ?? "remove"} size={12} color={TREND_COLORS[s.currentTrend] ?? Colors.textMuted} />
                        </View>
                      </View>
                      <View style={styles.xpBar}>
                        <View style={[styles.xpFill, {
                          width: `${Math.min(100, (s.xp / s.xpToNextLevel) * 100)}%` as any,
                          backgroundColor: SKILL_COLORS[s.skillId] ?? Colors.accent,
                        }]} />
                      </View>
                      <Text style={styles.skillStat}>Lv {s.level} • {s.xp}/{s.xpToNextLevel} XP • conf {(s.confidenceScore * 100).toFixed(0)}%</Text>
                    </View>
                  </View>
                ))
              )}
            </Animated.View>

            {/* Active Chain */}
            <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Active Chain</Text>
              {!data.activeChain ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="link-outline" size={24} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>No active quest chain</Text>
                </View>
              ) : (
                <View style={styles.chainCard}>
                  <View style={styles.chainHeader}>
                    <Ionicons name="link" size={18} color={Colors.accent} />
                    <Text style={styles.chainName}>{data.activeChain.chainName}</Text>
                    <View style={[styles.chainStatus, { backgroundColor: data.activeChain.status === "active" ? Colors.greenDim : Colors.amberDim }]}>
                      <Text style={[styles.chainStatusText, { color: data.activeChain.status === "active" ? Colors.green : Colors.amber }]}>
                        {data.activeChain.status}
                      </Text>
                    </View>
                  </View>
                  {data.activeChain.theme && <Text style={styles.chainTheme}>{data.activeChain.theme}</Text>}
                  <Text style={styles.chainProgress}>
                    Step {data.activeChain.currentStep} / {data.activeChain.totalSteps} • {data.activeChain.relatedSkill} • +{data.activeChain.completionBonusCoins} bonus
                  </Text>
                  <View style={styles.chainBar}>
                    <View style={[styles.chainFill, { width: `${(data.activeChain.currentStep / data.activeChain.totalSteps) * 100}%` as any }]} />
                  </View>
                  <Text style={styles.chainId}>ID: {data.activeChain.id}</Text>
                  {data.activeChain.recentMissions?.length > 0 && (
                    <View style={{ marginTop: 8, gap: 4 }}>
                      <Text style={styles.chainMissionsTitle}>Recent Chain Missions</Text>
                      {data.activeChain.recentMissions.map((m: any) => (
                        <View key={m.id} style={styles.chainMissionRow}>
                          <Text style={styles.chainMissionTitle} numberOfLines={1}>{m.title}</Text>
                          <Text style={[styles.chainMissionStatus, { color: STATUS_COLORS[m.status] ?? Colors.textMuted }]}>{m.status}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </Animated.View>

            {/* Badges */}
            <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Badges ({data.badges.length})</Text>
              {data.badges.length === 0 ? (
                <Text style={styles.emptyText}>No badges earned yet</Text>
              ) : (
                <View style={styles.badgeGrid}>
                  {data.badges.map((b: any) => (
                    <View key={b.badgeId} style={styles.badgeItem}>
                      <Ionicons name="ribbon" size={20} color={Colors.gold} />
                      <Text style={styles.badgeName} numberOfLines={1}>{b.name}</Text>
                      <Text style={[styles.badgeRarity, { color: b.rarity === "breakthrough" ? Colors.crimson : b.rarity === "rare" ? Colors.gold : Colors.textMuted }]}>
                        {b.rarity}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>

            {/* Titles */}
            <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Titles ({data.titles.length})</Text>
              {data.titles.length === 0 ? (
                <Text style={styles.emptyText}>No titles earned yet</Text>
              ) : (
                data.titles.map((t: any) => (
                  <View key={t.titleId} style={[styles.titleRow, t.isActive && styles.titleRowActive]}>
                    <Ionicons name="star" size={16} color={t.isActive ? Colors.gold : Colors.textMuted} />
                    <Text style={[styles.titleName, t.isActive && { color: Colors.gold }]}>{t.name}</Text>
                    {t.isActive && <View style={styles.activePill}><Text style={styles.activePillText}>ACTIVE</Text></View>}
                  </View>
                ))
              )}
            </Animated.View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.amber, accepted: Colors.green, rejected: Colors.crimson,
  not_now: Colors.textMuted, completed: Colors.accent, expired: Colors.textMuted,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  searchRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  input: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 8, color: Colors.textPrimary, fontFamily: "Inter_400Regular", fontSize: 13,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchBtn: { backgroundColor: Colors.accent, borderRadius: 10, width: 40, alignItems: "center", justifyContent: "center" },
  clearBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  scroll: { paddingHorizontal: 20, gap: 16 },
  placeholder: { marginTop: 60, alignItems: "center", gap: 16 },
  placeholderText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center", maxWidth: 240 },
  emptyCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 24, alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  userCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  userAvatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.accent },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  userName: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  userEmail: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  userLevel: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.accent },
  userXp: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  adminPill: { backgroundColor: Colors.accentGlow, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  adminPillText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent, letterSpacing: 0.8 },
  inactivePill: { backgroundColor: Colors.crimsonDim, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  inactivePillText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.crimson, letterSpacing: 0.8 },
  walletRow: { flexDirection: "row", backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  walletStat: { flex: 1, alignItems: "center", gap: 2 },
  walletVal: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  walletLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  section: { gap: 10 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  arcCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  arcHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  arcName: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary, flex: 1 },
  arcDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  arcGoal: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  arcProblem: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, fontStyle: "italic" },
  arcMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  skillRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  skillIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  skillNameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  skillName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary, flex: 1 },
  rankPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  rankText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.3 },
  trendPill: {},
  xpBar: { height: 4, backgroundColor: Colors.bgElevated, borderRadius: 2, overflow: "hidden", marginBottom: 4 },
  xpFill: { height: "100%", borderRadius: 2 },
  skillStat: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  chainCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  chainHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  chainName: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary, flex: 1 },
  chainStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chainStatusText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.3 },
  chainTheme: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, fontStyle: "italic" },
  chainProgress: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textPrimary },
  chainBar: { height: 6, backgroundColor: Colors.bgElevated, borderRadius: 3, overflow: "hidden" },
  chainFill: { height: "100%", backgroundColor: Colors.accent, borderRadius: 3 },
  chainId: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  chainMissionsTitle: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textSecondary },
  chainMissionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chainMissionTitle: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textPrimary, flex: 1 },
  chainMissionStatus: { fontFamily: "Inter_500Medium", fontSize: 11 },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badgeItem: { backgroundColor: Colors.bgCard, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 4, minWidth: 80, flex: 1 },
  badgeName: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textPrimary, textAlign: "center" },
  badgeRarity: { fontFamily: "Inter_400Regular", fontSize: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  titleRowActive: { borderColor: Colors.gold + "40", backgroundColor: Colors.goldDim },
  titleName: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textPrimary },
  activePill: { backgroundColor: Colors.goldDim, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: Colors.gold + "30" },
  activePillText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.gold, letterSpacing: 0.8 },
});

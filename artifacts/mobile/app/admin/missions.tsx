import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery } from "@tanstack/react-query";

const DIFF_COLORS: Record<string, string> = {
  gray: "#9E9E9E", green: Colors.green, blue: "#2196F3",
  purple: Colors.accent, gold: Colors.gold, red: Colors.crimson,
};

const RARITY_COLORS: Record<string, string> = {
  normal: Colors.textMuted, rare: Colors.gold, breakthrough: Colors.crimson,
};

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.amber, accepted: Colors.green, rejected: Colors.crimson,
  not_now: Colors.textMuted, completed: Colors.accent, expired: Colors.textMuted,
};

type Filter = "all" | "pending" | "accepted" | "rejected" | "expired";
type GenFilter = "all" | "ai" | "rule_based";

export default function AdminMissionsScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [statusFilter, setStatusFilter] = useState<Filter>("all");
  const [genFilter, setGenFilter] = useState<GenFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const params = new URLSearchParams({ limit: "50" });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (genFilter !== "all") params.set("generatedBy", genFilter);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "missions", statusFilter, genFilter],
    queryFn: () => request<any>(`/admin/missions/generated?${params.toString()}`),
  });

  const missions: any[] = data?.missions ?? [];

  const STATUS_TABS: Filter[] = ["all", "pending", "accepted", "rejected", "expired"];
  const GEN_TABS: GenFilter[] = ["all", "ai", "rule_based"];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Mission Inspection</Text>
        <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      {/* Status Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {STATUS_TABS.map(s => (
          <Pressable
            key={s}
            style={[styles.filterTab, statusFilter === s && styles.filterTabActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.filterTabText, statusFilter === s && { color: Colors.textPrimary }]}>
              {s === "rule_based" ? "Rule" : s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* GenBy Filter */}
      <View style={styles.genFilterRow}>
        {GEN_TABS.map(g => (
          <Pressable
            key={g}
            style={[styles.genTab, genFilter === g && styles.genTabActive]}
            onPress={() => setGenFilter(g)}
          >
            <Text style={[styles.genTabText, genFilter === g && { color: Colors.textPrimary }]}>
              {g === "rule_based" ? "Rule-based" : g === "ai" ? "AI" : "All sources"}
            </Text>
          </Pressable>
        ))}
        <Text style={styles.missionCount}>{missions.length} results</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : missions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="flash-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No missions match this filter</Text>
          </View>
        ) : (
          missions.map((m: any, i: number) => (
            <Animated.View key={m.id} entering={FadeInDown.delay(i * 15).springify()} style={styles.missionCard}>
              <Pressable onPress={() => setExpanded(expanded === m.id ? null : m.id)}>
                <View style={styles.missionHeader}>
                  <View style={styles.missionMeta}>
                    <View style={[styles.diffPill, { backgroundColor: (DIFF_COLORS[m.difficultyColor] ?? Colors.textMuted) + "20" }]}>
                      <Text style={[styles.diffText, { color: DIFF_COLORS[m.difficultyColor] ?? Colors.textMuted }]}>
                        {m.difficultyColor?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.rarityPill, { backgroundColor: (RARITY_COLORS[m.rarity] ?? Colors.textMuted) + "20" }]}>
                      <Text style={[styles.rarityText, { color: RARITY_COLORS[m.rarity] ?? Colors.textMuted }]}>
                        {m.rarity?.toUpperCase()}
                      </Text>
                    </View>
                    {m.chainId && (
                      <View style={styles.chainPill}>
                        <Ionicons name="link" size={11} color={Colors.accent} />
                        <Text style={styles.chainText}>chain</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: (STATUS_COLORS[m.status] ?? Colors.textMuted) + "20" }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[m.status] ?? Colors.textMuted }]}>
                      {m.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.missionTitle} numberOfLines={expanded === m.id ? 999 : 2}>{m.title}</Text>
                <Text style={styles.missionSkill}>
                  {m.relatedSkill} • {m.missionCategory?.replace(/_/g, " ")} • {m.estimatedDurationMinutes}min
                  {m.generatedBy === "ai" ? " • 🤖 AI" : " • 📋 Rule"}
                </Text>

                {expanded === m.id && (
                  <>
                    <Text style={styles.missionDesc}>{m.description}</Text>
                    <Text style={styles.missionReason} numberOfLines={3}>{m.reason}</Text>

                    <View style={styles.metaGrid}>
                      {m.adaptiveDifficultyScore != null && (
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Adaptive Score</Text>
                          <Text style={styles.metaVal}>{m.adaptiveDifficultyScore}</Text>
                        </View>
                      )}
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Reward Bonus</Text>
                        <Text style={styles.metaVal}>+{m.suggestedRewardBonus}</Text>
                      </View>
                      {m.chainStep != null && (
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Chain Step</Text>
                          <Text style={styles.metaVal}>#{m.chainStep}</Text>
                        </View>
                      )}
                      {m.expiryAt && (
                        <View style={styles.metaItem}>
                          <Text style={styles.metaLabel}>Expires</Text>
                          <Text style={styles.metaVal}>{new Date(m.expiryAt).toLocaleDateString()}</Text>
                        </View>
                      )}
                    </View>

                    {/* Acceptance event counts */}
                    {Object.keys(m.acceptanceCounts ?? {}).length > 0 && (
                      <View style={styles.acceptanceRow}>
                        {Object.entries(m.acceptanceCounts).map(([action, cnt]) => (
                          <View key={action} style={styles.acceptanceItem}>
                            <Text style={styles.acceptanceAction}>{action}</Text>
                            <Text style={styles.acceptanceCount}>{String(cnt)}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <Text style={styles.missionId}>ID: {m.id}</Text>
                    <Text style={styles.missionDate}>{new Date(m.createdAt).toLocaleString()}</Text>
                  </>
                )}

                <View style={styles.expandHint}>
                  <Ionicons name={expanded === m.id ? "chevron-up" : "chevron-down"} size={14} color={Colors.textMuted} />
                </View>
              </Pressable>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  filterBar: { maxHeight: 44 },
  filterContent: { paddingHorizontal: 20, gap: 8, alignItems: "center" },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  filterTabActive: { backgroundColor: Colors.accentGlow, borderColor: Colors.accentDim },
  filterTabText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },
  genFilterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginTop: 8, gap: 8, marginBottom: 4 },
  genTab: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  genTabActive: { backgroundColor: Colors.accentGlow, borderColor: Colors.accentDim },
  genTabText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textMuted },
  missionCount: { marginLeft: "auto", fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  scroll: { paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  emptyCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 40, alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  missionCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  missionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  missionMeta: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  diffPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  diffText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.5 },
  rarityPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  rarityText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.5 },
  chainPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.accentGlow, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  chainText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent, letterSpacing: 0.5 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.3 },
  missionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  missionSkill: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  missionDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textPrimary, lineHeight: 18, marginTop: 4 },
  missionReason: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 16, fontStyle: "italic" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  metaItem: { backgroundColor: Colors.bgElevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 2 },
  metaLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  metaVal: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textPrimary },
  acceptanceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  acceptanceItem: { backgroundColor: Colors.bgElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: "center", gap: 2 },
  acceptanceAction: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  acceptanceCount: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textPrimary },
  missionId: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  missionDate: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  expandHint: { alignItems: "center", marginTop: 4 },
});

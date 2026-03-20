import React from "react";
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

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => request<any>("/admin/dashboard"),
  });

  const { data: flagged, isLoading: flaggedLoading } = useQuery({
    queryKey: ["admin", "flagged"],
    queryFn: () => request<any[]>("/admin/reviews"),
  });

  const { data: auditLog, isLoading: auditLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => request<any[]>("/admin/audit-log?limit=15"),
  });

  const ACTION_COLORS: Record<string, string> = {
    reward_granted: Colors.green,
    proof_judged: Colors.cyan,
    admin_user_update: Colors.amber,
    admin_proof_review: Colors.accent,
    item_redeemed: Colors.gold,
    shop_item_created: Colors.accent,
    admin_mission_generate: Colors.cyan,
    admin_mission_expired: Colors.amber,
    admin_badge_granted: Colors.gold,
    admin_title_granted: Colors.gold,
    admin_chain_reset: Colors.crimson,
  };

  const NAV_ITEMS = [
    { label: "Rewards Audit", icon: "cash-outline" as const, route: "/admin/rewards", color: Colors.gold },
    { label: "Mission Inspection", icon: "flash-outline" as const, route: "/admin/missions", color: Colors.cyan },
    { label: "User Progression", icon: "person-outline" as const, route: "/admin/user-progression", color: Colors.accent },
    { label: "Override Actions", icon: "build-outline" as const, route: "/admin/overrides", color: Colors.crimson },
    { label: "Telemetry & Funnels", icon: "pulse-outline" as const, route: "/admin/telemetry", color: Colors.green },
    { label: "User Feedback", icon: "chatbubble-outline" as const, route: "/admin/feedback", color: Colors.amber },
    { label: "Feature Flags", icon: "toggle-outline" as const, route: "/admin/flags", color: Colors.accent },
  ];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={styles.adminBadge}>
          <Ionicons name="shield-checkmark" size={12} color={Colors.accent} />
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>

        {/* Dashboard Stats */}
        <Animated.View entering={FadeInDown.springify()}>
          <Text style={styles.sectionTitle}>System Health</Text>
          {dashLoading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : dashboard ? (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="people" size={20} color={Colors.accent} />
                  <Text style={styles.statValue}>{dashboard.users?.total ?? 0}</Text>
                  <Text style={styles.statLabel}>Users</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="flash" size={20} color={Colors.cyan} />
                  <Text style={styles.statValue}>{dashboard.aiMissions?.total ?? 0}</Text>
                  <Text style={styles.statLabel}>AI Missions</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="flag" size={20} color={Colors.crimson} />
                  <Text style={[styles.statValue, { color: (dashboard.proofs?.flagged ?? 0) > 0 ? Colors.crimson : Colors.textPrimary }]}>
                    {dashboard.proofs?.flagged ?? 0}
                  </Text>
                  <Text style={styles.statLabel}>Flagged</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="link" size={20} color={Colors.green} />
                  <Text style={styles.statValue}>{dashboard.chains?.active ?? 0}</Text>
                  <Text style={styles.statLabel}>Chains</Text>
                </View>
              </View>

              {/* Mission breakdown */}
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>AI Missions Breakdown</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Pending</Text>
                  <Text style={[styles.breakdownVal, { color: Colors.amber }]}>{dashboard.aiMissions?.pending ?? 0}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Accepted</Text>
                  <Text style={[styles.breakdownVal, { color: Colors.green }]}>{dashboard.aiMissions?.accepted ?? 0}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Rejected</Text>
                  <Text style={[styles.breakdownVal, { color: Colors.crimson }]}>{dashboard.aiMissions?.rejected ?? 0}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Expired</Text>
                  <Text style={[styles.breakdownVal, { color: Colors.textMuted }]}>{dashboard.aiMissions?.expired ?? 0}</Text>
                </View>
                <View style={[styles.breakdownRow, { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4, paddingTop: 8 }]}>
                  <Text style={styles.breakdownLabel}>AI Generated</Text>
                  <Text style={[styles.breakdownVal, { color: Colors.cyan }]}>{dashboard.aiMissions?.aiGenerated ?? 0}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Rule-Based</Text>
                  <Text style={[styles.breakdownVal, { color: Colors.textSecondary }]}>{dashboard.aiMissions?.ruleBased ?? 0}</Text>
                </View>
              </View>

              {/* Reward / Proof Summary */}
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>Economy & Proofs</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Total Reward Tx</Text>
                  <Text style={styles.breakdownVal}>{dashboard.rewards?.totalTransactions ?? 0}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tx Last 24h</Text>
                  <Text style={[styles.breakdownVal, { color: Colors.gold }]}>{dashboard.rewards?.last24hTransactions ?? 0}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Approved Proofs</Text>
                  <Text style={[styles.breakdownVal, { color: Colors.green }]}>{dashboard.proofs?.approved ?? 0}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Rejected Proofs</Text>
                  <Text style={[styles.breakdownVal, { color: Colors.crimson }]}>{dashboard.proofs?.rejected ?? 0}</Text>
                </View>
              </View>

              {/* Recent unlocks */}
              {((dashboard.recentUnlocks?.badges?.length ?? 0) + (dashboard.recentUnlocks?.titles?.length ?? 0)) > 0 && (
                <View style={styles.breakdownCard}>
                  <Text style={styles.breakdownTitle}>Recent Unlocks (7d)</Text>
                  {dashboard.recentUnlocks?.badges?.map((b: any) => (
                    <View key={`b-${b.badgeId}-${b.earnedAt}`} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}><Ionicons name="ribbon" size={12} /> Badge</Text>
                      <Text style={[styles.breakdownVal, { color: Colors.gold }]}>{b.badgeId}</Text>
                    </View>
                  ))}
                  {dashboard.recentUnlocks?.titles?.map((t: any) => (
                    <View key={`t-${t.titleId}-${t.earnedAt}`} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}><Ionicons name="star" size={12} /> Title</Text>
                      <Text style={[styles.breakdownVal, { color: Colors.accent }]}>{t.titleId}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : null}
        </Animated.View>

        {/* Navigation */}
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <Text style={styles.sectionTitle}>Inspection Tools</Text>
          <View style={styles.navGrid}>
            {NAV_ITEMS.map(item => (
              <Pressable
                key={item.route}
                style={({ pressed }) => [styles.navCard, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.navIcon, { backgroundColor: item.color + "18" }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={styles.navLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Flagged Proofs */}
        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <Text style={styles.sectionTitle}>Flagged Submissions</Text>
          {flaggedLoading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : !flagged?.length ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle" size={32} color={Colors.green} />
              <Text style={styles.emptyText}>No flagged submissions</Text>
            </View>
          ) : (
            flagged.map((p: any) => (
              <View key={p.id} style={styles.flagCard}>
                <View style={styles.flagHeader}>
                  <View style={styles.flagBadge}>
                    <Ionicons name="flag" size={14} color={Colors.crimson} />
                    <Text style={styles.flagBadgeText}>FLAGGED</Text>
                  </View>
                  <Text style={styles.flagDate}>{new Date(p.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.flagText} numberOfLines={3}>{p.textSummary ?? "No text summary"}</Text>
                {p.aiExplanation && <Text style={styles.flagAI} numberOfLines={2}>{p.aiExplanation}</Text>}
              </View>
            ))
          )}
        </Animated.View>

        {/* Audit Log */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.sectionTitle}>Audit Log</Text>
          {auditLoading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : (
            <View style={styles.auditList}>
              {auditLog?.map((entry: any) => (
                <View key={entry.id} style={styles.auditRow}>
                  <View style={[styles.auditDot, { backgroundColor: ACTION_COLORS[entry.action] ?? Colors.textMuted }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.auditAction}>{entry.action.replace(/_/g, " ").toUpperCase()}</Text>
                    <Text style={styles.auditDate}>{new Date(entry.createdAt).toLocaleString()}</Text>
                  </View>
                  <Text style={styles.auditRole}>{entry.actorRole}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  adminBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.accentGlow, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.accentDim,
  },
  adminBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent, letterSpacing: 1 },
  scroll: { paddingHorizontal: 20, gap: 24 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary, marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.textPrimary },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  breakdownCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 6, marginBottom: 10 },
  breakdownTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary, marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  breakdownLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  breakdownVal: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  navGrid: { gap: 10 },
  navCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  navIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  navLabel: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textPrimary },
  emptyCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 24, alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  flagCard: { backgroundColor: Colors.crimsonDim, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.crimson + "30", marginBottom: 10, gap: 10 },
  flagHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  flagBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  flagBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.crimson, letterSpacing: 1 },
  flagDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  flagText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  flagAI: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 16, fontStyle: "italic" },
  auditList: { backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  auditRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  auditDot: { width: 8, height: 8, borderRadius: 4 },
  auditAction: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textPrimary, letterSpacing: 0.5 },
  auditDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  auditRole: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textMuted },
});

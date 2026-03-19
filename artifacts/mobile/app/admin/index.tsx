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

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => request<any[]>("/admin/users"),
  });

  const { data: flagged, isLoading: flaggedLoading } = useQuery({
    queryKey: ["admin", "flagged"],
    queryFn: () => request<any[]>("/admin/reviews"),
  });

  const { data: auditLog, isLoading: auditLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: () => request<any[]>("/admin/audit-log?limit=20"),
  });

  const ACTION_COLORS: Record<string, string> = {
    reward_granted: Colors.green,
    proof_judged: Colors.cyan,
    admin_user_update: Colors.amber,
    admin_proof_review: Colors.accent,
    item_redeemed: Colors.gold,
    shop_item_created: Colors.accent,
  };

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
        {/* Stats */}
        <Animated.View entering={FadeInDown.springify()} style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color={Colors.accent} />
            <Text style={styles.statValue}>{users?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flag" size={24} color={Colors.crimson} />
            <Text style={[styles.statValue, { color: flagged?.length ? Colors.crimson : Colors.textPrimary }]}>
              {flagged?.length ?? 0}
            </Text>
            <Text style={styles.statLabel}>Flagged Proofs</Text>
          </View>
        </Animated.View>

        {/* Flagged Proofs */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
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

        {/* Users */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Text style={styles.sectionTitle}>Users</Text>
          {usersLoading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : (
            users?.slice(0, 10).map((u: any) => (
              <View key={u.id} style={styles.userRow}>
                <View style={styles.userAvatar}>
                  <Text style={styles.avatarText}>{u.username?.[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.username}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{u.email}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <View style={styles.trustBadge}>
                    <Text style={[styles.trustText, { color: u.trustScore > 0.8 ? Colors.green : u.trustScore > 0.5 ? Colors.amber : Colors.crimson }]}>
                      {(u.trustScore * 100).toFixed(0)}%
                    </Text>
                  </View>
                  {u.role === "admin" && (
                    <View style={styles.adminPill}>
                      <Text style={styles.adminPillText}>ADMIN</Text>
                    </View>
                  )}
                </View>
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
  statsGrid: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16, alignItems: "center", gap: 8, borderWidth: 1, borderColor: Colors.border },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.textPrimary },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary, marginBottom: 12 },
  emptyCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 24, alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  flagCard: {
    backgroundColor: Colors.crimsonDim, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.crimson + "30", marginBottom: 10, gap: 10,
  },
  flagHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  flagBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  flagBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.crimson, letterSpacing: 1 },
  flagDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  flagText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textPrimary, lineHeight: 18 },
  flagAI: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 16, fontStyle: "italic" },
  userRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  userAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.accent },
  userName: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  userEmail: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  trustBadge: { backgroundColor: Colors.bgElevated, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  trustText: { fontFamily: "Inter_700Bold", fontSize: 12 },
  adminPill: { backgroundColor: Colors.accentGlow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  adminPillText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent, letterSpacing: 0.8 },
  auditList: { backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  auditRow: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  auditDot: { width: 8, height: 8, borderRadius: 4 },
  auditAction: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textPrimary, letterSpacing: 0.5 },
  auditDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  auditRole: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textMuted },
});

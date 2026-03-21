import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  ActivityIndicator, Alert, RefreshControl, TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const PREMIUM_COLOR = "#F5C842";
const PREMIUM_DIM = "#F5C84220";
const PREMIUM_BORDER = "#F5C84240";

type Tab = "overview" | "packs" | "items" | "users" | "purchases";

export default function AdminOffersScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantDays, setGrantDays] = useState("365");

  const { data: overview, isLoading: overviewLoading, refetch: refetchOverview } = useQuery({
    queryKey: ["admin", "premium", "overview"],
    queryFn: () => request<any>("/admin/premium/overview"),
    enabled: activeTab === "overview",
  });

  const { data: packsData, isLoading: packsLoading } = useQuery({
    queryKey: ["admin", "premium", "packs"],
    queryFn: () => request<any>("/admin/premium/packs"),
    enabled: activeTab === "packs",
  });

  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ["admin", "premium", "items"],
    queryFn: () => request<any>("/admin/premium/items"),
    enabled: activeTab === "items",
  });

  const { data: premiumUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["admin", "premium", "users"],
    queryFn: () => request<any>("/admin/premium/users"),
    enabled: activeTab === "users",
  });

  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: ["admin", "premium", "purchases"],
    queryFn: () => request<any>("/admin/premium/purchases"),
    enabled: activeTab === "purchases",
  });

  const grantMutation = useMutation({
    mutationFn: ({ userId, durationDays }: { userId: string; durationDays: number }) =>
      request<any>("/admin/premium/grant", { method: "POST", body: JSON.stringify({ userId, durationDays, reason: "admin_grant" }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "premium"] });
      setGrantUserId("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Premium granted successfully.");
    },
    onError: (err: any) => Alert.alert("Error", err?.message ?? "Failed to grant premium."),
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) =>
      request<any>("/admin/premium/revoke", { method: "POST", body: JSON.stringify({ userId, reason: "admin_revoke" }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "premium"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    onError: (err: any) => Alert.alert("Error", err?.message ?? "Failed to revoke premium."),
  });

  const packToggleMutation = useMutation({
    mutationFn: ({ packId, isActive }: { packId: string; isActive: boolean }) =>
      request<any>(`/admin/premium/packs/${packId}`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "premium", "packs"] });
      Haptics.selectionAsync();
    },
  });

  const itemToggleMutation = useMutation({
    mutationFn: ({ itemId, isPremiumOnly }: { itemId: string; isPremiumOnly: boolean }) =>
      request<any>(`/admin/premium/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ isPremiumOnly }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "premium", "items"] }),
  });

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "analytics-outline" },
    { key: "packs", label: "Packs", icon: "cube-outline" },
    { key: "items", label: "Items", icon: "pricetag-outline" },
    { key: "users", label: "Users", icon: "person-outline" },
    { key: "purchases", label: "Purchases", icon: "receipt-outline" },
  ];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Offer Controls</Text>
        <View style={styles.adminBadge}>
          <Ionicons name="shield-checkmark" size={11} color={Colors.accent} />
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => { setActiveTab(tab.key); Haptics.selectionAsync(); }}
          >
            <Ionicons name={tab.icon as any} size={14} color={activeTab === tab.key ? Colors.accent : Colors.textMuted} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 50 }]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => refetchOverview()} tintColor={Colors.accent} />}
      >
        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          overviewLoading ? <ActivityIndicator color={PREMIUM_COLOR} style={{ marginTop: 40 }} /> :
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 16 }}>
            <View style={styles.statsGrid}>
              {[
                { label: "Premium Users", value: overview?.stats?.premiumUsers ?? 0, icon: "star", color: PREMIUM_COLOR },
                { label: "Total Purchases", value: overview?.stats?.totalPurchases ?? 0, icon: "receipt-outline", color: Colors.green },
                { label: "Pack Grants", value: overview?.stats?.totalPackGrants ?? 0, icon: "cube-outline", color: Colors.cyan },
                { label: "Premium Items", value: overview?.stats?.premiumOnlyItems ?? 0, icon: "pricetag-outline", color: Colors.accent },
              ].map((s, i) => (
                <View key={i} style={styles.statCard}>
                  <Ionicons name={s.icon as any} size={18} color={s.color} />
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Grant Premium Access</Text>
            <View style={styles.grantCard}>
              <Text style={styles.inputLabel}>User ID</Text>
              <TextInput
                style={styles.input}
                value={grantUserId}
                onChangeText={setGrantUserId}
                placeholder="User ID..."
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={styles.inputLabel}>Duration (days)</Text>
              <TextInput
                style={styles.input}
                value={grantDays}
                onChangeText={setGrantDays}
                keyboardType="numeric"
                placeholder="365"
                placeholderTextColor={Colors.textMuted}
              />
              <Pressable
                style={[styles.grantBtn, (!grantUserId.trim() || grantMutation.isPending) && { opacity: 0.5 }]}
                onPress={() => {
                  if (!grantUserId.trim()) return;
                  Alert.alert("Grant Premium", `Grant ${grantDays} days of premium to user ${grantUserId}?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Grant", style: "default", onPress: () => grantMutation.mutate({ userId: grantUserId.trim(), durationDays: Number(grantDays) || 365 }) },
                  ]);
                }}
                disabled={!grantUserId.trim() || grantMutation.isPending}
              >
                {grantMutation.isPending ? <ActivityIndicator color={Colors.bg} size="small" /> : (
                  <Text style={styles.grantBtnText}>Grant Premium</Text>
                )}
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Recent Purchases</Text>
            {(overview?.recentPurchases ?? []).map((p: any, i: number) => (
              <View key={i} style={styles.purchaseRow}>
                <Ionicons name="receipt-outline" size={14} color={Colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.purchaseProduct}>{p.productId}</Text>
                  <Text style={styles.purchaseMeta}>{p.userId} · {p.provider} · {p.status}</Text>
                </View>
                <Text style={styles.purchaseAmount}>${((p.amountCents ?? 0) / 100).toFixed(2)}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── PACKS ── */}
        {activeTab === "packs" && (
          packsLoading ? <ActivityIndicator color={PREMIUM_COLOR} style={{ marginTop: 40 }} /> :
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 12 }}>
            {(packsData?.packs ?? []).map((p: any, i: number) => (
              <View key={p.id} style={styles.packRow}>
                <Ionicons name={p.icon as any} size={18} color={p.isActive ? PREMIUM_COLOR : Colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.packName}>{p.name}</Text>
                  <Text style={styles.packMeta}>
                    {p.category} · {p.grantCount ?? 0} grants · {p.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
                <Pressable
                  style={[styles.toggleBtn, p.isActive ? styles.toggleBtnActive : styles.toggleBtnInactive]}
                  onPress={() => packToggleMutation.mutate({ packId: p.id, isActive: !p.isActive })}
                >
                  <Text style={styles.toggleBtnText}>{p.isActive ? "Deactivate" : "Activate"}</Text>
                </Pressable>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── ITEMS ── */}
        {activeTab === "items" && (
          itemsLoading ? <ActivityIndicator color={PREMIUM_COLOR} style={{ marginTop: 40 }} /> :
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 10 }}>
            <Text style={styles.hintText}>Toggle items to premium-only — premium users only can purchase them.</Text>
            {(itemsData?.items ?? []).map((item: any) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.isPremiumOnly && (
                      <View style={styles.premiumOnlyChip}>
                        <Ionicons name="star" size={9} color={PREMIUM_COLOR} />
                        <Text style={styles.premiumOnlyText}>PREMIUM</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.itemMeta}>{item.category} · {item.rarity} · {item.cost}c</Text>
                </View>
                <Pressable
                  style={[styles.toggleBtn, item.isPremiumOnly ? styles.toggleBtnPremium : styles.toggleBtnNeutral]}
                  onPress={() => itemToggleMutation.mutate({ itemId: item.id, isPremiumOnly: !item.isPremiumOnly })}
                >
                  <Text style={styles.toggleBtnText}>{item.isPremiumOnly ? "Remove Lock" : "Lock Premium"}</Text>
                </Pressable>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── USERS ── */}
        {activeTab === "users" && (
          usersLoading ? <ActivityIndicator color={PREMIUM_COLOR} style={{ marginTop: 40 }} /> :
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 10 }}>
            {(premiumUsers?.users ?? []).length === 0 && (
              <Text style={styles.emptyText}>No premium users yet.</Text>
            )}
            {(premiumUsers?.users ?? []).map((u: any) => (
              <View key={u.id} style={styles.userRow}>
                <Ionicons name="person-circle-outline" size={20} color={PREMIUM_COLOR} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.username}</Text>
                  <Text style={styles.userMeta}>
                    Expires: {u.premiumExpiresAt ? new Date(u.premiumExpiresAt).toLocaleDateString() : "Never"}
                  </Text>
                </View>
                <Pressable
                  style={styles.revokeBtn}
                  onPress={() => {
                    Alert.alert("Revoke Premium", `Remove premium from ${u.username}?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Revoke", style: "destructive", onPress: () => revokeMutation.mutate(u.id) },
                    ]);
                  }}
                >
                  <Text style={styles.revokeBtnText}>Revoke</Text>
                </Pressable>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── PURCHASES ── */}
        {activeTab === "purchases" && (
          purchasesLoading ? <ActivityIndicator color={PREMIUM_COLOR} style={{ marginTop: 40 }} /> :
          <Animated.View entering={FadeInDown.springify()} style={{ gap: 10 }}>
            {(purchasesData?.purchases ?? []).length === 0 && (
              <Text style={styles.emptyText}>No purchase records yet.</Text>
            )}
            {(purchasesData?.purchases ?? []).map((p: any) => (
              <View key={p.id} style={styles.purchaseRow}>
                <Ionicons name="receipt-outline" size={14} color={Colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.purchaseProduct}>{p.productId}</Text>
                  <Text style={styles.purchaseMeta}>{p.userId?.slice(0, 16)}… · {p.provider} · {new Date(p.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.purchaseRight}>
                  <Text style={styles.purchaseAmount}>${((p.amountCents ?? 0) / 100).toFixed(2)}</Text>
                  <View style={[styles.statusChip, { backgroundColor: p.status === "completed" ? Colors.greenDim : Colors.amberDim }]}>
                    <Text style={[styles.statusText, { color: p.status === "completed" ? Colors.green : Colors.amber }]}>{p.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </Animated.View>
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
  adminBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 8, backgroundColor: Colors.accentGlow, borderWidth: 1, borderColor: Colors.accentDim,
  },
  adminBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.accent },
  tabBar: { borderBottomWidth: 1, borderBottomColor: Colors.border, maxHeight: 44 },
  tabBarContent: { paddingHorizontal: 16, gap: 4 },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12,
    paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Colors.accent },
  tabText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  tabTextActive: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 20, gap: 16 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flex: 1, minWidth: 130, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: 14, alignItems: "center", gap: 6,
  },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center" },

  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, letterSpacing: 0.8, textTransform: "uppercase" },

  grantCard: {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 16, gap: 8,
  },
  inputLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: Colors.textPrimary,
    fontFamily: "Inter_400Regular", fontSize: 13,
  },
  grantBtn: {
    backgroundColor: PREMIUM_COLOR, borderRadius: 8, paddingVertical: 12,
    alignItems: "center", marginTop: 4,
  },
  grantBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.bg },

  purchaseRow: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12,
  },
  purchaseProduct: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textPrimary },
  purchaseMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  purchaseRight: { alignItems: "flex-end", gap: 4 },
  purchaseAmount: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.green },
  statusChip: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  packRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 14,
  },
  packName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  packMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },

  itemRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12,
  },
  itemTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  itemName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  itemMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  premiumOnlyChip: {
    flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: PREMIUM_DIM,
    borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2,
  },
  premiumOnlyText: { fontSize: 9, fontFamily: "Inter_700Bold", color: PREMIUM_COLOR },

  toggleBtn: { borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6, flexShrink: 0 },
  toggleBtnActive: { backgroundColor: Colors.crimsonDim },
  toggleBtnInactive: { backgroundColor: Colors.greenDim },
  toggleBtnPremium: { backgroundColor: Colors.amberDim },
  toggleBtnNeutral: { backgroundColor: PREMIUM_DIM },
  toggleBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },

  userRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: PREMIUM_BORDER, borderRadius: 10, padding: 12,
  },
  userName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  userMeta: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginTop: 2 },
  revokeBtn: { backgroundColor: Colors.crimsonDim, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6 },
  revokeBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.crimson },

  hintText: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textSecondary, lineHeight: 18 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textMuted, textAlign: "center", marginTop: 40 },
});

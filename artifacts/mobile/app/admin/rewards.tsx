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

const TX_TYPE_COLOR: Record<string, string> = {
  earned: Colors.green,
  bonus: Colors.gold,
  admin_grant: Colors.accent,
  spent: Colors.amber,
  penalty: Colors.crimson,
  admin_revoke: Colors.crimson,
};

const TX_ICON: Record<string, any> = {
  earned: "arrow-up-circle",
  bonus: "star",
  admin_grant: "shield-checkmark",
  spent: "arrow-down-circle",
  penalty: "warning",
  admin_revoke: "close-circle",
};

export default function AdminRewardsScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [filterUser, setFilterUser] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const url = selectedUser
    ? `/admin/rewards/user/${selectedUser}`
    : `/admin/rewards?limit=50${filterUser ? `&userId=${encodeURIComponent(filterUser)}` : ""}`;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "rewards", selectedUser, filterUser],
    queryFn: () => request<any>(url),
  });

  const transactions = selectedUser ? data?.recentTransactions : data?.transactions;
  const wallet = selectedUser ? data?.wallet : null;
  const summary = selectedUser ? data?.summary : null;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Rewards Audit</Text>
        <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <TextInput
          style={styles.input}
          placeholder="User ID to inspect wallet..."
          placeholderTextColor={Colors.textMuted}
          value={filterUser}
          onChangeText={setFilterUser}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={() => setSelectedUser(filterUser || null)}
        />
        <Pressable
          style={styles.filterBtn}
          onPress={() => setSelectedUser(filterUser || null)}
        >
          <Text style={styles.filterBtnText}>{selectedUser ? "Wallet" : "Filter"}</Text>
        </Pressable>
        {selectedUser && (
          <Pressable style={styles.clearBtn} onPress={() => { setSelectedUser(null); setFilterUser(""); }}>
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Wallet summary for specific user */}
            {wallet && (
              <Animated.View entering={FadeInDown.springify()} style={styles.walletCard}>
                <View style={styles.walletHeader}>
                  <Text style={styles.walletName}>{wallet.username}</Text>
                  <View style={styles.walletBadge}>
                    <Text style={styles.walletBadgeText}>Lv {wallet.level}</Text>
                  </View>
                </View>
                <View style={styles.walletStats}>
                  <View style={styles.walletStat}>
                    <Text style={[styles.walletStatVal, { color: Colors.gold }]}>{wallet.coinBalance}</Text>
                    <Text style={styles.walletStatLabel}>Coins</Text>
                  </View>
                  <View style={styles.walletStat}>
                    <Text style={[styles.walletStatVal, { color: Colors.accent }]}>{wallet.xp}</Text>
                    <Text style={styles.walletStatLabel}>XP</Text>
                  </View>
                  <View style={styles.walletStat}>
                    <Text style={[styles.walletStatVal, { color: Colors.green }]}>{wallet.currentStreak}d</Text>
                    <Text style={styles.walletStatLabel}>Streak</Text>
                  </View>
                  <View style={styles.walletStat}>
                    <Text style={[styles.walletStatVal, { color: wallet.trustScore > 0.7 ? Colors.green : Colors.amber }]}>
                      {(wallet.trustScore * 100).toFixed(0)}%
                    </Text>
                    <Text style={styles.walletStatLabel}>Trust</Text>
                  </View>
                </View>
                {summary && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryItem}>+{summary.totalEarned} earned</Text>
                    <Text style={styles.summaryItem}>-{summary.totalSpent} spent</Text>
                    <Text style={[styles.summaryItem, { color: Colors.crimson }]}>-{summary.totalPenalties} penalties</Text>
                  </View>
                )}
              </Animated.View>
            )}

            {/* Transaction list */}
            {(transactions ?? []).length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No transactions found</Text>
              </View>
            ) : (
              (transactions ?? []).map((tx: any, i: number) => (
                <Animated.View key={tx.id} entering={FadeInDown.delay(i * 20).springify()} style={styles.txCard}>
                  <View style={styles.txHeader}>
                    <View style={[styles.txIcon, { backgroundColor: (TX_TYPE_COLOR[tx.type] ?? Colors.textMuted) + "18" }]}>
                      <Ionicons name={TX_ICON[tx.type] ?? "swap-horizontal"} size={18} color={TX_TYPE_COLOR[tx.type] ?? Colors.textMuted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.txType, { color: TX_TYPE_COLOR[tx.type] ?? Colors.textPrimary }]}>
                        {tx.type.replace(/_/g, " ").toUpperCase()}
                      </Text>
                      <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleString()}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 2 }}>
                      <Text style={[styles.txAmount, { color: tx.amount >= 0 ? Colors.green : Colors.crimson }]}>
                        {tx.amount >= 0 ? "+" : ""}{tx.amount} coins
                      </Text>
                      {tx.xpAmount !== 0 && (
                        <Text style={[styles.txXp, { color: tx.xpAmount >= 0 ? Colors.accent : Colors.crimson }]}>
                          {tx.xpAmount >= 0 ? "+" : ""}{tx.xpAmount} XP
                        </Text>
                      )}
                    </View>
                  </View>

                  <Text style={styles.txReason} numberOfLines={2}>{tx.reason}</Text>

                  <View style={styles.txMeta}>
                    {tx.balanceAfter != null && (
                      <Text style={styles.txMetaText}>Balance after: {tx.balanceAfter}</Text>
                    )}
                    {tx.missionContext && (
                      <View style={styles.txMissionCtx}>
                        <Text style={styles.txMetaText}>
                          {tx.missionContext.title} •{" "}
                          <Text style={{ color: rarityColor(tx.missionContext.rarity) }}>{tx.missionContext.rarity}</Text>
                          {" • "}{tx.missionContext.difficultyColor}
                          {tx.missionContext.chainId ? " • chain" : ""}
                        </Text>
                      </View>
                    )}
                  </View>
                </Animated.View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function rarityColor(r: string) {
  if (r === "breakthrough") return Colors.crimson;
  if (r === "rare") return Colors.gold;
  return Colors.textMuted;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  input: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: 10, paddingHorizontal: 12,
    paddingVertical: 8, color: Colors.textPrimary, fontFamily: "Inter_400Regular", fontSize: 13,
    borderWidth: 1, borderColor: Colors.border,
  },
  filterBtn: { backgroundColor: Colors.accent, borderRadius: 10, paddingHorizontal: 14, justifyContent: "center" },
  filterBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#fff" },
  clearBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  scroll: { paddingHorizontal: 20, gap: 10 },
  walletCard: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12, marginBottom: 4 },
  walletHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  walletName: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  walletBadge: { backgroundColor: Colors.accentGlow, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  walletBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.accent },
  walletStats: { flexDirection: "row", gap: 12 },
  walletStat: { flex: 1, alignItems: "center", gap: 2 },
  walletStatVal: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  walletStatLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary },
  summaryRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  summaryItem: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  emptyCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 40, alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  txCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  txHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txType: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5 },
  txDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  txAmount: { fontFamily: "Inter_700Bold", fontSize: 15 },
  txXp: { fontFamily: "Inter_500Medium", fontSize: 12 },
  txReason: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  txMeta: { gap: 4 },
  txMetaText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  txMissionCtx: {},
});

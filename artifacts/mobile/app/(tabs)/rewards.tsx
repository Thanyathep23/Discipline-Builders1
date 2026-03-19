import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  ActivityIndicator, Alert, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useRewardBalance, useRewardHistory, useShopItems, useRedeemItem } from "@/hooks/useApi";

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"overview" | "history" | "shop">("overview");
  const { data: balance, isLoading } = useRewardBalance();
  const { data: history } = useRewardHistory();
  const { data: shopItems } = useShopItems();
  const redeemItem = useRedeemItem();
  const [confirmItem, setConfirmItem] = useState<any>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 84);

  const xpPercent = balance ? Math.min(100, Math.round((balance.xp / balance.xpToNextLevel) * 100)) : 0;

  async function handleRedeem(item: any) {
    setConfirmItem(null);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await redeemItem.mutateAsync(item.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Cannot redeem", err.message);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Rewards</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(["overview", "history", "shop"] as const).map(t => (
          <Pressable key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => { setTab(t); Haptics.selectionAsync(); }}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}>
          {tab === "overview" && (
            <>
              {/* Balance Card */}
              <Animated.View entering={FadeInDown.springify()} style={styles.balanceCard}>
                <View style={styles.balanceRow}>
                  <View>
                    <Text style={styles.balanceLabel}>COIN BALANCE</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="flash" size={28} color={Colors.gold} />
                      <Text style={styles.balanceValue}>{balance?.coinBalance ?? 0}</Text>
                    </View>
                  </View>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelLabel}>LVL</Text>
                    <Text style={styles.levelValue}>{balance?.level ?? 1}</Text>
                  </View>
                </View>
                {/* XP Bar */}
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.xpLabel}>XP Progress</Text>
                    <Text style={styles.xpLabel}>{balance?.xp} / {balance?.xpToNextLevel}</Text>
                  </View>
                  <View style={styles.xpBar}>
                    <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
                  </View>
                </View>
              </Animated.View>

              {/* Stats */}
              <View style={styles.statsRow}>
                {[
                  { label: "Streak", value: `${balance?.currentStreak ?? 0}d`, icon: "flame", color: Colors.amber },
                  { label: "Best Streak", value: `${balance?.longestStreak ?? 0}d`, icon: "trophy", color: Colors.gold },
                  { label: "Missions", value: balance?.totalMissionsCompleted ?? 0, icon: "checkmark-circle", color: Colors.green },
                  { label: "Total Earned", value: balance?.totalCoinsEarned ?? 0, icon: "flash", color: Colors.accent },
                ].map((s, i) => (
                  <Animated.View key={s.label} entering={FadeInDown.delay(i * 60).springify()} style={styles.statCard}>
                    <Ionicons name={s.icon as any} size={20} color={s.color} />
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </Animated.View>
                ))}
              </View>
            </>
          )}

          {tab === "history" && (
            !history?.length ? (
              <View style={styles.emptyBox}>
                <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No transactions yet</Text>
                <Text style={styles.emptyText}>Complete missions to earn coins.</Text>
              </View>
            ) : (
              history?.map((t: any, i: number) => (
                <Animated.View key={t.id} entering={FadeInDown.delay(i * 40).springify()} style={styles.txCard}>
                  <View style={[styles.txIcon, { backgroundColor: t.amount > 0 ? Colors.greenDim : Colors.crimsonDim }]}>
                    <Ionicons
                      name={t.amount > 0 ? "arrow-down" : "arrow-up"}
                      size={18}
                      color={t.amount > 0 ? Colors.green : Colors.crimson}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txReason} numberOfLines={1}>{t.reason}</Text>
                    <Text style={styles.txDate}>{new Date(t.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <Text style={[styles.txAmount, { color: t.amount > 0 ? Colors.green : Colors.crimson }]}>
                    {t.amount > 0 ? "+" : ""}{t.amount}
                  </Text>
                </Animated.View>
              ))
            )
          )}

          {tab === "shop" && (
            !shopItems?.length ? (
              <View style={styles.emptyBox}>
                <Ionicons name="storefront-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Shop is empty</Text>
                <Text style={styles.emptyText}>Admin will add items soon.</Text>
              </View>
            ) : (
              shopItems?.map((item: any, i: number) => (
                <Animated.View key={item.id} entering={FadeInDown.delay(i * 60).springify()}>
                  <Pressable
                    style={({ pressed }) => [styles.shopCard, pressed && { opacity: 0.9 }]}
                    onPress={() => setConfirmItem(item)}
                  >
                    <View style={styles.shopIcon}>
                      <Ionicons name={item.icon as any ?? "gift"} size={24} color={Colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shopName}>{item.name}</Text>
                      <Text style={styles.shopDesc} numberOfLines={1}>{item.description}</Text>
                    </View>
                    <View style={styles.shopCost}>
                      <Ionicons name="flash" size={14} color={Colors.gold} />
                      <Text style={styles.shopCostText}>{item.cost}</Text>
                    </View>
                  </Pressable>
                </Animated.View>
              ))
            )
          )}
        </ScrollView>
      )}

      {/* Confirm Redeem Modal */}
      <Modal visible={!!confirmItem} transparent animationType="fade" onRequestClose={() => setConfirmItem(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmItem(null)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Redeem Item</Text>
            <Text style={styles.modalBody}>Use <Text style={{ color: Colors.gold, fontFamily: "Inter_700Bold" }}>{confirmItem?.cost}</Text> coins to redeem "{confirmItem?.name}"?</Text>
            <Text style={styles.modalBalance}>Your balance: {balance?.coinBalance ?? 0} coins</Text>
            {(balance?.coinBalance ?? 0) < (confirmItem?.cost ?? 0) && (
              <Text style={styles.modalError}>Insufficient coins</Text>
            )}
            <View style={styles.modalBtns}>
              <Pressable style={styles.modalCancel} onPress={() => setConfirmItem(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirm, (balance?.coinBalance ?? 0) < (confirmItem?.cost ?? 0) && { opacity: 0.5 }]}
                onPress={() => handleRedeem(confirmItem)}
                disabled={(balance?.coinBalance ?? 0) < (confirmItem?.cost ?? 0) || redeemItem.isPending}
              >
                <Text style={styles.modalConfirmText}>Redeem</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.textPrimary, letterSpacing: -0.5 },
  tabRow: { flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  tabTextActive: { color: "#fff" },
  scroll: { paddingHorizontal: 20, gap: 12 },
  balanceCard: {
    backgroundColor: Colors.bgElevated, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: Colors.accentDim, gap: 20,
  },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  balanceLabel: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 6 },
  balanceValue: { fontFamily: "Inter_700Bold", fontSize: 40, color: Colors.gold, letterSpacing: -1 },
  levelBadge: {
    width: 60, height: 60, borderRadius: 16, backgroundColor: Colors.accent + "20",
    borderWidth: 2, borderColor: Colors.accent, alignItems: "center", justifyContent: "center",
  },
  levelLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent, letterSpacing: 1 },
  levelValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.accent },
  xpLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  xpBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  xpFill: { height: "100%", backgroundColor: Colors.accent, borderRadius: 3 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, textAlign: "center" },
  txCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.border },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txReason: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textPrimary },
  txDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  txAmount: { fontFamily: "Inter_700Bold", fontSize: 15 },
  shopCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  shopIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  shopName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textPrimary },
  shopDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  shopCost: { flexDirection: "row", alignItems: "center", gap: 4 },
  shopCostText: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.gold },
  emptyBox: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.textSecondary },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalBox: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 24, width: "100%", gap: 16, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  modalBody: { fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textSecondary },
  modalBalance: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  modalError: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.crimson },
  modalBtns: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  modalCancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  modalConfirm: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: Colors.accent },
  modalConfirmText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
});

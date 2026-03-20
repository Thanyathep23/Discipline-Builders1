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
import {
  useRewardBalance, useRewardHistory, useShopItems, useRedeemItem,
  useInventoryBadges, useInventoryTitles, useActivateTitle,
} from "@/hooks/useApi";

const RARITY_COLORS: Record<string, string> = {
  common:   "#9E9E9E",
  uncommon: "#4CAF50",
  rare:     "#2196F3",
  epic:     "#9C27B0",
  legendary:"#F5C842",
};

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"overview" | "history" | "shop" | "inventory">("overview");
  const { data: balance, isLoading } = useRewardBalance();
  const { data: history } = useRewardHistory();
  const { data: shopItems } = useShopItems();
  const redeemItem = useRedeemItem();
  const [confirmItem, setConfirmItem] = useState<any>(null);

  const { data: badgesData } = useInventoryBadges();
  const { data: titlesData } = useInventoryTitles();
  const activateTitle = useActivateTitle();

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

  async function handleActivateTitle(titleId: string) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await activateTitle.mutateAsync(titleId);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }

  const badges = badgesData?.badges ?? [];
  const titles = titlesData?.titles ?? [];
  const earnedBadges = badges.filter((b: any) => b.earned);
  const lockedBadges = badges.filter((b: any) => !b.earned);
  const earnedTitles = titles.filter((t: any) => t.earned);
  const activeTitle = titles.find((t: any) => t.isActive);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Rewards</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {(["overview", "inventory", "shop", "history"] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => { setTab(t); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
      >
        {tab === "overview" && (
          <>
            {isLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 60 }} />
            ) : (
              <>
                <Animated.View entering={FadeInDown.springify()} style={styles.balanceCard}>
                  <View style={styles.balanceRow}>
                    <Ionicons name="flash" size={28} color={Colors.gold} />
                    <View>
                      <Text style={styles.balanceLabel}>Coin Balance</Text>
                      <Text style={styles.balanceAmount}>{balance?.coinBalance?.toLocaleString() ?? "0"}</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.xpRow}>
                    <Text style={styles.xpLabel}>Level {balance?.level ?? 1}</Text>
                    <Text style={styles.xpPct}>{xpPercent}%</Text>
                  </View>
                  <View style={styles.xpBarBg}>
                    <View style={[styles.xpBarFill, { width: `${xpPercent}%` }]} />
                  </View>
                  <Text style={styles.xpSub}>{balance?.xp ?? 0} / {balance?.xpToNextLevel ?? 100} XP</Text>
                </Animated.View>

                <View style={styles.statsGrid}>
                  {[
                    { label: "Current Streak", value: `${balance?.currentStreak ?? 0}d`, icon: "flame", color: Colors.crimson },
                    { label: "Best Streak",    value: `${balance?.longestStreak ?? 0}d`, icon: "trophy", color: Colors.gold },
                  ].map((item, i) => (
                    <Animated.View key={i} entering={FadeInDown.delay(i * 80).springify()} style={styles.statCard}>
                      <Ionicons name={item.icon as any} size={22} color={item.color} />
                      <Text style={styles.statValue}>{item.value}</Text>
                      <Text style={styles.statLabel}>{item.label}</Text>
                    </Animated.View>
                  ))}
                </View>

                {activeTitle && (
                  <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.activeTitleCard}>
                    <Ionicons name="ribbon" size={18} color={Colors.gold} />
                    <View>
                      <Text style={styles.activeTitleLabel}>Active Title</Text>
                      <Text style={styles.activeTitleValue}>{activeTitle.name}</Text>
                    </View>
                  </Animated.View>
                )}

                {earnedBadges.length > 0 && (
                  <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.recentBadgesCard}>
                    <Text style={styles.sectionLabel}>Recent Badges</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        {earnedBadges.slice(0, 5).map((b: any) => (
                          <View key={b.id} style={styles.badgeMini}>
                            <View style={[styles.badgeMiniIcon, { backgroundColor: (RARITY_COLORS[b.rarity] ?? "#9E9E9E") + "18" }]}>
                              <Ionicons name={(b.icon ?? "ribbon") as any} size={20} color={RARITY_COLORS[b.rarity] ?? "#9E9E9E"} />
                            </View>
                            <Text style={styles.badgeMiniName} numberOfLines={1}>{b.name}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </Animated.View>
                )}
              </>
            )}
          </>
        )}

        {tab === "inventory" && (
          <>
            <Text style={styles.sectionLabel}>Titles</Text>
            {earnedTitles.length === 0 ? (
              <View style={styles.emptySmall}>
                <Text style={styles.emptySmallText}>No titles earned yet. Complete milestones to unlock them.</Text>
              </View>
            ) : (
              earnedTitles.map((t: any, i: number) => {
                const rarityColor = RARITY_COLORS[t.rarity] ?? "#9E9E9E";
                return (
                  <Animated.View key={t.id} entering={FadeInDown.delay(i * 60).springify()}>
                    <Pressable
                      style={[styles.titleCard, t.isActive && { borderColor: Colors.gold + "60" }]}
                      onPress={() => !t.isActive && handleActivateTitle(t.id)}
                    >
                      <View style={[styles.titleIconBox, { backgroundColor: rarityColor + "18" }]}>
                        <Ionicons name="ribbon" size={20} color={rarityColor} />
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={styles.titleName}>{t.name}</Text>
                          <View style={[styles.rarityChip, { backgroundColor: rarityColor + "18" }]}>
                            <Text style={[styles.rarityText, { color: rarityColor }]}>{t.rarity.toUpperCase()}</Text>
                          </View>
                        </View>
                        <Text style={styles.titleDesc}>{t.description}</Text>
                      </View>
                      {t.isActive ? (
                        <View style={styles.activeChip}>
                          <Text style={styles.activeChipText}>ACTIVE</Text>
                        </View>
                      ) : (
                        <Text style={styles.equipText}>Equip</Text>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })
            )}

            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Badges Earned</Text>
            {earnedBadges.length === 0 ? (
              <View style={styles.emptySmall}>
                <Text style={styles.emptySmallText}>No badges earned yet.</Text>
              </View>
            ) : (
              <View style={styles.badgesGrid}>
                {earnedBadges.map((b: any, i: number) => {
                  const rColor = RARITY_COLORS[b.rarity] ?? "#9E9E9E";
                  return (
                    <Animated.View key={b.id} entering={FadeInDown.delay(i * 50).springify()} style={[styles.badgeCard, { borderColor: rColor + "40" }]}>
                      <View style={[styles.badgeIcon, { backgroundColor: rColor + "18" }]}>
                        <Ionicons name={(b.icon ?? "ribbon") as any} size={26} color={rColor} />
                      </View>
                      <Text style={styles.badgeName} numberOfLines={2}>{b.name}</Text>
                      <View style={[styles.rarityChip, { backgroundColor: rColor + "18" }]}>
                        <Text style={[styles.rarityText, { color: rColor }]}>{b.rarity.toUpperCase()}</Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>
            )}

            {lockedBadges.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Locked Badges</Text>
                <View style={styles.badgesGrid}>
                  {lockedBadges.map((b: any, i: number) => (
                    <Animated.View key={b.id} entering={FadeInDown.delay(i * 40).springify()} style={[styles.badgeCard, styles.badgeCardLocked]}>
                      <View style={[styles.badgeIcon, { backgroundColor: Colors.bgElevated }]}>
                        <Ionicons name="lock-closed" size={22} color={Colors.textMuted} />
                      </View>
                      <Text style={[styles.badgeName, { color: Colors.textMuted }]} numberOfLines={2}>{b.name}</Text>
                      <Text style={styles.badgeDesc} numberOfLines={2}>{b.description}</Text>
                    </Animated.View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {tab === "shop" && (
          <>
            {!shopItems?.length ? (
              <View style={styles.emptyBox}>
                <Ionicons name="storefront-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Shop coming soon</Text>
              </View>
            ) : (
              shopItems.map((item: any, i: number) => (
                <Animated.View key={item.id} entering={FadeInDown.delay(i * 60).springify()}>
                  <Pressable
                    style={({ pressed }) => [styles.shopCard, pressed && { opacity: 0.9 }]}
                    onPress={() => setConfirmItem(item)}
                  >
                    <View style={styles.shopIconBox}>
                      <Ionicons name={(item.icon ?? "gift") as any} size={24} color={Colors.accent} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.shopName}>{item.name}</Text>
                      <Text style={styles.shopDesc}>{item.description}</Text>
                    </View>
                    <View style={styles.costBadge}>
                      <Ionicons name="flash" size={12} color={Colors.gold} />
                      <Text style={styles.costText}>{item.cost}</Text>
                    </View>
                  </Pressable>
                </Animated.View>
              ))
            )}
          </>
        )}

        {tab === "history" && (
          <>
            {!history?.length ? (
              <View style={styles.emptyBox}>
                <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No transactions yet</Text>
              </View>
            ) : (
              (history as any[]).map((tx: any, i: number) => {
                const isEarned = tx.type === "earned" || tx.type === "bonus" || tx.type === "admin_grant";
                return (
                  <Animated.View key={tx.id} entering={FadeInDown.delay(i * 40).springify()}>
                    <View style={styles.txRow}>
                      <View style={[styles.txDot, { backgroundColor: isEarned ? Colors.green : Colors.crimson }]} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={styles.txReason} numberOfLines={1}>{tx.reason}</Text>
                        <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                      </View>
                      <Text style={[styles.txAmount, { color: isEarned ? Colors.green : Colors.crimson }]}>
                        {isEarned ? "+" : ""}{tx.amount}
                      </Text>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {confirmItem && (
        <Modal transparent animationType="fade" onRequestClose={() => setConfirmItem(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setConfirmItem(null)}>
            <View style={styles.confirmModal}>
              <Text style={styles.confirmTitle}>Redeem Item</Text>
              <Text style={styles.confirmName}>{confirmItem.name}</Text>
              <Text style={styles.confirmDesc}>{confirmItem.description}</Text>
              <View style={styles.confirmCost}>
                <Ionicons name="flash" size={16} color={Colors.gold} />
                <Text style={styles.confirmCostText}>{confirmItem.cost} coins</Text>
              </View>
              <Text style={styles.confirmBalance}>
                Balance: {balance?.coinBalance ?? 0} coins
              </Text>
              <View style={styles.confirmActions}>
                <Pressable style={styles.cancelBtn} onPress={() => setConfirmItem(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.redeemBtn, (balance?.coinBalance ?? 0) < confirmItem.cost && { opacity: 0.4 }]}
                  onPress={() => handleRedeem(confirmItem)}
                  disabled={(balance?.coinBalance ?? 0) < confirmItem.cost}
                >
                  <Text style={styles.redeemBtnText}>Redeem</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.bg },
  header:             { paddingHorizontal: 20, paddingBottom: 12 },
  title:              { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.textPrimary, letterSpacing: -0.5 },
  tabRow:             { flexGrow: 0, marginBottom: 14 },
  tab:                { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive:          { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText:            { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  tabTextActive:      { color: "#fff" },
  scroll:             { paddingHorizontal: 20, gap: 12 },
  balanceCard:        { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  balanceRow:         { flexDirection: "row", alignItems: "center", gap: 14 },
  balanceLabel:       { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  balanceAmount:      { fontFamily: "Inter_700Bold", fontSize: 32, color: Colors.textPrimary },
  divider:            { height: 1, backgroundColor: Colors.border },
  xpRow:              { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  xpLabel:            { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  xpPct:              { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.accent },
  xpBarBg:            { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden" },
  xpBarFill:          { height: "100%", backgroundColor: Colors.accent, borderRadius: 4 },
  xpSub:              { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, textAlign: "right" },
  statsGrid:          { flexDirection: "row", gap: 12 },
  statCard:           { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border },
  statValue:          { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  statLabel:          { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  activeTitleCard:    { backgroundColor: Colors.gold + "12", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: Colors.gold + "30" },
  activeTitleLabel:   { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  activeTitleValue:   { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.gold },
  recentBadgesCard:   { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border },
  badgeMini:          { alignItems: "center", gap: 6, width: 68 },
  badgeMiniIcon:      { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badgeMiniName:      { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, textAlign: "center" },
  sectionLabel:       { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textMuted, letterSpacing: 1.2, textTransform: "uppercase" },
  titleCard:          { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  titleIconBox:       { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  titleName:          { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  titleDesc:          { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  rarityChip:         { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rarityText:         { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.8 },
  activeChip:         { backgroundColor: Colors.gold + "18", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  activeChipText:     { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.gold, letterSpacing: 0.8 },
  equipText:          { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },
  badgesGrid:         { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  badgeCard:          { width: "30%", backgroundColor: Colors.bgCard, borderRadius: 16, padding: 12, alignItems: "center", gap: 8, borderWidth: 1 },
  badgeCardLocked:    { borderColor: Colors.border, opacity: 0.55 },
  badgeIcon:          { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badgeName:          { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textPrimary, textAlign: "center" },
  badgeDesc:          { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, textAlign: "center" },
  shopCard:           { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  shopIconBox:        { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  shopName:           { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textPrimary },
  shopDesc:           { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  costBadge:          { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.goldDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  costText:           { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.gold },
  txRow:              { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  txDot:              { width: 8, height: 8, borderRadius: 4 },
  txReason:           { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textPrimary },
  txDate:             { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  txAmount:           { fontFamily: "Inter_700Bold", fontSize: 15 },
  emptyBox:           { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle:         { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.textSecondary },
  emptySmall:         { paddingVertical: 16, alignItems: "center" },
  emptySmallText:     { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  modalOverlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 },
  confirmModal:       { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 24, width: "100%", gap: 12, borderWidth: 1, borderColor: Colors.border },
  confirmTitle:       { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  confirmName:        { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textAccent },
  confirmDesc:        { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  confirmCost:        { flexDirection: "row", alignItems: "center", gap: 6 },
  confirmCostText:    { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.gold },
  confirmBalance:     { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },
  confirmActions:     { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn:          { flex: 1, paddingVertical: 12, backgroundColor: Colors.bgElevated, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  cancelBtnText:      { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  redeemBtn:          { flex: 1, paddingVertical: 12, backgroundColor: Colors.accent, borderRadius: 12, alignItems: "center" },
  redeemBtnText:      { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
});

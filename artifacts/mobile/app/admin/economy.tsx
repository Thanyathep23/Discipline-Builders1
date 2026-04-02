import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useAdminEconomy } from "@/hooks/useApi";

type Tab = "overview" | "categories" | "items" | "anomalies";

function fmtN(n: number | undefined | null) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function pct(a: number, b: number) {
  if (!b) return null;
  return Math.round((a / b) * 100);
}

export default function AdminEconomyScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<Tab>("overview");

  const { data, isLoading, refetch } = useAdminEconomy(days);

  const DAY_OPTIONS = [7, 14, 30, 60, 90];
  const TABS: { key: Tab; label: string }[] = [
    { key: "overview",   label: "Overview" },
    { key: "categories", label: "By Category" },
    { key: "items",      label: "Top Items" },
    { key: "anomalies",  label: "Anomalies" },
  ];

  const coinFlow        = data?.coinFlow;
  const topSources      = data?.topRewardSources ?? [];
  const byCategory      = data?.purchasesByCategory ?? {};
  const topItems        = data?.topItemsByPurchase ?? [];
  const anomalies       = data?.recentAnomalies ?? [];
  const walletStats     = data?.walletStats ?? {};
  const pricingSignals  = data?.pricingSignals ?? [];

  const SIGNAL_LABELS: Record<string, string> = {
    possibly_underpriced:  "Possibly Underpriced",
    featured_no_sales:     "Featured — No Sales",
    possibly_overpriced:   "Possibly Overpriced",
  };
  const SIGNAL_COLORS: Record<string, string> = {
    possibly_underpriced: Colors.amber,
    featured_no_sales:    Colors.crimson,
    possibly_overpriced:  Colors.cyan,
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Economy Console</Text>
        <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={Colors.textMuted} />
        </Pressable>
      </View>

      {/* Window selector */}
      <View style={styles.dayRow}>
        {DAY_OPTIONS.map(d => (
          <Pressable key={d} onPress={() => setDays(d)} style={[styles.dayChip, days === d && styles.dayChipActive]}>
            <Text style={[styles.dayChipText, days === d && styles.dayChipTextActive]}>{d}d</Text>
          </Pressable>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>

          {/* ── OVERVIEW tab ─────────────────────────────────────────────── */}
          {tab === "overview" && (
            <Animated.View entering={FadeInDown.springify()}>

              {/* Coin flow stats */}
              <Text style={styles.sectionTitle}>Coin Flow</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="arrow-up-circle" size={20} color={Colors.green} />
                  <Text style={[styles.statValue, { color: Colors.green }]}>{fmtN(coinFlow?.generated?.last24h)}</Text>
                  <Text style={styles.statLabel}>Generated 24h</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="arrow-up-circle" size={20} color={Colors.green} />
                  <Text style={[styles.statValue, { color: Colors.green }]}>{fmtN(coinFlow?.generated?.last7d)}</Text>
                  <Text style={styles.statLabel}>Generated 7d</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="arrow-up-circle" size={20} color={Colors.green} />
                  <Text style={[styles.statValue, { color: Colors.green }]}>{fmtN(coinFlow?.generated?.last30d)}</Text>
                  <Text style={styles.statLabel}>Generated 30d</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="arrow-down-circle" size={20} color={Colors.amber} />
                  <Text style={[styles.statValue, { color: Colors.amber }]}>{fmtN(coinFlow?.approximateSpend30d)}</Text>
                  <Text style={styles.statLabel}>Spent 30d (est.)</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="swap-horizontal" size={20} color={Colors.cyan} />
                  <Text style={[styles.statValue, { color: Colors.cyan }]}>
                    {coinFlow?.sinkSourceRatio != null ? `${coinFlow.sinkSourceRatio}x` : "—"}
                  </Text>
                  <Text style={styles.statLabel}>Sink/Source Ratio</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="cash" size={20} color={Colors.gold} />
                  <Text style={[styles.statValue, { color: Colors.gold }]}>{fmtN(coinFlow?.generated?.allTime)}</Text>
                  <Text style={styles.statLabel}>All-Time Generated</Text>
                </View>
              </View>

              {/* Wallet stats */}
              <Text style={styles.sectionTitle}>Wallet Distribution</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="people" size={20} color={Colors.accent} />
                  <Text style={[styles.statValue, { color: Colors.accent }]}>{fmtN(walletStats.userCount)}</Text>
                  <Text style={styles.statLabel}>Users</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="bar-chart" size={20} color={Colors.gold} />
                  <Text style={[styles.statValue, { color: Colors.gold }]}>{fmtN(walletStats.avg)}</Text>
                  <Text style={styles.statLabel}>Avg Balance</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="trending-down" size={20} color={Colors.textMuted} />
                  <Text style={styles.statValue}>{fmtN(walletStats.min)}</Text>
                  <Text style={styles.statLabel}>Min Balance</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="trending-up" size={20} color={Colors.green} />
                  <Text style={[styles.statValue, { color: Colors.green }]}>{fmtN(walletStats.max)}</Text>
                  <Text style={styles.statLabel}>Max Balance</Text>
                </View>
              </View>

              {/* Top reward sources */}
              <Text style={styles.sectionTitle}>Top Reward Sources ({days}d)</Text>
              {topSources.length === 0 ? (
                <Text style={styles.emptyText}>No reward transactions in this window.</Text>
              ) : topSources.slice(0, 8).map((s: any, i: number) => (
                <View key={i} style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowLabel}>{s.type ?? "—"}</Text>
                    {s.reason ? <Text style={styles.rowSub}>{s.reason}</Text> : null}
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowValue, { color: Colors.green }]}>{fmtN(s.totalCoins)} ¢</Text>
                    <Text style={styles.rowSub}>{fmtN(s.eventCount)} events</Text>
                  </View>
                </View>
              ))}

              {/* Pricing signals */}
              {pricingSignals.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Pricing Signals</Text>
                  {pricingSignals.map((sig: any, i: number) => (
                    <View key={i} style={styles.row}>
                      <View style={styles.rowLeft}>
                        <Text style={styles.rowLabel}>{sig.name}</Text>
                        <Text style={[styles.rowSub, { color: SIGNAL_COLORS[sig.signal] ?? Colors.textMuted }]}>
                          {SIGNAL_LABELS[sig.signal] ?? sig.signal}
                        </Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Text style={styles.rowValue}>{fmtN(sig.cost)} ¢</Text>
                        <Text style={styles.rowSub}>{fmtN(sig.purchaseCount)} sales</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </Animated.View>
          )}

          {/* ── BY CATEGORY tab ──────────────────────────────────────────── */}
          {tab === "categories" && (
            <Animated.View entering={FadeInDown.springify()}>
              <Text style={styles.sectionTitle}>Purchases by Category ({days}d)</Text>
              {Object.entries(byCategory).map(([cat, stats]: [string, any]) => (
                <View key={cat} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
                    <Text style={[styles.statValue, { fontSize: 16, color: Colors.accent }]}>{fmtN(stats.count)} sold</Text>
                  </View>
                  <View style={styles.categoryRow}>
                    <Text style={styles.categoryMetric}>Revenue (approx.)</Text>
                    <Text style={[styles.categoryValue, { color: Colors.gold }]}>{fmtN(stats.totalCost)} ¢</Text>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

          {/* ── TOP ITEMS tab ────────────────────────────────────────────── */}
          {tab === "items" && (
            <Animated.View entering={FadeInDown.springify()}>
              <Text style={styles.sectionTitle}>Top Items by Purchase ({days}d)</Text>
              {topItems.length === 0 ? (
                <Text style={styles.emptyText}>No purchases in this window.</Text>
              ) : topItems.map((item: any, i: number) => (
                <View key={item.itemId ?? i} style={styles.row}>
                  <View style={[styles.rankBadge, { backgroundColor: i < 3 ? Colors.gold + "22" : Colors.bgCard }]}>
                    <Text style={[styles.rankText, { color: i < 3 ? Colors.gold : Colors.textMuted }]}>#{i + 1}</Text>
                  </View>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowLabel}>{item.name}</Text>
                    <Text style={styles.rowSub}>{item.category} · {fmtN(item.cost)} ¢</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowValue, { color: Colors.accent }]}>{fmtN(item.purchaseCount)} sold</Text>
                    <Text style={styles.rowSub}>{fmtN(item.totalRevenue)} ¢ rev.</Text>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

          {/* ── ANOMALIES tab ────────────────────────────────────────────── */}
          {tab === "anomalies" && (
            <Animated.View entering={FadeInDown.springify()}>
              <Text style={styles.sectionTitle}>Large Reward Transactions ({days}d)</Text>
              <Text style={styles.subNote}>Events granting 500+ coins in a single transaction.</Text>
              {anomalies.length === 0 ? (
                <Text style={styles.emptyText}>No large transactions in this window.</Text>
              ) : anomalies.map((tx: any, i: number) => (
                <View key={i} style={[styles.row, { borderLeftWidth: 3, borderLeftColor: Colors.amber }]}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowLabel}>{tx.type}</Text>
                    <Text style={styles.rowSub}>{tx.reason ?? "—"}</Text>
                    <Text style={styles.rowSub}>User: {tx.userId}</Text>
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={[styles.rowValue, { color: Colors.amber }]}>+{fmtN(tx.amount)} ¢</Text>
                    <Text style={styles.rowSub}>{new Date(tx.at).toLocaleDateString()}</Text>
                  </View>
                </View>
              ))}
            </Animated.View>
          )}

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4, marginRight: 8 },
  refreshBtn: { padding: 4, marginLeft: "auto" as any },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary, flex: 1 },
  dayRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dayChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: Colors.bgCard },
  dayChipActive: { backgroundColor: Colors.accent },
  dayChipText: { fontSize: 12, color: Colors.textMuted },
  dayChipTextActive: { color: "#fff", fontWeight: "600" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  tabText: { fontSize: 12, color: Colors.textMuted },
  tabTextActive: { color: Colors.accent, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { flex: 1, minWidth: 130, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14, gap: 4, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted, textAlign: "center" },
  row: { backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  rowLeft: { flex: 1 },
  rowRight: { alignItems: "flex-end" },
  rowLabel: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  rowSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  rowValue: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  rankBadge: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 12, fontWeight: "700" },
  categoryCard: { backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  categoryHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  categoryName: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  categoryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryMetric: { fontSize: 13, color: Colors.textMuted },
  categoryValue: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 20 },
  subNote: { color: Colors.textMuted, fontSize: 13, marginBottom: 12 },
});

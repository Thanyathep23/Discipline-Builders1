import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useAdminFunnelDeep } from "@/hooks/useApi";

type Tab = "funnel" | "invite" | "premium" | "comeback";

function fmtN(n: number | undefined | null) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function convBar(pctVal: number | null | undefined) {
  if (pctVal == null) return null;
  const clamped = Math.min(Math.max(pctVal, 0), 100);
  const color = clamped >= 60 ? Colors.green : clamped >= 30 ? Colors.amber : Colors.crimson;
  return { width: `${clamped}%`, color };
}

export default function AdminFunnelsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<Tab>("funnel");

  const { data, isLoading, refetch } = useAdminFunnelDeep(days);

  const DAY_OPTIONS = [7, 14, 30, 60, 90];
  const TABS: { key: Tab; label: string }[] = [
    { key: "funnel",   label: "Activation" },
    { key: "invite",   label: "Invite" },
    { key: "premium",  label: "Premium" },
    { key: "comeback", label: "Comeback" },
  ];

  const steps           = data?.steps ?? [];
  const inviteFunnel    = data?.inviteFunnel ?? {};
  const freeToPremium   = data?.freeToPremium ?? {};
  const comebackFunnel  = data?.comebackFunnel ?? {};
  const maxCount        = steps.reduce((m: number, s: any) => Math.max(m, s.count ?? 0), 1);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Funnel Analysis</Text>
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

          {/* ── ACTIVATION FUNNEL ────────────────────────────────────── */}
          {tab === "funnel" && (
            <Animated.View entering={FadeInDown.springify()}>
              <Text style={styles.sectionTitle}>Activation Funnel ({days}d)</Text>
              <Text style={styles.subNote}>Drop-off between each key activation step. Red = high drop-off needing attention.</Text>
              {steps.map((step: any, i: number) => {
                const bar = convBar(step.count > 0 ? Math.round((step.count / maxCount) * 100) : 0);
                const dropColor = step.conversionFromPrev == null ? Colors.textMuted
                  : step.conversionFromPrev >= 60 ? Colors.green
                  : step.conversionFromPrev >= 30 ? Colors.amber
                  : Colors.crimson;
                return (
                  <View key={step.key} style={styles.stepCard}>
                    <View style={styles.stepHeader}>
                      <View style={styles.stepIndex}>
                        <Text style={styles.stepIndexText}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stepLabel}>{step.label}</Text>
                        <Text style={styles.stepEvent}>{step.event}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={[styles.stepCount, { color: Colors.accent }]}>{fmtN(step.count)}</Text>
                        {step.conversionFromPrev != null && (
                          <Text style={[styles.convBadge, { color: dropColor }]}>
                            ↓ {step.conversionFromPrev}% conv.
                          </Text>
                        )}
                      </View>
                    </View>
                    {/* Visual bar */}
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: (bar?.width ?? "0%") as any, backgroundColor: bar?.color ?? Colors.border }]} />
                    </View>
                  </View>
                );
              })}
            </Animated.View>
          )}

          {/* ── INVITE FUNNEL ────────────────────────────────────────── */}
          {tab === "invite" && (
            <Animated.View entering={FadeInDown.springify()}>
              <Text style={styles.sectionTitle}>Invite Funnel ({days}d)</Text>
              <Text style={styles.subNote}>Conversion from invite-link signups through profile activation.</Text>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="people-outline" size={20} color={Colors.accent} />
                  <Text style={[styles.statValue, { color: Colors.accent }]}>{fmtN(inviteFunnel.inviteSignups)}</Text>
                  <Text style={styles.statLabel}>Invite Signups</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="person-add" size={20} color={Colors.green} />
                  <Text style={[styles.statValue, { color: Colors.green }]}>{fmtN(inviteFunnel.inviteActivated)}</Text>
                  <Text style={styles.statLabel}>Activated</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="analytics" size={20} color={Colors.gold} />
                  <Text style={[styles.statValue, { color: Colors.gold }]}>
                    {inviteFunnel.activationRate != null ? `${inviteFunnel.activationRate}%` : "—"}
                  </Text>
                  <Text style={styles.statLabel}>Activation Rate</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="enter-outline" size={20} color={Colors.textMuted} />
                  <Text style={styles.statValue}>{fmtN(inviteFunnel.directSignups)}</Text>
                  <Text style={styles.statLabel}>Direct Signups</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Invite vs Direct Breakdown</Text>
              {[
                { label: "Invite Signups", n: inviteFunnel.inviteSignups ?? 0, total: (inviteFunnel.inviteSignups ?? 0) + (inviteFunnel.directSignups ?? 0), color: Colors.accent },
                { label: "Direct Signups", n: inviteFunnel.directSignups ?? 0, total: (inviteFunnel.inviteSignups ?? 0) + (inviteFunnel.directSignups ?? 0), color: Colors.cyan },
              ].map(item => {
                const p = item.total > 0 ? Math.round((item.n / item.total) * 100) : 0;
                return (
                  <View key={item.label} style={styles.segRow}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <View style={styles.segBarTrack}>
                      <View style={[styles.segBarFill, { width: `${p}%`, backgroundColor: item.color }]} />
                    </View>
                    <Text style={[styles.segPct, { color: item.color }]}>{p}%</Text>
                  </View>
                );
              })}
            </Animated.View>
          )}

          {/* ── FREE → PREMIUM ───────────────────────────────────────── */}
          {tab === "premium" && (
            <Animated.View entering={FadeInDown.springify()}>
              <Text style={styles.sectionTitle}>Free → Premium Conversion ({days}d)</Text>
              <Text style={styles.subNote}>New users who became premium within the window.</Text>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="people-outline" size={20} color={Colors.accent} />
                  <Text style={[styles.statValue, { color: Colors.accent }]}>{fmtN(freeToPremium.newUsers)}</Text>
                  <Text style={styles.statLabel}>New Users</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="star" size={20} color={Colors.gold} />
                  <Text style={[styles.statValue, { color: Colors.gold }]}>{fmtN(freeToPremium.newPremium)}</Text>
                  <Text style={styles.statLabel}>Went Premium</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="trending-up" size={20} color={freeToPremium.conversionRate >= 10 ? Colors.green : Colors.amber} />
                  <Text style={[styles.statValue, { color: freeToPremium.conversionRate >= 10 ? Colors.green : Colors.amber }]}>
                    {freeToPremium.conversionRate != null ? `${freeToPremium.conversionRate}%` : "—"}
                  </Text>
                  <Text style={styles.statLabel}>Conversion Rate</Text>
                </View>
              </View>

              <View style={styles.healthCard}>
                <Ionicons
                  name={freeToPremium.conversionRate >= 10 ? "checkmark-circle" : "warning"}
                  size={20}
                  color={freeToPremium.conversionRate >= 10 ? Colors.green : Colors.amber}
                />
                <Text style={styles.healthText}>
                  {freeToPremium.conversionRate == null
                    ? "No data in this window."
                    : freeToPremium.conversionRate >= 20
                    ? "Strong premium conversion. Offers are converting well."
                    : freeToPremium.conversionRate >= 10
                    ? "Healthy premium conversion. Monitor weekly."
                    : freeToPremium.conversionRate >= 5
                    ? "Below target. Consider tuning offer timing or premium value."
                    : "Very low conversion. Review paywall placement and premium value proposition."
                  }
                </Text>
              </View>
            </Animated.View>
          )}

          {/* ── COMEBACK FUNNEL ──────────────────────────────────────── */}
          {tab === "comeback" && (
            <Animated.View entering={FadeInDown.springify()}>
              <Text style={styles.sectionTitle}>Comeback / Recovery Funnel ({days}d)</Text>
              <Text style={styles.subNote}>How many lapsed users saw recovery prompts vs accepted comeback missions.</Text>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="eye-outline" size={20} color={Colors.amber} />
                  <Text style={[styles.statValue, { color: Colors.amber }]}>{fmtN(comebackFunnel.surfaceShown)}</Text>
                  <Text style={styles.statLabel}>Surface Shown</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.green} />
                  <Text style={[styles.statValue, { color: Colors.green }]}>{fmtN(comebackFunnel.missionAccepted)}</Text>
                  <Text style={styles.statLabel}>Mission Accepted</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="analytics" size={20} color={Colors.cyan} />
                  <Text style={[styles.statValue, { color: Colors.cyan }]}>
                    {comebackFunnel.acceptRate != null ? `${comebackFunnel.acceptRate}%` : "—"}
                  </Text>
                  <Text style={styles.statLabel}>Accept Rate</Text>
                </View>
              </View>

              {comebackFunnel.surfaceShown === 0 && (
                <View style={styles.healthCard}>
                  <Ionicons name="information-circle" size={20} color={Colors.textMuted} />
                  <Text style={styles.healthText}>No comeback surface impressions tracked yet. Check that the comeback recommendation surface is enabled.</Text>
                </View>
              )}

              {comebackFunnel.surfaceShown > 0 && (
                <View style={styles.healthCard}>
                  <Ionicons
                    name={comebackFunnel.acceptRate >= 30 ? "checkmark-circle" : "warning"}
                    size={20}
                    color={comebackFunnel.acceptRate >= 30 ? Colors.green : Colors.amber}
                  />
                  <Text style={styles.healthText}>
                    {comebackFunnel.acceptRate >= 40
                      ? "Excellent comeback rate. Recovery missions are resonating."
                      : comebackFunnel.acceptRate >= 20
                      ? "Moderate comeback rate. Consider increasing comeback push weight."
                      : "Low comeback rate. Review recovery mission quality and targeting."
                    }
                  </Text>
                </View>
              )}
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
  subNote: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { flex: 1, minWidth: 120, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14, gap: 4, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted, textAlign: "center" },
  stepCard: { backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  stepIndex: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.accent + "22", alignItems: "center", justifyContent: "center" },
  stepIndexText: { fontSize: 12, fontWeight: "700", color: Colors.accent },
  stepLabel: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  stepEvent: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  stepCount: { fontSize: 16, fontWeight: "700" },
  convBadge: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  barTrack: { height: 6, backgroundColor: Colors.bgElevated, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  segRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  rowLabel: { fontSize: 13, color: Colors.textPrimary, width: 120 },
  segBarTrack: { flex: 1, height: 8, backgroundColor: Colors.bgElevated, borderRadius: 4, overflow: "hidden" },
  segBarFill: { height: 8, borderRadius: 4 },
  segPct: { fontSize: 13, fontWeight: "700", width: 40, textAlign: "right" },
  healthCard: { backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start", borderWidth: 1, borderColor: Colors.border, marginTop: 12 },
  healthText: { flex: 1, fontSize: 13, color: Colors.textPrimary, lineHeight: 20 },
});

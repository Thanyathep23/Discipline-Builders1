import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator, Switch, TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import {
  useAdminRecStats, useAdminRecControls, useAdminUpdateRecControls, useAdminRecUserDebug,
} from "@/hooks/useApi";

type Tab = "stats" | "controls" | "inspector";

function pct(a: number, b: number) {
  if (!b) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

function fmtN(n: number | undefined | null) {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function AdminRecommendationsScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [tab, setTab] = useState<Tab>("stats");
  const [days, setDays] = useState(7);
  const [inspectUserId, setInspectUserId] = useState("");
  const [queriedUserId, setQueriedUserId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ msg: string; ok: boolean } | null>(null);
  const [weightDraft, setWeightDraft] = useState<Record<string, number>>({});
  const [reasonDraft, setReasonDraft] = useState("");

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useAdminRecStats(days);
  const { data: controls, isLoading: controlsLoading, refetch: refetchControls } = useAdminRecControls();
  const { data: userDebug, isLoading: userDebugLoading } = useAdminRecUserDebug(queriedUserId);
  const updateControls = useAdminUpdateRecControls();

  const DAY_OPTIONS = [3, 7, 14, 30];
  const TABS: { key: Tab; label: string }[] = [
    { key: "stats",     label: "Performance" },
    { key: "controls",  label: "Controls" },
    { key: "inspector", label: "Inspector" },
  ];

  function showBanner(msg: string, ok: boolean) {
    setBanner({ msg, ok });
    setTimeout(() => setBanner(null), 3000);
  }

  async function toggleSurface(key: string, enabled: boolean) {
    try {
      await updateControls.mutateAsync({ surfaces: { [key]: enabled }, reason: "admin_toggle" });
      showBanner(`Surface "${key}" ${enabled ? "enabled" : "disabled"}.`, true);
    } catch {
      showBanner("Failed to update surface.", false);
    }
  }

  async function saveWeights() {
    if (Object.keys(weightDraft).length === 0) { showBanner("No weights changed.", false); return; }
    try {
      await updateControls.mutateAsync({ weights: weightDraft, reason: reasonDraft || undefined });
      setWeightDraft({});
      setReasonDraft("");
      showBanner("Weights updated.", true);
    } catch {
      showBanner("Failed to save weights.", false);
    }
  }

  const surfaces = controls?.surfaces ?? [];
  const weights  = controls?.weights ?? [];
  const totals   = stats?.totals ?? {};
  const clicksByType     = stats?.clicksByType ?? {};
  const dismissalsByType = stats?.dismissalsByType ?? {};

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Recommendations</Text>
        <Pressable onPress={() => { refetchStats(); refetchControls(); }} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={Colors.textMuted} />
        </Pressable>
      </View>

      {/* Banner */}
      {banner && (
        <View style={[styles.banner, { backgroundColor: banner.ok ? Colors.green + "22" : Colors.crimson + "22" }]}>
          <Ionicons name={banner.ok ? "checkmark-circle" : "warning"} size={16} color={banner.ok ? Colors.green : Colors.crimson} />
          <Text style={[styles.bannerText, { color: banner.ok ? Colors.green : Colors.crimson }]}>{banner.msg}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>

        {/* ── STATS / PERFORMANCE ───────────────────────────────────── */}
        {tab === "stats" && (
          <Animated.View entering={FadeInDown.springify()}>
            <View style={styles.dayRow}>
              {DAY_OPTIONS.map(d => (
                <Pressable key={d} onPress={() => setDays(d)} style={[styles.dayChip, days === d && styles.dayChipActive]}>
                  <Text style={[styles.dayChipText, days === d && styles.dayChipTextActive]}>{d}d</Text>
                </Pressable>
              ))}
            </View>

            {statsLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
            ) : (
              <>
                <Text style={styles.sectionTitle}>Aggregate Metrics ({days}d)</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Ionicons name="eye-outline" size={20} color={Colors.accent} />
                    <Text style={[styles.statValue, { color: Colors.accent }]}>{fmtN(totals.impressions)}</Text>
                    <Text style={styles.statLabel}>Impressions</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="hand-right-outline" size={20} color={Colors.green} />
                    <Text style={[styles.statValue, { color: Colors.green }]}>{fmtN(totals.clicks)}</Text>
                    <Text style={styles.statLabel}>Clicks</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="analytics" size={20} color={Colors.gold} />
                    <Text style={[styles.statValue, { color: Colors.gold }]}>
                      {totals.ctr != null ? `${totals.ctr}%` : "—"}
                    </Text>
                    <Text style={styles.statLabel}>CTR</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="close-circle-outline" size={20} color={Colors.crimson} />
                    <Text style={[styles.statValue, { color: Colors.crimson }]}>{fmtN(totals.dismissals)}</Text>
                    <Text style={styles.statLabel}>Dismissals</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="thumbs-down-outline" size={20} color={Colors.crimson} />
                    <Text style={[styles.statValue, { color: Colors.crimson }]}>{fmtN(totals.notRelevant)}</Text>
                    <Text style={styles.statLabel}>Not Relevant</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Ionicons name="trending-down-outline" size={20} color={Colors.amber} />
                    <Text style={[styles.statValue, { color: Colors.amber }]}>
                      {totals.dismissRate != null ? `${totals.dismissRate}%` : "—"}
                    </Text>
                    <Text style={styles.statLabel}>Dismiss Rate</Text>
                  </View>
                </View>

                {Object.keys(clicksByType).length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Clicks by Type</Text>
                    {Object.entries(clicksByType)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([type, n]) => (
                        <View key={type} style={styles.row}>
                          <Text style={[styles.rowLabel, { flex: 1 }]}>{type}</Text>
                          <Text style={[styles.rowValue, { color: Colors.green }]}>{fmtN(n as number)}</Text>
                        </View>
                      ))}
                  </>
                )}

                {Object.keys(dismissalsByType).length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Dismissals by Type</Text>
                    {Object.entries(dismissalsByType)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([type, n]) => (
                        <View key={type} style={styles.row}>
                          <Text style={[styles.rowLabel, { flex: 1 }]}>{type}</Text>
                          <Text style={[styles.rowValue, { color: Colors.crimson }]}>{fmtN(n as number)}</Text>
                        </View>
                      ))}
                  </>
                )}

                {stats?.recentEvents?.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Recent Events</Text>
                    {(stats.recentEvents as any[]).slice(0, 10).map((ev: any, i: number) => (
                      <View key={i} style={styles.eventRow}>
                        <View style={[styles.eventDot, {
                          backgroundColor: ev.action.includes("clicked") ? Colors.green
                            : ev.action.includes("dismissed") ? Colors.crimson : Colors.accent,
                        }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowLabel}>{ev.action}</Text>
                          {ev.details?.type && <Text style={styles.rowSub}>type: {ev.details.type}</Text>}
                        </View>
                        <Text style={styles.rowSub}>{new Date(ev.at).toLocaleDateString()}</Text>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </Animated.View>
        )}

        {/* ── CONTROLS ─────────────────────────────────────────────── */}
        {tab === "controls" && (
          <Animated.View entering={FadeInDown.springify()}>
            {controlsLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
            ) : (
              <>
                <Text style={styles.sectionTitle}>Recommendation Surfaces</Text>
                <Text style={styles.subNote}>Toggle each surface on or off. Changes are applied immediately and audit-logged.</Text>
                {surfaces.map((s: any) => (
                  <View key={s.key} style={styles.surfaceRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>{s.label}</Text>
                      <Text style={styles.rowSub}>{s.description}</Text>
                    </View>
                    <Switch
                      value={s.enabled}
                      onValueChange={(v) => toggleSurface(s.key, v)}
                      trackColor={{ false: Colors.border, true: Colors.accent + "88" }}
                      thumbColor={s.enabled ? Colors.accent : Colors.textMuted}
                    />
                  </View>
                ))}

                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recommendation Weights</Text>
                <Text style={styles.subNote}>Adjust weighting sliders (0–100). Changes take effect immediately.</Text>
                {weights.map((w: any) => {
                  const current = weightDraft[w.key] ?? w.value;
                  return (
                    <View key={w.key} style={styles.weightCard}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                        <Text style={styles.rowLabel}>{w.label}</Text>
                        <Text style={[styles.rowValue, { color: Colors.accent, fontSize: 14 }]}>{current}</Text>
                      </View>
                      <Text style={[styles.rowSub, { marginBottom: 8 }]}>{w.description}</Text>
                      <View style={styles.sliderRow}>
                        {[0, 25, 50, 75, 100].map(v => (
                          <Pressable
                            key={v}
                            onPress={() => setWeightDraft(d => ({ ...d, [w.key]: v }))}
                            style={[styles.sliderBtn, current === v && styles.sliderBtnActive]}
                          >
                            <Text style={[styles.sliderBtnText, current === v && styles.sliderBtnTextActive]}>{v}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  );
                })}

                {Object.keys(weightDraft).length > 0 && (
                  <>
                    <TextInput
                      style={styles.reasonInput}
                      placeholder="Reason for change (optional)"
                      placeholderTextColor={Colors.textMuted}
                      value={reasonDraft}
                      onChangeText={setReasonDraft}
                    />
                    <Pressable
                      onPress={saveWeights}
                      style={[styles.saveBtn, updateControls.isPending && styles.saveBtnDisabled]}
                      disabled={updateControls.isPending}
                    >
                      {updateControls.isPending
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.saveBtnText}>Save Weight Changes</Text>
                      }
                    </Pressable>
                  </>
                )}
              </>
            )}
          </Animated.View>
        )}

        {/* ── INSPECTOR ────────────────────────────────────────────── */}
        {tab === "inspector" && (
          <Animated.View entering={FadeInDown.springify()}>
            <Text style={styles.sectionTitle}>Per-User Debug Inspector</Text>
            <Text style={styles.subNote}>Enter a user ID to see the recommendation context and recent events for that player.</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="User ID..."
                placeholderTextColor={Colors.textMuted}
                value={inspectUserId}
                onChangeText={setInspectUserId}
                autoCapitalize="none"
              />
              <Pressable
                onPress={() => setQueriedUserId(inspectUserId.trim() || null)}
                style={styles.searchBtn}
              >
                <Ionicons name="search" size={18} color="#fff" />
              </Pressable>
            </View>

            {userDebugLoading && <ActivityIndicator color={Colors.accent} style={{ marginTop: 20 }} />}
            {userDebug && !userDebugLoading && (
              <>
                <Text style={styles.sectionTitle}>Debug State</Text>
                {Object.entries(userDebug.debug ?? {}).map(([k, v]) => (
                  <View key={k} style={styles.row}>
                    <Text style={[styles.rowLabel, { flex: 1 }]}>{k}</Text>
                    <Text style={styles.rowSub}>{typeof v === "object" ? JSON.stringify(v) : String(v)}</Text>
                  </View>
                ))}

                {userDebug.recentRecommendationEvents?.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Recent Rec Events</Text>
                    {(userDebug.recentRecommendationEvents as any[]).map((ev: any, i: number) => (
                      <View key={i} style={styles.eventRow}>
                        <View style={[styles.eventDot, {
                          backgroundColor: ev.action.includes("clicked") ? Colors.green
                            : ev.action.includes("dismissed") ? Colors.crimson : Colors.accent,
                        }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowLabel}>{ev.action}</Text>
                          {ev.details?.type && <Text style={styles.rowSub}>type: {ev.details.type}</Text>}
                        </View>
                        <Text style={styles.rowSub}>{new Date(ev.at).toLocaleDateString()}</Text>
                      </View>
                    ))}
                  </>
                )}
              </>
            )}
          </Animated.View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4, marginRight: 8 },
  refreshBtn: { padding: 4, marginLeft: "auto" as any },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary, flex: 1 },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  bannerText: { fontSize: 13, fontWeight: "600" },
  dayRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  dayChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: Colors.bgCard },
  dayChipActive: { backgroundColor: Colors.accent },
  dayChipText: { fontSize: 12, color: Colors.textMuted },
  dayChipTextActive: { color: "#fff", fontWeight: "600" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  tabText: { fontSize: 12, color: Colors.textMuted },
  tabTextActive: { color: Colors.accent, fontWeight: "600" },
  scroll: { padding: 16, gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  subNote: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { flex: 1, minWidth: 120, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 14, gap: 4, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted, textAlign: "center" },
  row: { backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6, borderWidth: 1, borderColor: Colors.border },
  rowLabel: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  rowSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  rowValue: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  eventRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  eventDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  surfaceRow: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.bgCard, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  weightCard: { backgroundColor: Colors.bgCard, borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  sliderRow: { flexDirection: "row", gap: 8 },
  sliderBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.bgElevated, alignItems: "center" },
  sliderBtnActive: { backgroundColor: Colors.accent },
  sliderBtnText: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
  sliderBtnTextActive: { color: "#fff" },
  reasonInput: { backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, marginTop: 12, marginBottom: 10 },
  saveBtn: { backgroundColor: Colors.accent, borderRadius: 12, padding: 14, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  searchInput: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, fontSize: 14 },
  searchBtn: { backgroundColor: Colors.accent, borderRadius: 10, padding: 12, alignItems: "center", justifyContent: "center" },
});

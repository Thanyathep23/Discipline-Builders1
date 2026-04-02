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

const SOURCE_COLORS: Record<string, string> = {
  direct:          Colors.accent,
  invite:          Colors.green,
  share_card:      Colors.cyan,
  landing_page:    Colors.gold,
  comeback_reentry: Colors.amber,
  unknown:         Colors.textMuted,
};

export default function AdminGrowthScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [days, setDays] = useState(30);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "growth", days],
    queryFn: () => request<any>(`/admin/growth?days=${days}`),
  });

  const DAY_OPTIONS = [7, 14, 30, 60, 90];
  const sources: Record<string, number> = data?.acquisitionSources ?? {};
  const inviteFunnel = data?.inviteFunnel ?? { signups: 0, activated: 0 };
  const activeCodes: any[] = data?.activeCodes ?? [];
  const recentInvitees: any[] = data?.recentInvitees ?? [];
  const totalSignups = data?.totalSignups ?? 0;

  const inviteConv = inviteFunnel.signups > 0
    ? Math.round((inviteFunnel.activated / inviteFunnel.signups) * 100)
    : 0;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Growth Funnel</Text>
        <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Period */}
        <Animated.View entering={FadeInDown.springify()}>
          <View style={styles.dayRow}>
            {DAY_OPTIONS.map(d => (
              <Pressable key={d} style={[styles.dayChip, days === d && styles.dayChipActive]} onPress={() => setDays(d)}>
                <Text style={[styles.dayChipText, days === d && styles.dayChipTextActive]}>{d}d</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Overview */}
        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <Text style={styles.sectionTitle}>Signups ({days}d)</Text>
          {isLoading ? <ActivityIndicator color={Colors.accent} /> : (
            <View style={styles.overviewRow}>
              <View style={styles.overviewCard}>
                <Text style={[styles.overviewNum, { color: Colors.accent }]}>{totalSignups}</Text>
                <Text style={styles.overviewLabel}>Total Signups</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={[styles.overviewNum, { color: Colors.green }]}>{inviteFunnel.signups}</Text>
                <Text style={styles.overviewLabel}>Via Invite</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={[styles.overviewNum, { color: Colors.gold }]}>{inviteConv}%</Text>
                <Text style={styles.overviewLabel}>Invite → Active</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Acquisition sources */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.sectionTitle}>Acquisition Sources</Text>
          {isLoading ? <ActivityIndicator color={Colors.accent} /> : Object.keys(sources).length === 0 ? (
            <View style={styles.emptyCard}><Text style={styles.emptyText}>No signups yet in this window.</Text></View>
          ) : (
            <View style={styles.sourceCard}>
              {Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([src, n]) => {
                const pct = totalSignups > 0 ? Math.max(4, (n / totalSignups) * 100) : 4;
                const color = SOURCE_COLORS[src] ?? Colors.textMuted;
                return (
                  <View key={src} style={styles.sourceRow}>
                    <Text style={[styles.sourceName, { color }]}>{src}</Text>
                    <View style={styles.sourceBarBg}>
                      <View style={[styles.sourceBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.sourceCount}>{n}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* Invite funnel */}
        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <Text style={styles.sectionTitle}>Invite Funnel</Text>
          {isLoading ? <ActivityIndicator color={Colors.accent} /> : (
            <View style={styles.funnelCard}>
              {[
                { label: "Invite code used at signup", value: inviteFunnel.signups, color: Colors.accent },
                { label: "Invitees who activated (Quick Start)", value: inviteFunnel.activated, color: Colors.green },
              ].map((step, i) => (
                <View key={i} style={[styles.funnelRow, i > 0 && styles.funnelBorder]}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.funnelLabel}>{step.label}</Text>
                    {i > 0 && inviteFunnel.signups > 0 && (
                      <Text style={[styles.funnelConv, { color: inviteConv >= 50 ? Colors.green : Colors.amber }]}>
                        {inviteConv}% conversion
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.funnelCount, { color: step.color }]}>{step.value}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Active codes */}
        {activeCodes.length > 0 && (
          <Animated.View entering={FadeInDown.delay(180).springify()}>
            <Text style={styles.sectionTitle}>Active Invite Codes</Text>
            <View style={styles.codeCard}>
              {activeCodes.map((c, i) => (
                <View key={i} style={[styles.codeRow, i > 0 && styles.funnelBorder]}>
                  <Text style={styles.codeValue}>{c.code}</Text>
                  <Text style={styles.codeMeta}>{c.usesCount}/{c.maxUses} uses</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Recent invitees */}
        {recentInvitees.length > 0 && (
          <Animated.View entering={FadeInDown.delay(220).springify()}>
            <Text style={styles.sectionTitle}>Recent Invite Signups</Text>
            <View style={styles.inviteeCard}>
              {recentInvitees.map((inv, i) => (
                <View key={i} style={[styles.inviteeRow, i > 0 && styles.funnelBorder]}>
                  <Text style={styles.inviteeName}>{inv.username}</Text>
                  <Text style={styles.inviteeCode}>{inv.code}</Text>
                  <Text style={styles.inviteeDate}>
                    {inv.joinedAt ? new Date(inv.joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, gap: 24 },

  dayRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 4 },
  dayChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  dayChipActive: { backgroundColor: Colors.accentGlow, borderColor: Colors.accentDim },
  dayChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.accent },

  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary, marginBottom: 12 },
  emptyCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 20, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },

  overviewRow: { flexDirection: "row", gap: 10 },
  overviewCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, alignItems: "center", gap: 4, borderWidth: 1, borderColor: Colors.border },
  overviewNum: { fontFamily: "Inter_700Bold", fontSize: 24 },
  overviewLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },

  sourceCard: { backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 12 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sourceName: { fontFamily: "Inter_600SemiBold", fontSize: 12, width: 90 },
  sourceBarBg: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3 },
  sourceBarFill: { height: 6, borderRadius: 3 },
  sourceCount: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary, width: 28, textAlign: "right" },

  funnelCard: { backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  funnelRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  funnelBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  funnelLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  funnelConv: { fontFamily: "Inter_400Regular", fontSize: 11 },
  funnelCount: { fontFamily: "Inter_700Bold", fontSize: 22 },

  codeCard: { backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  codeRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  codeValue: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.accent, flex: 1, letterSpacing: 2 },
  codeMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },

  inviteeCard: { backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  inviteeRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 8 },
  inviteeName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary, flex: 1 },
  inviteeCode: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.accent },
  inviteeDate: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
});

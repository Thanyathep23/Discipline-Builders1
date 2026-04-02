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

const FUNNEL_LABELS: Record<string, string> = {
  signup_completed:           "Signup Completed",
  quick_start_completed:      "Quick Start Done",
  standard_profile_completed: "Standard Profile Done",
  deep_profile_completed:     "Deep Profile Done",
  ai_mission_shown:           "AI Mission Shown",
  ai_mission_accepted:        "AI Mission Accepted",
  focus_started:              "Focus Started",
  focus_completed:            "Focus Completed",
  proof_submitted:            "Proof Submitted",
  proof_approved:             "Proof Approved",
};

function conversionPct(from: number, to: number) {
  if (!from) return null;
  return Math.round((to / from) * 100);
}

export default function AdminTelemetryScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const [days, setDays] = useState(30);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "funnel", days],
    queryFn: () => request<any>(`/admin/funnel?days=${days}`),
  });

  const funnel: { event: string; count: number }[] = data?.funnel ?? [];
  const dau: { day: string; n: number }[] = data?.dau ?? [];

  const DAY_OPTIONS = [7, 14, 30, 60, 90];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Telemetry & Funnels</Text>
        <Pressable onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Period selector */}
        <Animated.View entering={FadeInDown.springify()}>
          <Text style={styles.sectionTitle}>Time Period</Text>
          <View style={styles.dayRow}>
            {DAY_OPTIONS.map(d => (
              <Pressable
                key={d}
                style={[styles.dayChip, days === d && styles.dayChipActive]}
                onPress={() => setDays(d)}
              >
                <Text style={[styles.dayChipText, days === d && styles.dayChipTextActive]}>{d}d</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Funnel */}
        <Animated.View entering={FadeInDown.delay(60).springify()}>
          <Text style={styles.sectionTitle}>Activation Funnel</Text>
          {isLoading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : funnel.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No events recorded yet.</Text>
            </View>
          ) : (
            <View style={styles.funnelCard}>
              {funnel.map((step, i) => {
                const prevCount = i > 0 ? funnel[i - 1].count : null;
                const pct = prevCount !== null ? conversionPct(prevCount, step.count) : null;
                const barWidth = funnel[0].count > 0 ? Math.max(4, (step.count / funnel[0].count) * 100) : 0;
                return (
                  <View key={step.event} style={[styles.funnelRow, i > 0 && styles.funnelRowBorder]}>
                    <View style={styles.funnelLeft}>
                      <Text style={styles.funnelLabel}>{FUNNEL_LABELS[step.event] ?? step.event}</Text>
                      {pct !== null && (
                        <Text style={[styles.funnelConv, pct < 30 && { color: Colors.crimson }, pct >= 30 && pct < 70 && { color: Colors.amber }, pct >= 70 && { color: Colors.green }]}>
                          {pct}% from prev
                        </Text>
                      )}
                      <View style={styles.funnelBarBg}>
                        <View style={[styles.funnelBarFill, { width: `${barWidth}%` }]} />
                      </View>
                    </View>
                    <Text style={styles.funnelCount}>{step.count.toLocaleString()}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* DAU */}
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <Text style={styles.sectionTitle}>Daily Active Users</Text>
          {isLoading ? (
            <ActivityIndicator color={Colors.accent} />
          ) : dau.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No activity data yet.</Text>
            </View>
          ) : (
            <View style={styles.dauCard}>
              {[...dau].reverse().slice(0, 14).reverse().map((row) => {
                const maxDau = Math.max(...dau.map(r => Number(r.n)), 1);
                const barPct = Math.max(4, (Number(row.n) / maxDau) * 100);
                const dayLabel = new Date(row.day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                return (
                  <View key={row.day} style={styles.dauRow}>
                    <Text style={styles.dauLabel}>{dayLabel}</Text>
                    <View style={styles.dauBarBg}>
                      <View style={[styles.dauBarFill, { width: `${barPct}%` }]} />
                    </View>
                    <Text style={styles.dauCount}>{Number(row.n)}</Text>
                  </View>
                );
              })}
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
  refreshBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, gap: 24 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary, marginBottom: 12 },

  dayRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  dayChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  dayChipActive: { backgroundColor: Colors.accentGlow, borderColor: Colors.accentDim },
  dayChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.accent },

  emptyCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 24, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },

  funnelCard: { backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  funnelRow: { padding: 14, gap: 6 },
  funnelRowBorder: { borderTopWidth: 1, borderTopColor: Colors.borderLight },
  funnelLeft: { gap: 4 },
  funnelLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  funnelConv: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  funnelBarBg: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginTop: 4 },
  funnelBarFill: { height: 4, backgroundColor: Colors.accent, borderRadius: 2 },
  funnelCount: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },

  dauCard: { backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 10 },
  dauRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dauLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, width: 50 },
  dauBarBg: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3 },
  dauBarFill: { height: 6, backgroundColor: Colors.cyan, borderRadius: 3 },
  dauCount: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textPrimary, width: 28, textAlign: "right" },
});

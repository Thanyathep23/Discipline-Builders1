import React from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface KillSwitchStatus {
  key: string;
  killed: boolean;
  description: string;
  updatedAt: string | null;
  updatedBy: string | null;
}

export default function AdminKillSwitchesScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const qc = useQueryClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin", "kill-switches"],
    queryFn: () => request<{ killSwitches: KillSwitchStatus[] }>("/admin/kill-switches"),
  });

  const killMutation = useMutation({
    mutationFn: (key: string) =>
      request<any>(`/admin/kill-switches/${encodeURIComponent(key)}/kill`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "kill-switches"] }),
    onError: (err: any) => Alert.alert("Error", err?.message ?? "Failed to activate kill-switch."),
  });

  const reviveMutation = useMutation({
    mutationFn: (key: string) =>
      request<any>(`/admin/kill-switches/${encodeURIComponent(key)}/revive`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "kill-switches"] }),
    onError: (err: any) => Alert.alert("Error", err?.message ?? "Failed to revive subsystem."),
  });

  const isPending = killMutation.isPending || reviveMutation.isPending;

  function confirmToggle(sw: KillSwitchStatus) {
    if (sw.killed) {
      Alert.alert(
        "Re-enable Subsystem",
        `Revive "${sw.key}"?\n\n${sw.description}`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Revive", style: "default", onPress: () => reviveMutation.mutate(sw.key) },
        ]
      );
    } else {
      Alert.alert(
        "Kill Subsystem",
        `Disable "${sw.key}"?\n\n${sw.description}\n\nThis takes effect immediately.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Kill", style: "destructive", onPress: () => killMutation.mutate(sw.key) },
        ]
      );
    }
  }

  const switches: KillSwitchStatus[] = data?.killSwitches ?? [];
  const killedCount = switches.filter(s => s.killed).length;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Kill Switches</Text>
        <Pressable onPress={() => refetch()} style={styles.refreshBtn} disabled={isLoading}>
          <Ionicons name="refresh" size={18} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        <Animated.View entering={FadeInDown.springify()}>
          <View style={[styles.alertBanner, killedCount > 0 ? styles.alertBannerActive : styles.alertBannerSafe]}>
            <Ionicons
              name={killedCount > 0 ? "warning" : "shield-checkmark"}
              size={18}
              color={killedCount > 0 ? Colors.crimson : Colors.green}
            />
            <Text style={[styles.alertText, { color: killedCount > 0 ? Colors.crimson : Colors.green }]}>
              {killedCount > 0
                ? `${killedCount} subsystem${killedCount > 1 ? "s" : ""} currently disabled`
                : "All subsystems live — no active kill-switches"}
            </Text>
          </View>

          <View style={styles.warnBanner}>
            <Ionicons name="warning-outline" size={15} color={Colors.amber} />
            <Text style={styles.warnText}>
              Kill-switches disable subsystems immediately for all users. Each action is audit-logged.
            </Text>
          </View>
        </Animated.View>

        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
        ) : (
          switches.map((sw, i) => (
            <Animated.View key={sw.key} entering={FadeInDown.delay(i * 50).springify()}>
              <View style={[styles.card, sw.killed && styles.cardKilled]}>
                <View style={styles.cardTop}>
                  <View style={styles.statusDot}>
                    <View style={[styles.dot, { backgroundColor: sw.killed ? Colors.crimson : Colors.green }]} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.keyText}>{sw.key}</Text>
                    <Text style={styles.descText}>{sw.description}</Text>
                    {sw.updatedAt && (
                      <Text style={styles.metaText}>
                        Last changed {new Date(sw.updatedAt).toLocaleString()}
                        {sw.updatedBy ? ` · ${sw.updatedBy.slice(0, 8)}` : ""}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <View style={[styles.statusPill, sw.killed ? styles.statusPillKilled : styles.statusPillLive]}>
                    <Text style={[styles.statusPillText, { color: sw.killed ? Colors.crimson : Colors.green }]}>
                      {sw.killed ? "KILLED" : "LIVE"}
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.toggleBtn,
                      sw.killed ? styles.toggleBtnRevive : styles.toggleBtnKill,
                      (pressed || isPending) && { opacity: 0.6 },
                    ]}
                    onPress={() => confirmToggle(sw)}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons
                          name={sw.killed ? "power" : "stop-circle-outline"}
                          size={14}
                          color="#fff"
                        />
                        <Text style={styles.toggleBtnText}>
                          {sw.killed ? "Revive" : "Kill"}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard,
  },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard,
  },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },

  scroll: { paddingHorizontal: 20, gap: 12 },

  alertBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, padding: 14, marginBottom: 4,
    borderWidth: 1,
  },
  alertBannerSafe: {
    backgroundColor: Colors.greenDim, borderColor: Colors.green + "30",
  },
  alertBannerActive: {
    backgroundColor: Colors.crimsonDim, borderColor: Colors.crimson + "40",
  },
  alertText: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },

  warnBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: Colors.amberDim, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.amber + "30", marginBottom: 8,
  },
  warnText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.amber, flex: 1, lineHeight: 17 },

  card: {
    backgroundColor: Colors.bgCard, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  cardKilled: {
    borderColor: Colors.crimson + "40", backgroundColor: Colors.crimsonDim,
  },

  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  statusDot: { paddingTop: 3 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardInfo: { flex: 1, gap: 3 },
  keyText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textPrimary },
  descText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  metaText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  statusPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  statusPillLive: { backgroundColor: Colors.greenDim, borderColor: Colors.green + "30" },
  statusPillKilled: { backgroundColor: Colors.crimsonDim, borderColor: Colors.crimson + "30" },
  statusPillText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1 },

  toggleBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10,
  },
  toggleBtnKill: { backgroundColor: Colors.crimson },
  toggleBtnRevive: { backgroundColor: Colors.green + "CC" },
  toggleBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },
});

import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useMissions, useStartSession, useActiveSession } from "@/hooks/useApi";

const TABS = ["active", "completed", "draft", "archived"] as const;

function PriorityBar({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    low: Colors.priorityLow, medium: Colors.priorityMedium,
    high: Colors.priorityHigh, critical: Colors.priorityCritical,
  };
  return <View style={{ width: 3, height: "100%", borderRadius: 2, backgroundColor: map[priority] ?? Colors.textMuted }} />;
}

export default function MissionsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("active");
  const { data: missions, isLoading, refetch, isRefetching } = useMissions(activeTab);
  const { data: activeSessionData } = useActiveSession();
  const startSession = useStartSession();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 84);

  async function handleStartFocus(missionId: string) {
    if (activeSessionData?.hasActive) {
      router.push("/focus/active");
      return;
    }
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await startSession.mutateAsync({ missionId, strictnessMode: "normal" });
      router.push("/focus/active");
    } catch (err: any) {
      console.error(err);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Missions</Text>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/mission/new"); }}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {TABS.map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => { setActiveTab(tab); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        refreshControl={<RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={Colors.accent} />}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 60 }} />
        ) : !missions?.length ? (
          <View style={styles.emptyBox}>
            <Ionicons name="telescope-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No {activeTab} missions</Text>
            <Text style={styles.emptyText}>Create a mission to get started.</Text>
            {activeTab === "active" && (
              <Pressable
                style={styles.emptyBtn}
                onPress={() => router.push("/mission/new")}
              >
                <Text style={styles.emptyBtnText}>Create Mission</Text>
              </Pressable>
            )}
          </View>
        ) : (
          missions.map((m: any, i: number) => (
            <AnimatedMissionCard
              key={m.id}
              mission={m}
              index={i}
              onOpen={() => router.push(`/mission/${m.id}`)}
              onFocus={() => handleStartFocus(m.id)}
              showFocus={activeTab === "active"}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function AnimatedMissionCard({ mission: m, index, onOpen, onFocus, showFocus }: any) {
  const priorityColorMap: Record<string, string> = {
    low: Colors.priorityLow, medium: Colors.priorityMedium,
    high: Colors.priorityHigh, critical: Colors.priorityCritical,
  };
  const pColor = priorityColorMap[m.priority] ?? Colors.textSecondary;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} onPress={onOpen}>
        <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
          <PriorityBar priority={m.priority} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{m.title}</Text>
              <View style={[styles.priorityChip, { backgroundColor: pColor + "20" }]}>
                <Text style={[styles.priorityLabel, { color: pColor }]}>{m.priority.toUpperCase()}</Text>
              </View>
            </View>
            {m.description ? <Text style={styles.cardDesc} numberOfLines={2}>{m.description}</Text> : null}
            <View style={styles.cardMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText}>{m.targetDurationMinutes}min</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="layers-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaText}>{m.category}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="flash-outline" size={13} color={Colors.gold} />
                <Text style={[styles.metaText, { color: Colors.gold }]}>{m.rewardPotential}</Text>
              </View>
            </View>
          </View>
        </View>
        {showFocus && (
          <Pressable
            style={({ pressed }) => [styles.focusBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] }]}
            onPress={(e) => { e.stopPropagation?.(); onFocus(); }}
          >
            <Ionicons name="play" size={16} color="#fff" />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.textPrimary, letterSpacing: -0.5 },
  addBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accent,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  tabRow: { flexGrow: 0, marginBottom: 16 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  tabTextActive: { color: "#fff" },
  scroll: { paddingHorizontal: 20, gap: 12 },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textPrimary, flex: 1 },
  cardDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  cardMeta: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  priorityChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  priorityLabel: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.8 },
  focusBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.green,
    alignItems: "center", justifyContent: "center",
    shadowColor: Colors.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  emptyBox: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.textSecondary },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.accent, borderRadius: 12 },
  emptyBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
});

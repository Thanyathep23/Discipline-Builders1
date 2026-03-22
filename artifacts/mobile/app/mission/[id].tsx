import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useMissions, useUpdateMission, useStartSession, useActiveSession } from "@/hooks/useApi";

const STRICTNESS_OPTIONS = [
  { mode: "normal", label: "Normal", desc: "Up to 3 pauses, standard penalties", color: Colors.strictNormal },
  { mode: "strict", label: "Strict", desc: "Only 1 pause, higher rewards", color: Colors.strictStrict },
  { mode: "extreme", label: "Extreme", desc: "No pauses, maximum rewards", color: Colors.strictExtreme },
] as const;

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [strictnessModal, setStrictnessModal] = useState(false);
  const [selectedStrictness, setSelectedStrictness] = useState<"normal" | "strict" | "extreme">("normal");
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const { data: missions } = useMissions();
  const mission = missions?.find((m: any) => m.id === id);
  const { data: activeSessionData } = useActiveSession();
  const updateMission = useUpdateMission();
  const startSession = useStartSession();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (!mission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  const priorityColorMap: Record<string, string> = {
    low: Colors.priorityLow, medium: Colors.priorityMedium,
    high: Colors.priorityHigh, critical: Colors.priorityCritical,
  };
  const pColor = priorityColorMap[mission.priority] ?? Colors.textSecondary;

  async function handleStartFocus() {
    if (activeSessionData?.hasActive) {
      router.push("/focus/active");
      return;
    }
    setStrictnessModal(true);
  }

  async function confirmStartSession() {
    setStrictnessModal(false);
    setStartError(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      await startSession.mutateAsync({ missionId: mission.id, strictnessMode: selectedStrictness });
      router.push("/focus/active");
    } catch (err: any) {
      setStartError(err?.message ?? "Failed to start session. Try again.");
    }
  }

  function handleArchive() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setShowArchiveModal(true);
  }

  async function confirmArchive() {
    setShowArchiveModal(false);
    await updateMission.mutateAsync({ id: mission.id, data: { status: "archived" } });
    router.back();
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Pressable onPress={handleArchive} style={styles.archiveBtn}>
          <Ionicons name="archive-outline" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      {startError && (
        <Pressable
          style={styles.errorBanner}
          onPress={() => setStartError(null)}
        >
          <Ionicons name="alert-circle-outline" size={15} color={Colors.crimson} />
          <Text style={styles.errorBannerText} numberOfLines={2}>{startError}</Text>
          <Ionicons name="close" size={14} color={Colors.crimson} />
        </Pressable>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        {/* Title & Priority */}
        <Animated.View entering={FadeInDown.springify()}>
          <View style={[styles.priorityBar, { backgroundColor: pColor }]} />
          <Text style={styles.title}>{mission.title}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: pColor + "20", borderColor: pColor + "50" }]}>
              <Text style={[styles.badgeText, { color: pColor }]}>{mission.priority.toUpperCase()}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="layers-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.badgeText}>{mission.category}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.badgeText}>{mission.targetDurationMinutes}min</Text>
            </View>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.statsRow}>
          <View style={styles.statBox}>
            <Ionicons name="flash" size={20} color={Colors.gold} />
            <Text style={styles.statValue}>{mission.rewardPotential}</Text>
            <Text style={styles.statLabel}>Max Coins</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="trending-up" size={20} color={Colors.cyan} />
            <Text style={styles.statValue}>{mission.impactLevel}/10</Text>
            <Text style={styles.statLabel}>Impact</Text>
          </View>
          <View style={styles.statBox}>
            <View style={[styles.statusDot, { backgroundColor: mission.status === "active" ? Colors.green : mission.status === "completed" ? Colors.accent : Colors.textMuted }]} />
            <Text style={styles.statValue}>{mission.status}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </Animated.View>

        {/* Description & Purpose */}
        {mission.description && (
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.infoCard}>
            <Text style={styles.infoTitle}>Description</Text>
            <Text style={styles.infoText}>{mission.description}</Text>
          </Animated.View>
        )}

        {mission.purpose && (
          <Animated.View entering={FadeInDown.delay(160).springify()} style={[styles.infoCard, { borderColor: Colors.accent + "30" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ionicons name="flame" size={16} color={Colors.accent} />
              <Text style={[styles.infoTitle, { color: Colors.accent }]}>Why This Matters</Text>
            </View>
            <Text style={styles.infoText}>{mission.purpose}</Text>
          </Animated.View>
        )}

        {/* Required Proof */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.proofCard}>
          <Text style={styles.infoTitle}>Required Proof</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {mission.requiredProofTypes?.map((pt: string) => (
              <View key={pt} style={styles.proofChip}>
                <Ionicons name="checkmark" size={12} color={Colors.accent} />
                <Text style={styles.proofChipText}>{pt}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Focus Button */}
        {mission.status === "active" && (
          <Animated.View entering={FadeInDown.delay(240).springify()}>
            <Pressable
              style={({ pressed }) => [styles.focusBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
              onPress={handleStartFocus}
              disabled={startSession.isPending}
            >
              <Ionicons name="play-circle" size={24} color="#fff" />
              <Text style={styles.focusBtnText}>
                {activeSessionData?.hasActive ? "Resume Active Session" : "Start Focus Session"}
              </Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* Archive Confirmation Modal */}
      <Modal visible={showArchiveModal} transparent animationType="fade" onRequestClose={() => setShowArchiveModal(false)}>
        <Pressable style={styles.confirmOverlay} onPress={() => setShowArchiveModal(false)}>
          <Pressable style={styles.confirmSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.confirmIconRing}>
              <Ionicons name="archive-outline" size={26} color={Colors.amber} />
            </View>
            <Text style={styles.confirmTitle}>Archive Mission?</Text>
            <Text style={styles.confirmSub}>This mission will be moved to your archive. You can still view it but won't earn XP from it.</Text>
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.85 }]}
              onPress={confirmArchive}
              disabled={updateMission.isPending}
            >
              <Text style={styles.confirmBtnText}>Archive</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.confirmCancel, pressed && { opacity: 0.7 }]}
              onPress={() => setShowArchiveModal(false)}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Strictness Modal */}
      <Modal visible={strictnessModal} transparent animationType="slide" onRequestClose={() => setStrictnessModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Choose Strictness Mode</Text>
            <Text style={styles.modalSubtitle}>Stricter modes = fewer pauses + higher rewards</Text>
            <View style={styles.strictnessOptions}>
              {STRICTNESS_OPTIONS.map(opt => (
                <Pressable
                  key={opt.mode}
                  style={[styles.strictnessCard, selectedStrictness === opt.mode && { borderColor: opt.color, backgroundColor: opt.color + "10" }]}
                  onPress={() => { setSelectedStrictness(opt.mode); Haptics.selectionAsync(); }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[styles.strictnessLabel, selectedStrictness === opt.mode && { color: opt.color }]}>{opt.label}</Text>
                    {selectedStrictness === opt.mode && <Ionicons name="checkmark-circle" size={18} color={opt.color} />}
                  </View>
                  <Text style={styles.strictnessDesc}>{opt.desc}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={styles.startBtn} onPress={confirmStartSession}>
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={styles.startBtnText}>Begin Session</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

import { ActivityIndicator } from "react-native";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  archiveBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  scroll: { paddingHorizontal: 20, gap: 20 },
  priorityBar: { height: 3, borderRadius: 2, marginBottom: 12 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.textPrimary, letterSpacing: -0.5, lineHeight: 34, marginBottom: 12 },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.bgCard, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 0.5 },
  statsRow: { flexDirection: "row", gap: 12 },
  statBox: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  infoCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 8 },
  infoTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary, letterSpacing: 0.5 },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  proofCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  proofChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.accentGlow, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  proofChipText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.accent },
  focusBtn: {
    backgroundColor: Colors.accent, borderRadius: 16, height: 58, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 10,
  },
  focusBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 16, borderWidth: 1, borderColor: Colors.border,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: "center", marginBottom: 8 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  modalSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  strictnessOptions: { gap: 10 },
  strictnessCard: {
    backgroundColor: Colors.bgElevated, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: Colors.border, gap: 6,
  },
  strictnessLabel: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  strictnessDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  startBtn: {
    backgroundColor: Colors.accent, borderRadius: 14, height: 54, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 7,
  },
  startBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  errorBanner: {
    flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 20, marginBottom: 12,
    backgroundColor: Colors.crimsonDim, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.crimson + "40",
  },
  errorBannerText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.crimson, lineHeight: 18 },
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 32 },
  confirmSheet: { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 28, gap: 12, width: "100%", maxWidth: 380, borderWidth: 1, borderColor: Colors.border, alignItems: "center" },
  confirmIconRing: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.amberDim, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  confirmTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary, textAlign: "center" },
  confirmSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
  confirmBtn: { width: "100%", backgroundColor: Colors.amber, borderRadius: 14, height: 50, alignItems: "center", justifyContent: "center", marginTop: 4 },
  confirmBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#000" },
  confirmCancel: { width: "100%", alignItems: "center", justifyContent: "center", height: 40 },
  confirmCancelText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textMuted },
});

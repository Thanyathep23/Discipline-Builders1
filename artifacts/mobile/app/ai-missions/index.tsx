import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useGenerateAiMissions, useCreateMission, useLifeProfile } from "@/hooks/useApi";

const CATEGORY_COLORS: Record<string, string> = {
  Work: Colors.accent, Study: Colors.cyan, Learning: Colors.cyan, Creative: Colors.crimson,
  Health: Colors.green, Finance: Colors.gold, Personal: Colors.amber, Project: Colors.textAccent,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: Colors.priorityLow, medium: Colors.priorityMedium, high: Colors.priorityHigh, critical: Colors.priorityCritical,
};

export default function AiMissionsScreen() {
  const insets = useSafeAreaInsets();
  const [missions, setMissions] = useState<any[]>([]);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const { mutateAsync: generate, isPending: isGenerating } = useGenerateAiMissions();
  const { mutateAsync: createMission, isPending: isCreating } = useCreateMission();
  const { data: profileData } = useLifeProfile();
  const hasProfile = profileData?.exists && profileData?.profile?.quickStartDone;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const bottomPad = insets.bottom + 32;

  async function handleGenerate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const data = await generate(5);
      setMissions(data.missions ?? []);
      setAccepted(new Set());
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }

  async function handleAccept(idx: number, mission: any) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await createMission({
        title: mission.title,
        description: mission.description,
        category: mission.category,
        priority: mission.priority,
        targetDurationMinutes: mission.targetDurationMinutes,
        impactLevel: mission.impactLevel,
        requiredProofTypes: mission.requiredProofTypes,
        purpose: mission.purposeStatement,
        tags: mission.tags,
      });
      setAccepted((prev) => new Set(prev).add(idx));
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.screenTitle}>AI Mission Board</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        {!hasProfile && (
          <Animated.View entering={FadeInDown.springify()} style={styles.profileBanner}>
            <Ionicons name="person-outline" size={20} color={Colors.amber} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Life Profile Needed</Text>
              <Text style={styles.bannerText}>Complete your quick start to get personalized missions.</Text>
            </View>
            <Pressable style={styles.bannerBtn} onPress={() => router.push("/onboarding")}>
              <Text style={styles.bannerBtnText}>Set Up</Text>
            </Pressable>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles" size={32} color={Colors.accent} />
          </View>
          <Text style={styles.heroTitle}>AI Game Master</Text>
          <Text style={styles.heroText}>
            Your AI Game Master analyzes your life profile and generates missions tailored to your goals, available time, and skill gaps.
          </Text>
          <Pressable style={[styles.generateBtn, isGenerating && { opacity: 0.7 }]} onPress={handleGenerate} disabled={isGenerating}>
            <Ionicons name={isGenerating ? "hourglass-outline" : "game-controller-outline"} size={20} color={Colors.bg} />
            <Text style={styles.generateBtnText}>{isGenerating ? "Generating..." : missions.length > 0 ? "Regenerate Missions" : "Generate My Missions"}</Text>
          </Pressable>
        </Animated.View>

        {missions.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Generated for You</Text>
            {missions.map((mission, i) => {
              const isAccepted = accepted.has(i);
              return (
                <Animated.View key={i} entering={FadeInDown.delay(i * 80).springify()} style={[styles.missionCard, isAccepted && styles.missionCardAccepted]}>
                  <View style={styles.missionTop}>
                    <View style={[styles.categoryBadge, { backgroundColor: `${CATEGORY_COLORS[mission.category] ?? Colors.accent}18` }]}>
                      <Text style={[styles.categoryText, { color: CATEGORY_COLORS[mission.category] ?? Colors.accent }]}>{mission.category}</Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: `${PRIORITY_COLORS[mission.priority] ?? Colors.amber}18` }]}>
                      <Text style={[styles.priorityText, { color: PRIORITY_COLORS[mission.priority] ?? Colors.amber }]}>{mission.priority}</Text>
                    </View>
                  </View>

                  <Text style={styles.missionTitle}>{mission.title}</Text>
                  <Text style={styles.missionDesc}>{mission.description}</Text>

                  <View style={styles.purposeBox}>
                    <Ionicons name="bulb-outline" size={14} color={Colors.gold} />
                    <Text style={styles.purposeText}>{mission.purposeStatement}</Text>
                  </View>

                  <View style={styles.missionMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="timer-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.metaText}>{mission.targetDurationMinutes}m</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="flash-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.metaText}>Impact {mission.impactLevel}/10</Text>
                    </View>
                  </View>

                  {isAccepted ? (
                    <View style={styles.acceptedRow}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.green} />
                      <Text style={styles.acceptedText}>Added to your missions</Text>
                    </View>
                  ) : (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={styles.acceptBtn}
                        onPress={() => handleAccept(i, mission)}
                        disabled={isCreating}
                      >
                        <Ionicons name="add-circle-outline" size={16} color={Colors.bg} />
                        <Text style={styles.acceptBtnText}>Accept Mission</Text>
                      </Pressable>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, gap: 16 },
  profileBanner: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 16,
    backgroundColor: Colors.amberDim, borderRadius: 16, borderWidth: 1, borderColor: Colors.amber,
  },
  bannerTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.amber },
  bannerText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  bannerBtn: { backgroundColor: Colors.amber, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bannerBtnText: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.bg },
  heroCard: {
    backgroundColor: Colors.bgCard, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 12,
  },
  heroIcon: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.accentGlow,
    alignItems: "center", justifyContent: "center",
  },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  heroText: {
    fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary,
    textAlign: "center", lineHeight: 22,
  },
  generateBtn: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.accent,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 4,
  },
  generateBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.bg },
  sectionLabel: {
    fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textMuted,
    letterSpacing: 1, textTransform: "uppercase",
  },
  missionCard: {
    backgroundColor: Colors.bgCard, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  missionCardAccepted: { borderColor: Colors.green, backgroundColor: Colors.greenDim },
  missionTop: { flexDirection: "row", gap: 8 },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase" },
  missionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary },
  missionDesc: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  purposeBox: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: Colors.goldDim, borderRadius: 10, padding: 10,
  },
  purposeText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  missionMeta: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  acceptedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  acceptedText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.green },
  actionRow: { flexDirection: "row", gap: 10 },
  acceptBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 12,
  },
  acceptBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.bg },
});

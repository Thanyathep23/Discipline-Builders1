import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, Alert, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useAiMissions, useGenerateAiMissions, useRespondToAiMission, useLifeProfile } from "@/hooks/useApi";

const DIFFICULTY_COLORS: Record<string, string> = {
  gray:   "#9E9E9E",
  green:  "#4CAF50",
  blue:   "#2196F3",
  purple: "#9C27B0",
  gold:   "#F5C842",
  red:    "#F44336",
};

const SKILL_ICONS: Record<string, string> = {
  focus:      "eye",
  discipline: "shield",
  sleep:      "moon",
  fitness:    "barbell",
  learning:   "book",
  trading:    "trending-up",
};

const CATEGORY_LABELS: Record<string, string> = {
  daily_discipline: "Daily Discipline",
  skill_growth:     "Skill Growth",
  trading_practice: "Trading Practice",
  recovery_reset:   "Recovery Reset",
};

function DifficultyBadge({ color }: { color: string }) {
  const c = DIFFICULTY_COLORS[color] ?? "#9E9E9E";
  return (
    <View style={[diffBadgeStyles.badge, { borderColor: c + "60", backgroundColor: c + "18" }]}>
      <View style={[diffBadgeStyles.dot, { backgroundColor: c }]} />
      <Text style={[diffBadgeStyles.text, { color: c }]}>{color.toUpperCase()}</Text>
    </View>
  );
}

const diffBadgeStyles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  text:  { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.8 },
});

function ProofRequirementsModal({ proofReq, onClose }: { proofReq: any; onClose: () => void }) {
  const types: string[] = (() => {
    try { return JSON.parse(proofReq.acceptedProofTypes ?? '["text"]'); }
    catch { return ["text"]; }
  })();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Ionicons name="shield-checkmark" size={22} color={Colors.accent} />
            <Text style={styles.modalTitle}>Proof Requirements</Text>
          </View>
          <View style={styles.reqRow}>
            <Text style={styles.reqLabel}>Accepted proof types</Text>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {types.map((t) => (
                <View key={t} style={styles.typeChip}>
                  <Text style={styles.typeChipText}>{t.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.reqRow}>
            <Text style={styles.reqLabel}>Minimum proof count</Text>
            <Text style={styles.reqValue}>{proofReq.minimumProofCount ?? 1}</Text>
          </View>
          <View style={styles.reqRow}>
            <Text style={styles.reqLabel}>Difficulty tier</Text>
            <Text style={styles.reqValue}>{proofReq.proofDifficultyTier ?? "basic"}</Text>
          </View>
          {proofReq.reviewRubricSummary ? (
            <View style={styles.rubricBox}>
              <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.rubricText}>{proofReq.reviewRubricSummary}</Text>
            </View>
          ) : null}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Got it</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function MissionCard({
  mission, onRespond, isResponding,
}: {
  mission: any;
  onRespond: (missionId: string, action: string) => void;
  isResponding: boolean;
}) {
  const [showProof, setShowProof] = useState(false);
  const proofTypes: string[] = (() => {
    try { return JSON.parse(mission.recommendedProofTypes ?? '["text"]'); }
    catch { return ["text"]; }
  })();
  const diffColor = DIFFICULTY_COLORS[mission.difficultyColor] ?? Colors.textMuted;
  const skillIcon = SKILL_ICONS[mission.relatedSkill] ?? "star";
  const isHandled = ["accepted", "rejected", "not_now"].includes(mission.status);

  return (
    <View style={[styles.missionCard, isHandled && { opacity: 0.55 }]}>
      <View style={styles.missionTop}>
        <View style={[styles.skillChip, { backgroundColor: diffColor + "18" }]}>
          <Ionicons name={skillIcon as any} size={13} color={diffColor} />
          <Text style={[styles.skillChipText, { color: diffColor }]}>
            {mission.relatedSkill?.charAt(0).toUpperCase() + mission.relatedSkill?.slice(1)}
          </Text>
        </View>
        <DifficultyBadge color={mission.difficultyColor} />
        {mission.isStretch && (
          <View style={styles.stretchChip}>
            <Text style={styles.stretchText}>STRETCH</Text>
          </View>
        )}
        <Text style={styles.durationText}>
          <Ionicons name="timer-outline" size={11} color={Colors.textMuted} /> {mission.estimatedDurationMinutes}m
        </Text>
      </View>

      <Text style={styles.missionTitle}>{mission.title}</Text>
      <Text style={styles.missionDesc}>{mission.description}</Text>

      <View style={styles.reasonBox}>
        <Ionicons name="bulb-outline" size={13} color={Colors.gold} />
        <Text style={styles.reasonText}>{mission.reason}</Text>
      </View>

      <View style={styles.categoryRow}>
        <Text style={styles.categoryText}>{CATEGORY_LABELS[mission.missionCategory] ?? mission.missionCategory}</Text>
        {mission.suggestedRewardBonus > 0 && (
          <View style={styles.bonusChip}>
            <Ionicons name="flash" size={11} color={Colors.gold} />
            <Text style={styles.bonusText}>+{mission.suggestedRewardBonus} bonus</Text>
          </View>
        )}
      </View>

      <Pressable style={styles.proofPeek} onPress={() => setShowProof(true)}>
        <Ionicons name="shield-checkmark-outline" size={13} color={Colors.accent} />
        <Text style={styles.proofPeekText}>
          Proof: {proofTypes.join(", ")}
        </Text>
        <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} />
      </Pressable>

      {!isHandled ? (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.acceptBtn, isResponding && { opacity: 0.6 }]}
            onPress={() => onRespond(mission.id, "accepted")}
            disabled={isResponding}
          >
            <Ionicons name="checkmark-circle" size={16} color={Colors.bg} />
            <Text style={styles.acceptBtnText}>Accept</Text>
          </Pressable>
          <Pressable
            style={[styles.notNowBtn, isResponding && { opacity: 0.6 }]}
            onPress={() => onRespond(mission.id, "not_now")}
            disabled={isResponding}
          >
            <Text style={styles.notNowText}>Later</Text>
          </Pressable>
          <Pressable
            style={[styles.rejectBtn, isResponding && { opacity: 0.6 }]}
            onPress={() => onRespond(mission.id, "rejected")}
            disabled={isResponding}
          >
            <Ionicons name="close" size={16} color={Colors.crimson} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.statusRow}>
          <Ionicons
            name={mission.status === "accepted" ? "checkmark-circle" : mission.status === "not_now" ? "time" : "close-circle"}
            size={16}
            color={mission.status === "accepted" ? Colors.green : mission.status === "not_now" ? Colors.amber : Colors.crimson}
          />
          <Text style={[
            styles.statusText,
            { color: mission.status === "accepted" ? Colors.green : mission.status === "not_now" ? Colors.amber : Colors.crimson },
          ]}>
            {mission.status === "accepted" ? "Accepted — Added to missions" : mission.status === "not_now" ? "Saved for later" : "Rejected"}
          </Text>
        </View>
      )}

      {showProof && (
        <ProofRequirementsModal
          proofReq={{
            acceptedProofTypes: mission.recommendedProofTypes,
            minimumProofCount: 1,
            proofDifficultyTier: "standard",
            reviewRubricSummary: null,
          }}
          onClose={() => setShowProof(false)}
        />
      )}
    </View>
  );
}

export default function AiMissionsScreen() {
  const insets = useSafeAreaInsets();
  const [gmNote, setGmNote] = useState<string | null>(null);
  const { data: missionsData, isLoading, refetch } = useAiMissions();
  const { mutateAsync: generate, isPending: isGenerating } = useGenerateAiMissions();
  const { mutateAsync: respond, isPending: isResponding } = useRespondToAiMission();
  const { data: profileData } = useLifeProfile();
  const hasProfile = profileData?.exists && profileData?.profile?.quickStartDone;

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const bottomPad = insets.bottom + 32;

  const missions: any[] = missionsData?.missions ?? [];

  async function handleGenerate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const data = await generate(5);
      setGmNote(data.gmNote ?? null);
      refetch();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to generate missions");
    }
  }

  async function handleRespond(missionId: string, action: string) {
    Haptics.impactAsync(
      action === "accepted" ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
    );
    try {
      const data = await respond({ missionId, action });
      setGmNote(data.gmNote ?? null);
      if (action === "accepted") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      refetch();
    } catch (e: any) {
      Alert.alert("Failed", e.message ?? "Action failed");
    }
  }

  const pendingMissions = missions.filter((m) => m.status === "pending");
  const handledMissions = missions.filter((m) => m.status !== "pending");

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.screenTitle}>Mission Board</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
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

        {gmNote && (
          <Animated.View entering={FadeInDown.springify()} style={styles.gmNoteCard}>
            <View style={styles.gmNoteHeader}>
              <Ionicons name="game-controller" size={16} color={Colors.accent} />
              <Text style={styles.gmNoteLabel}>Game Master</Text>
            </View>
            <Text style={styles.gmNoteText}>{gmNote}</Text>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles" size={28} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>AI Game Master</Text>
            <Text style={styles.heroText}>
              Personalized missions built from your life profile, skill levels, and goals.
            </Text>
          </View>
          <Pressable
            style={[styles.generateBtn, isGenerating && { opacity: 0.7 }]}
            onPress={handleGenerate}
            disabled={isGenerating}
          >
            <Ionicons name={isGenerating ? "hourglass-outline" : "refresh"} size={18} color={Colors.bg} />
            <Text style={styles.generateBtnText}>
              {isGenerating ? "Generating..." : missions.length > 0 ? "Refresh" : "Generate"}
            </Text>
          </Pressable>
        </Animated.View>

        {isLoading && (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading missions...</Text>
          </View>
        )}

        {pendingMissions.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Awaiting Your Decision</Text>
            {pendingMissions.map((m, i) => (
              <Animated.View key={m.id} entering={FadeInDown.delay(i * 70).springify()}>
                <MissionCard mission={m} onRespond={handleRespond} isResponding={isResponding} />
              </Animated.View>
            ))}
          </>
        )}

        {pendingMissions.length === 0 && !isLoading && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.emptyBox}>
            <Ionicons name="telescope-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No pending missions</Text>
            <Text style={styles.emptyText}>Generate new missions to see what your Game Master has planned.</Text>
          </Animated.View>
        )}

        {handledMissions.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Previous Decisions</Text>
            {handledMissions.slice(0, 5).map((m, i) => (
              <Animated.View key={m.id} entering={FadeInDown.delay(i * 50).springify()}>
                <MissionCard mission={m} onRespond={handleRespond} isResponding={isResponding} />
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  topBar:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  backBtn:         { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  screenTitle:     { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  scroll:          { paddingHorizontal: 20, gap: 16 },
  profileBanner:   { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: Colors.amberDim, borderRadius: 16, borderWidth: 1, borderColor: Colors.amber },
  bannerTitle:     { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.amber },
  bannerText:      { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  bannerBtn:       { backgroundColor: Colors.amber, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bannerBtnText:   { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.bg },
  gmNoteCard:      { backgroundColor: Colors.accentGlow, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.accent + "40", gap: 8 },
  gmNoteHeader:    { flexDirection: "row", alignItems: "center", gap: 6 },
  gmNoteLabel:     { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.accent, letterSpacing: 0.5 },
  gmNoteText:      { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textAccent, lineHeight: 20 },
  heroCard:        { backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon:        { width: 50, height: 50, borderRadius: 14, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  heroTitle:       { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  heroText:        { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginTop: 2 },
  generateBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  generateBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.bg },
  loadingBox:      { alignItems: "center", paddingVertical: 32 },
  loadingText:     { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  sectionLabel:    { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textMuted, letterSpacing: 1.2, textTransform: "uppercase" },
  emptyBox:        { alignItems: "center", gap: 12, paddingVertical: 40 },
  emptyTitle:      { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textSecondary },
  emptyText:       { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  missionCard:     { backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  missionTop:      { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  skillChip:       { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  skillChipText:   { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.5 },
  stretchChip:     { backgroundColor: Colors.crimson + "18", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  stretchText:     { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.crimson, letterSpacing: 0.8 },
  durationText:    { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginLeft: "auto" },
  missionTitle:    { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  missionDesc:     { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  reasonBox:       { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: Colors.goldDim, borderRadius: 10, padding: 10 },
  reasonText:      { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  categoryRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  categoryText:    { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  bonusChip:       { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.goldDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  bonusText:       { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.gold },
  proofPeek:       { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, borderTopWidth: 1, borderTopColor: Colors.border },
  proofPeekText:   { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1 },
  actionRow:       { flexDirection: "row", gap: 8, paddingTop: 4 },
  acceptBtn:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 11 },
  acceptBtnText:   { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.bg },
  notNowBtn:       { paddingHorizontal: 16, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgElevated, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  notNowText:      { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary },
  rejectBtn:       { width: 44, alignItems: "center", justifyContent: "center", backgroundColor: Colors.crimson + "15", borderRadius: 12, borderWidth: 1, borderColor: Colors.crimson + "30" },
  statusRow:       { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 4 },
  statusText:      { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  modalOverlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard:       { backgroundColor: Colors.bgCard, borderRadius: 24, padding: 24, width: "100%", gap: 14, borderWidth: 1, borderColor: Colors.border },
  modalHeader:     { flexDirection: "row", alignItems: "center", gap: 10 },
  modalTitle:      { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  reqRow:          { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  reqLabel:        { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  reqValue:        { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  typeChip:        { backgroundColor: Colors.accentGlow, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeChipText:    { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.accent, letterSpacing: 0.5 },
  rubricBox:       { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: Colors.bgElevated, borderRadius: 10, padding: 10 },
  rubricText:      { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  closeBtn:        { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 13, alignItems: "center", marginTop: 4 },
  closeBtnText:    { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.bg },
});

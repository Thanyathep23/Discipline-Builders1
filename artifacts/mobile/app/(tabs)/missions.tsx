import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  ActivityIndicator, RefreshControl, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import {
  useMissions, useStartSession, useActiveSession,
  useAiMissions, useGenerateAiMissions, useRespondToAiMission,
} from "@/hooks/useApi";

const BOARD_TABS = ["mine", "ai"] as const;
const MISSION_TABS = ["active", "completed", "draft", "archived"] as const;

const DIFF_COLORS: Record<string, string> = {
  gray:   "#9E9E9E",
  green:  "#4CAF50",
  blue:   "#2196F3",
  purple: "#9C27B0",
  gold:   "#F5C842",
  red:    "#F44336",
};

const SKILL_ICONS: Record<string, string> = {
  focus: "eye", discipline: "shield", sleep: "moon",
  fitness: "barbell", learning: "book", trading: "trending-up",
};

const CAT_LABELS: Record<string, string> = {
  daily_discipline: "Daily Discipline",
  skill_growth:     "Skill Growth",
  trading_practice: "Trading Practice",
  recovery_reset:   "Recovery & Reset",
};

function DifficultyDot({ color }: { color: string }) {
  const c = DIFF_COLORS[color] ?? "#9E9E9E";
  return (
    <View style={[diffDotStyles.badge, { borderColor: c + "80", backgroundColor: c + "18" }]}>
      <View style={[diffDotStyles.dot, { backgroundColor: c }]} />
      <Text style={[diffDotStyles.text, { color: c }]}>{color.toUpperCase()}</Text>
    </View>
  );
}

const diffDotStyles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  dot:   { width: 5, height: 5, borderRadius: 3 },
  text:  { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.8 },
});

function PriorityBar({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    low: Colors.priorityLow, medium: Colors.priorityMedium,
    high: Colors.priorityHigh, critical: Colors.priorityCritical,
  };
  return (
    <View style={{ width: 3, height: "100%", borderRadius: 2, backgroundColor: map[priority] ?? Colors.textMuted }} />
  );
}

export default function MissionsScreen() {
  const insets = useSafeAreaInsets();
  const [boardTab, setBoardTab] = useState<(typeof BOARD_TABS)[number]>("mine");
  const [missionTab, setMissionTab] = useState<(typeof MISSION_TABS)[number]>("active");
  const [whyModal, setWhyModal] = useState<{ visible: boolean; title: string; reason: string; skill: string; gmNote?: string } | null>(null);
  const [gmBriefing, setGmBriefing] = useState<string | null>(null);
  const [gmResponse, setGmResponse] = useState<string | null>(null);

  const { data: missions, isLoading: missionsLoading, refetch: refetchMissions, isRefetching: refetchingMissions } = useMissions(missionTab);
  const { data: aiData, isLoading: aiLoading, refetch: refetchAi, isRefetching: refetchingAi } = useAiMissions("pending");
  const { data: activeSessionData } = useActiveSession();
  const startSession = useStartSession();
  const generateAiMissions = useGenerateAiMissions();
  const respondToAiMission = useRespondToAiMission();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 84);

  const aiMissions: any[] = aiData?.missions ?? [];

  async function handleStartFocus(missionId: string) {
    if (activeSessionData?.hasActive) { router.push("/focus/active"); return; }
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await startSession.mutateAsync({ missionId, strictnessMode: "normal" });
      router.push("/focus/active");
    } catch (err: any) {
      console.error(err);
    }
  }

  async function handleGenerate() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await generateAiMissions.mutateAsync(5);
      if (result?.gmNote) {
        setGmBriefing(result.gmNote);
        setTimeout(() => setGmBriefing(null), 8000);
      }
    } catch (err: any) {
      console.error(err);
    }
  }

  async function handleRespond(missionId: string, action: string, m?: any) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (action === "ask_why" && m) {
      try {
        const result = await respondToAiMission.mutateAsync({ missionId, action });
        setWhyModal({
          visible: true,
          title: m.title,
          reason: m.reason,
          skill: m.relatedSkill,
          gmNote: result?.gmNote,
        });
      } catch {
        setWhyModal({ visible: true, title: m.title, reason: m.reason, skill: m.relatedSkill });
      }
      return;
    }
    try {
      const result = await respondToAiMission.mutateAsync({ missionId, action });
      if (action === "accepted") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (result?.gmNote) {
        setGmResponse(result.gmNote);
        setTimeout(() => setGmResponse(null), 5000);
      }
    } catch (err: any) {
      console.error(err);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Mission Board</Text>
        {boardTab === "mine" && (
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/mission/new"); }}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        )}
        {boardTab === "ai" && (
          <Pressable
            style={({ pressed }) => [styles.genBtn, pressed && { opacity: 0.8 }, generateAiMissions.isPending && { opacity: 0.5 }]}
            onPress={handleGenerate}
            disabled={generateAiMissions.isPending}
          >
            {generateAiMissions.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="flash" size={18} color="#fff" />
            }
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.boardTabRow}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {BOARD_TABS.map((t) => (
          <Pressable
            key={t}
            style={[styles.boardTab, boardTab === t && styles.boardTabActive]}
            onPress={() => { setBoardTab(t); Haptics.selectionAsync(); }}
          >
            <Ionicons
              name={t === "mine" ? "list" : "flash"}
              size={14}
              color={boardTab === t ? "#fff" : Colors.textMuted}
            />
            <Text style={[styles.boardTabText, boardTab === t && styles.boardTabTextActive]}>
              {t === "mine" ? "My Missions" : "AI Generated"}
            </Text>
            {t === "ai" && aiMissions.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{aiMissions.length}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {boardTab === "mine" && (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.subTabRow}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            {MISSION_TABS.map((tab) => (
              <Pressable
                key={tab}
                style={[styles.subTab, missionTab === tab && styles.subTabActive]}
                onPress={() => { setMissionTab(tab); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.subTabText, missionTab === tab && styles.subTabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
            refreshControl={<RefreshControl refreshing={!!refetchingMissions} onRefresh={refetchMissions} tintColor={Colors.accent} />}
          >
            {missionsLoading ? (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 60 }} />
            ) : !missions?.length ? (
              <View style={styles.emptyBox}>
                <Ionicons name="telescope-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No {missionTab} missions</Text>
                <Text style={styles.emptyText}>Create a mission to get started.</Text>
                {missionTab === "active" && (
                  <Pressable style={styles.emptyBtn} onPress={() => router.push("/mission/new")}>
                    <Text style={styles.emptyBtnText}>Create Mission</Text>
                  </Pressable>
                )}
              </View>
            ) : (
              missions.map((m: any, i: number) => (
                <Animated.View key={m.id} entering={FadeInDown.delay(i * 50).springify()}>
                  <Pressable
                    style={({ pressed }) => [styles.missionCard, pressed && { opacity: 0.92 }]}
                    onPress={() => router.push(`/mission/${m.id}`)}
                  >
                    <View style={{ flexDirection: "row", gap: 12, flex: 1 }}>
                      <PriorityBar priority={m.priority} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <Text style={styles.cardTitle} numberOfLines={1}>{m.title}</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            {m.source === "ai_generated" && (
                              <View style={styles.aiChip}>
                                <Ionicons name="flash" size={10} color={Colors.accent} />
                                <Text style={styles.aiChipText}>AI</Text>
                              </View>
                            )}
                            {m.difficultyColor && <DifficultyDot color={m.difficultyColor} />}
                          </View>
                        </View>
                        {m.description ? (
                          <Text style={styles.cardDesc} numberOfLines={2}>{m.description}</Text>
                        ) : null}
                        <View style={styles.cardMeta}>
                          <MetaItem icon="time-outline" text={`${m.targetDurationMinutes}min`} />
                          <MetaItem icon="layers-outline" text={m.category} />
                          {m.relatedSkill && (
                            <MetaItem icon={(SKILL_ICONS[m.relatedSkill] ?? "star") as any} text={m.relatedSkill} color={Colors.cyan} />
                          )}
                          <View style={styles.metaItem}>
                            <Ionicons name="flash-outline" size={13} color={Colors.gold} />
                            <Text style={[styles.metaText, { color: Colors.gold }]}>{m.rewardPotential}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {missionTab === "active" && (
                      <Pressable
                        style={({ pressed }) => [styles.focusBtn, pressed && { opacity: 0.85 }]}
                        onPress={(e) => { e.stopPropagation?.(); handleStartFocus(m.id); }}
                      >
                        <Ionicons name="play" size={16} color="#fff" />
                      </Pressable>
                    )}
                  </Pressable>
                </Animated.View>
              ))
            )}
          </ScrollView>
        </>
      )}

      {boardTab === "ai" && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
          refreshControl={<RefreshControl refreshing={!!refetchingAi} onRefresh={refetchAi} tintColor={Colors.accent} />}
        >
          {gmBriefing && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.gmBriefing}>
              <Ionicons name="person" size={14} color={Colors.accent} />
              <Text style={styles.gmBriefingText}>{gmBriefing}</Text>
            </Animated.View>
          )}

          {gmResponse && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.gmResponse}>
              <Text style={styles.gmResponseText}>{gmResponse}</Text>
            </Animated.View>
          )}

          {aiLoading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginTop: 60 }} />
          ) : aiMissions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="flash-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No directives issued</Text>
              <Text style={styles.emptyText}>
                Generate missions calibrated to your current skill levels and goals.
              </Text>
              <Pressable style={styles.emptyBtn} onPress={handleGenerate}>
                {generateAiMissions.isPending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.emptyBtnText}>Generate Missions</Text>
                }
              </Pressable>
            </View>
          ) : (
            aiMissions.map((m: any, i: number) => (
              <Animated.View key={m.id} entering={FadeInDown.delay(i * 60).springify()}>
                <AiMissionCard
                  mission={m}
                  onRespond={(action) => handleRespond(m.id, action, m)}
                  isPending={respondToAiMission.isPending}
                />
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}

      {whyModal?.visible && (
        <Modal transparent animationType="fade" onRequestClose={() => setWhyModal(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setWhyModal(null)}>
            <View style={styles.whyModal}>
              <View style={styles.whyHeader}>
                <Ionicons name="person" size={18} color={Colors.accent} />
                <Text style={styles.whyTitle}>Game Master Briefing</Text>
              </View>
              <Text style={styles.whyMissionTitle}>{whyModal.title}</Text>
              {whyModal.gmNote && (
                <View style={styles.gmNoteBox}>
                  <Text style={styles.gmNoteText}>{whyModal.gmNote}</Text>
                </View>
              )}
              <View style={styles.whySkillRow}>
                <Ionicons name={(SKILL_ICONS[whyModal.skill] ?? "star") as any} size={14} color={Colors.cyan} />
                <Text style={styles.whySkillText}>Skill track: {whyModal.skill}</Text>
              </View>
              <Pressable style={styles.whyClose} onPress={() => setWhyModal(null)}>
                <Text style={styles.whyCloseText}>Understood</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

function MetaItem({ icon, text, color }: { icon: any; text: string; color?: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={13} color={color ?? Colors.textMuted} />
      <Text style={[styles.metaText, color ? { color } : {}]}>{text}</Text>
    </View>
  );
}

function AiMissionCard({ mission: m, onRespond, isPending }: { mission: any; onRespond: (a: string) => void; isPending: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const diffColor = DIFF_COLORS[m.difficultyColor] ?? "#9E9E9E";

  return (
    <View style={[styles.aiCard, { borderLeftColor: diffColor, borderLeftWidth: 3 }]}>
      <Pressable onPress={() => setExpanded(!expanded)}>
        <View style={styles.aiCardHeader}>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <DifficultyDot color={m.difficultyColor} />
              {m.isStretch && (
                <View style={styles.stretchChip}>
                  <Text style={styles.stretchText}>STRETCH TIER</Text>
                </View>
              )}
            </View>
            <Text style={styles.aiCardTitle}>{m.title}</Text>
            <View style={styles.aiMeta}>
              <MetaItem icon="time-outline" text={`${m.estimatedDurationMinutes}min`} />
              <MetaItem icon={(SKILL_ICONS[m.relatedSkill] ?? "star") as any} text={m.relatedSkill} color={Colors.cyan} />
              <MetaItem icon="flash-outline" text={`+${m.suggestedRewardBonus} bonus`} color={Colors.gold} />
            </View>
            <View style={styles.catChip}>
              <Text style={styles.catChipText}>{CAT_LABELS[m.missionCategory] ?? m.missionCategory}</Text>
            </View>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={Colors.textMuted}
          />
        </View>

        {expanded && (
          <View style={styles.aiCardExpanded}>
            <Text style={styles.aiCardDesc}>{m.description}</Text>
            <View style={styles.reasonBox}>
              <Ionicons name="navigate-outline" size={14} color={Colors.accent} />
              <Text style={styles.reasonText}>{m.reason}</Text>
            </View>
            {m.recommendedProofTypes && (
              <View style={styles.proofRow}>
                <Ionicons name="shield-checkmark-outline" size={13} color={Colors.textSecondary} />
                <Text style={styles.proofLabel}>Proof required: </Text>
                <Text style={styles.proofTypes}>
                  {(() => {
                    try { return JSON.parse(m.recommendedProofTypes).join(", "); }
                    catch { return m.recommendedProofTypes; }
                  })()}
                </Text>
              </View>
            )}
          </View>
        )}
      </Pressable>

      <View style={styles.aiActions}>
        <Pressable
          style={({ pressed }) => [styles.actionAccept, pressed && { opacity: 0.8 }]}
          onPress={() => onRespond("accepted")}
          disabled={isPending}
        >
          <Ionicons name="checkmark" size={14} color="#fff" />
          <Text style={styles.actionAcceptText}>Accept</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
          onPress={() => onRespond("not_now")}
          disabled={isPending}
        >
          <Text style={styles.actionBtnText}>Later</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
          onPress={() => onRespond("rejected")}
          disabled={isPending}
        >
          <Ionicons name="close" size={14} color={Colors.crimson} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
          onPress={() => onRespond("make_easier")}
          disabled={isPending}
        >
          <Ionicons name="remove-circle-outline" size={14} color={Colors.textMuted} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
          onPress={() => onRespond("make_harder")}
          disabled={isPending}
        >
          <Ionicons name="add-circle-outline" size={14} color={Colors.textMuted} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.8 }]}
          onPress={() => onRespond("ask_why")}
          disabled={isPending}
        >
          <Ionicons name="help-circle-outline" size={14} color={Colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.bg },
  header:             { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  title:              { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.textPrimary, letterSpacing: -0.5 },
  addBtn:             { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  genBtn:             { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  boardTabRow:        { flexGrow: 0, marginBottom: 10 },
  boardTab:           { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  boardTabActive:     { backgroundColor: Colors.accent, borderColor: Colors.accent },
  boardTabText:       { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textMuted },
  boardTabTextActive: { color: "#fff" },
  badge:              { backgroundColor: Colors.crimson, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, minWidth: 16, alignItems: "center" },
  badgeText:          { fontFamily: "Inter_700Bold", fontSize: 10, color: "#fff" },
  subTabRow:          { flexGrow: 0, marginBottom: 12 },
  subTab:             { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  subTabActive:       { backgroundColor: Colors.bgElevated, borderColor: Colors.border },
  subTabText:         { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },
  subTabTextActive:   { color: Colors.textPrimary },
  scroll:             { paddingHorizontal: 16, gap: 12 },
  missionCard:        { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 10 },
  cardTitle:          { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textPrimary, flex: 1 },
  cardDesc:           { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  cardMeta:           { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  metaItem:           { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText:           { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  aiChip:             { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.accentGlow, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  aiChipText:         { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent },
  focusBtn:           { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.green, alignItems: "center", justifyContent: "center" },
  emptyBox:           { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle:         { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.textSecondary },
  emptyText:          { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 24 },
  emptyBtn:           { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.accent, borderRadius: 12 },
  emptyBtnText:       { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  aiCard:             { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  aiCardHeader:       { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  aiCardTitle:        { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  aiMeta:             { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  catChip:            { backgroundColor: Colors.accent + "14", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  catChipText:        { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textAccent },
  stretchChip:        { backgroundColor: Colors.gold + "18", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  stretchText:        { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.gold, letterSpacing: 0.8 },
  aiCardExpanded:     { gap: 10, marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  aiCardDesc:         { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  reasonBox:          { flexDirection: "row", gap: 8, backgroundColor: Colors.accentGlow, borderRadius: 10, padding: 10 },
  reasonText:         { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textAccent, flex: 1, lineHeight: 18 },
  proofRow:           { flexDirection: "row", alignItems: "center", gap: 6 },
  proofLabel:         { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  proofTypes:         { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textSecondary },
  aiActions:          { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionAccept:       { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.green, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flex: 1 },
  actionAcceptText:   { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },
  actionBtn:          { alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgElevated, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border },
  actionBtnText:      { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textSecondary },
  modalOverlay:       { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 },
  whyModal:           { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 24, width: "100%", gap: 14, borderWidth: 1, borderColor: Colors.border },
  whyHeader:          { flexDirection: "row", alignItems: "center", gap: 8 },
  whyTitle:           { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  whyMissionTitle:    { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  gmBriefing:         { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: Colors.accentGlow, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.accent + "40" },
  gmBriefingText:     { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textAccent, flex: 1, lineHeight: 18 },
  gmResponse:         { backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border },
  gmResponseText:     { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, fontStyle: "italic" },
  gmNoteBox:          { backgroundColor: Colors.accentGlow, borderRadius: 10, padding: 12 },
  gmNoteText:         { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textAccent, lineHeight: 20 },
  whySkillRow:        { flexDirection: "row", alignItems: "center", gap: 6 },
  whySkillText:       { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  whyClose:           { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  whyCloseText:       { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
});

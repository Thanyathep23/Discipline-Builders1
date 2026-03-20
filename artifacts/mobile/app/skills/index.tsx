import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useSkills, useSkillEvents } from "@/hooks/useApi";

const RANK_COLORS: Record<string, string> = {
  Gray:   "#9E9E9E",
  Green:  "#4CAF50",
  Blue:   "#2196F3",
  Purple: "#9C27B0",
  Gold:   "#F5C842",
  Red:    "#F44336",
};

const SKILL_ICONS: Record<string, string> = {
  focus: "eye", discipline: "shield", sleep: "moon",
  fitness: "barbell", learning: "book", trading: "trending-up",
};

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "rising")  return <Ionicons name="trending-up"   size={13} color="#4CAF50" />;
  if (trend === "falling") return <Ionicons name="trending-down" size={13} color="#F44336" />;
  return <Ionicons name="remove" size={13} color={Colors.textMuted} />;
}

function ConfidenceBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "#4CAF50" : pct >= 40 ? "#FFB300" : "#F44336";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ flex: 1, height: 3, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: 2 }} />
      </View>
      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted }}>{pct}%</Text>
    </View>
  );
}

function RankBadge({ rank }: { rank: string }) {
  const color = RANK_COLORS[rank] ?? "#9E9E9E";
  return (
    <View style={[rankBadgeStyles.badge, { borderColor: color + "60", backgroundColor: color + "18" }]}>
      <View style={[rankBadgeStyles.dot, { backgroundColor: color }]} />
      <Text style={[rankBadgeStyles.text, { color }]}>{rank.toUpperCase()}</Text>
    </View>
  );
}

const rankBadgeStyles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  text:  { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.8 },
});

interface Suggestions {
  reason: string;
  helping: string[];
  hurting: string[];
  actions: string[];
}

function GrowthSuggestions({ suggestions, color }: { suggestions: Suggestions; color: string }) {
  return (
    <View style={[suggStyles.container, { borderColor: color + "25" }]}>
      <View style={suggStyles.header}>
        <Ionicons name="bulb-outline" size={14} color={color} />
        <Text style={[suggStyles.headerText, { color }]}>GROWTH COACHING</Text>
      </View>

      <Text style={suggStyles.reason}>{suggestions.reason}</Text>

      {suggestions.helping.length > 0 && (
        <View style={suggStyles.section}>
          <Text style={[suggStyles.sectionLabel, { color: "#4CAF50" }]}>HELPING</Text>
          {suggestions.helping.map((h, i) => (
            <View key={i} style={suggStyles.bulletRow}>
              <Ionicons name="checkmark-circle" size={13} color="#4CAF50" />
              <Text style={suggStyles.bulletText}>{h}</Text>
            </View>
          ))}
        </View>
      )}

      {suggestions.hurting.length > 0 && (
        <View style={suggStyles.section}>
          <Text style={[suggStyles.sectionLabel, { color: "#F44336" }]}>HURTING</Text>
          {suggestions.hurting.map((h, i) => (
            <View key={i} style={suggStyles.bulletRow}>
              <Ionicons name="remove-circle" size={13} color="#F44336" />
              <Text style={suggStyles.bulletText}>{h}</Text>
            </View>
          ))}
        </View>
      )}

      {suggestions.actions.length > 0 && (
        <View style={suggStyles.actionsBox}>
          <Text style={[suggStyles.sectionLabel, { color }]}>NEXT ACTIONS</Text>
          {suggestions.actions.map((a, i) => (
            <View key={i} style={suggStyles.actionRow}>
              <View style={[suggStyles.actionNum, { backgroundColor: color + "20" }]}>
                <Text style={[suggStyles.actionNumText, { color }]}>{i + 1}</Text>
              </View>
              <Text style={suggStyles.actionText}>{a}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const suggStyles = StyleSheet.create({
  container: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 12, backgroundColor: Colors.bgElevated + "80" },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.2 },
  reason: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  section: { gap: 6 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.0 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  bulletText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, flex: 1, lineHeight: 17 },
  actionsBox: { gap: 8 },
  actionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  actionNum: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  actionNumText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  actionText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textPrimary, flex: 1, lineHeight: 18 },
});

export default function SkillsScreen() {
  const insets = useSafeAreaInsets();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());
  const { data, isLoading } = useSkills();
  const { data: eventsData } = useSkillEvents(selectedSkill ?? undefined, 7);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const bottomPad = insets.bottom + 32;

  const skills = data?.skills ?? [];
  const totalXp = data?.totalXp ?? 0;
  const avgLevel = data?.avgLevel ?? 1;
  const weakSkills = data?.weakSkills ?? [];

  function toggleSuggestions(skillId: string) {
    setExpandedSuggestions(prev => {
      const next = new Set(prev);
      if (next.has(skillId)) next.delete(skillId);
      else next.add(skillId);
      return next;
    });
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.screenTitle}>Skill Tree</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{avgLevel.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Avg Level</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalXp.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total XP</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{skills.length}</Text>
              <Text style={styles.summaryLabel}>Skills</Text>
            </View>
          </View>
          {weakSkills.length > 0 && (
            <View style={styles.weakBox}>
              <Ionicons name="warning-outline" size={13} color={Colors.amber} />
              <Text style={styles.weakText}>
                Weak zones: {weakSkills.map((s: any) => s.meta?.label).join(", ")}
              </Text>
            </View>
          )}
        </Animated.View>

        <Text style={styles.sectionLabel}>Character Skills</Text>

        {isLoading && (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading skill tree...</Text>
          </View>
        )}

        {skills.map((skill: any, i: number) => {
          const isSelected = selectedSkill === skill.skillId;
          const suggestionsExpanded = expandedSuggestions.has(skill.skillId);
          const hasSuggestions = !!skill.suggestions;
          return (
            <Animated.View key={skill.skillId} entering={FadeInDown.delay(i * 60).springify()}>
              <Pressable
                style={[styles.skillCard, isSelected && { borderColor: (RANK_COLORS[skill.rank] ?? "#9E9E9E") + "60" }]}
                onPress={() => setSelectedSkill(isSelected ? null : skill.skillId)}
              >
                <View style={[styles.iconBox, { backgroundColor: `${skill.meta.color}18` }]}>
                  <Ionicons
                    name={(SKILL_ICONS[skill.skillId] ?? "star") as any}
                    size={24}
                    color={skill.meta.color}
                  />
                </View>
                <View style={styles.skillContent}>
                  <View style={styles.skillHeader}>
                    <Text style={styles.skillName}>{skill.meta.label}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <TrendIcon trend={skill.currentTrend} />
                      <RankBadge rank={skill.rank} />
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <View style={[styles.levelBadge, { backgroundColor: skill.meta.color + "20" }]}>
                      <Text style={[styles.levelText, { color: skill.meta.color }]}>LVL {skill.level}</Text>
                    </View>
                    {skill.recentXp > 0 && (
                      <View style={styles.recentXpChip}>
                        <Text style={styles.recentXpText}>+{skill.recentXp} this week</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.skillDesc}>{skill.meta.description}</Text>

                  <View style={styles.xpRow}>
                    <View style={styles.xpBarBg}>
                      <View style={[styles.xpBarFill, { width: `${skill.progressPct}%`, backgroundColor: skill.meta.color }]} />
                    </View>
                    <Text style={styles.xpText}>{skill.xp}/{skill.xpToNextLevel} XP</Text>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.confLabel}>Confidence</Text>
                    <View style={{ flex: 1 }}>
                      <ConfidenceBar score={skill.confidenceScore ?? 0.5} />
                    </View>
                  </View>
                </View>
              </Pressable>

              {isSelected && (
                <>
                  {hasSuggestions && (
                    <View style={{ marginTop: 4 }}>
                      <Pressable
                        style={styles.suggToggle}
                        onPress={() => toggleSuggestions(skill.skillId)}
                      >
                        <Ionicons name="bulb-outline" size={15} color={skill.meta.color} />
                        <Text style={[styles.suggToggleText, { color: skill.meta.color }]}>
                          {suggestionsExpanded ? "Hide Growth Suggestions" : "Show Growth Suggestions"}
                        </Text>
                        <Ionicons
                          name={suggestionsExpanded ? "chevron-up" : "chevron-down"}
                          size={14}
                          color={skill.meta.color}
                        />
                      </Pressable>

                      {suggestionsExpanded && (
                        <GrowthSuggestions suggestions={skill.suggestions} color={skill.meta.color} />
                      )}
                    </View>
                  )}

                  {eventsData?.events?.length > 0 && (
                    <View style={styles.eventsBox}>
                      <Text style={styles.eventsTitle}>Recent XP Events</Text>
                      {eventsData.events.slice(0, 5).map((evt: any, ei: number) => (
                        <View key={ei} style={styles.eventRow}>
                          <Ionicons name="flash" size={12} color={Colors.gold} />
                          <Text style={styles.eventText}>+{evt.xpAmount} XP — {evt.description}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </Animated.View>
          );
        })}

        {skills.length === 0 && !isLoading && (
          <View style={styles.emptyBox}>
            <Ionicons name="stats-chart-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No skills yet</Text>
            <Text style={styles.emptyText}>Complete missions and submit proofs to grow your skills.</Text>
          </View>
        )}

        <View style={styles.howBox}>
          <Text style={styles.howTitle}>How Skills Grow</Text>
          {[
            { icon: "timer-outline" as const,            color: Colors.cyan,    text: "Every minute of focused work earns skill XP" },
            { icon: "checkmark-circle-outline" as const, color: Colors.green,   text: "Approved proofs give a 40% XP bonus" },
            { icon: "shield-outline" as const,            color: Colors.amber,   text: "Mission category determines which skills improve" },
            { icon: "trending-up-outline" as const,      color: Colors.gold,    text: "Weekly XP determines your Trend: Rising / Stable / Falling" },
            { icon: "ribbon-outline" as const,            color: "#9C27B0",      text: "Ranks: Gray → Green → Blue → Purple → Gold → Red" },
            { icon: "bulb-outline" as const,              color: Colors.accent,  text: "Tap any skill to see coaching tips and growth suggestions" },
          ].map((item, i) => (
            <View key={i} style={styles.howItem}>
              <Ionicons name={item.icon} size={15} color={item.color} />
              <Text style={styles.howText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  topBar:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  backBtn:        { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  screenTitle:    { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  scroll:         { paddingHorizontal: 20, gap: 16 },
  summaryCard:    { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  summaryRow:     { flexDirection: "row", alignItems: "center" },
  summaryItem:    { flex: 1, alignItems: "center", gap: 4 },
  summaryValue:   { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  summaryLabel:   { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  summaryDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  weakBox:        { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.amber + "12", borderRadius: 10, padding: 8 },
  weakText:       { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.amber, flex: 1 },
  sectionLabel:   { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textMuted, letterSpacing: 1.2, textTransform: "uppercase" },
  loadingBox:     { alignItems: "center", padding: 40 },
  loadingText:    { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  skillCard:      { flexDirection: "row", gap: 14, backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border },
  iconBox:        { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  skillContent:   { flex: 1, gap: 7 },
  skillHeader:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skillName:      { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  levelBadge:     { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  levelText:      { fontFamily: "Inter_700Bold", fontSize: 11 },
  recentXpChip:   { backgroundColor: Colors.green + "18", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  recentXpText:   { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.green },
  skillDesc:      { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  xpRow:          { flexDirection: "row", alignItems: "center", gap: 10 },
  xpBarBg:        { flex: 1, height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  xpBarFill:      { height: "100%", borderRadius: 3 },
  xpText:         { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  confLabel:      { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  suggToggle:     { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.bgCard, borderRadius: 10, marginTop: 4, borderWidth: 1, borderColor: Colors.border },
  suggToggleText: { fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1 },
  eventsBox:      { backgroundColor: Colors.bgElevated, borderRadius: 14, padding: 14, marginTop: 4, gap: 8, borderWidth: 1, borderColor: Colors.border },
  eventsTitle:    { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  eventRow:       { flexDirection: "row", alignItems: "center", gap: 6 },
  eventText:      { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, flex: 1 },
  emptyBox:       { alignItems: "center", gap: 12, paddingVertical: 40 },
  emptyTitle:     { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textSecondary },
  emptyText:      { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  howBox:         { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.border },
  howTitle:       { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  howItem:        { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  howText:        { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
});

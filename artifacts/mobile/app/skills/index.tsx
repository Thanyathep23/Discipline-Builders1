import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useSkills } from "@/hooks/useApi";

const LEVEL_TITLES: Record<number, string> = {
  1: "Novice", 2: "Apprentice", 3: "Practitioner", 4: "Adept", 5: "Expert",
  6: "Master", 7: "Elite", 8: "Champion", 9: "Legend", 10: "Transcendent",
};

function getLevelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level, 10)] ?? "Legend";
}

export default function SkillsScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useSkills();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);
  const bottomPad = insets.bottom + 32;

  const skills = data?.skills ?? [];
  const totalXp = data?.totalXp ?? 0;
  const avgLevel = data?.avgLevel ?? 1;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.screenTitle}>Skill Tree</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
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
              <Text style={styles.summaryLabel}>Active Skills</Text>
            </View>
          </View>
        </Animated.View>

        <Text style={styles.sectionLabel}>Character Skills</Text>

        {isLoading && (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading skill tree...</Text>
          </View>
        )}

        {skills.map((skill: any, i: number) => (
          <Animated.View key={skill.skillId} entering={FadeInDown.delay(i * 60).springify()} style={styles.skillCard}>
            <View style={[styles.iconBox, { backgroundColor: `${skill.meta.color}18` }]}>
              <Ionicons name={skill.meta.icon as any} size={24} color={skill.meta.color} />
            </View>
            <View style={styles.skillContent}>
              <View style={styles.skillHeader}>
                <Text style={styles.skillName}>{skill.meta.label}</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>LVL {skill.level}</Text>
                </View>
              </View>
              <Text style={styles.skillTitle}>{getLevelTitle(skill.level)}</Text>
              <Text style={styles.skillDesc}>{skill.meta.description}</Text>
              <View style={styles.xpRow}>
                <View style={styles.xpBarBg}>
                  <View style={[styles.xpBarFill, { width: `${skill.progressPct}%`, backgroundColor: skill.meta.color }]} />
                </View>
                <Text style={styles.xpText}>{skill.xp}/{skill.xpToNextLevel} XP</Text>
              </View>
            </View>
          </Animated.View>
        ))}

        {skills.length === 0 && !isLoading && (
          <View style={styles.emptyBox}>
            <Ionicons name="stats-chart-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No skills yet</Text>
            <Text style={styles.emptyText}>Complete missions and submit proofs to grow your skills.</Text>
          </View>
        )}

        <View style={styles.howBox}>
          <Text style={styles.howTitle}>How Skills Grow</Text>
          <View style={styles.howItem}>
            <Ionicons name="timer-outline" size={16} color={Colors.cyan} />
            <Text style={styles.howText}>Every minute of focused work earns skill XP</Text>
          </View>
          <View style={styles.howItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={Colors.green} />
            <Text style={styles.howText}>Approved proofs give a 40% XP bonus</Text>
          </View>
          <View style={styles.howItem}>
            <Ionicons name="shield-outline" size={16} color={Colors.amber} />
            <Text style={styles.howText}>Mission category determines which skills improve</Text>
          </View>
        </View>
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
  summaryCard: {
    backgroundColor: Colors.bgCard, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  summaryLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  summaryDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textMuted, letterSpacing: 1, textTransform: "uppercase" },
  loadingBox: { alignItems: "center", padding: 40 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  skillCard: {
    flexDirection: "row", gap: 16, backgroundColor: Colors.bgCard,
    borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border,
  },
  iconBox: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  skillContent: { flex: 1, gap: 6 },
  skillHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skillName: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  levelBadge: { backgroundColor: Colors.accentGlow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  levelText: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.accent, letterSpacing: 0.5 },
  skillTitle: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textAccent },
  skillDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  xpBarBg: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  xpBarFill: { height: "100%", borderRadius: 3 },
  xpText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  emptyBox: { alignItems: "center", gap: 12, paddingVertical: 40 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textSecondary },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center" },
  howBox: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  howTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  howItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  howText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1 },
});

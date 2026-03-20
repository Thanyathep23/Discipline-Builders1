import React from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useRewardBalance, useDailyAnalytics, useSkills, useLifeProfile } from "@/hooks/useApi";

const SKILL_ICONS: Record<string, string> = {
  focus: "eye-outline", discipline: "shield-outline", learning: "book-outline",
  health: "heart-outline", finance: "cash-outline", creativity: "color-palette-outline",
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data: balance } = useRewardBalance();
  const { data: analytics } = useDailyAnalytics(7);
  const { data: skillsData } = useSkills();
  const { data: profileData } = useLifeProfile();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 84);

  const totalFocusMinutes = analytics?.reduce((a: number, d: any) => a + d.focusMinutes, 0) ?? 0;
  const maxFocus = Math.max(1, ...(analytics?.map((d: any) => d.focusMinutes) ?? [1]));

  const skills = skillsData?.skills ?? [];
  const topSkill = skillsData?.topSkill;
  const hasProfile = profileData?.exists && profileData?.profile?.quickStartDone;
  const profile = profileData?.profile;

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}>
        <Animated.View entering={FadeInDown.springify()} style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
          <View style={{ gap: 4, flex: 1 }}>
            <Text style={styles.username}>{user?.username}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {topSkill && (
              <View style={styles.topSkillBadge}>
                <Ionicons name={SKILL_ICONS[topSkill.skillId] as any ?? "star"} size={11} color={Colors.gold} />
                <Text style={styles.topSkillText}>Top: {topSkill.meta?.label} Lv{topSkill.level}</Text>
              </View>
            )}
          </View>
          <View style={styles.trustScore}>
            <Text style={styles.trustLabel}>TRUST</Text>
            <Text style={styles.trustValue}>{((user?.trustScore ?? 1) * 100).toFixed(0)}%</Text>
          </View>
        </Animated.View>

        {!hasProfile && (
          <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.onboardBanner}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.onboardTitle}>Build Your Life Profile</Text>
              <Text style={styles.onboardText}>Set up your profile so the AI Game Master can generate personalized missions.</Text>
            </View>
            <Pressable
              style={styles.onboardBtn}
              onPress={() => { Haptics.selectionAsync(); router.push("/onboarding"); }}
            >
              <Text style={styles.onboardBtnText}>Start</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.bg} />
            </Pressable>
          </Animated.View>
        )}

        {hasProfile && profile && (
          <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.profileSummary}>
            <Text style={styles.sectionTitle}>Life Profile</Text>
            <Text style={styles.profileGoal} numberOfLines={2}>{profile.mainGoal}</Text>
            <View style={styles.profileTags}>
              {JSON.parse(profile.improvementAreas ?? "[]").map((area: string) => (
                <View key={area} style={styles.areaTag}>
                  <Ionicons name={SKILL_ICONS[area] as any ?? "star-outline"} size={12} color={Colors.accent} />
                  <Text style={styles.areaTagText}>{area.charAt(0).toUpperCase() + area.slice(1)}</Text>
                </View>
              ))}
            </View>
            <Pressable style={styles.editProfileBtn} onPress={() => router.push("/onboarding")}>
              <Ionicons name="create-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </Pressable>
          </Animated.View>
        )}

        {skills.length > 0 && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Character Skills</Text>
              <Pressable onPress={() => { Haptics.selectionAsync(); router.push("/skills"); }}>
                <Text style={styles.seeAllText}>View Full Tree</Text>
              </Pressable>
            </View>
            <View style={styles.skillGrid}>
              {skills.slice(0, 6).map((skill: any) => (
                <Pressable
                  key={skill.skillId}
                  style={styles.skillCard}
                  onPress={() => { Haptics.selectionAsync(); router.push("/skills"); }}
                >
                  <View style={[styles.skillIcon, { backgroundColor: `${skill.meta.color}18` }]}>
                    <Ionicons name={skill.meta.icon as any} size={18} color={skill.meta.color} />
                  </View>
                  <Text style={styles.skillLabel}>{skill.meta.label}</Text>
                  <View style={styles.skillXpBar}>
                    <View style={[styles.skillXpFill, { width: `${skill.progressPct}%`, backgroundColor: skill.meta.color }]} />
                  </View>
                  <Text style={styles.skillLvl}>Lv{skill.level}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Text style={styles.sectionTitle}>7-Day Focus</Text>
          <View style={styles.chartCard}>
            <View style={styles.chart}>
              {analytics?.map((d: any, i: number) => (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { height: `${Math.round((d.focusMinutes / maxFocus) * 100)}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>{new Date(d.date).toLocaleDateString("en", { weekday: "narrow" })}</Text>
                </View>
              ))}
            </View>
            <View style={styles.chartStats}>
              <View style={styles.chartStat}>
                <Ionicons name="timer-outline" size={14} color={Colors.cyan} />
                <Text style={styles.chartStatText}>{totalFocusMinutes}m total</Text>
              </View>
              <View style={styles.chartStat}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.green} />
                <Text style={styles.chartStatText}>
                  {analytics?.reduce((a: number, d: any) => a + d.missionsCompleted, 0) ?? 0} done
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.menuList}>
            <MenuItem icon="sparkles-outline" label="AI Mission Board" onPress={() => router.push("/ai-missions")} accent />
            <MenuItem icon="stats-chart-outline" label="Skill Tree" onPress={() => router.push("/skills")} />
            <MenuItem icon="ban-outline" label="Website Blocking" onPress={() => router.push("/settings/blocking")} />
            {user?.role === "admin" && (
              <MenuItem icon="shield-outline" label="Admin Panel" onPress={() => router.push("/admin")} accent />
            )}
            <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function MenuItem({ icon, label, onPress, accent, danger }: any) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.8 }]}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
    >
      <View style={[styles.menuIcon, danger && { backgroundColor: Colors.crimsonDim }, accent && { backgroundColor: Colors.accentGlow }]}>
        <Ionicons name={icon} size={18} color={danger ? Colors.crimson : accent ? Colors.accent : Colors.textSecondary} />
      </View>
      <Text style={[styles.menuLabel, danger && { color: Colors.crimson }, accent && { color: Colors.accent }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 20, gap: 24 },
  profileCard: {
    backgroundColor: Colors.bgCard, borderRadius: 20, padding: 20,
    flexDirection: "row", alignItems: "center", gap: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: Colors.accentGlow,
    borderWidth: 2, borderColor: Colors.accent, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.accent },
  username: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  email: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  topSkillBadge: {
    flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start",
    backgroundColor: Colors.goldDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  topSkillText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.gold, letterSpacing: 0.5 },
  trustScore: {
    alignItems: "center", backgroundColor: Colors.bgElevated,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
  },
  trustLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1 },
  trustValue: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.green },
  onboardBanner: {
    flexDirection: "row", alignItems: "center", gap: 16, padding: 18,
    backgroundColor: Colors.accentGlow, borderRadius: 18, borderWidth: 1, borderColor: Colors.accent,
  },
  onboardTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  onboardText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  onboardBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accent,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  onboardBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.bg },
  profileSummary: {
    backgroundColor: Colors.bgCard, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  profileGoal: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
  profileTags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  areaTag: {
    flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accentGlow,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  areaTagText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.accent },
  editProfileBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start" },
  editProfileText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary, marginBottom: 12 },
  seeAllText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.accent },
  skillGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  skillCard: {
    width: "31%", backgroundColor: Colors.bgCard, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 6,
  },
  skillIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  skillLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },
  skillXpBar: { width: "100%", height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden" },
  skillXpFill: { height: "100%", borderRadius: 2 },
  skillLvl: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textAccent },
  chartCard: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 80 },
  barCol: { flex: 1, alignItems: "center", gap: 6, height: "100%" },
  barBg: { flex: 1, width: "100%", backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  barFill: { width: "100%", backgroundColor: Colors.accent, borderRadius: 4 },
  barLabel: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textMuted },
  chartStats: { flexDirection: "row", gap: 16 },
  chartStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  chartStatText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  menuList: { backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 14, padding: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textPrimary },
});

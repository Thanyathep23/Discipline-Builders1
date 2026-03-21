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
import {
  useRewardBalance, useDailyAnalytics, useSkills,
  useLifeProfile, useInventoryBadges, useInventoryTitles, useStreaks,
  useIdentity, useEndgame,
} from "@/hooks/useApi";

const SKILL_ICONS: Record<string, string> = {
  focus: "eye-outline", discipline: "shield-outline", learning: "book-outline",
  sleep: "moon-outline", fitness: "barbell-outline", trading: "trending-up-outline",
};

const RANK_COLORS: Record<string, string> = {
  Gray:   "#9E9E9E",
  Green:  "#4CAF50",
  Blue:   "#2196F3",
  Purple: "#9C27B0",
  Gold:   "#F5C842",
  Red:    "#F44336",
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data: balance } = useRewardBalance();
  const { data: analytics } = useDailyAnalytics(7);
  const { data: skillsData } = useSkills();
  const { data: profileData } = useLifeProfile();
  const { data: badgesData } = useInventoryBadges();
  const { data: titlesData } = useInventoryTitles();
  const { data: streakData } = useStreaks();
  const { data: identityData } = useIdentity();
  const { data: endgameData } = useEndgame();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 84);

  const totalFocusMinutes = analytics?.reduce((a: number, d: any) => a + d.focusMinutes, 0) ?? 0;
  const maxFocus = Math.max(1, ...(analytics?.map((d: any) => d.focusMinutes) ?? [1]));

  const skills = skillsData?.skills ?? [];
  const topSkill = skillsData?.topSkill;
  const weakSkills = skillsData?.weakSkills ?? [];
  const hasProfile = profileData?.exists && profileData?.profile?.quickStartDone;
  const profile = profileData?.profile;

  const quickStartDone = profile?.quickStartDone ?? false;
  const standardDone = profile?.standardDone ?? false;
  const deepDone = profile?.deepDone ?? false;

  const earnedBadges = (badgesData?.badges ?? []).filter((b: any) => b.earned);
  const activeTitle = (titlesData?.titles ?? []).find((t: any) => t.isActive);

  const sortedByLevel = [...skills].sort((a, b) => b.level - a.level);
  const topStrengths = sortedByLevel.slice(0, 2);
  const weakZones = sortedByLevel.slice(-2).reverse();

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
          <View style={{ gap: 5, flex: 1 }}>
            <Text style={styles.username}>{user?.username}</Text>
            {activeTitle && (
              <View style={styles.activeTitleBadge}>
                <Ionicons name="ribbon" size={11} color={Colors.gold} />
                <Text style={styles.activeTitleText}>{activeTitle.name}</Text>
              </View>
            )}
            {identityData?.identitySummaryLine ? (
              <Text style={styles.identityLine} numberOfLines={2}>{identityData.identitySummaryLine}</Text>
            ) : null}
            <Text style={styles.email}>{user?.email}</Text>
            {topSkill && (
              <View style={styles.topSkillBadge}>
                <Ionicons name={(SKILL_ICONS[topSkill.skillId] ?? "star") as any} size={11} color={Colors.gold} />
                <Text style={styles.topSkillText}>
                  Top: {topSkill.meta?.label} — {topSkill.rank} Lv{topSkill.level}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.trustScore}>
            <Text style={styles.trustLabel}>TRUST</Text>
            <Text style={styles.trustValue}>{((user?.trustScore ?? 1) * 100).toFixed(0)}%</Text>
          </View>
        </Animated.View>

        {streakData && (
          <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.streakCard}>
            <View style={styles.streakLeft}>
              <View style={styles.streakCountRow}>
                <Text style={styles.streakCount}>{streakData.currentStreak}</Text>
                <Text style={styles.streakUnit}>day{streakData.currentStreak !== 1 ? "s" : ""}</Text>
              </View>
              <Text style={styles.streakLabel}>
                {streakData.activeToday ? "Active today" : streakData.lastActiveDaysAgo === 1 ? "Last active yesterday" : streakData.lastActiveDaysAgo != null ? `Last active ${streakData.lastActiveDaysAgo}d ago` : "No activity yet"}
              </Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakRight}>
              <Text style={styles.streakGm}>{streakData.gmNote}</Text>
              {streakData.longestStreak > 0 && (
                <Text style={styles.streakBest}>Best: {streakData.longestStreak} days</Text>
              )}
            </View>
          </Animated.View>
        )}

        {identityData?.recentUnlock && (
          <Animated.View entering={FadeInDown.delay(45).springify()} style={styles.recentUnlockCard}>
            <Ionicons name="trophy-outline" size={16} color={Colors.gold} />
            <View style={{ flex: 1 }}>
              <Text style={styles.recentUnlockLabel}>RECENT UNLOCK</Text>
              <Text style={styles.recentUnlockName}>{identityData.recentUnlock.name}</Text>
            </View>
            {identityData.nextMilestoneHint ? (
              <Text style={styles.nextMilestoneHint} numberOfLines={1}>Next: {identityData.nextMilestoneHint}</Text>
            ) : null}
          </Animated.View>
        )}

        {!hasProfile && (
          <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.onboardBanner}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.onboardTitle}>Build Your Life Profile</Text>
              <Text style={styles.onboardText}>
                Set up your profile so AI missions can be personalized to your goals.
              </Text>
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

        {quickStartDone && !standardDone && (
          <Animated.View entering={FadeInDown.delay(55).springify()} style={styles.continueBanner}>
            <View style={styles.continueBannerIcon}>
              <Ionicons name="layers-outline" size={18} color={Colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.continueBannerTitle}>Unlock Standard Profile</Text>
              <Text style={styles.continueBannerText}>Deeper context = smarter missions. Takes 3–4 minutes.</Text>
            </View>
            <Pressable
              style={styles.continueBtn}
              onPress={() => { Haptics.selectionAsync(); router.push("/onboarding/standard"); }}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.bg} />
            </Pressable>
          </Animated.View>
        )}

        {quickStartDone && standardDone && !deepDone && (
          <Animated.View entering={FadeInDown.delay(55).springify()} style={[styles.continueBanner, styles.deepBanner]}>
            <View style={[styles.continueBannerIcon, { backgroundColor: Colors.goldDim }]}>
              <Ionicons name="diamond-outline" size={18} color={Colors.gold} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.continueBannerTitle, { color: Colors.gold }]}>Complete Deep Profile</Text>
              <Text style={styles.continueBannerText}>Optional — unlocks elite mission personalization.</Text>
            </View>
            <Pressable
              style={[styles.continueBtn, { backgroundColor: Colors.gold }]}
              onPress={() => { Haptics.selectionAsync(); router.push("/onboarding/deep"); }}
            >
              <Text style={styles.continueBtnText}>Unlock</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.bg} />
            </Pressable>
          </Animated.View>
        )}

        {skills.length > 0 && (
          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.characterCard}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Character Summary</Text>
              <Pressable onPress={() => { Haptics.selectionAsync(); router.push("/skills"); }}>
                <Text style={styles.seeAllText}>Full Tree</Text>
              </Pressable>
            </View>

            {skillsData?.currentArc && (
              <View style={styles.arcBox}>
                <View style={styles.arcIconWrap}>
                  <Ionicons name={(skillsData.currentArc.icon ?? "navigate") as any} size={16} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.arcLabel}>CURRENT ARC</Text>
                  <Text style={styles.arcValue}>{skillsData.currentArc.name}</Text>
                  <Text style={styles.arcSub}>{skillsData.currentArc.subtitle}</Text>
                  {endgameData?.arcStage && (
                    <View style={endgameProfileStyles.arcStagePill}>
                      <View style={endgameProfileStyles.arcStageDot} />
                      <Text style={endgameProfileStyles.arcStageText}>
                        {endgameData.arcStage.stageLabel} Stage — {endgameData.arcStage.progressToNextPct}%{endgameData.arcStage.nextStage ? ` to ${endgameData.arcStage.nextStage}` : " (complete)"}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {endgameData?.prestige && endgameData.prestige.currentTier > 0 && (
              <View style={[endgameProfileStyles.prestigeBox, { borderColor: (endgameData.prestige.currentBorderColor ?? "#9C27B0") + "50" }]}>
                <Ionicons name="shield-checkmark" size={16} color={endgameData.prestige.currentBorderColor ?? "#9C27B0"} />
                <View style={{ flex: 1 }}>
                  <Text style={[endgameProfileStyles.prestigeLabel, { color: endgameData.prestige.currentBorderColor ?? "#9C27B0" }]}>
                    {endgameData.prestige.currentLabel}
                  </Text>
                  <Text style={endgameProfileStyles.prestigeTitle}>{endgameData.prestige.currentTitle}</Text>
                </View>
              </View>
            )}

            {endgameData?.prestige && !endgameData.prestige.currentTier && endgameData.prestige.readinessScore >= 30 && (
              <View style={endgameProfileStyles.prestigeReadinessBox}>
                <View style={{ flex: 1 }}>
                  <Text style={endgameProfileStyles.prestigeReadinessLabel}>PRESTIGE READINESS</Text>
                  <Text style={endgameProfileStyles.prestigeReadinessDesc}>{endgameData.prestige.readinessSummary}</Text>
                </View>
                <View style={endgameProfileStyles.readinessPill}>
                  <Text style={endgameProfileStyles.readinessPct}>{endgameData.prestige.readinessScore}%</Text>
                </View>
              </View>
            )}

            {profile?.mainGoal && (
              <View style={styles.activeGoalBox}>
                <View style={styles.activeGoalHeader}>
                  <Ionicons name="flag" size={13} color={Colors.green} />
                  <Text style={styles.activeGoalLabel}>ACTIVE GOAL</Text>
                </View>
                <Text style={styles.activeGoalText} numberOfLines={2}>{profile.mainGoal}</Text>
              </View>
            )}

            {hasProfile && (
              <View style={styles.completionRow}>
                <Text style={styles.completionTitle}>Profile Depth</Text>
                <View style={styles.completionLayers}>
                  <View style={styles.completionLayer}>
                    <View style={[styles.completionDot, quickStartDone && styles.completionDotDone]} />
                    <Text style={[styles.completionLayerLabel, quickStartDone && styles.completionLayerLabelDone]}>Quick Start</Text>
                  </View>
                  <View style={[styles.completionConnector, standardDone && styles.completionConnectorDone]} />
                  <View style={styles.completionLayer}>
                    <View style={[styles.completionDot, standardDone && styles.completionDotDone]} />
                    <Text style={[styles.completionLayerLabel, standardDone && styles.completionLayerLabelDone]}>Standard</Text>
                  </View>
                  <View style={[styles.completionConnector, deepDone && styles.completionConnectorDone]} />
                  <View style={styles.completionLayer}>
                    <View style={[styles.completionDot, deepDone && { backgroundColor: Colors.gold, borderColor: Colors.gold }]} />
                    <Text style={[styles.completionLayerLabel, deepDone && { color: Colors.gold }]}>Deep</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.strengthsRow}>
              <View style={styles.strengthsCol}>
                <Text style={styles.strengthsLabel}>Top Strengths</Text>
                {topStrengths.map((s: any) => {
                  const rankColor = RANK_COLORS[s.rank] ?? "#9E9E9E";
                  return (
                    <View key={s.skillId} style={styles.strengthItem}>
                      <Ionicons name={(SKILL_ICONS[s.skillId] ?? "star") as any} size={13} color={s.meta.color} />
                      <Text style={styles.strengthText}>{s.meta.label}</Text>
                      <View style={[styles.rankMini, { backgroundColor: rankColor + "18" }]}>
                        <Text style={[styles.rankMiniText, { color: rankColor }]}>{s.rank}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
              <View style={styles.strengthsDivider} />
              <View style={styles.strengthsCol}>
                <Text style={[styles.strengthsLabel, { color: Colors.amber }]}>Weak Zones</Text>
                {weakZones.map((s: any) => (
                  <View key={s.skillId} style={styles.strengthItem}>
                    <Ionicons name={(SKILL_ICONS[s.skillId] ?? "star") as any} size={13} color={Colors.amber} />
                    <Text style={[styles.strengthText, { color: Colors.amber }]}>{s.meta.label}</Text>
                    <Text style={styles.levelMini}>Lv{s.level}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.skillGrid}>
              {skills.slice(0, 6).map((skill: any) => (
                <Pressable
                  key={skill.skillId}
                  style={styles.skillCard}
                  onPress={() => { Haptics.selectionAsync(); router.push("/skills"); }}
                >
                  <View style={[styles.skillIcon, { backgroundColor: `${skill.meta.color}18` }]}>
                    <Ionicons name={(SKILL_ICONS[skill.skillId] ?? "star") as any} size={17} color={skill.meta.color} />
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

        {earnedBadges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.inventoryCard}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Inventory</Text>
              <Pressable onPress={() => { Haptics.selectionAsync(); router.push("/(tabs)/rewards"); }}>
                <Text style={styles.seeAllText}>View All</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {earnedBadges.slice(0, 8).map((b: any) => (
                  <View key={b.id} style={styles.badgeMini}>
                    <View style={styles.badgeMiniIcon}>
                      <Ionicons name={(b.icon ?? "ribbon") as any} size={18} color={Colors.gold} />
                    </View>
                    <Text style={styles.badgeMiniName} numberOfLines={1}>{b.name}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {hasProfile && profile && (
          <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.profileSummary}>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Life Profile</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {quickStartDone && !standardDone && (
                  <Pressable style={styles.editProfileBtn} onPress={() => { Haptics.selectionAsync(); router.push("/onboarding/standard"); }}>
                    <Ionicons name="layers-outline" size={14} color={Colors.accent} />
                    <Text style={[styles.editProfileText, { color: Colors.accent }]}>Standard</Text>
                  </Pressable>
                )}
                {standardDone && !deepDone && (
                  <Pressable style={styles.editProfileBtn} onPress={() => { Haptics.selectionAsync(); router.push("/onboarding/deep"); }}>
                    <Ionicons name="diamond-outline" size={14} color={Colors.gold} />
                    <Text style={[styles.editProfileText, { color: Colors.gold }]}>Deep</Text>
                  </Pressable>
                )}
                <Pressable style={styles.editProfileBtn} onPress={() => { Haptics.selectionAsync(); router.push("/onboarding"); }}>
                  <Ionicons name="create-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.editProfileText}>Edit</Text>
                </Pressable>
              </View>
            </View>
            {profile.mainProblem && (
              <View style={styles.problemBox}>
                <Ionicons name="alert-circle-outline" size={14} color={Colors.amber} />
                <Text style={styles.problemText} numberOfLines={2}>{profile.mainProblem}</Text>
              </View>
            )}
            <View style={styles.profileTags}>
              {JSON.parse(profile.improvementAreas ?? "[]").map((area: string) => (
                <View key={area} style={styles.areaTag}>
                  <Ionicons name={(SKILL_ICONS[area] ?? "star-outline") as any} size={12} color={Colors.accent} />
                  <Text style={styles.areaTagText}>{area.charAt(0).toUpperCase() + area.slice(1)}</Text>
                </View>
              ))}
            </View>
            <View style={styles.profileMeta}>
              {profile.availableHoursPerDay && (
                <View style={styles.profileMetaItem}>
                  <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.profileMetaText}>{profile.availableHoursPerDay}h/day available</Text>
                </View>
              )}
              {profile.strictnessPreference && (
                <View style={styles.profileMetaItem}>
                  <Ionicons name="shield-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.profileMetaText}>{profile.strictnessPreference} mode</Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <Text style={styles.sectionTitle}>7-Day Focus</Text>
          <View style={styles.chartCard}>
            <View style={styles.chart}>
              {analytics?.map((d: any, i: number) => (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { height: `${Math.round((d.focusMinutes / maxFocus) * 100)}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>
                    {new Date(d.date).toLocaleDateString("en", { weekday: "narrow" })}
                  </Text>
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

        {/* Phase 18 — Command Center entry point */}
        <Animated.View entering={FadeInDown.delay(195).springify()} style={styles.commandCenterBanner}>
          <View style={styles.commandCenterLeft}>
            <View style={styles.commandCenterIcon}>
              <Ionicons name="grid-outline" size={20} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.commandCenterTitle}>Command Center</Text>
              <Text style={styles.commandCenterSub}>Display your trophies, titles, and room upgrades</Text>
            </View>
          </View>
          <Pressable
            style={styles.commandCenterBtn}
            onPress={() => { Haptics.selectionAsync(); router.push("/world"); }}
          >
            <Text style={styles.commandCenterBtnText}>Enter</Text>
            <Ionicons name="arrow-forward" size={13} color={Colors.bg} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.menuList}>
            <MenuItem icon="share-outline" label="Share Progress" onPress={() => router.push("/share")} accent />
            <MenuItem icon="people" label="Accountability Circles" onPress={() => router.push("/circles")} accent />
            <MenuItem icon="eye-outline" label="Prestige Showcase" onPress={() => router.push("/settings/showcase")} />
            <MenuItem icon="people-outline" label="Invite Friends" onPress={() => router.push("/invite")} />
            <MenuItem icon="sparkles-outline" label="AI Mission Board" onPress={() => router.push("/(tabs)/missions")} />
            <MenuItem icon="stats-chart-outline" label="Skill Tree" onPress={() => router.push("/skills")} />
            <MenuItem icon="ribbon-outline" label="Inventory & Badges" onPress={() => router.push("/(tabs)/rewards")} />
            <MenuItem icon="ban-outline" label="Website Blocking" onPress={() => router.push("/settings/blocking")} />
            <MenuItem icon="flash-outline" label="Integrations & API" onPress={() => router.push("/settings/integrations")} />
            <MenuItem icon="chatbubble-ellipses-outline" label="Send Feedback" onPress={() => router.push("/feedback")} />
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
  container:        { flex: 1, backgroundColor: Colors.bg },
  scroll:           { paddingHorizontal: 20, gap: 20 },
  profileCard:      { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 16, borderWidth: 1, borderColor: Colors.border },
  avatar:           { width: 60, height: 60, borderRadius: 18, backgroundColor: Colors.accentGlow, borderWidth: 2, borderColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  avatarText:       { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.accent },
  username:         { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  email:            { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  activeTitleBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: Colors.goldDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeTitleText:  { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.gold },
  identityLine:     { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, fontStyle: "italic", lineHeight: 15 },
  recentUnlockCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, backgroundColor: Colors.goldDim, borderRadius: 14, borderWidth: 1, borderColor: Colors.gold + "33" },
  recentUnlockLabel:{ fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.gold, letterSpacing: 1 },
  recentUnlockName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary, marginTop: 2 },
  nextMilestoneHint:{ fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, flexShrink: 1 },
  topSkillBadge:    { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: Colors.goldDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  topSkillText:     { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.gold },
  trustScore:       { alignItems: "center", backgroundColor: Colors.bgElevated, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  trustLabel:       { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1 },
  trustValue:       { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.green },
  onboardBanner:    { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, backgroundColor: Colors.accentGlow, borderRadius: 18, borderWidth: 1, borderColor: Colors.accent },
  onboardTitle:     { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  onboardText:      { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  onboardBtn:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  onboardBtnText:   { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.bg },
  characterCard:    { backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  arcBox:           { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: Colors.accentGlow, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.accent + "30" },
  arcIconWrap:      { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.accent + "20", alignItems: "center", justifyContent: "center", marginTop: 1 },
  arcLabel:         { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textAccent, letterSpacing: 1.2, marginBottom: 2 },
  arcValue:         { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary, lineHeight: 19 },
  arcSub:           { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textAccent, lineHeight: 17, marginTop: 3 },
  strengthsRow:     { flexDirection: "row", gap: 12 },
  strengthsCol:     { flex: 1, gap: 8 },
  strengthsDivider: { width: 1, backgroundColor: Colors.border },
  strengthsLabel:   { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.8 },
  strengthItem:     { flexDirection: "row", alignItems: "center", gap: 6 },
  strengthText:     { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textPrimary, flex: 1 },
  rankMini:         { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  rankMiniText:     { fontFamily: "Inter_700Bold", fontSize: 9 },
  levelMini:        { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  skillGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillCard:        { width: "31%", backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 5 },
  skillIcon:        { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  skillLabel:       { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary, textAlign: "center" },
  skillXpBar:       { width: "100%", height: 3, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden" },
  skillXpFill:      { height: "100%", borderRadius: 2 },
  skillLvl:         { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.textAccent },
  inventoryCard:    { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  badgeMini:        { alignItems: "center", gap: 4, width: 60 },
  badgeMiniIcon:    { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.goldDim, alignItems: "center", justifyContent: "center" },
  badgeMiniName:    { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted, textAlign: "center" },
  profileSummary:   { backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  problemBox:       { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: Colors.amber + "12", borderRadius: 10, padding: 8 },
  problemText:      { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.amber, flex: 1 },
  profileTags:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  areaTag:          { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accentGlow, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  areaTagText:      { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.accent },
  profileMeta:      { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  profileMetaItem:  { flexDirection: "row", alignItems: "center", gap: 5 },
  profileMetaText:  { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  editProfileBtn:   { flexDirection: "row", alignItems: "center", gap: 4 },
  editProfileText:  { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  sectionRow:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle:     { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary },
  seeAllText:       { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.accent },
  chartCard:        { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  chart:            { flexDirection: "row", alignItems: "flex-end", gap: 8, height: 80 },
  barCol:           { flex: 1, alignItems: "center", gap: 6, height: "100%" },
  barBg:            { flex: 1, width: "100%", backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  barFill:          { width: "100%", backgroundColor: Colors.accent, borderRadius: 4 },
  barLabel:         { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textMuted },
  chartStats:       { flexDirection: "row", gap: 16 },
  chartStat:        { flexDirection: "row", alignItems: "center", gap: 6 },
  chartStatText:    { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  streakCard:       { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", gap: 14, alignItems: "center" },
  streakLeft:       { alignItems: "center", minWidth: 70, gap: 2 },
  streakCountRow:   { flexDirection: "row", alignItems: "baseline", gap: 3 },
  streakCount:      { fontFamily: "Inter_700Bold", fontSize: 34, color: Colors.textPrimary, lineHeight: 40 },
  streakUnit:       { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  streakLabel:      { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, textAlign: "center" },
  streakDivider:    { width: 1, height: 44, backgroundColor: Colors.border },
  streakRight:      { flex: 1, gap: 5 },
  streakGm:         { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18, fontStyle: "italic" },
  streakBest:       { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  menuList:              { backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  menuItem:              { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  menuIcon:              { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center" },
  menuLabel:             { flex: 1, fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textPrimary },
  continueBanner:        { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.accent + "40" },
  deepBanner:            { borderColor: Colors.gold + "40" },
  continueBannerIcon:    { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  continueBannerTitle:   { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  continueBannerText:    { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  continueBtn:           { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  continueBtnText:       { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.bg },
  activeGoalBox:         { backgroundColor: Colors.green + "12", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.green + "30", gap: 6 },
  activeGoalHeader:      { flexDirection: "row", alignItems: "center", gap: 6 },
  activeGoalLabel:       { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.green, letterSpacing: 1 },
  activeGoalText:        { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textPrimary, lineHeight: 19 },
  completionRow:         { gap: 8 },
  completionTitle:       { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.8 },
  completionLayers:      { flexDirection: "row", alignItems: "flex-start", gap: 0 },
  completionLayer:       { alignItems: "center", gap: 4, flex: 1 },
  completionDot:         { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.bgElevated },
  completionDotDone:     { backgroundColor: Colors.accent, borderColor: Colors.accent },
  completionLayerLabel:  { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, textAlign: "center" },
  completionLayerLabelDone: { color: Colors.accent, fontFamily: "Inter_600SemiBold" },
  completionConnector:      { flex: 1, height: 2, backgroundColor: Colors.border, marginTop: 5 },
  completionConnectorDone:  { backgroundColor: Colors.accent },
  // Phase 18 — Command Center banner
  commandCenterBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.accent + "40",
  },
  commandCenterLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  commandCenterIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center",
  },
  commandCenterTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary, marginBottom: 2 },
  commandCenterSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  commandCenterBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
  },
  commandCenterBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.bg },
});

const endgameProfileStyles = StyleSheet.create({
  arcStagePill: {
    flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4,
    backgroundColor: Colors.accent + "15", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start",
  },
  arcStageDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  arcStageText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.accent },
  prestigeBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#9C27B012", borderRadius: 12, padding: 12, borderWidth: 1,
  },
  prestigeLabel: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1 },
  prestigeTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary, marginTop: 2 },
  prestigeReadinessBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#FFFFFF06", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border,
  },
  prestigeReadinessLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.2, marginBottom: 3 },
  prestigeReadinessDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  readinessPill: {
    backgroundColor: Colors.accentGlow, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: "center", justifyContent: "center",
  },
  readinessPct: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.accent },
});

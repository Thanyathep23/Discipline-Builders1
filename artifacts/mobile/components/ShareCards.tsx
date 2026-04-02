import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

const RARITY_COLORS: Record<string, string> = {
  common:    "#9E9E9E",
  uncommon:  "#4CAF50",
  rare:      "#2196F3",
  epic:      "#9C27B0",
  legendary: "#F5C842",
};

const RANK_COLORS: Record<string, string> = {
  Gray:   "#9E9E9E",
  Green:  "#4CAF50",
  Blue:   "#2196F3",
  Purple: "#9C27B0",
  Gold:   "#F5C842",
  Red:    "#F44336",
};

// ─────────────────────────────────────────────
// Identity Card — character overview snapshot
// ─────────────────────────────────────────────
export function IdentityCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>IDENTITY</Text>
        </View>
        <Text style={styles.cardBrand}>DisciplineOS</Text>
      </View>

      <View style={styles.identityMain}>
        <View style={styles.identityAvatar}>
          <Text style={styles.identityAvatarText}>{data.username?.[0]?.toUpperCase() ?? "?"}</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.identityUsername}>{data.username}</Text>
          {data.activeTitle && (
            <View style={styles.titleChip}>
              <Ionicons name="ribbon" size={11} color={Colors.gold} />
              <Text style={styles.titleChipText}>{data.activeTitle.name}</Text>
            </View>
          )}
        </View>
        <View style={styles.levelBubble}>
          <Text style={styles.levelBubbleNum}>Lv{data.level}</Text>
        </View>
      </View>

      {data.identitySummaryLine ? (
        <Text style={styles.identityLine}>{data.identitySummaryLine}</Text>
      ) : null}

      <View style={styles.identityStats}>
        <View style={styles.identityStat}>
          <Ionicons name="flame" size={14} color={Colors.crimson} />
          <Text style={styles.identityStatVal}>{data.streak?.current ?? 0}d</Text>
          <Text style={styles.identityStatLabel}>Streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.identityStat}>
          <Ionicons name="flash" size={14} color={Colors.gold} />
          <Text style={styles.identityStatVal}>{data.xp}</Text>
          <Text style={styles.identityStatLabel}>XP</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.identityStat}>
          <Ionicons name="checkmark-circle" size={14} color={Colors.green} />
          <Text style={styles.identityStatVal}>{data.totalSessions}</Text>
          <Text style={styles.identityStatLabel}>Sessions</Text>
        </View>
      </View>

      {data.topSkill && (
        <View style={[styles.topSkillRow, { borderColor: data.topSkill.color + "40" }]}>
          <View style={[styles.topSkillIcon, { backgroundColor: data.topSkill.color + "18" }]}>
            <Ionicons name={(data.topSkill.icon ?? "star") as any} size={15} color={data.topSkill.color} />
          </View>
          <Text style={[styles.topSkillLabel, { color: data.topSkill.color }]}>
            Top: {data.topSkill.label}
          </Text>
          <View style={[styles.rankChip, { backgroundColor: (RANK_COLORS[data.topSkill.rank] ?? "#9E9E9E") + "22" }]}>
            <Text style={[styles.rankChipText, { color: RANK_COLORS[data.topSkill.rank] ?? "#9E9E9E" }]}>
              {data.topSkill.rank} · Lv{data.topSkill.level}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>disciplineos.app</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Arc Card — current life arc snapshot
// ─────────────────────────────────────────────
export function ArcCard({ data }: { data: any }) {
  if (!data?.currentArc) return null;
  const arc = data.currentArc;
  return (
    <View style={[styles.card, styles.arcCard]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardBadge, { backgroundColor: Colors.accentDim }]}>
          <Text style={styles.cardBadgeText}>CURRENT ARC</Text>
        </View>
        <Text style={styles.cardBrand}>DisciplineOS</Text>
      </View>

      <View style={styles.arcIconWrap}>
        <Ionicons name={(arc.icon ?? "navigate") as any} size={36} color={Colors.accent} />
      </View>

      <Text style={styles.arcName}>{arc.name}</Text>
      <Text style={styles.arcSubtitle}>{arc.subtitle}</Text>

      <View style={styles.arcOperatorRow}>
        <View style={styles.identityAvatar}>
          <Text style={styles.identityAvatarText}>{data.username?.[0]?.toUpperCase() ?? "?"}</Text>
        </View>
        <View>
          <Text style={styles.arcOperatorName}>{data.username}</Text>
          {data.activeTitle && (
            <Text style={styles.arcOperatorTitle}>{data.activeTitle.name}</Text>
          )}
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>disciplineos.app</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Skill Rank Card — top skill rank achievement
// ─────────────────────────────────────────────
export function SkillRankCard({ data }: { data: any }) {
  if (!data?.topSkill) return null;
  const skill = data.topSkill;
  const rankColor = RANK_COLORS[skill.rank] ?? "#9E9E9E";

  return (
    <View style={[styles.card, { borderColor: rankColor + "40" }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardBadge, { backgroundColor: rankColor + "20" }]}>
          <Text style={[styles.cardBadgeText, { color: rankColor }]}>SKILL RANK</Text>
        </View>
        <Text style={styles.cardBrand}>DisciplineOS</Text>
      </View>

      <View style={[styles.skillRankIcon, { backgroundColor: skill.color + "18", borderColor: skill.color + "40" }]}>
        <Ionicons name={(skill.icon ?? "star") as any} size={40} color={skill.color} />
      </View>

      <Text style={[styles.skillRankName, { color: skill.color }]}>{skill.label}</Text>
      <View style={[styles.rankBigChip, { backgroundColor: rankColor + "18", borderColor: rankColor + "40" }]}>
        <Text style={[styles.rankBigText, { color: rankColor }]}>{skill.rank} Rank · Level {skill.level}</Text>
      </View>

      <View style={styles.skillXpBar}>
        <View style={[styles.skillXpFill, { width: `${skill.progressPct ?? 0}%`, backgroundColor: skill.color }]} />
      </View>
      <Text style={styles.skillXpLabel}>{skill.progressPct ?? 0}% to next level</Text>

      <View style={styles.arcOperatorRow}>
        <View style={styles.identityAvatar}>
          <Text style={styles.identityAvatarText}>{data.username?.[0]?.toUpperCase() ?? "?"}</Text>
        </View>
        <Text style={styles.arcOperatorName}>{data.username}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>disciplineos.app</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Weekly Growth Card — 7-day progress snapshot
// ─────────────────────────────────────────────
export function WeeklyGrowthCard({ data }: { data: any }) {
  if (!data) return null;
  const hrs = Math.floor((data.weeklyFocusMinutes ?? 0) / 60);
  const mins = (data.weeklyFocusMinutes ?? 0) % 60;
  const focusLabel = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

  return (
    <View style={[styles.card, styles.weekCard]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardBadge, { backgroundColor: Colors.cyanDim }]}>
          <Text style={[styles.cardBadgeText, { color: Colors.cyan }]}>WEEKLY GROWTH</Text>
        </View>
        <Text style={styles.cardBrand}>DisciplineOS</Text>
      </View>

      <Text style={styles.weekHeadline}>7-Day Snapshot</Text>
      <Text style={styles.weekSub}>{data.username} · {new Date().toLocaleDateString("en", { month: "short", year: "numeric" })}</Text>

      <View style={styles.weekStats}>
        <View style={styles.weekStat}>
          <Ionicons name="timer-outline" size={22} color={Colors.cyan} />
          <Text style={styles.weekStatVal}>{focusLabel}</Text>
          <Text style={styles.weekStatLabel}>Focus Time</Text>
        </View>
        <View style={styles.weekStatDivider} />
        <View style={styles.weekStat}>
          <Ionicons name="checkmark-done-outline" size={22} color={Colors.green} />
          <Text style={styles.weekStatVal}>{data.weeklySessionsCompleted ?? 0}</Text>
          <Text style={styles.weekStatLabel}>Sessions</Text>
        </View>
        <View style={styles.weekStatDivider} />
        <View style={styles.weekStat}>
          <Ionicons name="flame" size={22} color={Colors.crimson} />
          <Text style={styles.weekStatVal}>{data.streak?.current ?? 0}d</Text>
          <Text style={styles.weekStatLabel}>Streak</Text>
        </View>
      </View>

      {data.topSkills?.length > 0 && (
        <View style={styles.topSkillsRow}>
          {data.topSkills.slice(0, 3).map((s: any) => (
            <View key={s.skillId} style={[styles.skillPill, { borderColor: s.color + "40", backgroundColor: s.color + "10" }]}>
              <Ionicons name={(s.icon ?? "star") as any} size={11} color={s.color} />
              <Text style={[styles.skillPillText, { color: s.color }]}>{s.label} Lv{s.level}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>disciplineos.app</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Milestone Card — streak / badge / title unlock
// ─────────────────────────────────────────────
export function MilestoneCard({
  type,
  label,
  sublabel,
  icon,
  color,
  username,
}: {
  type: "streak" | "comeback" | "badge" | "title" | "rank" | "chain";
  label: string;
  sublabel?: string;
  icon?: string;
  color?: string;
  username?: string;
}) {
  const accentColor = color ?? Colors.gold;
  const milestoneIcon = icon ?? "trophy";
  const typeLabel = type === "streak" ? "STREAK MILESTONE"
    : type === "comeback" ? "COMEBACK"
    : type === "badge" ? "BADGE UNLOCK"
    : type === "title" ? "TITLE UNLOCK"
    : type === "rank" ? "RANK UP"
    : "CHAIN COMPLETE";

  return (
    <View style={[styles.card, { borderColor: accentColor + "40" }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardBadge, { backgroundColor: accentColor + "18" }]}>
          <Text style={[styles.cardBadgeText, { color: accentColor }]}>{typeLabel}</Text>
        </View>
        <Text style={styles.cardBrand}>DisciplineOS</Text>
      </View>

      <View style={[styles.milestoneIconWrap, { backgroundColor: accentColor + "15", borderColor: accentColor + "30" }]}>
        <Ionicons name={(milestoneIcon ?? "trophy") as any} size={44} color={accentColor} />
      </View>

      <Text style={[styles.milestoneLabel, { color: accentColor }]}>{label}</Text>
      {sublabel ? <Text style={styles.milestoneSublabel}>{sublabel}</Text> : null}

      {username && (
        <View style={styles.arcOperatorRow}>
          <View style={[styles.identityAvatar, { borderColor: accentColor }]}>
            <Text style={styles.identityAvatarText}>{username[0]?.toUpperCase() ?? "?"}</Text>
          </View>
          <Text style={styles.arcOperatorName}>{username}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>disciplineos.app</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Mission Result Card — mission completion
// ─────────────────────────────────────────────
export function MissionResultCard({
  missionTitle,
  skillLabel,
  skillColor,
  skillIcon,
  coinsEarned,
  xpEarned,
  rarity,
  streakBonus,
  username,
}: {
  missionTitle: string;
  skillLabel?: string;
  skillColor?: string;
  skillIcon?: string;
  coinsEarned?: number;
  xpEarned?: number;
  rarity?: string;
  streakBonus?: boolean;
  username?: string;
}) {
  const rarityColor = RARITY_COLORS[rarity ?? "common"] ?? "#9E9E9E";

  return (
    <View style={[styles.card, { borderColor: rarityColor + "40" }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardBadge, { backgroundColor: rarityColor + "18" }]}>
          <Text style={[styles.cardBadgeText, { color: rarityColor }]}>
            {rarity ? rarity.toUpperCase() : "MISSION"} COMPLETE
          </Text>
        </View>
        <Text style={styles.cardBrand}>DisciplineOS</Text>
      </View>

      <View style={styles.missionCompleteIcon}>
        <Ionicons name="checkmark-circle" size={48} color={Colors.green} />
      </View>

      <Text style={styles.missionTitle} numberOfLines={2}>{missionTitle}</Text>

      {skillLabel && (
        <View style={[styles.topSkillRow, { borderColor: (skillColor ?? Colors.accent) + "40" }]}>
          <Ionicons name={(skillIcon ?? "star") as any} size={13} color={skillColor ?? Colors.accent} />
          <Text style={[styles.topSkillLabel, { color: skillColor ?? Colors.accent }]}>{skillLabel}</Text>
        </View>
      )}

      <View style={styles.missionRewards}>
        {xpEarned != null && (
          <View style={styles.rewardChip}>
            <Ionicons name="flash" size={13} color={Colors.accent} />
            <Text style={styles.rewardChipText}>+{xpEarned} XP</Text>
          </View>
        )}
        {coinsEarned != null && (
          <View style={[styles.rewardChip, { backgroundColor: Colors.goldDim }]}>
            <Ionicons name="flash" size={13} color={Colors.gold} />
            <Text style={[styles.rewardChipText, { color: Colors.gold }]}>+{coinsEarned} Coins</Text>
          </View>
        )}
        {streakBonus && (
          <View style={[styles.rewardChip, { backgroundColor: Colors.crimsonDim }]}>
            <Ionicons name="flame" size={13} color={Colors.crimson} />
            <Text style={[styles.rewardChipText, { color: Colors.crimson }]}>Streak Bonus</Text>
          </View>
        )}
      </View>

      {username && (
        <View style={styles.arcOperatorRow}>
          <View style={styles.identityAvatar}>
            <Text style={styles.identityAvatarText}>{username[0]?.toUpperCase() ?? "?"}</Text>
          </View>
          <Text style={styles.arcOperatorName}>{username}</Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>disciplineos.app</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    gap: 14,
    width: "100%",
  },
  arcCard:  { borderColor: Colors.accentDim },
  weekCard: { borderColor: Colors.cyanDim },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardBadge: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },
  cardBrand: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    marginTop: 2,
    alignItems: "center",
  },
  cardFooterText: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },

  identityMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  identityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: Colors.accentGlow,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  identityAvatarText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.accent,
  },
  identityUsername: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  levelBubble: {
    backgroundColor: Colors.accentGlow,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.accent + "40",
  },
  levelBubbleNum: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    color: Colors.accent,
  },
  titleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.goldDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  titleChipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: Colors.gold,
  },
  identityLine: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 17,
  },
  identityStats: {
    flexDirection: "row",
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    justifyContent: "space-around",
    gap: 4,
  },
  identityStat: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  identityStatVal: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: Colors.textPrimary,
  },
  identityStatLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  topSkillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topSkillIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  topSkillLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    flex: 1,
  },
  rankChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rankChipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.5,
  },

  arcIconWrap: {
    alignSelf: "center",
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.accentGlow,
    borderWidth: 1,
    borderColor: Colors.accent + "40",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  arcName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  arcSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  arcOperatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
  },
  arcOperatorName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  arcOperatorTitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.gold,
  },

  skillRankIcon: {
    alignSelf: "center",
    width: 90,
    height: 90,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  skillRankName: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    textAlign: "center",
  },
  rankBigChip: {
    alignSelf: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  rankBigText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  skillXpBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
    marginHorizontal: 4,
  },
  skillXpFill: {
    height: "100%",
    borderRadius: 3,
  },
  skillXpLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
  },

  weekHeadline: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
  },
  weekSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: -8,
  },
  weekStats: {
    flexDirection: "row",
    backgroundColor: Colors.bgElevated,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "space-around",
  },
  weekStat: {
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  weekStatVal: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
  },
  weekStatLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: Colors.textMuted,
  },
  weekStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  topSkillsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  skillPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  skillPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },

  milestoneIconWrap: {
    alignSelf: "center",
    width: 100,
    height: 100,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  milestoneLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    textAlign: "center",
  },
  milestoneSublabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
    marginTop: -6,
  },

  missionCompleteIcon: {
    alignSelf: "center",
    marginVertical: 4,
  },
  missionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: "center",
    lineHeight: 24,
  },
  missionRewards: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  rewardChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.accentGlow,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rewardChipText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: Colors.accent,
  },
});

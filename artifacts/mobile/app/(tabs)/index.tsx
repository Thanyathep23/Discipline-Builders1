import React from "react";
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
import { useAuth } from "@/context/AuthContext";
import { useDashboard, useActiveChain, useDailyContext, useEndgame, useStartCycle, useLiveOps, useVariantBySurface, useTrackVariantOutcome, useNextAction, useRecommendations, useTrackRecommendationEvent } from "@/hooks/useApi";
import { NextActionCard } from "@/components/guidance/NextActionCard";
import { CoachCard } from "@/components/guidance/CoachCard";
import { ProgressionTipCard, StoreRecommendationCard, SecondaryActionCard } from "@/components/guidance/RecommendationPanel";

function StatCard({ label, value, icon, color, delay }: any) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[styles.statCard, { borderColor: color + "40" }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colorMap: Record<string, string> = {
    low: Colors.priorityLow,
    medium: Colors.priorityMedium,
    high: Colors.priorityHigh,
    critical: Colors.priorityCritical,
  };
  const color = colorMap[priority] ?? Colors.textSecondary;
  return (
    <View style={[styles.priorityBadge, { backgroundColor: color + "20" }]}>
      <Text style={[styles.priorityText, { color }]}>{priority.toUpperCase()}</Text>
    </View>
  );
}

function ActiveChainCard({ chain }: { chain: any }) {
  const step = (chain.currentStep ?? 0) + 1;
  const total = chain.totalSteps ?? 1;
  const pct = Math.min(step / total, 1);
  return (
    <Animated.View entering={FadeInDown.delay(160).springify()} style={chainCardStyles.card}>
      <View style={chainCardStyles.header}>
        <View style={chainCardStyles.iconBox}>
          <Ionicons name="link" size={16} color="#4FC3F7" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={chainCardStyles.label}>QUEST CHAIN</Text>
          <Text style={chainCardStyles.name}>{chain.chainName}</Text>
        </View>
        <View style={chainCardStyles.bonusChip}>
          <Ionicons name="flash" size={10} color={Colors.gold} />
          <Text style={chainCardStyles.bonusText}>+{chain.completionBonusCoins}c</Text>
        </View>
      </View>
      <View style={chainCardStyles.progress}>
        <View style={[chainCardStyles.progressBar, { width: `${Math.round(pct * 100)}%` as any }]} />
      </View>
      <Text style={chainCardStyles.stepText}>Step {step} of {total}</Text>
    </Animated.View>
  );
}

function DailyDirectiveCard({ state, message, suggestedAction, daysSinceLast, variantContent, onCTA }: {
  state: string; message: string; suggestedAction: string; daysSinceLast: number | null;
  variantContent?: string | null;
  onCTA?: () => void;
}) {
  const isComeback = state === "comeback";
  const isOverloaded = state === "overloaded";
  const accentColor = isComeback ? Colors.amber : isOverloaded ? "#FF6B6B" : Colors.accent;
  const iconName = isComeback ? "alert-circle-outline" : isOverloaded ? "warning-outline" : "radio-outline";
  const label = isComeback ? "WELCOME BACK" : isOverloaded ? "PACE YOURSELF" : "DAILY DIRECTIVE";
  const displayMessage = (isComeback && variantContent) ? variantContent : message;

  function handleCTA() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCTA?.();
    if (suggestedAction === "review_pending") {
      router.push("/mission/ai");
    } else {
      router.push("/mission/ai");
    }
  }

  return (
    <Animated.View entering={FadeInDown.delay(180).springify()} style={[directiveStyles.card, { borderColor: accentColor + "35" }]}>
      <View style={directiveStyles.header}>
        <View style={[directiveStyles.iconBox, { backgroundColor: accentColor + "20" }]}>
          <Ionicons name={iconName as any} size={16} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[directiveStyles.label, { color: accentColor }]}>{label}</Text>
          {daysSinceLast !== null && daysSinceLast > 0 && (
            <Text style={directiveStyles.days}>{daysSinceLast}d ago</Text>
          )}
        </View>
      </View>
      <Text style={directiveStyles.message}>{displayMessage}</Text>
      <Pressable
        onPress={handleCTA}
        style={({ pressed }) => [directiveStyles.cta, { opacity: pressed ? 0.8 : 1 }]}
      >
        <Text style={[directiveStyles.ctaText, { color: accentColor }]}>
          {suggestedAction === "review_pending" ? "Review Directives" : "Get Directives"}
        </Text>
        <Ionicons name="arrow-forward" size={13} color={accentColor} />
      </Pressable>
    </Animated.View>
  );
}

const directiveStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF08", borderRadius: 16, padding: 14,
    borderWidth: 1, gap: 10,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2 },
  days: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
  message: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  cta: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  ctaText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});

const chainCardStyles = StyleSheet.create({
  card: {
    backgroundColor: "#4FC3F710", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "#4FC3F730", gap: 10,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: {
    width: 34, height: 34, borderRadius: 9,
    backgroundColor: "#4FC3F720", alignItems: "center", justifyContent: "center",
  },
  label: { fontFamily: "Inter_700Bold", fontSize: 9, color: "#4FC3F7", letterSpacing: 1.2, marginBottom: 2 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  bonusChip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: Colors.goldDim, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.gold + "30",
  },
  bonusText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.gold },
  progress: {
    height: 4, backgroundColor: "#4FC3F730", borderRadius: 2, overflow: "hidden",
  },
  progressBar: { height: 4, backgroundColor: "#4FC3F7", borderRadius: 2 },
  stepText: { fontFamily: "Inter_400Regular", fontSize: 11, color: "#4FC3F7" },
});

const URGENCY_COLORS: Record<string, string> = { high: "#F44336", medium: Colors.amber, low: Colors.textMuted };
const HORIZON_ICONS: Record<string, string> = {
  mastery: "diamond-outline",
  prestige: "shield-half-outline",
  arc_stage: "navigate-outline",
  cycle: "reload-circle-outline",
};

function NextHorizonCard({ items, onStartCycle, cycleData }: {
  items: Array<{ type: string; label: string; description: string; urgency: string }>;
  onStartCycle: () => void;
  cycleData: any;
}) {
  if (!items || items.length === 0) return null;
  return (
    <Animated.View entering={FadeInDown.delay(195).springify()} style={horizonStyles.card}>
      <View style={horizonStyles.header}>
        <View style={horizonStyles.iconBox}>
          <Ionicons name="telescope-outline" size={16} color={Colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={horizonStyles.label}>PROGRESSION HORIZON</Text>
          <Text style={horizonStyles.subtitle}>Your next major unlocks</Text>
        </View>
      </View>
      {items.map((item, i) => (
        <View key={i} style={[horizonStyles.item, i > 0 && { borderTopWidth: 1, borderTopColor: Colors.border + "60" }]}>
          <View style={[horizonStyles.itemIcon, { backgroundColor: URGENCY_COLORS[item.urgency] + "15" }]}>
            <Ionicons name={(HORIZON_ICONS[item.type] ?? "arrow-forward-outline") as any} size={13} color={URGENCY_COLORS[item.urgency]} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[horizonStyles.itemLabel, { color: URGENCY_COLORS[item.urgency] }]}>{item.label}</Text>
            <Text style={horizonStyles.itemDesc} numberOfLines={2}>{item.description}</Text>
          </View>
          <View style={[horizonStyles.urgencyDot, { backgroundColor: URGENCY_COLORS[item.urgency] }]} />
        </View>
      ))}
      {!cycleData?.activeCycle && (
        <Pressable
          style={({ pressed }) => [horizonStyles.startCycleBtn, pressed && { opacity: 0.8 }]}
          onPress={onStartCycle}
        >
          <Ionicons name="add-circle-outline" size={14} color={Colors.accent} />
          <Text style={horizonStyles.startCycleBtnText}>Start a Season / Sprint</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const horizonStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF06", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.accent + "25", gap: 10,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 32, height: 32, borderRadius: 9, backgroundColor: Colors.accent + "18", alignItems: "center", justifyContent: "center" },
  label: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent, letterSpacing: 1.2 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingTop: 8 },
  itemIcon: { width: 28, height: 28, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemLabel: { fontFamily: "Inter_700Bold", fontSize: 12 },
  itemDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 16 },
  urgencyDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  startCycleBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 6 },
  startCycleBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },
});

function LiveContentBanner({ events, packs }: { events: any[]; packs: any[] }) {
  const topEvent = events[0] ?? null;
  const topPack = packs[0] ?? null;
  if (!topEvent && !topPack) return null;

  if (topEvent) {
    const color = topEvent.bannerColor ?? Colors.accent;
    const hasEndsAt = !!topEvent.endsAt;
    const daysLeft = hasEndsAt
      ? Math.max(0, Math.ceil((new Date(topEvent.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;
    return (
      <Animated.View entering={FadeInDown.delay(190).springify()} style={[liveStyles.card, { borderColor: color + "35" }]}>
        <View style={liveStyles.header}>
          <View style={[liveStyles.iconBox, { backgroundColor: color + "20" }]}>
            <Ionicons name="calendar-outline" size={14} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[liveStyles.label, { color }]}>LIVE EVENT</Text>
            <Text style={liveStyles.name}>{topEvent.name}</Text>
          </View>
          {daysLeft !== null && (
            <View style={[liveStyles.timerChip, { backgroundColor: color + "18" }]}>
              <Ionicons name="timer-outline" size={10} color={color} />
              <Text style={[liveStyles.timerText, { color }]}>{daysLeft}d left</Text>
            </View>
          )}
        </View>
        {!!topEvent.description && (
          <Text style={liveStyles.desc} numberOfLines={2}>{topEvent.description}</Text>
        )}
        {topEvent.rewardCoins > 0 && (
          <View style={liveStyles.rewardRow}>
            <Ionicons name="flash" size={11} color={Colors.gold} />
            <Text style={liveStyles.rewardText}>{topEvent.rewardCoins} bonus coins on completion</Text>
          </View>
        )}
      </Animated.View>
    );
  }

  if (topPack) {
    return (
      <Animated.View entering={FadeInDown.delay(190).springify()} style={[liveStyles.card, { borderColor: Colors.cyan + "35" }]}>
        <View style={liveStyles.header}>
          <View style={[liveStyles.iconBox, { backgroundColor: Colors.cyan + "18" }]}>
            <Ionicons name="layers-outline" size={14} color={Colors.cyan} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[liveStyles.label, { color: Colors.cyan }]}>CHALLENGE PACK</Text>
            <Text style={liveStyles.name}>{topPack.name}</Text>
          </View>
        </View>
        {!!topPack.description && (
          <Text style={liveStyles.desc} numberOfLines={2}>{topPack.description}</Text>
        )}
        {(topPack.missionTemplates ?? []).length > 0 && (
          <Text style={liveStyles.packMeta}>{topPack.missionTemplates.length} curated missions available</Text>
        )}
      </Animated.View>
    );
  }

  return null;
}

const liveStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF06", borderRadius: 16, padding: 14,
    borderWidth: 1, gap: 8,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary, marginTop: 1 },
  timerChip: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7,
  },
  timerText: { fontFamily: "Inter_700Bold", fontSize: 9 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  rewardText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.gold },
  packMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
});

const HIGH_PRIORITY_ACTIONS = new Set([
  "complete_profile", "create_first_mission", "start_first_session",
  "submit_first_proof", "answer_followup", "return_to_session", "recover_rejection",
]);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useDashboard();
  const { data: chainData } = useActiveChain();
  const { data: dailyData } = useDailyContext();
  const { data: endgameData } = useEndgame();
  const { data: liveOpsData } = useLiveOps();
  const { data: guidanceData } = useNextAction();
  const { data: recData } = useRecommendations();
  const trackRec = useTrackRecommendationEvent();
  const [dismissedCards, setDismissedCards] = React.useState<string[]>([]);
  const isComeback = dailyData?.state === "comeback";
  const { data: comebackVariant } = useVariantBySurface("comeback_copy", isComeback);
  const trackOutcome = useTrackVariantOutcome();
  const startCycle = useStartCycle();

  const nextAction = guidanceData?.nextAction ?? null;
  const coachCards = (guidanceData?.coachCards ?? []).filter((c: any) => !dismissedCards.includes(c.id));
  const showNextAction = nextAction && HIGH_PRIORITY_ACTIONS.has(nextAction.action);

  function handleComebackCTA() {
    if (comebackVariant?.variantId && comebackVariant.variantKey !== "control") {
      trackOutcome.mutate({
        variantId: comebackVariant.variantId,
        variantKey: comebackVariant.variantKey,
        action: "directive_cta_pressed",
        surface: "comeback_copy",
      });
    }
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 84);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
        refreshControl={<RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={Colors.accent} />}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Good {getTimeOfDay()},</Text>
            <Text style={styles.username}>{user?.username ?? "Operator"}</Text>
          </View>
          <View style={styles.coinsChip}>
            <Ionicons name="flash" size={14} color={Colors.gold} />
            <Text style={styles.coinsText}>{data?.coinBalance ?? user?.coinBalance ?? 0}</Text>
          </View>
        </Animated.View>

        {/* Active Session Banner */}
        {data?.activeSession && (
          <Animated.View entering={FadeInDown.delay(50).springify()}>
            <Pressable
              style={({ pressed }) => [styles.activeBanner, pressed && { opacity: 0.9 }]}
              onPress={() => router.push("/focus/active")}
            >
              <View style={styles.activePulse}>
                <View style={styles.activeDot} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activeBannerLabel}>ACTIVE SESSION</Text>
                <Text style={styles.activeBannerTitle}>{data.activeSession.mission?.title}</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={Colors.green} />
            </Pressable>
          </Animated.View>
        )}

        {/* Next Action Guidance (high-priority, new-user flows) */}
        {showNextAction && (
          <NextActionCard action={nextAction} delay={60} />
        )}

        {/* Stats Grid */}
        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard label="Today's Focus" value={`${data?.todayFocusMinutes ?? 0}m`} icon="timer-outline" color={Colors.cyan} delay={100} />
            <StatCard label="Streak" value={`${data?.currentStreak ?? 0}d`} icon="flame" color={Colors.amber} delay={150} />
            <StatCard label="Done Today" value={`${data?.todayCompleted ?? 0}/${data?.todayMissions ?? 0}`} icon="checkmark-circle" color={Colors.green} delay={200} />
            <StatCard label="Level" value={`L${data?.level ?? user?.level ?? 1}`} icon="star" color={Colors.accent} delay={250} />
          </View>
        )}

        {/* Quick Actions — primary CTA near the top */}
        <Animated.View entering={FadeInDown.delay(180).springify()}>
          <View style={styles.quickActions}>
            <Pressable
              style={({ pressed }) => [styles.quickBtn, styles.quickBtnPrimary, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/mission/new"); }}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.quickBtnTextPrimary}>New Mission</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.quickBtn, styles.quickBtnSecondary, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/missions"); }}
            >
              <Ionicons name="list" size={20} color={Colors.textPrimary} />
              <Text style={styles.quickBtnTextSecondary}>View Missions</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Current Arc */}
        {data?.currentArc && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.arcBanner}>
            <View style={styles.arcBannerIcon}>
              <Ionicons name={(data.currentArc.icon ?? "navigate") as any} size={18} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.arcBannerLabel}>CURRENT ARC</Text>
              <Text style={styles.arcBannerName}>{data.currentArc.name}</Text>
              <Text style={styles.arcBannerSub} numberOfLines={1}>{data.currentArc.subtitle}</Text>
            </View>
          </Animated.View>
        )}

        {/* Active Quest Chain */}
        {chainData?.chain && chainData.chain.status === "active" && (
          <ActiveChainCard chain={chainData.chain} />
        )}

        {/* Daily Directive */}
        {dailyData && (
          <DailyDirectiveCard
            state={dailyData.state}
            message={dailyData.message}
            suggestedAction={dailyData.suggestedAction}
            daysSinceLast={dailyData.daysSinceLast}
            variantContent={comebackVariant?.content}
            onCTA={handleComebackCTA}
          />
        )}

        {/* Coach Cards */}
        {coachCards.length > 0 && (
          <Animated.View entering={FadeInDown.delay(220).springify()} style={{ gap: 10 }}>
            {coachCards.map((card: any, i: number) => (
              <CoachCard
                key={card.id}
                card={card}
                delay={i * 40}
                onDismiss={(id) => setDismissedCards((prev) => [...prev, id])}
              />
            ))}
          </Animated.View>
        )}

        {/* For You — Recommendation Panel (intermediate/advanced users only) */}
        {recData && recData.userTier !== "new" && (
          <Animated.View entering={FadeInDown.delay(240).springify()} style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>For You</Text>
            {recData.progressionTip && (
              <ProgressionTipCard
                tip={recData.progressionTip}
                delay={0}
                onDismiss={() => trackRec.mutate({ event: "dismissed", type: "progression" })}
              />
            )}
            {!recData.progressionTip && recData.storeRecommendation && (
              <StoreRecommendationCard
                rec={recData.storeRecommendation}
                delay={0}
                onDismiss={() => trackRec.mutate({ event: "dismissed", type: "store", itemId: recData.storeRecommendation?.itemId })}
                onCTAPress={() => trackRec.mutate({ event: "clicked", type: "store", itemId: recData.storeRecommendation?.itemId })}
              />
            )}
            {(recData.secondaryActions ?? []).map((action: any, i: number) => (
              <SecondaryActionCard
                key={action.type}
                action={action}
                delay={i * 40}
                onCTAPress={() => trackRec.mutate({ event: "clicked", type: action.type })}
              />
            ))}
          </Animated.View>
        )}

        {/* Live Event / Challenge Pack Banner */}
        {liveOpsData && (liveOpsData.events.length > 0 || liveOpsData.packs.length > 0) && (
          <LiveContentBanner events={liveOpsData.events} packs={liveOpsData.packs} />
        )}

        {/* Progression Horizon — first item only to reduce noise; see full list in Evolution */}
        {endgameData?.nextHorizon && endgameData.nextHorizon.length > 0 && (
          <Animated.View entering={FadeInDown.delay(260).springify()} style={{ gap: 8 }}>
            <NextHorizonCard
              items={endgameData.nextHorizon.slice(0, 1)}
              cycleData={endgameData.cycle}
              onStartCycle={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                const suggested = endgameData.cycle?.suggestedCycleType ?? "focus_season";
                startCycle.mutate(suggested);
              }}
            />
            {endgameData.nextHorizon.length > 1 && (
              <Pressable
                style={styles.seeAllHorizon}
                onPress={() => { Haptics.selectionAsync(); router.push("/evolution"); }}
              >
                <Text style={styles.seeAllHorizonText}>+{endgameData.nextHorizon.length - 1} more milestones in Evolution</Text>
                <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} />
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* Pending Follow-ups */}
        {data?.pendingProofs?.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Text style={styles.sectionTitle}>Awaiting Your Response</Text>
            {data.pendingProofs.map((p: any) => (
              <Pressable
                key={p.id}
                style={({ pressed }) => [styles.followupCard, pressed && { opacity: 0.9 }]}
                onPress={() => router.push(`/proof/${p.sessionId}`)}
              >
                <View style={styles.followupIcon}>
                  <Ionicons name="chatbubble-ellipses" size={20} color={Colors.amber} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.followupTitle}>AI has follow-up questions</Text>
                  <Text style={styles.followupSub} numberOfLines={1}>{p.followupQuestions}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </Pressable>
            ))}
          </Animated.View>
        )}

        {/* Recent Missions */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Recent Missions</Text>
            <Pressable onPress={() => router.push("/(tabs)/missions")}>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          {!data?.recentMissions?.length ? (
            <View style={styles.emptyBox}>
              <Ionicons name="telescope-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No missions yet</Text>
              <Text style={styles.emptyText}>
                A mission is a committed task — you set the goal, start a focus session, and submit proof. That loop is how you earn XP, rewards, and build your character.
              </Text>
              <Pressable
                style={styles.emptyActionBtn}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/mission/new"); }}
              >
                <Ionicons name="add-circle-outline" size={16} color={Colors.accent} />
                <Text style={styles.emptyActionBtnText}>Create Your First Mission</Text>
              </Pressable>
            </View>
          ) : (
            data.recentMissions.map((m: any, i: number) => (
              <Pressable
                key={m.id}
                style={({ pressed }) => [styles.missionCard, pressed && { opacity: 0.9 }]}
                onPress={() => router.push(`/mission/${m.id}`)}
              >
                <View style={styles.missionCardRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.missionTitle} numberOfLines={1}>{m.title}</Text>
                    <Text style={styles.missionMeta}>{m.category} · {m.targetDurationMinutes}min</Text>
                  </View>
                  <View style={styles.missionCardRight}>
                    <PriorityBadge priority={m.priority} />
                    <StatusDot status={m.status} />
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: Colors.green,
    completed: Colors.accent,
    rejected: Colors.crimson,
    draft: Colors.textMuted,
    archived: Colors.textMuted,
  };
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colorMap[status] ?? Colors.textMuted }} />;
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 20, gap: 24 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  username: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.textPrimary, letterSpacing: -0.5 },
  coinsChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.bgElevated, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.goldDim,
  },
  coinsText: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.gold },

  activeBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.greenDim, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.green + "50",
  },
  activePulse: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.green + "20", alignItems: "center", justifyContent: "center" },
  activeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.green },
  activeBannerLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.green, letterSpacing: 1.5 },
  activeBannerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary, marginTop: 2 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    flex: 1, minWidth: "45%", backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, gap: 8, alignItems: "flex-start",
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary, letterSpacing: -0.5 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },

  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary, marginBottom: 12 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  seeAll: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.accent },

  quickActions: { flexDirection: "row", gap: 12 },
  quickBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", height: 50, borderRadius: 14, gap: 8 },
  quickBtnPrimary: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  quickBtnSecondary: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  quickBtnTextPrimary: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },
  quickBtnTextSecondary: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },

  followupCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.amberDim, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.amber + "40", marginBottom: 8,
  },
  followupIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.amber + "20", alignItems: "center", justifyContent: "center" },
  followupTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  followupSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  missionCard: { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  missionCardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  missionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textPrimary },
  missionMeta: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  missionCardRight: { alignItems: "flex-end", gap: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.8 },

  arcBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: Colors.accentGlow, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.accent + "30",
  },
  arcBannerIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: Colors.accent + "20", alignItems: "center", justifyContent: "center",
  },
  arcBannerLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textAccent, letterSpacing: 1.2, marginBottom: 3 },
  arcBannerName:  { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary, lineHeight: 20 },
  arcBannerSub:   { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textAccent, lineHeight: 16, marginTop: 3 },

  emptyBox: { alignItems: "center", padding: 32, gap: 12 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textSecondary },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
  emptyActionBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.accent + "50", backgroundColor: Colors.accent + "15",
  },
  emptyActionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.accent },

  seeAllHorizon: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: 8,
  },
  seeAllHorizonText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
});

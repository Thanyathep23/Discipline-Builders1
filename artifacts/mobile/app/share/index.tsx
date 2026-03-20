import React, { useState, useRef } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  ActivityIndicator, Share, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useShareSnapshot } from "@/hooks/useApi";
import {
  IdentityCard,
  ArcCard,
  SkillRankCard,
  WeeklyGrowthCard,
  MilestoneCard,
} from "@/components/ShareCards";

type CardType = "identity" | "arc" | "skill" | "weekly" | "streak" | "comeback";

const CARD_TABS: { key: CardType; label: string; icon: string }[] = [
  { key: "identity", label: "Identity",    icon: "person"         },
  { key: "arc",      label: "Arc",         icon: "navigate"       },
  { key: "skill",    label: "Top Skill",   icon: "stats-chart"    },
  { key: "weekly",   label: "Weekly",      icon: "calendar"       },
  { key: "streak",   label: "Streak",      icon: "flame"          },
];

export default function ShareShowcaseScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, error } = useShareSnapshot();
  const [activeCard, setActiveCard] = useState<CardType>("identity");

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 34 : 84);

  const snap = data as any;

  async function handleShareText() {
    if (!snap) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const streakStr = snap.streak?.current > 0 ? ` ${snap.streak.current}-day streak.` : "";
      const arcStr = snap.currentArc ? ` Currently on the ${snap.currentArc.name}.` : "";
      const skillStr = snap.topSkill ? ` Top skill: ${snap.topSkill.label} (${snap.topSkill.rank} Rank Lv${snap.topSkill.level}).` : "";
      const text = `${snap.identitySummaryLine}.${streakStr}${arcStr}${skillStr}\n\n— via DisciplineOS`;
      await Share.share({ message: text });
    } catch (err: any) {
      if (err.message !== "User did not share") {
        Alert.alert("Share", err.message);
      }
    }
  }

  function getMilestoneCardProps() {
    if (!snap) return null;
    const streak = snap.streak?.current ?? 0;
    if (streak >= 14) {
      return { type: "streak" as const, label: `${streak}-Day Streak`, sublabel: "Unbreakable consistency. Every day counts.", icon: "flame", color: Colors.gold };
    }
    if (streak >= 7) {
      return { type: "streak" as const, label: `${streak}-Day Streak`, sublabel: "7 days of real discipline.", icon: "flame", color: Colors.crimson };
    }
    if (streak >= 3) {
      return { type: "streak" as const, label: `${streak}-Day Streak`, sublabel: "Building momentum.", icon: "flash", color: Colors.amber };
    }
    return { type: "streak" as const, label: "Starting the Streak", sublabel: "One session starts everything.", icon: "play-circle", color: Colors.accent };
  }

  const milestoneProps = getMilestoneCardProps();

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.loadingText}>Building your cards...</Text>
      </View>
    );
  }

  if (error || !snap) {
    return (
      <View style={[styles.container, { paddingTop: topPad, justifyContent: "center", alignItems: "center", gap: 14 }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.errorText}>Could not load snapshot</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const availableTabs = CARD_TABS.filter((tab) => {
    if (tab.key === "arc" && !snap.currentArc) return false;
    if (tab.key === "skill" && !snap.topSkill) return false;
    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => { Haptics.selectionAsync(); router.back(); }} style={styles.backIcon}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Share Progress</Text>
        <Pressable onPress={handleShareText} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={18} color={Colors.accent} />
          <Text style={styles.shareBtnText}>Share</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {availableTabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeCard === tab.key && styles.tabActive]}
            onPress={() => { Haptics.selectionAsync(); setActiveCard(tab.key); }}
          >
            <Ionicons
              name={(tab.icon + (activeCard === tab.key ? "" : "-outline")) as any}
              size={14}
              color={activeCard === tab.key ? "#fff" : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeCard === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad }]}
      >
        <Animated.View key={activeCard} entering={FadeInDown.springify()} style={styles.cardWrap}>
          {activeCard === "identity" && <IdentityCard data={snap} />}
          {activeCard === "arc" && <ArcCard data={snap} />}
          {activeCard === "skill" && <SkillRankCard data={snap} />}
          {activeCard === "weekly" && <WeeklyGrowthCard data={snap} />}
          {activeCard === "streak" && milestoneProps && (
            <MilestoneCard {...milestoneProps} username={snap.username} />
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.screenshotHint}>
          <Ionicons name="camera-outline" size={18} color={Colors.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.hintTitle}>Screenshot to Share</Text>
            <Text style={styles.hintText}>
              Take a screenshot of this card to share your progress. Cards show only your public progress — no private data.
            </Text>
          </View>
        </Animated.View>

        {snap.recentBadges?.length > 0 && (
          <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.badgesRow}>
            <Text style={styles.badgesLabel}>RECENT UNLOCKS</Text>
            <View style={styles.badgesList}>
              {snap.recentBadges.map((b: any, i: number) => {
                const rarityColors: Record<string, string> = {
                  common: "#9E9E9E", uncommon: "#4CAF50", rare: "#2196F3", epic: "#9C27B0", legendary: "#F5C842"
                };
                const c = rarityColors[b.rarity] ?? "#9E9E9E";
                return (
                  <View key={i} style={[styles.badgePill, { borderColor: c + "40", backgroundColor: c + "10" }]}>
                    <Ionicons name={(b.icon ?? "ribbon") as any} size={13} color={c} />
                    <Text style={[styles.badgePillText, { color: c }]}>{b.name}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.privacyNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color={Colors.green} />
          <Text style={styles.privacyText}>
            Share cards never expose your email, financial data, private notes, or proof files.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  header:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
  backIcon:        { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  headerTitle:     { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary, flex: 1 },
  shareBtn:        { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.accentGlow, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: Colors.accent + "40" },
  shareBtnText:    { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.accent },
  tabScroll:       { flexGrow: 0, marginBottom: 14 },
  tab:             { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  tabActive:       { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tabText:         { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  tabTextActive:   { color: "#fff" },
  scroll:          { paddingHorizontal: 20, gap: 16 },
  cardWrap:        {},
  screenshotHint:  { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  hintTitle:       { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary, marginBottom: 3 },
  hintText:        { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  badgesRow:       { backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  badgesLabel:     { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.2 },
  badgesList:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badgePill:       { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  badgePillText:   { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  privacyNote:     { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 6, paddingHorizontal: 4 },
  privacyText:     { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, flex: 1, lineHeight: 16 },
  loadingText:     { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted, marginTop: 12 },
  errorText:       { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.textSecondary },
  backBtn:         { backgroundColor: Colors.bgCard, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  backBtnText:     { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
});

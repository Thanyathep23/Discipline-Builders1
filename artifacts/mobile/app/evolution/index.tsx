import React, { useMemo } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useSkills, useEndgame, useIdentity, useInventoryTitles, useAppliedState } from "@/hooks/useApi";
import { computeCharacterState, type CharacterState, type DimensionScore, type EquippedGearItem } from "@/lib/characterEngine";

const RARITY_COLORS: Record<string, string> = {
  common:    "#9E9E9E",
  uncommon:  "#4CAF50",
  rare:      "#2196F3",
  epic:      "#9C27B0",
  legendary: "#FF9800",
};

// ─── Character Figure ────────────────────────────────────────────────────────

function CharacterFigure({ state }: { state: CharacterState }) {
  const tc = state.tierColor;
  const glowOpacity = 0.12 + state.statusTierIndex * 0.06;
  const auraSize = 140 + state.statusTierIndex * 10;

  return (
    <View style={figStyles.container}>
      {/* Outer environment backdrop */}
      <View style={[figStyles.backdrop, { backgroundColor: tc + "08" }]} />

      {/* Aura rings */}
      <View style={[figStyles.auraOuter, { width: auraSize + 40, height: auraSize + 40, borderColor: tc + "18" }]} />
      <View style={[figStyles.auraInner, { width: auraSize, height: auraSize, borderColor: tc + "30" }]} />
      <View style={[figStyles.auraCore, { width: auraSize - 40, height: auraSize - 40, backgroundColor: tc + (Math.round(glowOpacity * 255).toString(16).padStart(2, "0")) }]} />

      {/* Character silhouette — head */}
      <View style={[figStyles.head, { borderColor: tc + "60", backgroundColor: Colors.bgCard }]}>
        <View style={[figStyles.headGlow, { backgroundColor: tc + "20" }]} />
        {/* Tier indicator inside head */}
        <Text style={[figStyles.tierGlyph, { color: tc }]}>
          {state.statusTierIndex === 4 ? "◆" :
           state.statusTierIndex === 3 ? "★" :
           state.statusTierIndex === 2 ? "▲" :
           state.statusTierIndex === 1 ? "●" : "○"}
        </Text>
      </View>

      {/* Character silhouette — body */}
      <View style={[figStyles.body, { borderColor: tc + "40", backgroundColor: Colors.bgCard }]}>
        {/* Body inner glow */}
        <View style={[figStyles.bodyGlow, { backgroundColor: tc + "15" }]} />

        {/* Outfit tier stripe */}
        <View style={[figStyles.outfitStripe, { backgroundColor: tc + "30" }]} />

        {/* Specialist badge */}
        <View style={[figStyles.specialistBadge, { backgroundColor: Colors.bg, borderColor: tc + "80" }]}>
          <Ionicons name={state.specialistIcon as any} size={13} color={tc} />
        </View>

        {/* Prestige accent */}
        {state.hasPrestige && (
          <View style={[figStyles.prestigeAccent, { backgroundColor: "#F5C842" + "20", borderColor: "#F5C842" + "60" }]}>
            <Ionicons name="diamond" size={10} color="#F5C842" />
          </View>
        )}
      </View>

      {/* Energy tone bar below figure */}
      <View style={figStyles.energyBar}>
        <View style={[figStyles.energyFill, { width: `${(state.overallScore / 10) * 100}%` as any, backgroundColor: tc }]} />
      </View>

      {/* Labels */}
      <Text style={[figStyles.tierLabel, { color: tc }]}>{state.statusTier.toUpperCase()}</Text>
      <Text style={figStyles.roleLabel}>{state.specialistRole} · {state.energyTone}</Text>
    </View>
  );
}

const figStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 0,
    position: "relative",
  },
  backdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 24,
  },
  auraOuter: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
  },
  auraInner: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
  },
  auraCore: {
    position: "absolute",
    borderRadius: 999,
  },
  head: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    overflow: "hidden",
    zIndex: 2,
  },
  headGlow: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 26,
  },
  tierGlyph: {
    fontSize: 20,
    zIndex: 3,
  },
  body: {
    width: 64,
    height: 80,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    zIndex: 2,
    position: "relative",
  },
  bodyGlow: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
  },
  outfitStripe: {
    position: "absolute",
    top: 18,
    left: 0,
    right: 0,
    height: 24,
  },
  specialistBadge: {
    position: "absolute",
    bottom: 8,
    right: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  prestigeAccent: {
    position: "absolute",
    top: 6,
    right: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  energyBar: {
    width: 80,
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 12,
    zIndex: 2,
  },
  energyFill: {
    height: "100%",
    borderRadius: 2,
  },
  tierLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 2,
    marginTop: 10,
    zIndex: 2,
  },
  roleLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    zIndex: 2,
    textTransform: "capitalize",
  },
});

// ─── Dimension Bar ───────────────────────────────────────────────────────────

function DimensionBar({ dim, delay }: { dim: DimensionScore; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={dimStyles.row}>
      <View style={dimStyles.labelRow}>
        <View style={[dimStyles.iconWrap, { backgroundColor: dim.color + "18" }]}>
          <Ionicons name={dim.icon as any} size={14} color={dim.color} />
        </View>
        <Text style={dimStyles.label}>{dim.label}</Text>
        {dim.isStrength && (
          <View style={[dimStyles.tag, { backgroundColor: dim.color + "20", borderColor: dim.color + "50" }]}>
            <Text style={[dimStyles.tagText, { color: dim.color }]}>Strength</Text>
          </View>
        )}
        {dim.isWeakZone && (
          <View style={[dimStyles.tag, { backgroundColor: Colors.amberDim, borderColor: Colors.amber + "40" }]}>
            <Text style={[dimStyles.tagText, { color: Colors.amber }]}>Focus</Text>
          </View>
        )}
        <Text style={dimStyles.descriptor}>{dim.descriptor}</Text>
      </View>
      <View style={dimStyles.track}>
        <View style={[dimStyles.fill, { width: `${dim.pct}%` as any, backgroundColor: dim.color }]} />
      </View>
    </Animated.View>
  );
}

const dimStyles = StyleSheet.create({
  row: { gap: 6 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  tag: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
  },
  tagText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.8 },
  descriptor: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, flex: 1, textAlign: "right" },
  track: { height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});

// ─── Hint Card ───────────────────────────────────────────────────────────────

function HintCard({ message, urgency, delay }: { message: string; urgency: string; delay: number }) {
  const color = urgency === "high" ? Colors.crimson : urgency === "medium" ? Colors.amber : Colors.accent;
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[hintStyles.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <Ionicons name="arrow-forward-circle-outline" size={14} color={color} style={{ marginTop: 1 }} />
      <Text style={hintStyles.text}>{message}</Text>
    </Animated.View>
  );
}

const hintStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 19,
  },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CharacterEvolutionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: skillsData, isLoading: skillsLoading } = useSkills();
  const { data: endgameData, isLoading: endgameLoading } = useEndgame();
  const { data: identityData } = useIdentity();
  const { data: titlesData } = useInventoryTitles();
  const { data: appliedState } = useAppliedState();

  const isLoading = skillsLoading || endgameLoading;

  const equippedCharacterItems = useMemo(() => {
    return appliedState?.character?.equippedItems ?? [];
  }, [appliedState]);

  const characterState = useMemo<CharacterState | null>(() => {
    if (!skillsData?.skills || !endgameData) return null;
    return computeCharacterState(skillsData.skills, endgameData, identityData, equippedCharacterItems);
  }, [skillsData, endgameData, identityData, equippedCharacterItems]);

  const activeTitle = (titlesData?.titles ?? []).find((t: any) => t.isActive);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Character Evolution</Text>
          {characterState && (
            <Text style={styles.headerSub}>
              {user?.username} · {characterState.arcLabel ?? "No arc"}
            </Text>
          )}
        </View>
        {characterState && (
          <View style={[styles.tierPill, { backgroundColor: characterState.tierColor + "18", borderColor: characterState.tierColor + "50" }]}>
            <Text style={[styles.tierPillText, { color: characterState.tierColor }]}>
              {characterState.statusTier}
            </Text>
          </View>
        )}
      </View>

      {isLoading || !characterState ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Computing your evolution…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        >
          {/* ── Hero character visualization ── */}
          <Animated.View entering={FadeIn.duration(400)} style={[styles.heroCard, { borderColor: characterState.tierColor + "30" }]}>
            {/* Active title if any */}
            {activeTitle && (
              <View style={styles.activeTitleRow}>
                <Ionicons name="ribbon" size={12} color={Colors.gold} />
                <Text style={styles.activeTitleText}>{activeTitle.name}</Text>
              </View>
            )}

            <CharacterFigure state={characterState} />

            {/* Visual state descriptors */}
            <View style={styles.descriptorRow}>
              <View style={styles.descriptorChip}>
                <Text style={styles.descriptorLabel}>BODY</Text>
                <Text style={styles.descriptorValue}>{characterState.bodyState}</Text>
              </View>
              <View style={styles.descriptorDivider} />
              <View style={styles.descriptorChip}>
                <Text style={styles.descriptorLabel}>POSTURE</Text>
                <Text style={styles.descriptorValue}>{characterState.postureState}</Text>
              </View>
              <View style={styles.descriptorDivider} />
              <View style={styles.descriptorChip}>
                <Text style={styles.descriptorLabel}>OUTFIT</Text>
                <Text style={styles.descriptorValue}>{characterState.outfitTier}</Text>
              </View>
            </View>

            {/* Arc + prestige badges */}
            <View style={styles.badgesRow}>
              {characterState.arcLabel && (
                <View style={styles.arcBadge}>
                  <Ionicons name="compass-outline" size={11} color={Colors.accent} />
                  <Text style={styles.arcBadgeText}>{characterState.arcLabel}</Text>
                  {characterState.arcStageLabel && (
                    <Text style={styles.arcStageText}>· {characterState.arcStageLabel}</Text>
                  )}
                </View>
              )}
              {characterState.hasPrestige && (
                <View style={styles.prestigeBadge}>
                  <Ionicons name="diamond" size={11} color="#F5C842" />
                  <Text style={styles.prestigeBadgeText}>Prestige {characterState.prestigeTier}</Text>
                </View>
              )}
              {characterState.hasMastery && !characterState.hasPrestige && (
                <View style={styles.masteryBadge}>
                  <Ionicons name="star" size={11} color={Colors.accent} />
                  <Text style={styles.masteryBadgeText}>Mastery Unlocked</Text>
                </View>
              )}
            </View>

            {/* ── Equipped gear row (Phase 23) ── */}
            {characterState.equippedGear.length > 0 && (
              <View style={styles.gearRow}>
                <Text style={styles.gearLabel}>EQUIPPED</Text>
                <View style={styles.gearChips}>
                  {characterState.equippedGear.map((g: EquippedGearItem) => (
                    <View key={g.itemId} style={[styles.gearChip, { borderColor: RARITY_COLORS[g.rarity] + "50" }]}>
                      <Ionicons name={(g.icon ?? "gift") as any} size={11} color={RARITY_COLORS[g.rarity] ?? "#9E9E9E"} />
                      <Text style={[styles.gearChipText, { color: RARITY_COLORS[g.rarity] ?? "#9E9E9E" }]} numberOfLines={1}>
                        {g.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Animated.View>

          {/* ── Overall score ── */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.scoreCard}>
            <View style={styles.scoreLeft}>
              <Text style={[styles.scoreValue, { color: characterState.tierColor }]}>
                {characterState.overallScore.toFixed(1)}
              </Text>
              <Text style={styles.scoreMax}>/10</Text>
            </View>
            <View style={styles.scoreMeta}>
              <Text style={styles.scoreTitle}>Evolution Score</Text>
              <Text style={styles.scoreDesc}>
                Weighted across fitness, discipline, lifestyle, specialist depth, and prestige.
              </Text>
            </View>
            {/* Tier progress indicator */}
            <View style={styles.tierProgressWrap}>
              {(["Starter", "Hustle", "Rising", "Refined", "Elite"] as const).map((t, i) => (
                <View
                  key={t}
                  style={[
                    styles.tierDot,
                    {
                      backgroundColor: i <= characterState.statusTierIndex
                        ? characterState.tierColor
                        : Colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── Dimension breakdown ── */}
          <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Progression Dimensions</Text>
            <View style={styles.dimensionsCard}>
              {characterState.dimensions.map((dim, i) => (
                <View key={dim.id}>
                  <DimensionBar dim={dim} delay={160 + i * 40} />
                  {i < characterState.dimensions.length - 1 && <View style={styles.dimDivider} />}
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ── What's powering you ── */}
          {characterState.topStrengths.length > 0 && (
            <Animated.View entering={FadeInDown.delay(360).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Powering Your Evolution</Text>
              {characterState.topStrengths.map(s => (
                <View key={s.id} style={[styles.strengthRow, { borderLeftColor: s.color, borderLeftWidth: 3 }]}>
                  <View style={[styles.strengthIcon, { backgroundColor: s.color + "18" }]}>
                    <Ionicons name={s.icon as any} size={16} color={s.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.strengthLabel}>{s.label}</Text>
                    <Text style={styles.strengthDesc}>{s.descriptor}</Text>
                  </View>
                  <Text style={[styles.strengthScore, { color: s.color }]}>{s.pct}%</Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* ── What's holding you back ── */}
          {characterState.weakZones.length > 0 && (
            <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Limiting Your Evolution</Text>
              {characterState.weakZones.map(w => (
                <View key={w.id} style={[styles.weakRow, { borderLeftColor: Colors.amber, borderLeftWidth: 3 }]}>
                  <View style={[styles.strengthIcon, { backgroundColor: Colors.amberDim }]}>
                    <Ionicons name={w.icon as any} size={16} color={Colors.amber} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.strengthLabel}>{w.label}</Text>
                    <Text style={styles.strengthDesc}>{w.descriptor}</Text>
                  </View>
                  <Text style={[styles.strengthScore, { color: Colors.amber }]}>{w.pct}%</Text>
                </View>
              ))}
            </Animated.View>
          )}

          {/* ── Next evolution hints ── */}
          <Animated.View entering={FadeInDown.delay(440).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Next Evolution</Text>
            <View style={{ gap: 10 }}>
              {characterState.evolutionHints.map((hint, i) => (
                <HintCard
                  key={i}
                  message={hint.message}
                  urgency={hint.urgency}
                  delay={460 + i * 40}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── Action shortcuts ── */}
          <Animated.View entering={FadeInDown.delay(560).springify()} style={styles.actionsRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.push("/skills")}
            >
              <Ionicons name="barbell-outline" size={16} color={Colors.accent} />
              <Text style={styles.actionBtnText}>Skills</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.push("/world")}
            >
              <Ionicons name="home-outline" size={16} color={Colors.accent} />
              <Text style={styles.actionBtnText}>Command Center</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.push("/(tabs)/rewards")}
            >
              <Ionicons name="storefront-outline" size={16} color={Colors.accent} />
              <Text style={styles.actionBtnText}>Marketplace</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  tierPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
  },
  tierPillText: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1 },

  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },

  scroll: { paddingHorizontal: 20, gap: 16 },

  // ── Hero card ──────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
    gap: 16,
    overflow: "hidden",
  },
  activeTitleRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.gold + "18", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.gold + "30",
  },
  activeTitleText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.gold },

  descriptorRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 12,
    width: "100%",
  },
  descriptorChip: { flex: 1, alignItems: "center", gap: 3 },
  descriptorLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1 },
  descriptorValue: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textPrimary, textTransform: "capitalize" },
  descriptorDivider: { width: 1, height: 30, backgroundColor: Colors.border },

  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  arcBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.accentGlow, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.accentDim,
  },
  arcBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },
  arcStageText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  prestigeBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#F5C84218", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "#F5C84250",
  },
  prestigeBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#F5C842" },
  masteryBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.accentGlow, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.accentDim,
  },
  masteryBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },
  gearRow: { gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  gearLabel: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1 },
  gearChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  gearChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFFFFF08", borderRadius: 8, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  gearChipText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },

  // ── Score card ─────────────────────────────────────────────────────────────
  scoreCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    flexDirection: "row", alignItems: "center", gap: 14,
  },
  scoreLeft: { flexDirection: "row", alignItems: "baseline", gap: 3 },
  scoreValue: { fontFamily: "Inter_700Bold", fontSize: 36 },
  scoreMax: { fontFamily: "Inter_400Regular", fontSize: 16, color: Colors.textMuted },
  scoreMeta: { flex: 1, gap: 3 },
  scoreTitle: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  scoreDesc: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
  tierProgressWrap: { flexDirection: "column", gap: 5, alignItems: "center" },
  tierDot: { width: 8, height: 8, borderRadius: 4 },

  // ── Sections ───────────────────────────────────────────────────────────────
  section: { gap: 12 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },

  dimensionsCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, gap: 16,
  },
  dimDivider: { height: 1, backgroundColor: Colors.borderLight },

  // ── Strength / Weak rows ───────────────────────────────────────────────────
  strengthRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  weakRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  strengthIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  strengthLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  strengthDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2, textTransform: "capitalize" },
  strengthScore: { fontFamily: "Inter_700Bold", fontSize: 18 },

  // ── Actions ────────────────────────────────────────────────────────────────
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },
});

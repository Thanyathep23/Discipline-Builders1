import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Modal, Platform, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import Svg, { Path, Circle, Rect, Ellipse } from "react-native-svg";
import { Colors, RARITY_COLORS } from "@/constants/colors";
import { useCars, usePurchaseCar, useFeatureCar } from "@/hooks/useApi";
import { LoadingScreen, EmptyState } from "@/design-system";

// ─── Types ────────────────────────────────────────────────────────────────────

type Car = {
  id: string;
  name: string;
  description: string;
  fullDescription: string | null;
  cost: number;
  rarity: string;
  carClass: string | null;
  minLevel: number;
  icon: string;
  isLimited: boolean;
  isExclusive: boolean;
  styleEffect: string | null;
  prestigeValue: number;
  isPhotoEligible: boolean;
  isShowcaseEligible: boolean;
  isOwned: boolean;
  isLocked: boolean;
  isFeatured: boolean;
  isAffordable: boolean;
  lockReason: string | null;
};

type CarState = "featured" | "owned" | "available" | "near_reach" | "locked_soon" | "locked";
type FilterMode = "all" | "owned" | "available" | "locked";

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASS_LABELS: Record<string, string> = {
  starter:   "Starter",
  rising:    "Rising Luxury",
  executive: "Executive",
  elite:     "Elite Supercar",
  prestige:  "Prestige Signature",
};

const CLASS_ASPIRATION: Record<string, string> = {
  starter:   "Your first step into a different life.",
  rising:    "The car people notice before they notice you.",
  executive: "Reserved for those who operate differently.",
  elite:     "A supercar signals a different level of discipline.",
  prestige:  "Owned by fewer than 1% of serious operators.",
};

const RARITY_ASPIRATION: Record<string, string> = {
  common:    "Entry point — the start of the journey.",
  uncommon:  "Better than most will ever touch.",
  rare:      "Few people will own this. You could.",
  epic:      "The kind of car people search for online.",
  legendary: "This car defines a legacy. Is that you?",
};

// ─── State classifier ─────────────────────────────────────────────────────────

function getCarState(car: Car, userLevel: number): CarState {
  if (car.isOwned && car.isFeatured) return "featured";
  if (car.isOwned) return "owned";
  if (!car.isLocked && car.isAffordable) return "available";
  if (!car.isLocked && !car.isAffordable) return "near_reach";
  if (car.isLocked && car.minLevel - userLevel <= 5) return "locked_soon";
  return "locked";
}

const STATE_ORDER: Record<CarState, number> = {
  featured: 0, owned: 1, available: 2, near_reach: 3, locked_soon: 4, locked: 5,
};

// ─── Car SVG Silhouette ───────────────────────────────────────────────────────

function CarSilhouette({
  rarity, size = 80, dimmed = false,
}: {
  rarity: string; size?: number; dimmed?: boolean;
}) {
  const base = RARITY_COLORS[rarity] ?? Colors.textMuted;
  const color = dimmed ? Colors.textMuted : base;
  const opacity = dimmed ? 0.45 : 1;
  const h = size * 0.42;
  const w = size;

  return (
    <Svg width={w} height={h + 14} viewBox={`0 0 ${w} ${h + 14}`} opacity={opacity}>
      <Ellipse cx={w / 2} cy={h + 9} rx={w * 0.36} ry={4} fill={color + "18"} />
      <Rect x={4} y={h * 0.45} width={w - 8} height={h * 0.44} rx={5} fill={color + "25"} stroke={color + "80"} strokeWidth={1.2} />
      <Path
        d={`M${w*0.22},${h*0.45} L${w*0.32},${h*0.1} L${w*0.68},${h*0.1} L${w*0.78},${h*0.45} Z`}
        fill={color + "18"} stroke={color + "80"} strokeWidth={1.2}
      />
      <Path
        d={`M${w*0.25},${h*0.43} L${w*0.34},${h*0.14} L${w*0.47},${h*0.14} L${w*0.47},${h*0.43} Z`}
        fill={color + "28"} stroke={color + "50"} strokeWidth={0.8}
      />
      <Path
        d={`M${w*0.53},${h*0.43} L${w*0.53},${h*0.14} L${w*0.66},${h*0.14} L${w*0.75},${h*0.43} Z`}
        fill={color + "28"} stroke={color + "50"} strokeWidth={0.8}
      />
      <Circle cx={w*0.22} cy={h*0.9} r={h*0.2} fill={color + "20"} stroke={color + "90"} strokeWidth={1.4} />
      <Circle cx={w*0.78} cy={h*0.9} r={h*0.2} fill={color + "20"} stroke={color + "90"} strokeWidth={1.4} />
      <Circle cx={w*0.22} cy={h*0.9} r={h*0.08} fill={color + "55"} />
      <Circle cx={w*0.78} cy={h*0.9} r={h*0.08} fill={color + "55"} />
      <Rect x={w - 8} y={h * 0.52} width={5} height={h * 0.14} rx={2} fill={color + (dimmed ? "50" : "90")} />
      <Rect x={3} y={h * 0.52} width={5} height={h * 0.14} rx={2} fill={color + "50"} />
    </Svg>
  );
}

// ─── State badge ──────────────────────────────────────────────────────────────

function StateBadge({ state, rarity, levelsAway, coinsAway }: {
  state: CarState; rarity: string; levelsAway?: number; coinsAway?: number;
}) {
  const rarityColor = RARITY_COLORS[rarity] ?? Colors.textMuted;

  if (state === "featured") return (
    <View style={[badge.chip, { backgroundColor: Colors.gold + "20", borderColor: Colors.gold + "40" }]}>
      <Ionicons name="star" size={9} color={Colors.gold} />
      <Text style={[badge.text, { color: Colors.gold }]}>FEATURED</Text>
    </View>
  );
  if (state === "owned") return (
    <View style={[badge.chip, { backgroundColor: Colors.green + "15", borderColor: Colors.green + "30" }]}>
      <Ionicons name="checkmark-circle" size={9} color={Colors.green} />
      <Text style={[badge.text, { color: Colors.green }]}>OWNED</Text>
    </View>
  );
  if (state === "available") return (
    <View style={[badge.chip, { backgroundColor: Colors.accent + "18", borderColor: Colors.accent + "40" }]}>
      <Ionicons name="flash" size={9} color={Colors.accent} />
      <Text style={[badge.text, { color: Colors.accent }]}>AVAILABLE</Text>
    </View>
  );
  if (state === "near_reach") return (
    <View style={[badge.chip, { backgroundColor: Colors.amberDim, borderColor: Colors.amber + "40" }]}>
      <Ionicons name="trending-up" size={9} color={Colors.amber} />
      <Text style={[badge.text, { color: Colors.amber }]}>
        {coinsAway ? `${coinsAway.toLocaleString()}c AWAY` : "SAVE UP"}
      </Text>
    </View>
  );
  if (state === "locked_soon") return (
    <View style={[badge.chip, { backgroundColor: Colors.amberDim, borderColor: Colors.amber + "30" }]}>
      <Ionicons name="lock-open-outline" size={9} color={Colors.amber} />
      <Text style={[badge.text, { color: Colors.amber }]}>
        {levelsAway ? `LV +${levelsAway}` : "SOON"}
      </Text>
    </View>
  );
  return (
    <View style={[badge.chip, { backgroundColor: Colors.bgElevated, borderColor: Colors.border }]}>
      <Ionicons name="lock-closed" size={9} color={Colors.textMuted} />
      <Text style={[badge.text, { color: Colors.textMuted }]}>LOCKED</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  text: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 0.8 },
});

// ─── Car Card ─────────────────────────────────────────────────────────────────

function CarCard({
  car, state, userLevel, onPress,
}: {
  car: Car; state: CarState; userLevel: number;
  onPress: (car: Car) => void;
}) {
  const rarityColor = RARITY_COLORS[car.rarity] ?? Colors.textMuted;
  const classLabel = CLASS_LABELS[car.carClass ?? "starter"] ?? "VEHICLE";
  const dimmed = state === "locked" || state === "locked_soon";
  const levelsAway = car.isLocked ? car.minLevel - userLevel : 0;
  const coinsAway = !car.isOwned && !car.isLocked && !car.isAffordable && car.cost > 0 ? car.cost : 0;

  const borderLeftColor =
    state === "featured" ? Colors.gold :
    state === "owned"    ? rarityColor :
    state === "available"? Colors.accent :
    state === "near_reach"? Colors.amber :
    Colors.border;

  const bgTint =
    state === "featured" ? Colors.gold + "08" :
    state === "owned"    ? rarityColor + "05" :
    state === "available"? Colors.accent + "05" :
    Colors.bgCard;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.carCard,
        { borderLeftColor, borderLeftWidth: state !== "locked" ? 3 : 1, backgroundColor: bgTint },
        pressed && { opacity: 0.87 },
      ]}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(car); }}
    >
      <View style={styles.carCardHeader}>
        <View style={[styles.classChip, { backgroundColor: dimmed ? Colors.bgElevated : rarityColor + "18" }]}>
          <Text style={[styles.classChipText, { color: dimmed ? Colors.textMuted : rarityColor }]}>
            {classLabel.toUpperCase().slice(0, 3)}
          </Text>
        </View>
        <StateBadge state={state} rarity={car.rarity} levelsAway={levelsAway} coinsAway={coinsAway} />
        {car.isLimited && (
          <View style={styles.limitedBadge}>
            <Text style={styles.limitedBadgeText}>LIMITED</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {car.prestigeValue > 0 && state !== "locked" && (
          <View style={styles.prestigeMini}>
            <Ionicons name="shield-checkmark" size={9} color={Colors.gold} />
            <Text style={styles.prestigeMiniText}>+{car.prestigeValue}</Text>
          </View>
        )}
      </View>

      <View style={styles.carVisual}>
        <CarSilhouette rarity={car.rarity} size={128} dimmed={dimmed} />
        {state === "locked" && (
          <View style={styles.lockOverlay}>
            <View style={styles.lockIconBox}>
              <Ionicons name="lock-closed" size={16} color={Colors.textMuted} />
            </View>
            <Text style={styles.lockLevelText}>Level {car.minLevel}</Text>
          </View>
        )}
        {state === "locked_soon" && (
          <View style={styles.lockSoonOverlay}>
            <Ionicons name="lock-open-outline" size={14} color={Colors.amber} />
            <Text style={styles.lockSoonText}>Lv {car.minLevel}</Text>
          </View>
        )}
      </View>

      <View style={styles.carCardFooter}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.carName, dimmed && { color: Colors.textSecondary }]} numberOfLines={1}>{car.name}</Text>
          {car.styleEffect && !dimmed ? (
            <Text style={styles.styleEffect} numberOfLines={1}>{car.styleEffect}</Text>
          ) : (
            <Text style={styles.carDesc} numberOfLines={1}>{car.description}</Text>
          )}
        </View>
        {state === "owned" || state === "featured" ? (
          <View style={[styles.pricePill, { backgroundColor: Colors.green + "12" }]}>
            <Ionicons name="checkmark" size={13} color={Colors.green} />
          </View>
        ) : state === "available" ? (
          <View style={[styles.pricePill, { backgroundColor: Colors.accentDim }]}>
            <Ionicons name="logo-bitcoin" size={10} color={Colors.accent} />
            <Text style={[styles.priceText, { color: Colors.accent }]}>
              {car.cost === 0 ? "FREE" : car.cost.toLocaleString()}
            </Text>
          </View>
        ) : state === "near_reach" ? (
          <View style={[styles.pricePill, { backgroundColor: Colors.amberDim }]}>
            <Ionicons name="logo-bitcoin" size={10} color={Colors.amber} />
            <Text style={[styles.priceText, { color: Colors.amber }]}>{car.cost.toLocaleString()}</Text>
          </View>
        ) : (
          <View style={[styles.pricePill, { backgroundColor: Colors.bgElevated }]}>
            <Ionicons name="logo-bitcoin" size={10} color={Colors.textMuted} />
            <Text style={[styles.priceText, { color: Colors.textMuted }]}>{car.cost.toLocaleString()}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Collection Progress Hero ──────────────────────────────────────────────────

function CollectionProgressHero({
  catalog, ownedCount, coinBalance, userLevel, onNextGoal,
}: {
  catalog: Car[]; ownedCount: number; coinBalance: number; userLevel: number;
  onNextGoal: (car: Car) => void;
}) {
  const totalPrestige = useMemo(
    () => catalog.filter(c => c.isOwned).reduce((s, c) => s + c.prestigeValue, 0),
    [catalog]
  );
  const progressPct = catalog.length > 0 ? Math.round((ownedCount / catalog.length) * 100) : 0;

  // Next goal: cheapest available car or nearest-level locked_soon car
  const nextGoal = useMemo(() => {
    const available = catalog.filter(c => !c.isOwned && !c.isLocked).sort((a, b) => a.cost - b.cost);
    if (available.length > 0) return available[0];
    const soonest = catalog.filter(c => !c.isOwned && c.isLocked).sort((a, b) => a.minLevel - b.minLevel);
    return soonest[0] ?? null;
  }, [catalog]);

  const nextGoalCoinsAway = nextGoal && !nextGoal.isOwned && !nextGoal.isLocked
    ? Math.max(0, nextGoal.cost - coinBalance) : 0;

  return (
    <View style={progressHero.card}>
      {/* Collection fraction */}
      <View style={progressHero.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={progressHero.eyebrow}>YOUR COLLECTION</Text>
          <View style={progressHero.fractionRow}>
            <Text style={progressHero.fraction}>{ownedCount}</Text>
            <Text style={progressHero.fractionOf}>/{catalog.length} cars</Text>
            <View style={progressHero.progressDot} />
            <Text style={progressHero.progressPct}>{progressPct}% collected</Text>
          </View>
        </View>
        {totalPrestige > 0 && (
          <View style={progressHero.prestigeStat}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.gold} />
            <Text style={progressHero.prestigeVal}>+{totalPrestige}</Text>
            <Text style={progressHero.prestigeLbl}>prestige</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={progressHero.barBg}>
        <View style={[progressHero.barFill, { width: `${Math.min(100, progressPct)}%` as any }]} />
      </View>

      {/* Stat pills */}
      <View style={progressHero.pillRow}>
        <View style={progressHero.pill}>
          <Ionicons name="logo-bitcoin" size={10} color={Colors.accent} />
          <Text style={progressHero.pillText}>{coinBalance.toLocaleString()} coins</Text>
        </View>
        <View style={progressHero.pill}>
          <Ionicons name="trending-up" size={10} color={Colors.textMuted} />
          <Text style={progressHero.pillText}>Lv {userLevel}</Text>
        </View>
        <View style={progressHero.pill}>
          <Ionicons name="car-outline" size={10} color={Colors.textMuted} />
          <Text style={progressHero.pillText}>{catalog.length - ownedCount} to unlock</Text>
        </View>
      </View>

      {/* Next goal */}
      {nextGoal && (
        <Pressable
          style={progressHero.nextGoalRow}
          onPress={() => { Haptics.selectionAsync().catch(() => {}); onNextGoal(nextGoal); }}
        >
          <View style={progressHero.nextGoalIcon}>
            <Ionicons name="flag-outline" size={13} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={progressHero.nextGoalLabel}>NEXT GOAL</Text>
            <Text style={progressHero.nextGoalName}>{nextGoal.name}</Text>
          </View>
          {nextGoalCoinsAway > 0 ? (
            <Text style={progressHero.nextGoalDelta}>{nextGoalCoinsAway.toLocaleString()}c away</Text>
          ) : nextGoal.isLocked ? (
            <Text style={progressHero.nextGoalDelta}>Lv {nextGoal.minLevel}</Text>
          ) : (
            <Text style={[progressHero.nextGoalDelta, { color: Colors.accent }]}>Available now</Text>
          )}
          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginLeft: 4 }} />
        </Pressable>
      )}
    </View>
  );
}

const progressHero = StyleSheet.create({
  card: { backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  eyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  fractionRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4 },
  fraction: { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.textPrimary },
  fractionOf: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  progressDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.border, marginBottom: 2 },
  progressPct: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },
  prestigeStat: { alignItems: "center", gap: 2, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.goldDim, borderRadius: 12, borderWidth: 1, borderColor: Colors.gold + "25" },
  prestigeVal: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.gold },
  prestigeLbl: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.gold, opacity: 0.7 },
  barBg: { height: 6, backgroundColor: Colors.bgElevated, borderRadius: 3 },
  barFill: { height: 6, backgroundColor: Colors.accent, borderRadius: 3 },
  pillRow: { flexDirection: "row", gap: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.bgElevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.border },
  pillText: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary },
  nextGoalRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.accent + "25" },
  nextGoalIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  nextGoalLabel: { fontFamily: "Inter_700Bold", fontSize: 8, color: Colors.accent, letterSpacing: 1.2 },
  nextGoalName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary, marginTop: 1 },
  nextGoalDelta: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },
});

// ─── Featured Car Hero ────────────────────────────────────────────────────────

function FeaturedCarHero({ car, onPhotoMode, onTap }: {
  car: Car; onPhotoMode: () => void; onTap: (car: Car) => void;
}) {
  const rarityColor = RARITY_COLORS[car.rarity] ?? Colors.accent;
  const classLabel = CLASS_LABELS[car.carClass ?? "starter"] ?? "VEHICLE";

  return (
    <Pressable
      style={[featHero.card, { backgroundColor: rarityColor + "08", borderColor: rarityColor + "35" }]}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onTap(car); }}
    >
      <View style={featHero.eyebrowRow}>
        <Ionicons name="star" size={10} color={Colors.gold} />
        <Text style={featHero.eyebrow}>FEATURED VEHICLE</Text>
        <View style={{ flex: 1 }} />
        {car.isLimited && (
          <View style={featHero.limitedChip}>
            <Text style={featHero.limitedText}>LIMITED EDITION</Text>
          </View>
        )}
      </View>

      <View style={featHero.content}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[featHero.name, { color: rarityColor }]}>{car.name}</Text>
          <Text style={featHero.classLine}>{classLabel.toUpperCase()}</Text>
          {car.styleEffect && (
            <Text style={featHero.styleEffect} numberOfLines={2}>{car.styleEffect}</Text>
          )}
          <View style={featHero.bottomRow}>
            {car.prestigeValue > 0 && (
              <View style={featHero.prestigePill}>
                <Ionicons name="shield-checkmark" size={11} color={Colors.gold} />
                <Text style={featHero.prestigeText}>+{car.prestigeValue} Prestige</Text>
              </View>
            )}
            <Pressable
              style={featHero.photoBtn}
              onPress={(e) => { e.stopPropagation?.(); Haptics.selectionAsync().catch(() => {}); onPhotoMode(); }}
            >
              <Ionicons name="camera" size={13} color={Colors.accent} />
              <Text style={featHero.photoBtnText}>Photo Mode</Text>
            </Pressable>
          </View>
        </View>
        <View style={[featHero.silhouetteBox, { borderColor: rarityColor + "25" }]}>
          <CarSilhouette rarity={car.rarity} size={140} />
        </View>
      </View>
    </Pressable>
  );
}

const featHero = StyleSheet.create({
  card: { borderRadius: 20, padding: 18, borderWidth: 1, gap: 12 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  eyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.gold, letterSpacing: 1.5 },
  limitedChip: { backgroundColor: Colors.crimson + "15", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  limitedText: { fontFamily: "Inter_700Bold", fontSize: 8, color: Colors.crimson, letterSpacing: 0.8 },
  content: { flexDirection: "row", alignItems: "center", gap: 14 },
  name: { fontFamily: "Inter_700Bold", fontSize: 20, lineHeight: 24 },
  classLine: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2, marginTop: 1 },
  styleEffect: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17, fontStyle: "italic" },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" },
  prestigePill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.goldDim, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: Colors.gold + "25" },
  prestigeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.gold },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.accentDim, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1, borderColor: Colors.accent + "40" },
  photoBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },
  silhouetteBox: { borderRadius: 14, borderWidth: 1, padding: 10, backgroundColor: Colors.bg + "50" },
});

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function CarDetailModal({
  car, visible, onClose, onPurchase, onFeature, isPurchasing, isFeaturing,
}: {
  car: Car | null; visible: boolean; onClose: () => void;
  onPurchase: (id: string) => void; onFeature: (id: string) => void;
  isPurchasing: boolean; isFeaturing: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [confirmPurchase, setConfirmPurchase] = useState(false);

  if (!car) return null;
  const rarityColor = RARITY_COLORS[car.rarity] ?? Colors.textMuted;
  const classLabel = CLASS_LABELS[car.carClass ?? "starter"] ?? "VEHICLE";
  const aspirationCopy = CLASS_ASPIRATION[car.carClass ?? "starter"] ?? "";
  const rarityAspiration = RARITY_ASPIRATION[car.rarity] ?? "";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={detailStyles.overlay} onPress={onClose} />
      <View style={[detailStyles.sheet, { paddingBottom: insets.bottom + 28 }]}>
        <View style={detailStyles.handle} />

        {/* Hero — rarity tinted */}
        <View style={[detailStyles.hero, { backgroundColor: rarityColor + "10", borderColor: rarityColor + "35" }]}>
          <View style={detailStyles.heroChips}>
            <View style={[detailStyles.classChip, { backgroundColor: rarityColor + "20" }]}>
              <Text style={[detailStyles.classChipText, { color: rarityColor }]}>{classLabel.toUpperCase()}</Text>
            </View>
            <View style={[detailStyles.rarityChip, { backgroundColor: rarityColor + "15" }]}>
              <Text style={[detailStyles.rarityText, { color: rarityColor }]}>{car.rarity.toUpperCase()}</Text>
            </View>
            {car.isLimited && (
              <View style={detailStyles.limitedChip}>
                <Text style={detailStyles.limitedChipText}>LIMITED</Text>
              </View>
            )}
            {car.isFeatured && (
              <View style={detailStyles.featuredChip}>
                <Ionicons name="star" size={9} color={Colors.gold} />
                <Text style={detailStyles.featuredChipText}>FEATURED</Text>
              </View>
            )}
          </View>
          <View style={detailStyles.heroVisual}>
            <CarSilhouette rarity={car.rarity} size={200} dimmed={car.isLocked} />
          </View>
          <Text style={[detailStyles.name, { color: rarityColor }]}>{car.name}</Text>
        </View>

        {/* Description */}
        <Text style={detailStyles.desc}>{car.fullDescription ?? car.description}</Text>

        {/* "What this signals" aspiration block */}
        {(aspirationCopy || car.styleEffect) && (
          <View style={detailStyles.aspirationCard}>
            <View style={detailStyles.aspirationHeader}>
              <Ionicons name="eye-outline" size={12} color={rarityColor} />
              <Text style={[detailStyles.aspirationLabel, { color: rarityColor }]}>WHAT THIS SIGNALS</Text>
            </View>
            {car.styleEffect && <Text style={detailStyles.aspirationMain}>{car.styleEffect}</Text>}
            {aspirationCopy && <Text style={detailStyles.aspirationSub}>{aspirationCopy}</Text>}
            {rarityAspiration && <Text style={detailStyles.aspirationRarity}>{rarityAspiration}</Text>}
          </View>
        )}

        {/* Stats row */}
        <View style={detailStyles.statsRow}>
          <View style={detailStyles.statItem}>
            <Text style={detailStyles.statLabel}>LEVEL REQ</Text>
            <Text style={[detailStyles.statValue, { color: car.isLocked ? Colors.crimson : Colors.green }]}>
              {car.minLevel === 0 ? "None" : `Lv ${car.minLevel}`}
            </Text>
          </View>
          <View style={detailStyles.statDivider} />
          <View style={detailStyles.statItem}>
            <Text style={detailStyles.statLabel}>PRICE</Text>
            <Text style={detailStyles.statValue}>
              {car.cost === 0 ? "FREE" : `${car.cost.toLocaleString()}c`}
            </Text>
          </View>
          <View style={detailStyles.statDivider} />
          <View style={detailStyles.statItem}>
            <Text style={detailStyles.statLabel}>PRESTIGE</Text>
            <Text style={[detailStyles.statValue, { color: Colors.gold }]}>+{car.prestigeValue}</Text>
          </View>
        </View>

        {/* Lock banner */}
        {car.isLocked && (
          <View style={detailStyles.lockBanner}>
            <Ionicons name="lock-closed-outline" size={13} color={Colors.crimson} />
            <Text style={detailStyles.lockBannerText}>{car.lockReason ?? `Requires Level ${car.minLevel}`}</Text>
          </View>
        )}

        {/* Photo eligible */}
        {car.isOwned && car.isPhotoEligible && (
          <View style={detailStyles.photoBadge}>
            <Ionicons name="camera-outline" size={12} color={Colors.accent} />
            <Text style={detailStyles.photoBadgeText}>Eligible for Photo Mode — capture your story</Text>
          </View>
        )}

        {/* Actions */}
        {confirmPurchase ? (
          <View style={detailStyles.confirmBox}>
            <Text style={detailStyles.confirmTitle}>Confirm Purchase</Text>
            <Text style={detailStyles.confirmMsg}>
              Spend <Text style={{ color: Colors.accent, fontFamily: "Inter_700Bold" }}>{car.cost.toLocaleString()} coins</Text> on {car.name}?
            </Text>
            <View style={detailStyles.confirmRow}>
              <Pressable style={[detailStyles.confirmBtn, { backgroundColor: Colors.bgElevated }]} onPress={() => setConfirmPurchase(false)}>
                <Text style={detailStyles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[detailStyles.confirmBtn, { backgroundColor: Colors.accent }]}
                onPress={() => { setConfirmPurchase(false); onPurchase(car.id); }}
                disabled={isPurchasing}
              >
                {isPurchasing ? <ActivityIndicator size="small" color="#000" /> : <Text style={detailStyles.purchaseText}>Confirm</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={detailStyles.actionRow}>
            {/* TODO: Migrate Photo Mode / Feature / Purchase inline Pressable buttons to
                design-system <Button> once it supports flex:1 grow semantics for
                equal-width side-by-side row layouts. */}
            {car.isOwned ? (
              <>
                <Pressable
                  style={[detailStyles.actionBtn, { backgroundColor: Colors.accentDim, flex: 1, borderColor: Colors.accent + "40" }]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/cars/photo"); onClose(); }}
                >
                  <Ionicons name="camera" size={16} color={Colors.accent} />
                  <Text style={[detailStyles.actionBtnText, { color: Colors.accent }]}>Photo Mode</Text>
                </Pressable>
                {!car.isFeatured ? (
                  <Pressable
                    style={[detailStyles.actionBtn, { backgroundColor: Colors.goldDim, flex: 1, borderColor: Colors.gold + "30" }]}
                    onPress={() => onFeature(car.id)}
                    disabled={isFeaturing}
                  >
                    {isFeaturing ? <ActivityIndicator size="small" color={Colors.gold} /> : (
                      <>
                        <Ionicons name="star-outline" size={16} color={Colors.gold} />
                        <Text style={[detailStyles.actionBtnText, { color: Colors.gold }]}>Feature</Text>
                      </>
                    )}
                  </Pressable>
                ) : (
                  <View style={[detailStyles.actionBtn, { backgroundColor: Colors.goldDim, flex: 1 }]}>
                    <Ionicons name="star" size={16} color={Colors.gold} />
                    <Text style={[detailStyles.actionBtnText, { color: Colors.gold }]}>Featured</Text>
                  </View>
                )}
              </>
            ) : (
              <Pressable
                style={[
                  detailStyles.actionBtn, { flex: 1 },
                  !car.isLocked && car.isAffordable
                    ? { backgroundColor: Colors.accent, borderColor: Colors.accent }
                    : { backgroundColor: Colors.bgElevated, borderColor: Colors.border },
                ]}
                onPress={() => {
                  if (car.isLocked || !car.isAffordable) return;
                  Haptics.selectionAsync().catch(() => {});
                  setConfirmPurchase(true);
                }}
                disabled={car.isLocked || !car.isAffordable}
              >
                <Ionicons
                  name={car.isLocked ? "lock-closed-outline" : "cart-outline"}
                  size={16}
                  color={!car.isLocked && car.isAffordable ? "#000" : Colors.textMuted}
                />
                <Text style={[
                  detailStyles.actionBtnText,
                  { color: !car.isLocked && car.isAffordable ? "#000" : Colors.textMuted },
                ]}>
                  {car.isLocked
                    ? `Locked — Level ${car.minLevel} required`
                    : !car.isAffordable
                    ? `Need ${(car.cost).toLocaleString()}c`
                    : car.cost === 0 ? "Claim Free" : `Buy — ${car.cost.toLocaleString()}c`}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function GarageScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data, isLoading, refetch } = useCars();
  const purchaseCar = usePurchaseCar();
  const featureCar = useFeatureCar();

  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [refreshing, setRefreshing] = useState(false);

  const catalog: Car[] = data?.catalog ?? [];
  const featuredCar: Car | undefined = data?.featuredCar;
  const userLevel: number = data?.userLevel ?? 1;
  const coinBalance: number = data?.coinBalance ?? 0;
  const ownedCount: number = data?.ownedCount ?? 0;

  // Compute state for each car + sort
  const carsWithState = useMemo(() =>
    catalog.map(c => ({ car: c, state: getCarState(c, userLevel) }))
      .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]),
    [catalog, userLevel]
  );

  const filterCounts = useMemo(() => ({
    all: carsWithState.length,
    owned: carsWithState.filter(x => x.state === "featured" || x.state === "owned").length,
    available: carsWithState.filter(x => x.state === "available" || x.state === "near_reach").length,
    locked: carsWithState.filter(x => x.state === "locked" || x.state === "locked_soon").length,
  }), [carsWithState]);

  const filteredCars = useMemo(() => {
    if (filter === "owned") return carsWithState.filter(x => x.state === "featured" || x.state === "owned");
    if (filter === "available") return carsWithState.filter(x => x.state === "available" || x.state === "near_reach");
    if (filter === "locked") return carsWithState.filter(x => x.state === "locked" || x.state === "locked_soon");
    return carsWithState;
  }, [carsWithState, filter]);

  const handleOpenCar = useCallback((car: Car) => {
    setSelectedCar(car);
    setModalVisible(true);
  }, []);

  const handlePurchase = useCallback(async (carId: string) => {
    setErrorMsg(null);
    try {
      await purchaseCar.mutateAsync(carId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      refetch();
      setModalVisible(false);
    } catch (e: any) {
      setModalVisible(false);
      setErrorMsg(e.message ?? "Purchase failed");
    }
  }, [purchaseCar, refetch]);

  const handleFeature = useCallback(async (carId: string) => {
    setErrorMsg(null);
    try {
      await featureCar.mutateAsync(carId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      refetch();
      setModalVisible(false);
    } catch (e: any) {
      setModalVisible(false);
      setErrorMsg(e.message ?? "Could not feature car");
    }
  }, [featureCar, refetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <LoadingScreen message="Loading your collection..." accentColor={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>DREAM CARS</Text>
            <Text style={styles.headerTitle}>Collection</Text>
          </View>
          <Pressable
            style={styles.photoModeBtn}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/cars/photo"); }}
          >
            <Ionicons name="camera" size={16} color={Colors.accent} />
          </Pressable>
        </Animated.View>

        {/* Error banner */}
        {errorMsg && (
          <Pressable style={styles.errorBanner} onPress={() => setErrorMsg(null)}>
            <Ionicons name="warning-outline" size={13} color={Colors.crimson} />
            <Text style={styles.errorText} numberOfLines={2}>{errorMsg}</Text>
            <Ionicons name="close" size={13} color={Colors.crimson} />
          </Pressable>
        )}

        {/* ── Collection progress hero ──────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(20).springify()}>
          <CollectionProgressHero
            catalog={catalog}
            ownedCount={ownedCount}
            coinBalance={coinBalance}
            userLevel={userLevel}
            onNextGoal={handleOpenCar}
          />
        </Animated.View>

        {/* ── Featured car hero ─────────────────────────────────────── */}
        {featuredCar && (
          <Animated.View entering={FadeInDown.delay(40).springify()}>
            <FeaturedCarHero
              car={featuredCar}
              onPhotoMode={() => router.push("/cars/photo")}
              onTap={handleOpenCar}
            />
          </Animated.View>
        )}

        {/* ── Filter tabs with counts ───────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(58).springify()} style={styles.filterRow}>
          {(["all", "owned", "available", "locked"] as FilterMode[]).map((f) => {
            const labels: Record<FilterMode, string> = { all: "All", owned: "Owned", available: "Reach", locked: "Locked" };
            const active = filter === f;
            return (
              <Pressable
                key={f}
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); setFilter(f); }}
              >
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>{labels[f]}</Text>
                <Text style={[styles.filterCount, active && { color: Colors.accent }]}>{filterCounts[f]}</Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* ── Car list ─────────────────────────────────────────────── */}
        {filteredCars.length === 0 ? (
          <EmptyState
            preset="no_car"
            title={
              filter === "owned" ? "No vehicles owned yet" :
              filter === "available" ? "Nothing in reach right now" :
              "No locked vehicles"
            }
            subtitle={
              filter === "owned" ? "Purchase your first vehicle to start your collection." :
              filter === "available" ? "Keep earning coins to unlock vehicles." :
              "Check the All tab for the full catalog."
            }
            accentColor={Colors.accent}
          />
        ) : (
          <View style={styles.carList}>
            {filteredCars.map(({ car, state }, i) => (
              <Animated.View key={car.id} entering={FadeInDown.delay(75 + i * 25).springify()}>
                <CarCard
                  car={car}
                  state={state}
                  userLevel={userLevel}
                  onPress={handleOpenCar}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      <CarDetailModal
        car={selectedCar}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onPurchase={handlePurchase}
        onFeature={handleFeature}
        isPurchasing={purchaseCar.isPending}
        isFeaturing={featureCar.isPending}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  loadingIcon: { width: 68, height: 68, borderRadius: 18, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  loadingTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, marginTop: 4 },

  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  headerEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary, marginTop: 1 },
  photoModeBtn: { width: 38, height: 38, borderRadius: 13, backgroundColor: Colors.accentDim, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.accent + "40" },

  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.crimson + "18", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.crimson + "40" },
  errorText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.crimson, lineHeight: 17 },

  filterRow: { flexDirection: "row", gap: 8 },
  filterTab: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center", backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, gap: 2 },
  filterTabActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent + "50" },
  filterTabText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted },
  filterTabTextActive: { color: Colors.accent },
  filterCount: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textMuted },

  carList: { gap: 10 },

  carCard: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 15, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  carCardHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  classChip: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  classChipText: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 0.8 },
  limitedBadge: { backgroundColor: Colors.crimson + "12", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  limitedBadgeText: { fontFamily: "Inter_700Bold", fontSize: 8, color: Colors.crimson, letterSpacing: 0.8 },
  prestigeMini: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.goldDim, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: Colors.gold + "20" },
  prestigeMiniText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.gold },

  carVisual: { alignItems: "center", justifyContent: "center", position: "relative", paddingVertical: 4 },
  lockOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bg + "70", gap: 4, borderRadius: 8 },
  lockIconBox: { width: 30, height: 30, borderRadius: 9, backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  lockLevelText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted },
  lockSoonOverlay: { position: "absolute", bottom: 4, right: 8, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.amberDim, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: Colors.amber + "30" },
  lockSoonText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.amber },

  carCardFooter: { flexDirection: "row", alignItems: "center", gap: 10 },
  carName: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  styleEffect: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, marginTop: 2, fontStyle: "italic" },
  carDesc: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  pricePill: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  priceText: { fontFamily: "Inter_700Bold", fontSize: 12 },

  emptyState: { alignItems: "center", justifyContent: "center", gap: 12, padding: 36, backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary, textAlign: "center" },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 19 },
});

const detailStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#00000085" },
  sheet: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  handle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 4 },

  hero: { borderRadius: 18, padding: 16, gap: 12, borderWidth: 1 },
  heroChips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  classChip: { borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3 },
  classChipText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1 },
  rarityChip: { borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3 },
  rarityText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1 },
  limitedChip: { backgroundColor: Colors.crimson + "15", borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3 },
  limitedChipText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.crimson, letterSpacing: 1 },
  featuredChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.goldDim, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 3 },
  featuredChipText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.gold, letterSpacing: 1 },

  heroVisual: { alignItems: "center" },
  name: { fontFamily: "Inter_700Bold", fontSize: 24, textAlign: "center", lineHeight: 28 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19, textAlign: "center" },

  aspirationCard: { backgroundColor: Colors.bgElevated, borderRadius: 14, padding: 13, gap: 6, borderWidth: 1, borderColor: Colors.border },
  aspirationHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  aspirationLabel: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.5 },
  aspirationMain: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary, lineHeight: 18, fontStyle: "italic" },
  aspirationSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  aspirationRarity: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, lineHeight: 16, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 6, marginTop: 2 },

  statsRow: { flexDirection: "row", backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 14, alignItems: "center", justifyContent: "space-around", borderWidth: 1, borderColor: Colors.border },
  statItem: { alignItems: "center", flex: 1 },
  statLabel: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textMuted, letterSpacing: 1, marginBottom: 3 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.border },

  lockBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.crimson + "12", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.crimson + "28" },
  lockBannerText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.crimson, lineHeight: 17 },

  photoBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.accentDim, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.accent + "30" },
  photoBadgeText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.accent, flex: 1 },

  confirmBox: { backgroundColor: Colors.bgElevated, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.border },
  confirmTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  confirmMsg: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  confirmRow: { flexDirection: "row", gap: 10 },
  confirmBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  cancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  purchaseText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#000" },

  actionRow: { flexDirection: "row", gap: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: Colors.border },
  actionBtnText: { fontFamily: "Inter_700Bold", fontSize: 14 },
});

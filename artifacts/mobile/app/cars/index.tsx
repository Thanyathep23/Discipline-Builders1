import React, { useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Modal, Platform, RefreshControl,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import Svg, { Path, Circle, Rect, Ellipse, G, Line } from "react-native-svg";
import { Colors, RARITY_COLORS } from "@/constants/colors";
import { useCars, usePurchaseCar, useFeatureCar, useSelectCarVariant } from "@/hooks/useApi";
import { LoadingScreen, EmptyState } from "@/design-system";

const SCREEN_W = Dimensions.get("window").width;
const CARD_GAP = 10;
const CARD_W = (SCREEN_W - 32 - CARD_GAP) / 2;

type ColorVariant = { key: string; label: string; hex: string };

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
  prestigeValue: number;
  isPhotoEligible: boolean;
  isShowcaseEligible: boolean;
  isOwned: boolean;
  isLocked: boolean;
  isFeatured: boolean;
  isAffordable: boolean;
  lockReason: string | null;
  colorVariants: ColorVariant[];
  selectedVariant: string | null;
};

type CarState = "featured" | "owned" | "available" | "near_reach" | "locked_soon" | "locked";
type FilterMode = "all" | "owned" | "locked" | "rarity";

const CLASS_LABELS: Record<string, string> = {
  entry:        "Entry",
  sport:        "Sport",
  performance:  "Performance",
  grandtouring: "Grand Touring",
  flagship:     "Flagship",
  hypercar:     "Hypercar",
};

const RARITY_ORDER: Record<string, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

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

function getVariantHex(car: Car, variantKey?: string | null): string {
  const key = variantKey ?? car.selectedVariant;
  const v = car.colorVariants?.find(cv => cv.key === key);
  return v?.hex ?? RARITY_COLORS[car.rarity] ?? Colors.textMuted;
}

function CarVisual({
  carClass, bodyColor, size = 80, dimmed = false,
}: {
  carClass: string | null; bodyColor: string; size?: number; dimmed?: boolean;
}) {
  const opacity = dimmed ? 0.35 : 1;
  const c = dimmed ? Colors.textMuted : bodyColor;
  const w = size;
  const h = size * 0.5;

  const wheelR = h * 0.16;
  const wheelY = h * 0.88;
  const wlx = w * 0.22;
  const wrx = w * 0.78;

  const cls = carClass ?? "entry";

  const shadowEl = (
    <Ellipse cx={w / 2} cy={h + 8} rx={w * 0.38} ry={3.5} fill={c + "14"} />
  );

  const wheelEls = (
    <>
      <Circle cx={wlx} cy={wheelY} r={wheelR} fill={c + "18"} stroke={c + "80"} strokeWidth={1.3} />
      <Circle cx={wlx} cy={wheelY} r={wheelR * 0.45} fill={c + "50"} />
      <Circle cx={wrx} cy={wheelY} r={wheelR} fill={c + "18"} stroke={c + "80"} strokeWidth={1.3} />
      <Circle cx={wrx} cy={wheelY} r={wheelR * 0.45} fill={c + "50"} />
    </>
  );

  let bodyEl: React.ReactNode;

  if (cls === "entry") {
    bodyEl = (
      <>
        <Rect x={w * 0.08} y={h * 0.42} width={w * 0.84} height={h * 0.42} rx={6} fill={c + "22"} stroke={c + "70"} strokeWidth={1.2} />
        <Path d={`M${w * 0.28},${h * 0.42} L${w * 0.35},${h * 0.12} L${w * 0.65},${h * 0.12} L${w * 0.72},${h * 0.42} Z`} fill={c + "15"} stroke={c + "60"} strokeWidth={1} />
        <Path d={`M${w * 0.31},${h * 0.40} L${w * 0.37},${h * 0.16} L${w * 0.49},${h * 0.16} L${w * 0.49},${h * 0.40} Z`} fill={c + "25"} stroke={c + "40"} strokeWidth={0.7} />
        <Path d={`M${w * 0.51},${h * 0.40} L${w * 0.51},${h * 0.16} L${w * 0.63},${h * 0.16} L${w * 0.69},${h * 0.40} Z`} fill={c + "25"} stroke={c + "40"} strokeWidth={0.7} />
        <Rect x={w * 0.88} y={h * 0.50} width={4} height={h * 0.12} rx={2} fill={c + "80"} />
        <Rect x={w * 0.08} y={h * 0.50} width={4} height={h * 0.12} rx={2} fill={c + "50"} />
      </>
    );
  } else if (cls === "sport") {
    bodyEl = (
      <>
        <Rect x={w * 0.06} y={h * 0.40} width={w * 0.88} height={h * 0.44} rx={5} fill={c + "25"} stroke={c + "80"} strokeWidth={1.3} />
        <Path d={`M${w * 0.26},${h * 0.40} L${w * 0.34},${h * 0.08} L${w * 0.62},${h * 0.08} L${w * 0.74},${h * 0.40} Z`} fill={c + "18"} stroke={c + "70"} strokeWidth={1.1} />
        <Path d={`M${w * 0.29},${h * 0.38} L${w * 0.36},${h * 0.12} L${w * 0.48},${h * 0.12} L${w * 0.48},${h * 0.38} Z`} fill={c + "30"} stroke={c + "45"} strokeWidth={0.7} />
        <Path d={`M${w * 0.52},${h * 0.38} L${w * 0.52},${h * 0.12} L${w * 0.60},${h * 0.12} L${w * 0.71},${h * 0.38} Z`} fill={c + "30"} stroke={c + "45"} strokeWidth={0.7} />
        <Rect x={w * 0.90} y={h * 0.48} width={5} height={h * 0.14} rx={2} fill={c + "90"} />
        <Rect x={w * 0.05} y={h * 0.48} width={5} height={h * 0.14} rx={2} fill={c + "55"} />
        <Line x1={w * 0.12} y1={h * 0.83} x2={w * 0.18} y2={h * 0.83} stroke={c + "40"} strokeWidth={1} />
      </>
    );
  } else if (cls === "performance") {
    bodyEl = (
      <>
        <Path d={`M${w * 0.06},${h * 0.82} L${w * 0.06},${h * 0.42} Q${w * 0.06},${h * 0.36} ${w * 0.12},${h * 0.36} L${w * 0.88},${h * 0.36} Q${w * 0.94},${h * 0.36} ${w * 0.94},${h * 0.42} L${w * 0.94},${h * 0.82} Z`} fill={c + "25"} stroke={c + "80"} strokeWidth={1.3} />
        <Path d={`M${w * 0.20},${h * 0.36} L${w * 0.30},${h * 0.06} L${w * 0.58},${h * 0.06} L${w * 0.78},${h * 0.36} Z`} fill={c + "18"} stroke={c + "70"} strokeWidth={1.1} />
        <Path d={`M${w * 0.24},${h * 0.34} L${w * 0.32},${h * 0.10} L${w * 0.47},${h * 0.10} L${w * 0.47},${h * 0.34} Z`} fill={c + "32"} stroke={c + "50"} strokeWidth={0.7} />
        <Path d={`M${w * 0.53},${h * 0.34} L${w * 0.53},${h * 0.10} L${w * 0.56},${h * 0.10} L${w * 0.74},${h * 0.34} Z`} fill={c + "32"} stroke={c + "50"} strokeWidth={0.7} />
        <Rect x={w * 0.91} y={h * 0.44} width={5} height={h * 0.16} rx={2} fill={c + "90"} />
        <Rect x={w * 0.04} y={h * 0.44} width={5} height={h * 0.16} rx={2} fill={c + "55"} />
        <Path d={`M${w * 0.06},${h * 0.80} L${w * 0.02},${h * 0.70} L${w * 0.06},${h * 0.70}`} fill={c + "30"} />
        <Path d={`M${w * 0.94},${h * 0.80} L${w * 0.98},${h * 0.70} L${w * 0.94},${h * 0.70}`} fill={c + "30"} />
      </>
    );
  } else if (cls === "grandtouring") {
    bodyEl = (
      <>
        <Path d={`M${w * 0.04},${h * 0.82} L${w * 0.04},${h * 0.40} Q${w * 0.04},${h * 0.34} ${w * 0.10},${h * 0.34} L${w * 0.90},${h * 0.34} Q${w * 0.96},${h * 0.34} ${w * 0.96},${h * 0.40} L${w * 0.96},${h * 0.82} Z`} fill={c + "22"} stroke={c + "75"} strokeWidth={1.3} />
        <Path d={`M${w * 0.22},${h * 0.34} L${w * 0.32},${h * 0.06} Q${w * 0.34},${h * 0.02} ${w * 0.38},${h * 0.02} L${w * 0.68},${h * 0.02} Q${w * 0.72},${h * 0.02} ${w * 0.73},${h * 0.06} L${w * 0.80},${h * 0.34} Z`} fill={c + "18"} stroke={c + "65"} strokeWidth={1.1} />
        <Path d={`M${w * 0.25},${h * 0.32} L${w * 0.34},${h * 0.08} L${w * 0.49},${h * 0.08} L${w * 0.49},${h * 0.32} Z`} fill={c + "28"} stroke={c + "42"} strokeWidth={0.7} />
        <Path d={`M${w * 0.51},${h * 0.32} L${w * 0.51},${h * 0.08} L${w * 0.72},${h * 0.08} L${w * 0.77},${h * 0.32} Z`} fill={c + "28"} stroke={c + "42"} strokeWidth={0.7} />
        <Rect x={w * 0.93} y={h * 0.42} width={5} height={h * 0.18} rx={2.5} fill={c + "85"} />
        <Rect x={w * 0.02} y={h * 0.42} width={5} height={h * 0.18} rx={2.5} fill={c + "55"} />
        <Line x1={w * 0.10} y1={h * 0.83} x2={w * 0.17} y2={h * 0.83} stroke={c + "35"} strokeWidth={0.8} />
        <Line x1={w * 0.83} y1={h * 0.83} x2={w * 0.90} y2={h * 0.83} stroke={c + "35"} strokeWidth={0.8} />
      </>
    );
  } else if (cls === "flagship") {
    bodyEl = (
      <>
        <Path d={`M${w * 0.02},${h * 0.82} L${w * 0.02},${h * 0.38} Q${w * 0.02},${h * 0.32} ${w * 0.08},${h * 0.32} L${w * 0.92},${h * 0.32} Q${w * 0.98},${h * 0.32} ${w * 0.98},${h * 0.38} L${w * 0.98},${h * 0.82} Z`} fill={c + "25"} stroke={c + "80"} strokeWidth={1.4} />
        <Path d={`M${w * 0.18},${h * 0.32} L${w * 0.28},${h * 0.04} Q${w * 0.30},${h * 0.00} ${w * 0.34},${h * 0.00} L${w * 0.72},${h * 0.00} Q${w * 0.76},${h * 0.00} ${w * 0.78},${h * 0.04} L${w * 0.84},${h * 0.32} Z`} fill={c + "18"} stroke={c + "70"} strokeWidth={1.2} />
        <Path d={`M${w * 0.22},${h * 0.30} L${w * 0.30},${h * 0.06} L${w * 0.48},${h * 0.06} L${w * 0.48},${h * 0.30} Z`} fill={c + "30"} stroke={c + "48"} strokeWidth={0.7} />
        <Path d={`M${w * 0.52},${h * 0.30} L${w * 0.52},${h * 0.06} L${w * 0.76},${h * 0.06} L${w * 0.82},${h * 0.30} Z`} fill={c + "30"} stroke={c + "48"} strokeWidth={0.7} />
        <Rect x={w * 0.95} y={h * 0.40} width={5} height={h * 0.20} rx={2.5} fill={c + "90"} />
        <Rect x={w * 0.00} y={h * 0.40} width={5} height={h * 0.20} rx={2.5} fill={c + "60"} />
        <Line x1={w * 0.38} y1={h * 0.83} x2={w * 0.62} y2={h * 0.83} stroke={c + "20"} strokeWidth={0.6} />
      </>
    );
  } else if (cls === "hypercar") {
    bodyEl = (
      <>
        <Path d={`M${w * 0.04},${h * 0.82} L${w * 0.04},${h * 0.36} Q${w * 0.04},${h * 0.28} ${w * 0.12},${h * 0.28} L${w * 0.88},${h * 0.28} Q${w * 0.96},${h * 0.28} ${w * 0.96},${h * 0.36} L${w * 0.96},${h * 0.82} Z`} fill={c + "28"} stroke={c + "85"} strokeWidth={1.5} />
        <Path d={`M${w * 0.16},${h * 0.28} L${w * 0.28},${h * 0.02} Q${w * 0.30},${h * -0.02} ${w * 0.34},${h * -0.02} L${w * 0.60},${h * -0.02} Q${w * 0.64},${h * -0.02} ${w * 0.66},${h * 0.02} L${w * 0.84},${h * 0.28} Z`} fill={c + "20"} stroke={c + "75"} strokeWidth={1.2} />
        <Path d={`M${w * 0.20},${h * 0.26} L${w * 0.30},${h * 0.04} L${w * 0.46},${h * 0.04} L${w * 0.46},${h * 0.26} Z`} fill={c + "35"} stroke={c + "50"} strokeWidth={0.8} />
        <Path d={`M${w * 0.54},${h * 0.26} L${w * 0.54},${h * 0.04} L${w * 0.64},${h * 0.04} L${w * 0.80},${h * 0.26} Z`} fill={c + "35"} stroke={c + "50"} strokeWidth={0.8} />
        <Rect x={w * 0.93} y={h * 0.36} width={5} height={h * 0.22} rx={2.5} fill={c + "95"} />
        <Rect x={w * 0.02} y={h * 0.36} width={5} height={h * 0.22} rx={2.5} fill={c + "65"} />
        <Path d={`M${w * 0.04},${h * 0.80} L${w * -0.01},${h * 0.66} L${w * 0.04},${h * 0.66}`} fill={c + "35"} />
        <Path d={`M${w * 0.96},${h * 0.80} L${w * 1.01},${h * 0.66} L${w * 0.96},${h * 0.66}`} fill={c + "35"} />
        <Path d={`M${w * 0.42},${h * 0.78} L${w * 0.58},${h * 0.78}`} stroke={c + "30"} strokeWidth={0.8} />
      </>
    );
  } else {
    bodyEl = (
      <>
        <Rect x={w * 0.08} y={h * 0.42} width={w * 0.84} height={h * 0.42} rx={6} fill={c + "22"} stroke={c + "70"} strokeWidth={1.2} />
        <Path d={`M${w * 0.28},${h * 0.42} L${w * 0.35},${h * 0.12} L${w * 0.65},${h * 0.12} L${w * 0.72},${h * 0.42} Z`} fill={c + "15"} stroke={c + "60"} strokeWidth={1} />
        <Rect x={w * 0.88} y={h * 0.50} width={4} height={h * 0.12} rx={2} fill={c + "80"} />
        <Rect x={w * 0.08} y={h * 0.50} width={4} height={h * 0.12} rx={2} fill={c + "50"} />
      </>
    );
  }

  return (
    <Svg width={w} height={h + 14} viewBox={`0 0 ${w} ${h + 14}`} opacity={opacity}>
      {shadowEl}
      <G>{bodyEl}</G>
      {wheelEls}
    </Svg>
  );
}

function StateBadge({ state, rarity, levelsAway, coinsAway }: {
  state: CarState; rarity: string; levelsAway?: number; coinsAway?: number;
}) {
  if (state === "featured") return (
    <View style={[bdg.chip, { backgroundColor: Colors.gold + "20", borderColor: Colors.gold + "40" }]}>
      <Ionicons name="star" size={8} color={Colors.gold} />
      <Text style={[bdg.text, { color: Colors.gold }]}>FEATURED</Text>
    </View>
  );
  if (state === "owned") return (
    <View style={[bdg.chip, { backgroundColor: Colors.green + "15", borderColor: Colors.green + "30" }]}>
      <Ionicons name="checkmark-circle" size={8} color={Colors.green} />
      <Text style={[bdg.text, { color: Colors.green }]}>OWNED</Text>
    </View>
  );
  if (state === "available") return (
    <View style={[bdg.chip, { backgroundColor: Colors.accent + "18", borderColor: Colors.accent + "40" }]}>
      <Ionicons name="flash" size={8} color={Colors.accent} />
      <Text style={[bdg.text, { color: Colors.accent }]}>BUY</Text>
    </View>
  );
  if (state === "near_reach") return (
    <View style={[bdg.chip, { backgroundColor: Colors.amberDim, borderColor: Colors.amber + "40" }]}>
      <Ionicons name="trending-up" size={8} color={Colors.amber} />
      <Text style={[bdg.text, { color: Colors.amber }]}>
        {coinsAway ? `${coinsAway.toLocaleString()}c` : "SAVE"}
      </Text>
    </View>
  );
  if (state === "locked_soon") return (
    <View style={[bdg.chip, { backgroundColor: Colors.amberDim, borderColor: Colors.amber + "30" }]}>
      <Ionicons name="lock-open-outline" size={8} color={Colors.amber} />
      <Text style={[bdg.text, { color: Colors.amber }]}>{levelsAway ? `LV+${levelsAway}` : "SOON"}</Text>
    </View>
  );
  return (
    <View style={[bdg.chip, { backgroundColor: Colors.bgElevated, borderColor: Colors.border }]}>
      <Ionicons name="lock-closed" size={8} color={Colors.textMuted} />
      <Text style={[bdg.text, { color: Colors.textMuted }]}>LOCKED</Text>
    </View>
  );
}

const bdg = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 2, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1.5, borderWidth: 1 },
  text: { fontFamily: "Inter_700Bold", fontSize: 7, letterSpacing: 0.6 },
});

function RarityDot({ rarity }: { rarity: string }) {
  const color = RARITY_COLORS[rarity] ?? Colors.textMuted;
  return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />;
}

function CarGridCard({
  car, state, userLevel, onPress,
}: {
  car: Car; state: CarState; userLevel: number;
  onPress: (car: Car) => void;
}) {
  const rarityColor = RARITY_COLORS[car.rarity] ?? Colors.textMuted;
  const dimmed = state === "locked" || state === "locked_soon";
  const levelsAway = car.isLocked ? car.minLevel - userLevel : 0;
  const coinsAway = !car.isOwned && !car.isLocked && !car.isAffordable ? car.cost : 0;
  const bodyColor = getVariantHex(car);

  const borderTopColor =
    state === "featured" ? Colors.gold :
    state === "owned"    ? rarityColor :
    state === "available" ? Colors.accent :
    "transparent";

  return (
    <Pressable
      style={({ pressed }) => [
        gc.card, { width: CARD_W, borderTopColor, borderTopWidth: state !== "locked" && state !== "locked_soon" ? 2 : 0 },
        pressed && { opacity: 0.85 },
      ]}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(car); }}
    >
      <View style={gc.visual}>
        <CarVisual carClass={car.carClass} bodyColor={bodyColor} size={CARD_W * 0.82} dimmed={dimmed} />
        {state === "locked" && (
          <View style={gc.lockOverlay}>
            <View style={gc.lockBox}>
              <Ionicons name="lock-closed" size={13} color={Colors.textMuted} />
            </View>
            <Text style={gc.lockLvl}>Lv {car.minLevel}</Text>
          </View>
        )}
        {state === "locked_soon" && (
          <View style={gc.soonPill}>
            <Ionicons name="lock-open-outline" size={9} color={Colors.amber} />
            <Text style={gc.soonText}>Lv {car.minLevel}</Text>
          </View>
        )}
      </View>

      <View style={gc.info}>
        <View style={gc.nameRow}>
          <RarityDot rarity={car.rarity} />
          <Text style={[gc.name, dimmed && { color: Colors.textMuted }]} numberOfLines={1}>{car.name}</Text>
        </View>
        <View style={gc.bottomRow}>
          <StateBadge state={state} rarity={car.rarity} levelsAway={levelsAway} coinsAway={coinsAway} />
          {car.prestigeValue > 0 && !dimmed && (
            <View style={gc.prestigeMini}>
              <Ionicons name="shield-checkmark" size={7} color={Colors.gold} />
              <Text style={gc.prestigeVal}>+{car.prestigeValue}</Text>
            </View>
          )}
        </View>
        {(state === "available" || state === "near_reach") && (
          <Text style={[gc.price, state === "available" ? { color: Colors.accent } : { color: Colors.textMuted }]}>
            {car.cost === 0 ? "FREE" : `${car.cost.toLocaleString()}c`}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const gc = StyleSheet.create({
  card: { backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  visual: { alignItems: "center", justifyContent: "center", paddingVertical: 10, paddingHorizontal: 6, position: "relative", minHeight: 70 },
  lockOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bg + "75", gap: 3 },
  lockBox: { width: 26, height: 26, borderRadius: 8, backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  lockLvl: { fontFamily: "Inter_600SemiBold", fontSize: 9, color: Colors.textMuted },
  soonPill: { position: "absolute", bottom: 4, right: 4, flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.amberDim, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: Colors.amber + "30" },
  soonText: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: Colors.amber },
  info: { padding: 10, gap: 5 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textPrimary, flex: 1 },
  bottomRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  prestigeMini: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: Colors.goldDim, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1, borderColor: Colors.gold + "20" },
  prestigeVal: { fontFamily: "Inter_700Bold", fontSize: 7, color: Colors.gold },
  price: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
});

function FeaturedCarHero({
  car, onPhotoMode, onTap, onChangeFeatured,
}: {
  car: Car; onPhotoMode: () => void; onTap: (car: Car) => void;
  onChangeFeatured: () => void;
}) {
  const rarityColor = RARITY_COLORS[car.rarity] ?? Colors.accent;
  const classLabel = CLASS_LABELS[car.carClass ?? "entry"] ?? "VEHICLE";
  const bodyColor = getVariantHex(car);

  return (
    <Pressable
      style={[fh.card, { borderColor: rarityColor + "30" }]}
      onPress={() => { Haptics.selectionAsync().catch(() => {}); onTap(car); }}
    >
      <View style={fh.eyebrowRow}>
        <Ionicons name="star" size={10} color={Colors.gold} />
        <Text style={fh.eyebrow}>FEATURED VEHICLE</Text>
        <View style={{ flex: 1 }} />
        {car.isLimited && (
          <View style={fh.limitedChip}>
            <Text style={fh.limitedText}>LIMITED</Text>
          </View>
        )}
      </View>

      <View style={fh.content}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[fh.name, { color: rarityColor }]}>{car.name}</Text>
          <View style={fh.metaRow}>
            <View style={[fh.classChip, { backgroundColor: rarityColor + "18" }]}>
              <Text style={[fh.classText, { color: rarityColor }]}>{classLabel.toUpperCase()}</Text>
            </View>
            <View style={[fh.rarityChip, { backgroundColor: rarityColor + "12" }]}>
              <Text style={[fh.rarityText, { color: rarityColor }]}>{car.rarity.toUpperCase()}</Text>
            </View>
          </View>
          {car.prestigeValue > 0 && (
            <View style={fh.prestigePill}>
              <Ionicons name="shield-checkmark" size={10} color={Colors.gold} />
              <Text style={fh.prestigeText}>+{car.prestigeValue} Prestige</Text>
            </View>
          )}
          <View style={fh.btnRow}>
            <Pressable
              style={fh.actionBtn}
              onPress={(e) => { e.stopPropagation?.(); Haptics.selectionAsync().catch(() => {}); onChangeFeatured(); }}
            >
              <Ionicons name="swap-horizontal" size={12} color={Colors.textSecondary} />
              <Text style={fh.actionBtnText}>Change</Text>
            </Pressable>
            <Pressable
              style={[fh.actionBtn, { backgroundColor: Colors.accentDim, borderColor: Colors.accent + "40" }]}
              onPress={(e) => { e.stopPropagation?.(); Haptics.selectionAsync().catch(() => {}); onPhotoMode(); }}
            >
              <Ionicons name="camera" size={12} color={Colors.accent} />
              <Text style={[fh.actionBtnText, { color: Colors.accent }]}>Photo Mode</Text>
            </Pressable>
          </View>
        </View>
        <View style={[fh.vizBox, { borderColor: rarityColor + "20" }]}>
          <CarVisual carClass={car.carClass} bodyColor={bodyColor} size={130} />
        </View>
      </View>
    </Pressable>
  );
}

const fh = StyleSheet.create({
  card: { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 16, borderWidth: 1, gap: 10 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.gold, letterSpacing: 1.5 },
  limitedChip: { backgroundColor: Colors.crimson + "15", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  limitedText: { fontFamily: "Inter_700Bold", fontSize: 8, color: Colors.crimson, letterSpacing: 0.8 },
  content: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontFamily: "Inter_700Bold", fontSize: 19, lineHeight: 23 },
  metaRow: { flexDirection: "row", gap: 5 },
  classChip: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  classText: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1 },
  rarityChip: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  rarityText: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 1 },
  prestigePill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: Colors.goldDim, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: Colors.gold + "25" },
  prestigeText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.gold },
  btnRow: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.bgElevated, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: Colors.border },
  actionBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textSecondary },
  vizBox: { borderRadius: 14, borderWidth: 1, padding: 6, backgroundColor: Colors.bg + "50" },
});

function ColorSwatchSelector({
  variants, selectedKey, onSelect,
}: {
  variants: ColorVariant[]; selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  if (!variants || variants.length <= 1) return null;
  return (
    <View style={sw.container}>
      <Text style={sw.label}>COLOR VARIANT</Text>
      <View style={sw.row}>
        {variants.map((v) => {
          const active = v.key === selectedKey;
          return (
            <Pressable
              key={v.key}
              style={[sw.swatch, { borderColor: active ? Colors.accent : Colors.border }]}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); onSelect(v.key); }}
            >
              <View style={[sw.dot, { backgroundColor: v.hex }]} />
              {active && <View style={sw.checkmark}><Ionicons name="checkmark" size={8} color={Colors.textOnAccent} /></View>}
            </Pressable>
          );
        })}
      </View>
      <Text style={sw.variantName}>{variants.find(v => v.key === selectedKey)?.label ?? ""}</Text>
    </View>
  );
}

const sw = StyleSheet.create({
  container: { gap: 6 },
  label: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  dot: { width: 24, height: 24, borderRadius: 12 },
  checkmark: { position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  variantName: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary },
});

function CarDetailSheet({
  car, visible, onClose, onPurchase, onFeature, isPurchasing, isFeaturing,
  onSelectVariant, isSelectingVariant,
}: {
  car: Car | null; visible: boolean; onClose: () => void;
  onPurchase: (id: string) => void; onFeature: (id: string) => void;
  isPurchasing: boolean; isFeaturing: boolean;
  onSelectVariant: (carId: string, variantKey: string) => void;
  isSelectingVariant: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [confirmPurchase, setConfirmPurchase] = useState(false);
  const [previewVariant, setPreviewVariant] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setConfirmPurchase(false);
    setPreviewVariant(null);
  }, []);

  if (!car) return null;

  const rarityColor = RARITY_COLORS[car.rarity] ?? Colors.textMuted;
  const classLabel = CLASS_LABELS[car.carClass ?? "entry"] ?? "VEHICLE";
  const currentVariant = previewVariant ?? car.selectedVariant;
  const bodyColor = getVariantHex(car, currentVariant);
  const dimmed = car.isLocked;

  const levelProgress = car.isLocked && car.minLevel > 0
    ? Math.min(100, Math.round(((car.minLevel - (car.minLevel - 5)) / car.minLevel) * 100))
    : 100;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { resetState(); onClose(); }}>
      <Pressable style={ds.overlay} onPress={() => { resetState(); onClose(); }} />
      <ScrollView style={[ds.sheet, { paddingBottom: insets.bottom + 28 }]} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={ds.handle} />

        <View style={[ds.hero, { backgroundColor: rarityColor + "08", borderColor: rarityColor + "30" }]}>
          <View style={ds.chipRow}>
            <View style={[ds.chip, { backgroundColor: rarityColor + "18" }]}>
              <Text style={[ds.chipText, { color: rarityColor }]}>{classLabel.toUpperCase()}</Text>
            </View>
            <View style={[ds.chip, { backgroundColor: rarityColor + "12" }]}>
              <Text style={[ds.chipText, { color: rarityColor }]}>{car.rarity.toUpperCase()}</Text>
            </View>
            {car.isLimited && (
              <View style={[ds.chip, { backgroundColor: Colors.crimson + "15" }]}>
                <Text style={[ds.chipText, { color: Colors.crimson }]}>LIMITED</Text>
              </View>
            )}
            {car.isFeatured && (
              <View style={[ds.chip, { backgroundColor: Colors.goldDim }]}>
                <Ionicons name="star" size={8} color={Colors.gold} />
                <Text style={[ds.chipText, { color: Colors.gold }]}>FEATURED</Text>
              </View>
            )}
          </View>
          <View style={ds.heroViz}>
            <CarVisual carClass={car.carClass} bodyColor={bodyColor} size={200} dimmed={dimmed} />
          </View>
          <Text style={[ds.heroName, { color: rarityColor }]}>{car.name}</Text>
        </View>

        {car.isOwned && car.colorVariants && car.colorVariants.length > 1 && (
          <View style={{ opacity: isSelectingVariant ? 0.6 : 1 }}>
            <ColorSwatchSelector
              variants={car.colorVariants}
              selectedKey={currentVariant}
              onSelect={(key) => {
                if (isSelectingVariant) return;
                setPreviewVariant(key);
                onSelectVariant(car.id, key);
              }}
            />
          </View>
        )}

        <Text style={ds.desc}>{car.fullDescription ?? car.description}</Text>

        <View style={ds.statsRow}>
          <View style={ds.stat}>
            <Text style={ds.statLabel}>LEVEL REQ</Text>
            <Text style={[ds.statVal, { color: car.isLocked ? Colors.crimson : Colors.green }]}>
              {car.minLevel === 0 ? "None" : `Lv ${car.minLevel}`}
            </Text>
          </View>
          <View style={ds.statDiv} />
          <View style={ds.stat}>
            <Text style={ds.statLabel}>PRICE</Text>
            <Text style={ds.statVal}>{car.cost === 0 ? "FREE" : `${car.cost.toLocaleString()}c`}</Text>
          </View>
          <View style={ds.statDiv} />
          <View style={ds.stat}>
            <Text style={ds.statLabel}>PRESTIGE</Text>
            <Text style={[ds.statVal, { color: Colors.gold }]}>+{car.prestigeValue}</Text>
          </View>
        </View>

        {car.isLocked && (
          <View style={ds.lockBanner}>
            <Ionicons name="lock-closed-outline" size={13} color={Colors.crimson} />
            <Text style={ds.lockText}>{car.lockReason ?? `Requires Level ${car.minLevel}`}</Text>
          </View>
        )}

        {car.isOwned && car.isPhotoEligible && (
          <View style={ds.photoBadge}>
            <Ionicons name="camera-outline" size={12} color={Colors.accent} />
            <Text style={ds.photoBadgeText}>Eligible for Photo Mode</Text>
          </View>
        )}

        {confirmPurchase ? (
          <View style={ds.confirmBox}>
            <Text style={ds.confirmTitle}>Confirm Purchase</Text>
            <Text style={ds.confirmMsg}>
              Spend <Text style={{ color: Colors.accent, fontFamily: "Inter_700Bold" }}>{car.cost.toLocaleString()} coins</Text> on {car.name}?
            </Text>
            <View style={ds.confirmBtnRow}>
              <Pressable style={[ds.ctaBtn, { backgroundColor: Colors.bgElevated, flex: 1 }]} onPress={() => setConfirmPurchase(false)}>
                <Text style={[ds.ctaBtnText, { color: Colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[ds.ctaBtn, { backgroundColor: Colors.accent, flex: 1 }]}
                onPress={() => { setConfirmPurchase(false); onPurchase(car.id); }}
                disabled={isPurchasing}
              >
                {isPurchasing ? <ActivityIndicator size="small" color={Colors.bg} /> : <Text style={[ds.ctaBtnText, { color: Colors.bg }]}>Confirm</Text>}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={ds.actionRow}>
            {car.isOwned ? (
              <>
                <Pressable
                  style={[ds.ctaBtn, { backgroundColor: Colors.accentDim, flex: 1, borderColor: Colors.accent + "40" }]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/cars/photo"); resetState(); onClose(); }}
                >
                  <Ionicons name="camera" size={15} color={Colors.accent} />
                  <Text style={[ds.ctaBtnText, { color: Colors.accent }]}>Photo Mode</Text>
                </Pressable>
                {!car.isFeatured ? (
                  <Pressable
                    style={[ds.ctaBtn, { backgroundColor: Colors.goldDim, flex: 1, borderColor: Colors.gold + "30" }]}
                    onPress={() => onFeature(car.id)}
                    disabled={isFeaturing}
                  >
                    {isFeaturing ? <ActivityIndicator size="small" color={Colors.gold} /> : (
                      <>
                        <Ionicons name="star-outline" size={15} color={Colors.gold} />
                        <Text style={[ds.ctaBtnText, { color: Colors.gold }]}>Feature</Text>
                      </>
                    )}
                  </Pressable>
                ) : (
                  <View style={[ds.ctaBtn, { backgroundColor: Colors.goldDim, flex: 1 }]}>
                    <Ionicons name="star" size={15} color={Colors.gold} />
                    <Text style={[ds.ctaBtnText, { color: Colors.gold }]}>Featured</Text>
                  </View>
                )}
              </>
            ) : (
              <Pressable
                style={[
                  ds.ctaBtn, { flex: 1 },
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
                  size={15}
                  color={!car.isLocked && car.isAffordable ? Colors.bg : Colors.textMuted}
                />
                <Text style={[
                  ds.ctaBtnText,
                  { color: !car.isLocked && car.isAffordable ? Colors.bg : Colors.textMuted },
                ]}>
                  {car.isLocked
                    ? `Locked — Level ${car.minLevel}`
                    : !car.isAffordable
                    ? `Need ${car.cost.toLocaleString()}c`
                    : car.cost === 0 ? "Claim Free" : `Buy — ${car.cost.toLocaleString()}c`}
                </Text>
              </Pressable>
            )}
          </View>
        )}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </Modal>
  );
}

const ds = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlayHeavy },
  sheet: { backgroundColor: Colors.bgCard, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 14, maxHeight: "85%" },
  handle: { width: 36, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: "center", marginBottom: 10 },
  hero: { borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, marginBottom: 14 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { fontFamily: "Inter_700Bold", fontSize: 8, letterSpacing: 0.8 },
  heroViz: { alignItems: "center", paddingVertical: 6 },
  heroName: { fontFamily: "Inter_700Bold", fontSize: 22, textAlign: "center", lineHeight: 26 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19, textAlign: "center", marginBottom: 14 },
  statsRow: { flexDirection: "row", backgroundColor: Colors.bgElevated, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statLabel: { fontFamily: "Inter_700Bold", fontSize: 8, color: Colors.textMuted, letterSpacing: 1.2 },
  statVal: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  statDiv: { width: 1, backgroundColor: Colors.border },
  lockBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.crimson + "12", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.crimson + "30", marginBottom: 10 },
  lockText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.crimson, lineHeight: 17 },
  photoBadge: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: Colors.accentGlow, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.accent + "25", marginBottom: 10 },
  photoBadgeText: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.accent },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 14, paddingVertical: 13, borderWidth: 1, borderColor: "transparent" },
  ctaBtnText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  confirmBox: { backgroundColor: Colors.bgElevated, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.border },
  confirmTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  confirmMsg: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  confirmBtnRow: { flexDirection: "row", gap: 8 },
});

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

  const nextGoal = useMemo(() => {
    const available = catalog.filter(c => !c.isOwned && !c.isLocked).sort((a, b) => a.cost - b.cost);
    if (available.length > 0) return available[0];
    const soonest = catalog.filter(c => !c.isOwned && c.isLocked).sort((a, b) => a.minLevel - b.minLevel);
    return soonest[0] ?? null;
  }, [catalog]);

  const nextGoalCoinsAway = nextGoal && !nextGoal.isOwned && !nextGoal.isLocked
    ? Math.max(0, nextGoal.cost - coinBalance) : 0;

  return (
    <View style={ph.card}>
      <View style={ph.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={ph.eyebrow}>YOUR COLLECTION</Text>
          <View style={ph.fractionRow}>
            <Text style={ph.fraction}>{ownedCount}</Text>
            <Text style={ph.fractionOf}>/{catalog.length} cars</Text>
            <View style={ph.dot} />
            <Text style={ph.pct}>{progressPct}%</Text>
          </View>
        </View>
        {totalPrestige > 0 && (
          <View style={ph.prestigeBox}>
            <Ionicons name="shield-checkmark" size={13} color={Colors.gold} />
            <Text style={ph.prestigeNum}>+{totalPrestige}</Text>
            <Text style={ph.prestigeLbl}>prestige</Text>
          </View>
        )}
      </View>

      <View style={ph.barBg}>
        <View style={[ph.barFill, { width: `${Math.min(100, progressPct)}%` as any }]} />
      </View>

      <View style={ph.pillRow}>
        <View style={ph.pill}>
          <Ionicons name="logo-bitcoin" size={10} color={Colors.accent} />
          <Text style={ph.pillText}>{coinBalance.toLocaleString()}</Text>
        </View>
        <View style={ph.pill}>
          <Ionicons name="trending-up" size={10} color={Colors.textMuted} />
          <Text style={ph.pillText}>Lv {userLevel}</Text>
        </View>
        <View style={ph.pill}>
          <Ionicons name="car-outline" size={10} color={Colors.textMuted} />
          <Text style={ph.pillText}>{catalog.length - ownedCount} left</Text>
        </View>
      </View>

      {nextGoal && (
        <Pressable
          style={ph.nextRow}
          onPress={() => { Haptics.selectionAsync().catch(() => {}); onNextGoal(nextGoal); }}
        >
          <View style={ph.nextIcon}>
            <Ionicons name="flag-outline" size={12} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ph.nextLabel}>NEXT GOAL</Text>
            <Text style={ph.nextName}>{nextGoal.name}</Text>
          </View>
          {nextGoalCoinsAway > 0 ? (
            <Text style={ph.nextDelta}>{nextGoalCoinsAway.toLocaleString()}c away</Text>
          ) : nextGoal.isLocked ? (
            <Text style={ph.nextDelta}>Lv {nextGoal.minLevel}</Text>
          ) : (
            <Text style={[ph.nextDelta, { color: Colors.accent }]}>Available</Text>
          )}
          <Ionicons name="chevron-forward" size={13} color={Colors.textMuted} style={{ marginLeft: 3 }} />
        </Pressable>
      )}
    </View>
  );
}

const ph = StyleSheet.create({
  card: { backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  eyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  fractionRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 3 },
  fraction: { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.textPrimary },
  fractionOf: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.border, marginBottom: 2 },
  pct: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textMuted },
  prestigeBox: { alignItems: "center", gap: 2, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: Colors.goldDim, borderRadius: 11, borderWidth: 1, borderColor: Colors.gold + "25" },
  prestigeNum: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.gold },
  prestigeLbl: { fontFamily: "Inter_400Regular", fontSize: 8, color: Colors.gold, opacity: 0.7 },
  barBg: { height: 5, backgroundColor: Colors.bgElevated, borderRadius: 3 },
  barFill: { height: 5, backgroundColor: Colors.accent, borderRadius: 3 },
  pillRow: { flexDirection: "row", gap: 7 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.bgElevated, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  pillText: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textSecondary },
  nextRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.bgElevated, borderRadius: 11, padding: 10, borderWidth: 1, borderColor: Colors.accent + "25" },
  nextIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  nextLabel: { fontFamily: "Inter_700Bold", fontSize: 8, color: Colors.accent, letterSpacing: 1 },
  nextName: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textPrimary, marginTop: 1 },
  nextDelta: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textMuted },
});

export default function GarageScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data, isLoading, refetch } = useCars();
  const purchaseCar = usePurchaseCar();
  const featureCar = useFeatureCar();
  const selectVariant = useSelectCarVariant();

  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [refreshing, setRefreshing] = useState(false);

  const catalog: Car[] = data?.catalog ?? [];
  const featuredCar: Car | undefined = data?.featuredCar;
  const userLevel: number = data?.userLevel ?? 1;
  const coinBalance: number = data?.coinBalance ?? 0;
  const ownedCount: number = data?.ownedCount ?? 0;

  const carsWithState = useMemo(() =>
    catalog.map(c => ({ car: c, state: getCarState(c, userLevel) }))
      .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]),
    [catalog, userLevel]
  );

  const filterCounts = useMemo(() => ({
    all: carsWithState.length,
    owned: carsWithState.filter(x => x.state === "featured" || x.state === "owned").length,
    locked: carsWithState.filter(x => x.state === "locked" || x.state === "locked_soon").length,
    rarity: carsWithState.length,
  }), [carsWithState]);

  const filteredCars = useMemo(() => {
    if (filter === "owned") return carsWithState.filter(x => x.state === "featured" || x.state === "owned");
    if (filter === "locked") return carsWithState.filter(x => x.state === "locked" || x.state === "locked_soon");
    if (filter === "rarity") {
      return [...carsWithState].sort((a, b) =>
        (RARITY_ORDER[b.car.rarity] ?? 0) - (RARITY_ORDER[a.car.rarity] ?? 0)
      );
    }
    return carsWithState;
  }, [carsWithState, filter]);

  const handleOpenCar = useCallback((car: Car) => {
    setSelectedCar(car);
    setSheetVisible(true);
  }, []);

  const handlePurchase = useCallback(async (carId: string) => {
    setErrorMsg(null);
    try {
      await purchaseCar.mutateAsync(carId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      refetch();
      setSheetVisible(false);
    } catch (e: any) {
      setSheetVisible(false);
      setErrorMsg(e.message ?? "Purchase failed");
    }
  }, [purchaseCar, refetch]);

  const handleFeature = useCallback(async (carId: string) => {
    setErrorMsg(null);
    try {
      await featureCar.mutateAsync(carId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      refetch();
      setSheetVisible(false);
    } catch (e: any) {
      setSheetVisible(false);
      setErrorMsg(e.message ?? "Could not feature car");
    }
  }, [featureCar, refetch]);

  const handleSelectVariant = useCallback((carId: string, variantKey: string) => {
    selectVariant.mutate({ carId, colorVariant: variantKey });
  }, [selectVariant]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  if (isLoading) {
    return (
      <View style={[s.container, { paddingTop: topPad }]}>
        <LoadingScreen message="Loading your collection..." accentColor={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        <Animated.View entering={FadeIn.duration(300)} style={s.header}>
          <Pressable onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.headerEyebrow}>DREAM CARS</Text>
            <Text style={s.headerTitle}>Collection</Text>
          </View>
          <Pressable
            style={s.photoBtn}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/cars/photo"); }}
          >
            <Ionicons name="camera" size={16} color={Colors.accent} />
          </Pressable>
        </Animated.View>

        {errorMsg && (
          <Pressable style={s.errorBanner} onPress={() => setErrorMsg(null)}>
            <Ionicons name="warning-outline" size={13} color={Colors.crimson} />
            <Text style={s.errorText} numberOfLines={2}>{errorMsg}</Text>
            <Ionicons name="close" size={13} color={Colors.crimson} />
          </Pressable>
        )}

        <Animated.View entering={FadeInDown.delay(20).springify()}>
          <CollectionProgressHero
            catalog={catalog}
            ownedCount={ownedCount}
            coinBalance={coinBalance}
            userLevel={userLevel}
            onNextGoal={handleOpenCar}
          />
        </Animated.View>

        {featuredCar && (
          <Animated.View entering={FadeInDown.delay(40).springify()}>
            <FeaturedCarHero
              car={featuredCar}
              onPhotoMode={() => router.push("/cars/photo")}
              onTap={handleOpenCar}
              onChangeFeatured={() => {
                const ownedNonFeatured = catalog.find(c => c.isOwned && !c.isFeatured);
                if (ownedNonFeatured) {
                  handleOpenCar(ownedNonFeatured);
                } else {
                  setFilter("owned");
                }
              }}
            />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(55).springify()} style={s.filterRow}>
          {(["all", "owned", "locked", "rarity"] as FilterMode[]).map((f) => {
            const labels: Record<FilterMode, string> = { all: "All", owned: "Owned", locked: "Locked", rarity: "By Rarity" };
            const active = filter === f;
            return (
              <Pressable
                key={f}
                style={[s.filterTab, active && s.filterTabActive]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); setFilter(f); }}
              >
                <Text style={[s.filterText, active && s.filterTextActive]}>{labels[f]}</Text>
                {f !== "rarity" && <Text style={[s.filterCount, active && { color: Colors.accent }]}>{filterCounts[f]}</Text>}
              </Pressable>
            );
          })}
        </Animated.View>

        {filteredCars.length === 0 ? (
          <EmptyState
            preset="no_car"
            title={filter === "owned" ? "No vehicles owned yet" : "No locked vehicles"}
            subtitle={filter === "owned" ? "Purchase your first vehicle to start your collection." : "Check the All tab for the full catalog."}
            accentColor={Colors.accent}
          />
        ) : (
          <View style={s.grid}>
            {filteredCars.map(({ car, state }, i) => (
              <Animated.View key={car.id} entering={FadeInDown.delay(65 + i * 20).springify()}>
                <CarGridCard car={car} state={state} userLevel={userLevel} onPress={handleOpenCar} />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      <CarDetailSheet
        car={selectedCar}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onPurchase={handlePurchase}
        onFeature={handleFeature}
        isPurchasing={purchaseCar.isPending}
        isFeaturing={featureCar.isPending}
        onSelectVariant={handleSelectVariant}
        isSelectingVariant={selectVariant.isPending}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  headerEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary, marginTop: 1 },
  photoBtn: { width: 38, height: 38, borderRadius: 13, backgroundColor: Colors.accentDim, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.accent + "40" },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.crimson + "18", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.crimson + "40" },
  errorText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.crimson, lineHeight: 17 },
  filterRow: { flexDirection: "row", gap: 6 },
  filterTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, gap: 1 },
  filterTabActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent + "50" },
  filterText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: Colors.textMuted },
  filterTextActive: { color: Colors.accent },
  filterCount: { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textMuted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: CARD_GAP },
});

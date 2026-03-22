import React from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Svg, { Circle, Ellipse, Rect, Path, G } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { LoadingScreen, Button } from "@/design-system";
import { useAuth } from "@/context/AuthContext";
import { useCharacterStatus } from "@/hooks/useApi";

// ─── Phase 29 — Wearable State Types ──────────────────────────────────────────

type WearableTop = { id: string; slug: string; name: string; outfitTierOverride: number | null; styleEffect: string | null } | null;
type WearableWatch = { id: string; slug: string; name: string; watchStyle: "basic" | "refined" | "elite"; styleEffect: string | null } | null;
type WearableAccessory = { id: string; slug: string; name: string; accessoryStyle: "chain" | "pin"; styleEffect: string | null } | null;
type EquippedWearableState = { top: WearableTop; watch: WearableWatch; accessory: WearableAccessory } | null;

// ─── Phase 28 — Visual State Types ────────────────────────────────────────────

type VisualState = {
  bodyTone: number;
  posture: number;
  outfitTier: number;
  grooming: number;
  prestigeAccent: number;
  confidenceFace: number;
  outfitLabel?: string;
  evolutionExplanations?: { source: string; text: string }[];
};

const DEFAULT_VS: VisualState = {
  bodyTone: 0, posture: 0, outfitTier: 0, grooming: 0, prestigeAccent: 0, confidenceFace: 0,
};

// Outfit per tier
const OC = [
  { s: "#EEEEEE", ss: "#E4E4E4", p: "#1A1A2E", ps: "#20203A", seam: "#1C1C30", cr: "#151528", belt: "#3A3A52", bk: "#52526A", bk2: "#6A6A80", btn: true,  col: false },
  { s: "#F0F0F2", ss: "#E6E6E8", p: "#181928", ps: "#1E1E36", seam: "#1A1A2C", cr: "#131326", belt: "#3C3C54", bk: "#545470", bk2: "#686882", btn: true,  col: false },
  { s: "#C8C8D5", ss: "#BCBCC8", p: "#151525", ps: "#1C1C32", seam: "#121222", cr: "#0F0F1E", belt: "#484858", bk: "#606078", bk2: "#747492", btn: false, col: true  },
  { s: "#4A4A56", ss: "#42424E", p: "#111120", ps: "#17172C", seam: "#0E0E1A", cr: "#0B0B16", belt: "#504858", bk: "#6A6070", bk2: "#888096", btn: false, col: true  },
  { s: "#1E1E2A", ss: "#1A1A22", p: "#0A0A14", ps: "#10101E", seam: "#07070F", cr: "#05050C", belt: "#4A3E52", bk: "#786A82", bk2: "#C0A030", btn: false, col: true  },
];

const SKIN_C = ["#D4A574","#D6A876","#D8AA78","#DAAC7A","#DCAE7C"];
const SKIN_S = ["#C49A6C","#C69C6E","#C89E70","#CAA072","#CCA274"];

function mouthPath(cf: number, hY: number): string {
  const y = hY + 12;
  if (cf === 0) return `M45 ${y} Q50 ${y + 2} 55 ${y}`;
  if (cf === 1) return `M45 ${y} Q50 ${y + 3.5} 55 ${y}`;
  return `M44 ${y} Q50 ${y + 4.5} 56 ${y}`;
}
function browPaths(cf: number, hY: number): [string, string] {
  const [y0, y1] = [hY - 7, hY - 9];
  if (cf === 0) return [`M40 ${y0} Q43 ${y0 - 1} 46 ${y0}`, `M54 ${y0} Q57 ${y0 - 1} 60 ${y0}`];
  if (cf === 1) return [`M40 ${y0 - 0.5} Q43 ${y1} 46 ${y0 - 0.5}`, `M54 ${y0 - 0.5} Q57 ${y1} 60 ${y0 - 0.5}`];
  return [`M40 ${y0 - 1} Q43 ${y1 - 0.5} 46 ${y0 - 1}`, `M54 ${y0 - 1} Q57 ${y1 - 0.5} 60 ${y0 - 1}`];
}

// ─── Evolved Character Renderer ───────────────────────────────────────────────

function EvolvedCharacter({ visualState, equippedWearables, size = 190 }: { visualState?: VisualState | null; equippedWearables?: EquippedWearableState; size?: number }) {
  const v = visualState ?? DEFAULT_VS;
  const effectiveOutfitTier = equippedWearables?.top?.outfitTierOverride != null
    ? equippedWearables.top.outfitTierOverride
    : v.outfitTier;
  const watchStyle: "basic" | "refined" | "elite" = equippedWearables?.watch?.watchStyle ?? "basic";
  const accessoryStyle: "chain" | "pin" | null = equippedWearables?.accessory?.accessoryStyle ?? null;
  const oc = OC[Math.min(effectiveOutfitTier, 4)];
  const skin  = SKIN_C[Math.min(v.bodyTone, 4)];
  const skinS = SKIN_S[Math.min(v.bodyTone, 4)];

  const hCY  = [29,  28,  26 ][v.posture] ?? 28;
  const eCY  = [31,  30,  28 ][v.posture] ?? 30;
  const nY   = [46,  43,  40 ][v.posture] ?? 43;
  const nH   = [10,  12,  14 ][v.posture] ?? 12;
  const tX   = [24,  24,  22 ][v.posture] ?? 24;
  const tW   = [52,  52,  56 ][v.posture] ?? 52;
  const aLX  = [8,   8,   6  ][v.posture] ?? 8;
  const aRX  = [76,  76,  78 ][v.posture] ?? 76;
  const aW   = [16,  16,  18 ][v.posture] ?? 16;

  const hsRx = [5,   4.5, 3.5, 2.5][v.grooming] ?? 5;
  const hsRy = [12,  11,  9,   7  ][v.grooming] ?? 12;
  const hcRy = [13,  13,  12,  11 ][v.grooming] ?? 13;

  const [bl, br] = browPaths(Math.min(v.confidenceFace, 2), hCY);
  const mouth    = mouthPath(Math.min(v.confidenceFace, 2), hCY);
  const hasWatch = v.prestigeAccent >= 1 || equippedWearables?.watch != null;
  const hasChain = v.prestigeAccent >= 2 || accessoryStyle === "chain";
  const hasGold  = v.prestigeAccent >= 3 || accessoryStyle === "pin";
  const nBottom  = nY + nH;

  const aspect = 220 / 100;
  const w = size / aspect;
  const h = size;

  return (
    <Svg width={w} height={h} viewBox="0 0 100 220">
      {v.bodyTone >= 3 && (
        <Ellipse cx="50" cy="130" rx="36" ry="90" fill="rgba(0,230,118,0.035)" />
      )}
      <Ellipse cx="50" cy="212" rx="30" ry="5" fill="#00000055" />
      <Ellipse cx="36" cy="197" rx="16" ry="7.5" fill="#0C0C1A" />
      <Ellipse cx="25" cy="195" rx="8"  ry="5"   fill="#0C0C1A" />
      <Ellipse cx="64" cy="197" rx="16" ry="7.5" fill="#0C0C1A" />
      <Ellipse cx="75" cy="195" rx="8"  ry="5"   fill="#0C0C1A" />
      <Ellipse cx="28" cy="192" rx="5"  ry="2.5" fill="#1A1A2A" />
      <Ellipse cx="72" cy="192" rx="5"  ry="2.5" fill="#1A1A2A" />
      <Rect x="26" y="118" width="21" height="80" rx="4" fill={oc.p} />
      <Rect x="53" y="118" width="21" height="80" rx="4" fill={oc.p} />
      <Rect x="46" y="118" width="8"  height="80" rx="0" fill={oc.seam} />
      {oc.btn && (
        <>
          <Rect x="28" y="122" width="11" height="8" rx="2" fill={oc.ps} />
          <Rect x="61" y="122" width="11" height="8" rx="2" fill={oc.ps} />
        </>
      )}
      <Rect x="35" y="140" width="1.5" height="50" rx="0.75" fill={oc.cr} />
      <Rect x="63" y="140" width="1.5" height="50" rx="0.75" fill={oc.cr} />
      <Rect x="25" y="113" width="50" height="7" rx="2.5" fill={oc.belt} />
      <Rect x="43" y="113" width="14" height="7" rx="1.5" fill={oc.bk} />
      <Rect x="47" y="115" width="6"  height="3" rx="1"   fill={oc.bk2} />
      <Rect x={tX}          y="52" width={tW}      height="64" rx="6"   fill={oc.s} />
      <Rect x={tX}          y="52" width={5}        height="64" rx="2.5" fill={oc.ss} />
      <Rect x={tX + tW - 5} y="52" width={5}        height="64" rx="2.5" fill={oc.ss} />
      {oc.btn && (
        <>
          <Circle cx="50" cy="70" r="1.6" fill={oc.ss} />
          <Circle cx="50" cy="83" r="1.6" fill={oc.ss} />
          <Circle cx="50" cy="96" r="1.6" fill={oc.ss} />
          <Rect x="49.2" y="60" width="1.5" height="52" rx="0.5" fill={oc.ss} />
        </>
      )}
      <Rect x={aLX}      y="54" width={aW} height="50" rx="8" fill={oc.s} />
      <Rect x={aRX}      y="54" width={aW} height="50" rx="8" fill={oc.s} />
      <Rect x={aLX}      y="54" width={4}  height="50" rx="2" fill={oc.ss} />
      <Rect x={aRX + aW - 4} y="54" width={4} height="50" rx="2" fill={oc.ss} />
      <Ellipse cx={aLX + aW / 2} cy="106" rx="9" ry="7" fill={skin} />
      <Ellipse cx={aRX + aW / 2} cy="106" rx="9" ry="7" fill={skin} />
      <Ellipse cx={aLX + 2}           cy="106" rx="3" ry="2.5" fill={skinS} />
      <Ellipse cx={aRX + aW - 2}      cy="106" rx="3" ry="2.5" fill={skinS} />
      {hasWatch && watchStyle === "basic" && (
        <G>
          <Rect x={aRX + 2} y="99" width="10" height="6" rx="1.5" fill="#7A6030" />
          <Rect x={aRX + 3} y="100" width="8" height="4" rx="1"   fill="#C0A030" />
          <Circle cx={aRX + 7} cy="102" r="1.5" fill="#1A1A28" />
          <Circle cx={aRX + 7} cy="102" r="0.7" fill="#C0A030" />
        </G>
      )}
      {hasWatch && watchStyle === "refined" && (
        <G>
          <Rect x={aRX + 1} y="97" width="2" height="10" rx="1" fill="#7A6030" />
          <Rect x={aRX + 11} y="97" width="2" height="10" rx="1" fill="#7A6030" />
          <Rect x={aRX + 2} y="98" width="10" height="8" rx="2" fill="#8A7040" />
          <Rect x={aRX + 3} y="99" width="8" height="6" rx="1.5" fill="#C0A030" />
          <Circle cx={aRX + 7} cy="102" r="2.2" fill="#1A1A28" />
          <Circle cx={aRX + 7} cy="102" r="1.1" fill="#2A2A40" />
          <Circle cx={aRX + 8} cy="101.2" r="0.5" fill="#C0A030" />
        </G>
      )}
      {hasWatch && watchStyle === "elite" && (
        <G>
          <Rect x={aRX + 1} y="96" width="2" height="12" rx="1" fill="#5A4020" />
          <Rect x={aRX + 11} y="96" width="2" height="12" rx="1" fill="#5A4020" />
          <Circle cx={aRX + 7} cy="102" r="7" fill="#8A7030" />
          <Circle cx={aRX + 7} cy="102" r="5.5" fill="#C0A030" />
          <Circle cx={aRX + 7} cy="102" r="3.8" fill="#0A0A18" />
          <Circle cx={aRX + 7} cy="102" r="1.8" fill="#C0A030" />
          <Circle cx={aRX + 7} cy="102" r="0.9" fill="#E8E8FF" />
        </G>
      )}
      {oc.col ? (
        <Path
          d={`M${tX + 16} 52 L50 60 L${tX + tW - 16} 52`}
          stroke={oc.ss} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
      ) : (
        <Path d="M42 52 L50 62 L58 52" stroke="#DDDDDD" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {hasChain && (
        <Path
          d={`M44 ${nBottom + 2} Q50 ${nBottom + 6} 56 ${nBottom + 2}`}
          stroke="#C0A030" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.85"
        />
      )}
      {hasGold && (
        <Circle cx={tX + 10} cy="61" r="2.2" fill="#C0A030" />
      )}
      <Rect x="44" y={nY} width="12" height={nH} rx="4" fill={skin} />
      <Ellipse cx="31" cy={eCY} rx="4" ry="6"   fill={skin} />
      <Ellipse cx="69" cy={eCY} rx="4" ry="6"   fill={skin} />
      <Ellipse cx="31" cy={eCY} rx="2" ry="3.5" fill={skinS} />
      <Ellipse cx="69" cy={eCY} rx="2" ry="3.5" fill={skinS} />
      <Ellipse cx="50" cy={hCY}      rx="19" ry="21" fill={skin} />
      <Ellipse cx="50" cy={hCY + 16} rx="14" ry="5"  fill={skinS} />
      <Ellipse cx="43" cy={hCY - 2} rx="3"   ry="3.2" fill="#2A2A3A" />
      <Ellipse cx="57" cy={hCY - 2} rx="3"   ry="3.2" fill="#2A2A3A" />
      <Ellipse cx="43" cy={hCY - 2} rx="2.2" ry="2.4" fill="#1A1A28" />
      <Ellipse cx="57" cy={hCY - 2} rx="2.2" ry="2.4" fill="#1A1A28" />
      <Circle  cx={44.2} cy={hCY - 3.2} r="0.9" fill="#FFFFFF" />
      <Circle  cx={58.2} cy={hCY - 3.2} r="0.9" fill="#FFFFFF" />
      <Path d={bl} stroke="#252535" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Path d={br} stroke="#252535" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Path
        d={`M50 ${hCY + 3} L48 ${hCY + 8} L52 ${hCY + 8}`}
        stroke="#C09070" strokeWidth="0.9" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      <Ellipse cx="50" cy={hCY + 7.5} rx="3" ry="1.5" fill={skin} />
      <Path d={mouth} stroke="#B07A5A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Ellipse cx="50" cy={hCY + 14} rx="4" ry="1.2" fill="#C98C6C" />
      <Ellipse cx="50" cy={hCY - 16} rx="20" ry={hcRy}  fill="#1E1E30" />
      <Rect    x="30"  y={hCY - 16}  width="40" height="14" fill="#1E1E30" />
      <Ellipse cx="31" cy={hCY - 8}  rx={hsRx}  ry={hsRy}  fill="#1E1E30" />
      <Ellipse cx="69" cy={hCY - 8}  rx={hsRx}  ry={hsRy}  fill="#1E1E30" />
      <Path d={`M38 ${hCY - 20} Q50 ${hCY - 24} 62 ${hCY - 20}`} stroke="#2A2A42" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d={`M36 ${hCY - 16} Q50 ${hCY - 21} 64 ${hCY - 16}`} stroke="#2A2A42" strokeWidth="1"   fill="none" strokeLinecap="round" />
      {v.grooming >= 1 && (
        <G>
          <Path d={`M30 ${hCY - 14} Q31 ${hCY - 8} 32 ${hCY - 2}`}  stroke="#1C1C2C" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <Path d={`M70 ${hCY - 14} Q69 ${hCY - 8} 68 ${hCY - 2}`}  stroke="#1C1C2C" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </G>
      )}
      {v.grooming >= 2 && (
        <G>
          <Path d={`M32 ${hCY - 11} Q33 ${hCY - 4} 35 ${hCY + 1}`} stroke="#141424" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <Path d={`M68 ${hCY - 11} Q67 ${hCY - 4} 65 ${hCY + 1}`} stroke="#141424" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}

// ─── Dimension Card — with FOCUS / STRENGTH badges ────────────────────────────

function DimensionCard({ dimension, badge, delay = 0 }: { dimension: any; badge?: "LOWEST" | "TOP"; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={dimStyles.card}>
      <View style={dimStyles.topRow}>
        <View style={[dimStyles.iconWrap, { backgroundColor: dimension.color + "18" }]}>
          <Ionicons name={dimension.icon as any} size={15} color={dimension.color} />
        </View>
        {badge && (
          <View style={[dimStyles.badge, {
            backgroundColor: badge === "LOWEST" ? Colors.crimsonDim : dimension.color + "20",
          }]}>
            <Text style={[dimStyles.badgeText, {
              color: badge === "LOWEST" ? Colors.crimson : dimension.color,
            }]}>
              {badge === "LOWEST" ? "FOCUS" : "TOP"}
            </Text>
          </View>
        )}
      </View>
      <Text style={dimStyles.name}>{dimension.name}</Text>
      <View style={dimStyles.barBg}>
        <View style={[dimStyles.barFill, { width: `${dimension.score}%` as any, backgroundColor: dimension.color }]} />
      </View>
      <View style={dimStyles.footer}>
        <Text style={[dimStyles.label, { color: dimension.color }]}>{dimension.label}</Text>
        <Text style={[dimStyles.scoreNum, { color: dimension.color }]}>{dimension.score}</Text>
      </View>
      <Text style={dimStyles.description} numberOfLines={3}>{dimension.description}</Text>
    </Animated.View>
  );
}

// ─── Equipped Style Row ────────────────────────────────────────────────────────

const SLOT_ICONS: Record<string, any> = { top: "shirt-outline", watch: "watch-outline", accessory: "diamond-outline" };
const SLOT_LABELS: Record<string, string> = { top: "TOP", watch: "WATCH", accessory: "PIECE" };

function EquippedStyleRow({ equippedWearables }: { equippedWearables: any }) {
  // TODO: Migrate each wearable slot Pressable to <ActionCard icon=... onPress=... /> once
  // ActionCard supports flex:1 stretch mode for equal-width row layouts.
  const slots = ["top", "watch", "accessory"] as const;
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {slots.map((slot) => {
        const item = equippedWearables?.[slot] ?? null;
        return (
          <Pressable
            key={slot}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: Colors.bgCard,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: item ? Colors.accent + "50" : Colors.border,
              paddingVertical: 11,
              paddingHorizontal: 8,
              alignItems: "center",
              gap: 5,
              opacity: pressed ? 0.75 : 1,
            })}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/wearables" as any); }}
          >
            <Ionicons name={SLOT_ICONS[slot]} size={17} color={item ? Colors.accent : Colors.textMuted} />
            <Text style={{ fontSize: 8, color: Colors.textMuted, fontFamily: "Inter_700Bold", letterSpacing: 0.8 }}>
              {SLOT_LABELS[slot]}
            </Text>
            {item ? (
              <Text style={{ fontSize: 9, color: Colors.textPrimary, fontFamily: "Inter_600SemiBold", textAlign: "center" }} numberOfLines={2}>
                {item.name}
              </Text>
            ) : (
              <Text style={{ fontSize: 9, color: Colors.textMuted, fontFamily: "Inter_400Regular", fontStyle: "italic" }}>None</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Tier constants ────────────────────────────────────────────────────────────

const TIER_ORDER = ["Starter", "Hustle", "Rising", "Refined", "Elite"];
const TIER_COLORS: Record<string, string> = {
  Starter: "#8888AA", Hustle: "#FFB300", Rising: "#00E676", Refined: "#00D4FF", Elite: "#F5C842",
};

// ─── Evolution explanation colors ─────────────────────────────────────────────

const EXPL_COLORS: Record<string, string> = {
  "Fitness":           "#00E67620",
  "Discipline":        "#7C5CFC20",
  "Finance/Lifestyle": "#F5C84220",
  "Prestige":          "#00D4FF20",
  "Starting Out":      Colors.bgElevated,
};
const EXPL_TEXT: Record<string, string> = {
  "Fitness":           "#00E676",
  "Discipline":        "#7C5CFC",
  "Finance/Lifestyle": "#F5C842",
  "Prestige":          "#00D4FF",
  "Starting Out":      Colors.textMuted,
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CharacterStatusScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useCharacterStatus();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 100);

  const tierColor = data?.statusTierColor ?? Colors.textMuted;
  const currentTierIdx = TIER_ORDER.indexOf(data?.statusTier ?? "Starter");

  const dims = data
    ? [
        { name: "Fitness",    ...data.dimensions.fitness    },
        { name: "Discipline", ...data.dimensions.discipline },
        { name: "Finance",    ...data.dimensions.finance    },
        { name: "Prestige",   ...data.dimensions.prestige   },
      ]
    : [];

  let weakestIdx = -1;
  let strongestIdx = -1;
  if (dims.length > 0) {
    let minScore = Infinity, maxScore = -Infinity;
    dims.forEach((d, i) => {
      if (d.score < minScore) { minScore = d.score; weakestIdx = i; }
      if (d.score > maxScore) { maxScore = d.score; strongestIdx = i; }
    });
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => { Haptics.selectionAsync().catch(() => {}); router.back(); }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>CHARACTER STATUS</Text>
        <View style={[styles.tierPillHeader, { borderColor: tierColor + "60", backgroundColor: tierColor + "15" }]}>
          <View style={[styles.tierDotHeader, { backgroundColor: tierColor }]} />
          <Text style={[styles.tierPillHeaderText, { color: tierColor }]}>
            {data?.statusTier ?? "—"}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <LoadingScreen
          message="Rendering character..."
          accentColor={Colors.accent}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: botPad }]}
          refreshControl={
            <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={Colors.accent} />
          }
        >

          {/* ── 1. CHARACTER HERO ── */}
          <Animated.View entering={FadeIn.duration(600)} style={styles.heroCard}>
            <LinearGradient
              colors={[tierColor + "28", "#0E0A20", "#06060F"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.heroGradient}
            >
              {/* Ambient glow rings */}
              <View style={[styles.glowRing, { width: 280, height: 280, borderColor: tierColor + "16", marginLeft: -140, marginTop: -140 }]} />
              <View style={[styles.glowRing, { width: 200, height: 200, borderColor: tierColor + "10", marginLeft: -100, marginTop: -100 }]} />

              {/* The character — full hero presence */}
              <View style={styles.characterWrap}>
                <EvolvedCharacter
                  visualState={data?.visualState as VisualState | null}
                  equippedWearables={(data as any)?.equippedWearables as EquippedWearableState ?? null}
                  size={230}
                />
              </View>

              {/* Identity beneath the figure */}
              <Text style={styles.characterName}>{user?.username ?? "Character"}</Text>
              <Text style={styles.outfitLabel}>{data?.character?.outfitLabel ?? "Starter Kit"}</Text>

              {/* Status score pill */}
              <View style={[styles.scoreChip, { borderColor: tierColor + "60", backgroundColor: tierColor + "18" }]}>
                <Text style={[styles.scoreChipNum, { color: tierColor }]}>{data?.overallScore ?? 0}</Text>
                <Text style={styles.scoreChipLabel}> STATUS SCORE</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── 2. WHO AM I — Status + tier ladder (merged, no duplicate cards) ── */}
          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.tierCard}>
            <View style={styles.tierCardTop}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={styles.tierCardEyebrow}>CURRENT STATUS</Text>
                <Text style={[styles.tierCardName, { color: tierColor }]}>{data?.statusTier ?? "Starter"}</Text>
                <Text style={styles.tierCardDesc}>
                  {data?.statusTierDescription ?? "Keep pushing. Your status is earned through consistent action."}
                </Text>
              </View>
              <View style={styles.statsCol}>
                <View style={styles.miniStat}>
                  <Text style={[styles.miniStatNum, { color: Colors.gold }]}>{data?.completedSessions ?? 0}</Text>
                  <Text style={styles.miniStatLabel}>Sessions</Text>
                </View>
                <View style={[styles.miniStatDivider]} />
                <View style={styles.miniStat}>
                  <Text style={[styles.miniStatNum, { color: Colors.cyan }]}>{data?.badgeCount ?? 0}</Text>
                  <Text style={styles.miniStatLabel}>Badges</Text>
                </View>
              </View>
            </View>

            {/* Tier progression ladder — horizontal with connecting rail */}
            <View style={styles.tierLadder}>
              {TIER_ORDER.map((t, i) => {
                const active = t === data?.statusTier;
                const past = i < currentTierIdx;
                const isLast = i === TIER_ORDER.length - 1;
                const tc = TIER_COLORS[t];
                return (
                  <React.Fragment key={t}>
                    <View style={styles.tierStep}>
                      <View style={[
                        styles.tierStepDot,
                        { borderColor: tc },
                        (active || past) && { backgroundColor: tc },
                        active && { width: 13, height: 13, borderRadius: 7 },
                      ]} />
                      <Text style={[
                        styles.tierStepLabel,
                        (active || past) && { color: tc },
                        active && { fontFamily: "Inter_700Bold" },
                      ]}>{t}</Text>
                    </View>
                    {!isLast && (
                      <View style={[styles.tierRail, past && { backgroundColor: tc }]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </Animated.View>

          {/* ── 3. WHAT SHOULD I DO — Next Evolution (promoted to primary CTA) ── */}
          {data?.nextEvolutionHint && (
            <Animated.View entering={FadeInDown.delay(120).springify()}>
              <LinearGradient
                colors={[Colors.accent + "18", Colors.bgCard]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.evolutionCard}
              >
                <View style={styles.evolutionTopRow}>
                  <View style={styles.evolutionIconWrap}>
                    <Ionicons name="trending-up" size={21} color={Colors.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.evolutionEyebrow}>NEXT EVOLUTION</Text>
                    <Text style={styles.evolutionDimension}>{data.nextEvolutionHint.dimension}</Text>
                  </View>
                </View>
                <Text style={styles.evolutionHint}>{data.nextEvolutionHint.hint}</Text>
                <Button
                  label={data.nextEvolutionHint.action}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    router.push("/(tabs)/missions");
                  }}
                  variant="primary"
                  iconLeft="flash"
                />
              </LinearGradient>
            </Animated.View>
          )}

          {/* ── 4. EQUIPPED STYLE ── */}
          <Animated.View entering={FadeInDown.delay(160).springify()}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shirt-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.sectionHeaderText}>EQUIPPED STYLE</Text>
              <Pressable
                style={styles.sectionLink}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/wearables" as any); }}
              >
                <Text style={styles.sectionLinkText}>Manage</Text>
                <Ionicons name="chevron-forward" size={11} color={Colors.accent} />
              </Pressable>
            </View>
            <EquippedStyleRow equippedWearables={(data as any)?.equippedWearables ?? null} />
          </Animated.View>

          {/* ── 5. STATUS DIMENSIONS — why you look like you do ── */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <View style={styles.sectionHeader}>
              <Ionicons name="stats-chart-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.sectionHeaderText}>STATUS DIMENSIONS</Text>
            </View>
            <View style={styles.dimsGrid}>
              {dims.map((dim, i) => {
                const badge =
                  i === weakestIdx ? "LOWEST" as const :
                  i === strongestIdx ? "TOP" as const :
                  undefined;
                return (
                  <DimensionCard key={dim.name} dimension={dim} badge={badge} delay={220 + i * 30} />
                );
              })}
            </View>
          </Animated.View>

          {/* ── 6. WHY I LOOK LIKE THIS — evolution explanations ── */}
          {data?.visualState?.evolutionExplanations && data.visualState.evolutionExplanations.length > 0 && (
            <Animated.View entering={FadeInDown.delay(310).springify()}>
              <View style={styles.sectionHeader}>
                <Ionicons name="eye-outline" size={12} color={Colors.textMuted} />
                <Text style={styles.sectionHeaderText}>WHY YOU LOOK LIKE THIS</Text>
              </View>
              <View style={evolStyles.card}>
                {(data.visualState.evolutionExplanations as { source: string; text: string }[]).map((ex, i) => (
                  <View key={i} style={[evolStyles.row, i > 0 && evolStyles.rowBorder]}>
                    <View style={[evolStyles.sourcePill, { backgroundColor: EXPL_COLORS[ex.source] ?? Colors.accentGlow }]}>
                      <Text style={[evolStyles.sourceText, { color: EXPL_TEXT[ex.source] ?? Colors.accent }]}>
                        {ex.source.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={evolStyles.text}>{ex.text}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* ── 7. YOUR SPACE — compact dual chip (no bloated room preview) ── */}
          <Animated.View entering={FadeInDown.delay(360).springify()}>
            <View style={styles.sectionHeader}>
              <Ionicons name="home-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.sectionHeaderText}>YOUR SPACE</Text>
            </View>
            <View style={styles.spaceRow}>
              <Pressable
                style={({ pressed }) => [styles.spaceChip, pressed && { opacity: 0.82 }]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/world"); }}
              >
                <View style={[styles.spaceChipIcon, { backgroundColor: Colors.cyan + "18" }]}>
                  <Ionicons name="cube-outline" size={19} color={Colors.cyan} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.spaceChipTitle}>Command Center</Text>
                  <Text style={styles.spaceChipSub}>Room & display slots</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.spaceChip, pressed && { opacity: 0.82 }]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/cars" as any); }}
              >
                <View style={[styles.spaceChipIcon, { backgroundColor: Colors.amber + "18" }]}>
                  <Ionicons name="car-sport-outline" size={19} color={Colors.amber} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.spaceChipTitle}>Dream Garage</Text>
                  <Text style={styles.spaceChipSub}>Vehicle collection</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
              </Pressable>
            </View>
          </Animated.View>

          {/* ── 8. QUICK ACTIONS ── */}
          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.quickActions}>
            {[
              { icon: "radio-button-on-outline", label: "Missions",  onPress: () => router.push("/(tabs)/missions") },
              { icon: "cart-outline",            label: "Store",     onPress: () => router.push("/(tabs)/rewards")  },
              { icon: "trophy-outline",          label: "Profile",   onPress: () => router.push("/(tabs)/profile")  },
              { icon: "shirt-outline",           label: "Wardrobe",  onPress: () => router.push("/wearables" as any) },
            ].map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [styles.quickActionBtn, pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] }]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); action.onPress(); }}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name={action.icon as any} size={20} color={Colors.accent} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </Animated.View>

        </ScrollView>
      )}
    </View>
  );
}

// ─── Core Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText:      { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },

  // Header
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 12, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold", fontSize: 15,
    color: Colors.textPrimary, letterSpacing: 1.5, flex: 1,
  },
  tierPillHeader: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  tierDotHeader:    { width: 6, height: 6, borderRadius: 3 },
  tierPillHeaderText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.2 },

  scroll: { paddingHorizontal: 16, gap: 14 },

  // ── Hero Card ──
  heroCard:     { borderRadius: 26, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  heroGradient: {
    paddingTop: 32, paddingBottom: 24, paddingHorizontal: 20,
    alignItems: "center", gap: 8, position: "relative",
  },
  glowRing: {
    position: "absolute", borderRadius: 1000, borderWidth: 1,
    top: "50%", left: "50%",
  },
  characterWrap: { alignItems: "center", zIndex: 1 },
  characterName: {
    fontFamily: "Inter_700Bold", fontSize: 22,
    color: Colors.textPrimary, letterSpacing: -0.3, zIndex: 1,
  },
  outfitLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, zIndex: 1 },
  scoreChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, marginTop: 6, zIndex: 1,
  },
  scoreChipNum:   { fontFamily: "Inter_700Bold", fontSize: 16 },
  scoreChipLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },

  // ── Status Tier Card (merged) ──
  tierCard: {
    backgroundColor: Colors.bgCard, borderRadius: 22,
    padding: 20, borderWidth: 1, borderColor: Colors.border, gap: 18,
  },
  tierCardTop:    { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  tierCardEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  tierCardName:   { fontFamily: "Inter_700Bold", fontSize: 32, letterSpacing: -1.5 },
  tierCardDesc:   { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  statsCol:       { alignItems: "center", gap: 6, minWidth: 52 },
  miniStat:       { alignItems: "center" },
  miniStatNum:    { fontFamily: "Inter_700Bold", fontSize: 22 },
  miniStatLabel:  { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted },
  miniStatDivider: { width: 28, height: 1, backgroundColor: Colors.border },

  // Tier ladder
  tierLadder: { flexDirection: "row", alignItems: "center" },
  tierStep:   { alignItems: "center", gap: 5 },
  tierStepDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  tierStepLabel: {
    fontFamily: "Inter_400Regular", fontSize: 8,
    color: Colors.textMuted, letterSpacing: 0.3,
  },
  tierRail: { flex: 1, height: 1.5, backgroundColor: Colors.border, marginBottom: 13 },

  // Section header
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 },
  sectionHeaderText: {
    fontFamily: "Inter_700Bold", fontSize: 10,
    color: Colors.textMuted, letterSpacing: 1.8, flex: 1,
  },
  sectionLink:     { flexDirection: "row", alignItems: "center", gap: 3 },
  sectionLinkText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.accent },

  // Dimensions grid
  dimsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  // ── Next Evolution CTA ──
  evolutionCard: {
    borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: Colors.accentDim, gap: 13,
  },
  evolutionTopRow:  { flexDirection: "row", alignItems: "center", gap: 13 },
  evolutionIconWrap: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: Colors.accent + "20",
    alignItems: "center", justifyContent: "center",
  },
  evolutionEyebrow:   { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },
  evolutionDimension: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.accent },
  evolutionHint: {
    fontFamily: "Inter_400Regular", fontSize: 14,
    color: Colors.textSecondary, lineHeight: 21,
  },
  evolutionCTA: {
    flexDirection: "row", alignItems: "center", gap: 8,
    alignSelf: "flex-start", backgroundColor: Colors.accent,
    borderRadius: 24, paddingHorizontal: 20, paddingVertical: 11,
  },
  evolutionCTAText: { fontFamily: "Inter_700Bold", fontSize: 13, color: "#fff" },

  // ── Your Space ──
  spaceRow: { gap: 10 },
  spaceChip: {
    flexDirection: "row", alignItems: "center", gap: 13,
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  spaceChipIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  spaceChipTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  spaceChipSub:   { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  // Quick actions
  quickActions: { flexDirection: "row", gap: 8 },
  quickActionBtn: {
    flex: 1, alignItems: "center", gap: 7,
    backgroundColor: Colors.bgCard, borderRadius: 14,
    paddingVertical: 13, borderWidth: 1, borderColor: Colors.border,
  },
  quickActionIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: Colors.accentGlow,
    alignItems: "center", justifyContent: "center",
  },
  quickActionLabel: {
    fontFamily: "Inter_500Medium", fontSize: 10,
    color: Colors.textSecondary, textAlign: "center",
  },
});

// ─── Dimension Card Styles ─────────────────────────────────────────────────────

const dimStyles = StyleSheet.create({
  card: {
    width: "48.5%" as any,
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 7,
  },
  topRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconWrap:    { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  badge:       { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText:   { fontFamily: "Inter_700Bold", fontSize: 7, letterSpacing: 0.8 },
  name:        { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  barBg:       { height: 4, backgroundColor: Colors.bgElevated, borderRadius: 2 },
  barFill:     { height: 4, borderRadius: 2 },
  footer:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label:       { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.4 },
  scoreNum:    { fontFamily: "Inter_700Bold", fontSize: 18 },
  description: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
});

// ─── Evolution Explanation Styles ─────────────────────────────────────────────

const evolStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 18, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border,
  },
  row:       { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  sourcePill: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    minWidth: 70, alignItems: "center", flexShrink: 0,
  },
  sourceText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2 },
  text:       { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 19 },
});

import React from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Svg, { Circle, Ellipse, Rect, Path, G } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { useCharacterStatus } from "@/hooks/useApi";

// ─── Phase 28 — Visual State Types ────────────────────────────────────────────

type VisualState = {
  bodyTone: number;          // 0–4 Fitness  → skin warmth / energy glow
  posture: number;           // 0–2 Fitness  → head position / shoulder width
  outfitTier: number;        // 0–4 Finance  → white starter → elite black
  grooming: number;          // 0–3 Discipline → fade tightness
  prestigeAccent: number;    // 0–3 Prestige → watch → chain → gold
  confidenceFace: number;    // 0–2 Discipline → neutral → smile → sharp
  outfitLabel?: string;
  evolutionExplanations?: { source: string; text: string }[];
};

const DEFAULT_VS: VisualState = {
  bodyTone: 0, posture: 0, outfitTier: 0, grooming: 0, prestigeAccent: 0, confidenceFace: 0,
};

// Outfit per tier: shirt / shirtShadow / pants / pantsS / seam / crease / belt / buckle / bk2 / buttons / collar
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

function EvolvedCharacter({ visualState, size = 190 }: { visualState?: VisualState | null; size?: number }) {
  const v = visualState ?? DEFAULT_VS;
  const oc = OC[Math.min(v.outfitTier, 4)];
  const skin  = SKIN_C[Math.min(v.bodyTone, 4)];
  const skinS = SKIN_S[Math.min(v.bodyTone, 4)];

  // Posture: head rises, neck grows, shoulders broaden
  const hCY  = [29,  28,  26 ][v.posture] ?? 28; // head center Y
  const eCY  = [31,  30,  28 ][v.posture] ?? 30; // ear Y
  const nY   = [46,  43,  40 ][v.posture] ?? 43; // neck top Y
  const nH   = [10,  12,  14 ][v.posture] ?? 12; // neck height
  const tX   = [24,  24,  22 ][v.posture] ?? 24; // torso left
  const tW   = [52,  52,  56 ][v.posture] ?? 52; // torso width
  const aLX  = [8,   8,   6  ][v.posture] ?? 8;  // left arm X
  const aRX  = [76,  76,  78 ][v.posture] ?? 76; // right arm X
  const aW   = [16,  16,  18 ][v.posture] ?? 16; // arm width

  // Grooming: side hair tightens into fade
  const hsRx = [5,   4.5, 3.5, 2.5][v.grooming] ?? 5;
  const hsRy = [12,  11,  9,   7  ][v.grooming] ?? 12;
  const hcRy = [13,  13,  12,  11 ][v.grooming] ?? 13;

  const [bl, br] = browPaths(Math.min(v.confidenceFace, 2), hCY);
  const mouth    = mouthPath(Math.min(v.confidenceFace, 2), hCY);
  const hasWatch = v.prestigeAccent >= 1;
  const hasChain = v.prestigeAccent >= 2;
  const hasGold  = v.prestigeAccent >= 3;
  const nBottom  = nY + nH;

  const aspect = 220 / 100;
  const w = size / aspect;
  const h = size;

  return (
    <Svg width={w} height={h} viewBox="0 0 100 220">

      {/* Layer 0 — Fitness body tone glow (bodyTone >= 3) */}
      {v.bodyTone >= 3 && (
        <Ellipse cx="50" cy="130" rx="36" ry="90" fill="rgba(0,230,118,0.035)" />
      )}

      {/* Floor shadow */}
      <Ellipse cx="50" cy="212" rx="30" ry="5" fill="#00000055" />

      {/* Layer 1 — Shoes */}
      <Ellipse cx="36" cy="197" rx="16" ry="7.5" fill="#0C0C1A" />
      <Ellipse cx="25" cy="195" rx="8"  ry="5"   fill="#0C0C1A" />
      <Ellipse cx="64" cy="197" rx="16" ry="7.5" fill="#0C0C1A" />
      <Ellipse cx="75" cy="195" rx="8"  ry="5"   fill="#0C0C1A" />
      <Ellipse cx="28" cy="192" rx="5"  ry="2.5" fill="#1A1A2A" />
      <Ellipse cx="72" cy="192" rx="5"  ry="2.5" fill="#1A1A2A" />

      {/* Layer 2 — Legs / pants (outfit-driven) */}
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

      {/* Layer 3 — Belt */}
      <Rect x="25" y="113" width="50" height="7" rx="2.5" fill={oc.belt} />
      <Rect x="43" y="113" width="14" height="7" rx="1.5" fill={oc.bk} />
      <Rect x="47" y="115" width="6"  height="3" rx="1"   fill={oc.bk2} />

      {/* Layer 4 — Shirt torso (posture-driven width) */}
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

      {/* Layer 5 — Arms (posture-driven position/width) */}
      <Rect x={aLX}      y="54" width={aW} height="50" rx="8" fill={oc.s} />
      <Rect x={aRX}      y="54" width={aW} height="50" rx="8" fill={oc.s} />
      <Rect x={aLX}      y="54" width={4}  height="50" rx="2" fill={oc.ss} />
      <Rect x={aRX + aW - 4} y="54" width={4} height="50" rx="2" fill={oc.ss} />

      {/* Layer 6 — Hands (skin-driven) */}
      <Ellipse cx={aLX + aW / 2} cy="106" rx="9" ry="7" fill={skin} />
      <Ellipse cx={aRX + aW / 2} cy="106" rx="9" ry="7" fill={skin} />
      <Ellipse cx={aLX + 2}           cy="106" rx="3" ry="2.5" fill={skinS} />
      <Ellipse cx={aRX + aW - 2}      cy="106" rx="3" ry="2.5" fill={skinS} />

      {/* Layer 7 — Prestige: Watch on right wrist */}
      {hasWatch && (
        <G>
          <Rect x={aRX + 2} y="99" width="10" height="6" rx="1.5" fill="#7A6030" />
          <Rect x={aRX + 3} y="100" width="8" height="4" rx="1"   fill="#C0A030" />
          <Circle cx={aRX + 7} cy="102" r="1.5" fill="#1A1A28" />
          <Circle cx={aRX + 7} cy="102" r="0.7" fill="#C0A030" />
        </G>
      )}

      {/* Layer 8 — Collar / V-neck (outfit-driven) */}
      {oc.col ? (
        <Path
          d={`M${tX + 16} 52 L50 60 L${tX + tW - 16} 52`}
          stroke={oc.ss} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
      ) : (
        <Path d="M42 52 L50 62 L58 52" stroke="#DDDDDD" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Layer 9 — Prestige: Chain at collar */}
      {hasChain && (
        <Path
          d={`M44 ${nBottom + 2} Q50 ${nBottom + 6} 56 ${nBottom + 2}`}
          stroke="#C0A030" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.85"
        />
      )}

      {/* Elite lapel pin / gem */}
      {hasGold && (
        <Circle cx={tX + 10} cy="61" r="2.2" fill="#C0A030" />
      )}

      {/* Layer 10 — Neck (posture-driven height) */}
      <Rect x="44" y={nY} width="12" height={nH} rx="4" fill={skin} />

      {/* Layer 11 — Ears (posture-driven Y) */}
      <Ellipse cx="31" cy={eCY} rx="4" ry="6"   fill={skin} />
      <Ellipse cx="69" cy={eCY} rx="4" ry="6"   fill={skin} />
      <Ellipse cx="31" cy={eCY} rx="2" ry="3.5" fill={skinS} />
      <Ellipse cx="69" cy={eCY} rx="2" ry="3.5" fill={skinS} />

      {/* Layer 12 — Head (posture-driven Y) */}
      <Ellipse cx="50" cy={hCY}      rx="19" ry="21" fill={skin} />
      <Ellipse cx="50" cy={hCY + 16} rx="14" ry="5"  fill={skinS} />

      {/* Layer 13 — Eyes */}
      <Ellipse cx="43" cy={hCY - 2} rx="3"   ry="3.2" fill="#2A2A3A" />
      <Ellipse cx="57" cy={hCY - 2} rx="3"   ry="3.2" fill="#2A2A3A" />
      <Ellipse cx="43" cy={hCY - 2} rx="2.2" ry="2.4" fill="#1A1A28" />
      <Ellipse cx="57" cy={hCY - 2} rx="2.2" ry="2.4" fill="#1A1A28" />
      <Circle  cx={44.2} cy={hCY - 3.2} r="0.9" fill="#FFFFFF" />
      <Circle  cx={58.2} cy={hCY - 3.2} r="0.9" fill="#FFFFFF" />

      {/* Layer 14 — Eyebrows (confidence-driven arch) */}
      <Path d={bl} stroke="#252535" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Path d={br} stroke="#252535" strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* Layer 15 — Nose */}
      <Path
        d={`M50 ${hCY + 3} L48 ${hCY + 8} L52 ${hCY + 8}`}
        stroke="#C09070" strokeWidth="0.9" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      <Ellipse cx="50" cy={hCY + 7.5} rx="3" ry="1.5" fill={skin} />

      {/* Layer 16 — Mouth (confidence-driven curve) */}
      <Path d={mouth} stroke="#B07A5A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Ellipse cx="50" cy={hCY + 14} rx="4" ry="1.2" fill="#C98C6C" />

      {/* Layer 17 — Hair / Grooming (side tightness driven by grooming level) */}
      <Ellipse cx="50" cy={hCY - 16} rx="20" ry={hcRy}  fill="#1E1E30" />
      <Rect    x="30"  y={hCY - 16}  width="40" height="14" fill="#1E1E30" />
      <Ellipse cx="31" cy={hCY - 8}  rx={hsRx}  ry={hsRy}  fill="#1E1E30" />
      <Ellipse cx="69" cy={hCY - 8}  rx={hsRx}  ry={hsRy}  fill="#1E1E30" />
      <Path d={`M38 ${hCY - 20} Q50 ${hCY - 24} 62 ${hCY - 20}`} stroke="#2A2A42" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d={`M36 ${hCY - 16} Q50 ${hCY - 21} 64 ${hCY - 16}`} stroke="#2A2A42" strokeWidth="1"   fill="none" strokeLinecap="round" />

      {/* Fade definition lines — grooming >= 1 */}
      {v.grooming >= 1 && (
        <G>
          <Path d={`M30 ${hCY - 14} Q31 ${hCY - 8} 32 ${hCY - 2}`}  stroke="#1C1C2C" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <Path d={`M70 ${hCY - 14} Q69 ${hCY - 8} 68 ${hCY - 2}`}  stroke="#1C1C2C" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </G>
      )}
      {/* Sharp fade line — grooming >= 2 */}
      {v.grooming >= 2 && (
        <G>
          <Path d={`M32 ${hCY - 11} Q33 ${hCY - 4} 35 ${hCY + 1}`} stroke="#141424" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <Path d={`M68 ${hCY - 11} Q67 ${hCY - 4} 65 ${hCY + 1}`} stroke="#141424" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}

// ─── Dimension Card ───────────────────────────────────────────────────────────

function DimensionCard({ dimension, delay = 0 }: { dimension: any; delay?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={dimStyles.card}>
      <View style={dimStyles.header}>
        <View style={[dimStyles.iconWrap, { backgroundColor: dimension.color + "18" }]}>
          <Ionicons name={dimension.icon as any} size={16} color={dimension.color} />
        </View>
        <Text style={[dimStyles.score, { color: dimension.color }]}>{dimension.score}</Text>
      </View>
      <Text style={dimStyles.name}>{dimension.name}</Text>
      <View style={dimStyles.barBg}>
        <View style={[dimStyles.barFill, { width: `${dimension.score}%` as any, backgroundColor: dimension.color }]} />
      </View>
      <Text style={[dimStyles.label, { color: dimension.color }]}>{dimension.label}</Text>
      <Text style={dimStyles.description} numberOfLines={2}>{dimension.description}</Text>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CharacterStatusScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data, isLoading } = useCharacterStatus();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 100);

  const dims = data
    ? [
        { name: "Fitness",         ...data.dimensions.fitness    },
        { name: "Discipline",      ...data.dimensions.discipline },
        { name: "Finance",         ...data.dimensions.finance    },
        { name: "Prestige",        ...data.dimensions.prestige   },
      ]
    : [];

  const tierColor = data?.statusTierColor ?? Colors.textMuted;

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
        <Text style={styles.headerTitle}>CHARACTER</Text>
        <View style={[styles.betaPill]}>
          <Text style={styles.betaText}>GAME MODE</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading character...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: botPad }]}
        >

          {/* ── Character Hero Card ── */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.heroCard}>
            <LinearGradient
              colors={["#1A0A3A", "#0A0A18"]}
              style={styles.heroGradient}
            >
              {/* Glow rings */}
              <View style={[styles.glowRing, { width: 220, height: 220, borderColor: tierColor + "20" }]} />
              <View style={[styles.glowRing, { width: 170, height: 170, borderColor: tierColor + "15" }]} />

              {/* Tier pill — above character */}
              <View style={[styles.tierPillTop, { borderColor: tierColor + "60", backgroundColor: tierColor + "15" }]}>
                <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
                <Text style={[styles.tierPillText, { color: tierColor }]}>
                  {data?.statusTier ?? "—"}
                </Text>
              </View>

              {/* Character figure — layered evolved renderer */}
              <View style={styles.characterWrap}>
                <EvolvedCharacter visualState={data?.visualState as VisualState | null} size={190} />
              </View>

              {/* Name + outfit label */}
              <Text style={styles.characterName}>{user?.username ?? "Character"}</Text>
              <Text style={styles.outfitLabel}>{data?.character?.outfitLabel ?? "Starter Kit"}</Text>

              {/* Stats strip */}
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{data?.completedSessions ?? 0}</Text>
                  <Text style={styles.heroStatLabel}>Sessions</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{data?.badgeCount ?? 0}</Text>
                  <Text style={styles.heroStatLabel}>Badges</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{data?.overallScore ?? 0}</Text>
                  <Text style={styles.heroStatLabel}>Status Score</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Status Tier Card ── */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.tierCard}>
            <View style={styles.tierCardLeft}>
              <Text style={styles.tierCardLabel}>STATUS TIER</Text>
              <Text style={[styles.tierCardName, { color: tierColor }]}>{data?.statusTier ?? "Starter"}</Text>
              <Text style={styles.tierCardDesc}>{data?.statusTierDescription ?? "—"}</Text>
            </View>
            <View style={styles.tierCardRight}>
              <View style={[styles.tierScoreRing, { borderColor: tierColor + "50" }]}>
                <Text style={[styles.tierScoreNum, { color: tierColor }]}>{data?.overallScore ?? 0}</Text>
                <Text style={styles.tierScoreLabel}>/ 100</Text>
              </View>
            </View>
          </Animated.View>

          {/* ── Tier progress bar ── */}
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.tierBarWrap}>
            {["Starter", "Hustle", "Rising", "Refined", "Elite"].map((t, i) => {
              const tierColors: Record<string, string> = {
                Starter: "#8888AA", Hustle: "#FFB300", Rising: "#00E676", Refined: "#00D4FF", Elite: "#F5C842",
              };
              const active = t === data?.statusTier;
              const past = ["Starter","Hustle","Rising","Refined","Elite"].indexOf(t) < ["Starter","Hustle","Rising","Refined","Elite"].indexOf(data?.statusTier ?? "Starter");
              return (
                <View key={t} style={styles.tierBarItem}>
                  <View style={[
                    styles.tierBarDot,
                    { borderColor: tierColors[t] },
                    (active || past) && { backgroundColor: tierColors[t] },
                  ]} />
                  <Text style={[styles.tierBarLabel, active && { color: tierColors[t], fontFamily: "Inter_700Bold" }]}>{t}</Text>
                </View>
              );
            })}
          </Animated.View>

          {/* ── Dimensions ── */}
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.sectionHeader}>
            <Ionicons name="grid-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.sectionHeaderText}>STATUS DIMENSIONS</Text>
          </Animated.View>

          <View style={styles.dimsGrid}>
            {dims.map((dim, i) => (
              <DimensionCard key={dim.name} dimension={dim} delay={180 + i * 40} />
            ))}
          </View>

          {/* ── Phase 28 — Evolution Explanation Layer ── */}
          {data?.visualState?.evolutionExplanations && data.visualState.evolutionExplanations.length > 0 && (
            <>
              <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.sectionHeader}>
                <Ionicons name="sparkles-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.sectionHeaderText}>WHY YOUR CHARACTER LOOKS LIKE THIS</Text>
              </Animated.View>
              <Animated.View entering={FadeInDown.delay(320).springify()} style={evolStyles.card}>
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
              </Animated.View>
            </>
          )}

          {/* ── Room Preview ── */}
          <Animated.View entering={FadeInDown.delay(340).springify()} style={styles.sectionHeader}>
            <Ionicons name="home-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.sectionHeaderText}>YOUR SPACE</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(360).springify()} style={styles.roomCard}>
            <LinearGradient colors={["#0F0F20", "#080814"]} style={styles.roomGradient}>
              {/* Simple room visual */}
              <View style={styles.roomScene}>
                {/* Back wall */}
                <View style={styles.roomWall} />
                {/* Floor */}
                <View style={styles.roomFloor} />
                {/* Window */}
                <View style={styles.roomWindow}>
                  <View style={styles.roomWindowPane} />
                  <View style={styles.roomWindowCross} />
                  <View style={styles.roomWindowCrossH} />
                </View>
                {/* Simple desk */}
                <View style={styles.roomDesk} />
                <View style={styles.roomDeskLeg} />
                {/* Floor lamp placeholder */}
                <View style={styles.roomLamp} />
                <View style={styles.roomLampHead} />
              </View>
            </LinearGradient>
            <View style={styles.roomInfo}>
              <View>
                <Text style={styles.roomName}>Starter Room</Text>
                <Text style={styles.roomDesc}>Basic space. Your environment evolves as you grow.</Text>
              </View>
              <Pressable
                style={styles.roomBtn}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/world"); }}
              >
                <Text style={styles.roomBtnText}>View Room</Text>
                <Ionicons name="arrow-forward" size={13} color={Colors.accent} />
              </Pressable>
            </View>
            <View style={styles.roomHintRow}>
              <Ionicons name="lock-closed-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.roomHintText}>
                Unlock decorations through missions and marketplace purchases.
              </Text>
            </View>
          </Animated.View>

          {/* ── Next Evolution Hint ── */}
          {data?.nextEvolutionHint && (
            <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.evolutionCard}>
              <View style={styles.evolutionHeader}>
                <View style={styles.evolutionIconWrap}>
                  <Ionicons name="arrow-up-circle" size={18} color={Colors.accent} />
                </View>
                <View>
                  <Text style={styles.evolutionLabel}>NEXT EVOLUTION</Text>
                  <Text style={styles.evolutionDimension}>{data.nextEvolutionHint.dimension}</Text>
                </View>
              </View>
              <Text style={styles.evolutionHint}>{data.nextEvolutionHint.hint}</Text>
              <Pressable
                style={styles.evolutionAction}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/(tabs)/missions"); }}
              >
                <Text style={styles.evolutionActionText}>{data.nextEvolutionHint.action}</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.accent} />
              </Pressable>
            </Animated.View>
          )}

          {/* ── Quick Actions ── */}
          <Animated.View entering={FadeInDown.delay(440).springify()} style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.sectionHeaderText}>QUICK ACTIONS</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(460).springify()} style={styles.quickActions}>
            {[
              { icon: "radio-button-on-outline", label: "Missions",  onPress: () => router.push("/(tabs)/missions") },
              { icon: "cart-outline",            label: "Store",     onPress: () => router.push("/(tabs)/rewards")  },
              { icon: "home-outline",            label: "My Room",   onPress: () => router.push("/world")           },
              { icon: "stats-chart-outline",     label: "Skills",    onPress: () => router.push("/skills")          },
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

          {/* ── Collection placeholder ── */}
          <Animated.View entering={FadeInDown.delay(480).springify()} style={styles.comingSoonCard}>
            <Ionicons name="car-sport-outline" size={20} color={Colors.textMuted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.comingSoonTitle}>Collection</Text>
              <Text style={styles.comingSoonDesc}>Vehicle and luxury collection. Unlocks at Refined tier.</Text>
            </View>
            <View style={styles.comingSoonPill}>
              <Text style={styles.comingSoonPillText}>SOON</Text>
            </View>
          </Animated.View>

        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },

  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, gap: 12,
  },
  backBtn:     { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary, letterSpacing: 2, flex: 1 },
  betaPill:    { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.accentGlow, borderRadius: 20, borderWidth: 1, borderColor: Colors.accentDim },
  betaText:    { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.accent, letterSpacing: 1.5 },

  scroll: { paddingHorizontal: 20, gap: 12 },

  // Hero
  heroCard:    { borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  heroGradient:{ padding: 24, alignItems: "center", gap: 12, position: "relative" },
  glowRing:    {
    position: "absolute", borderRadius: 1000, borderWidth: 1,
    top: "50%", left: "50%", marginLeft: -110, marginTop: -110,
  },
  tierPillTop: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
    zIndex: 1,
  },
  tierDot:     { width: 6, height: 6, borderRadius: 3 },
  tierPillText:{ fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.5 },
  characterWrap: { alignItems: "center", zIndex: 1 },
  characterName: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary, letterSpacing: -0.3, zIndex: 1 },
  outfitLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, zIndex: 1 },

  heroStats:   { flexDirection: "row", width: "100%", zIndex: 1, marginTop: 4 },
  heroStat:    { flex: 1, alignItems: "center", gap: 3 },
  heroStatValue: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  heroStatLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, letterSpacing: 0.5 },
  heroStatDivider: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  // Tier card
  tierCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.bgCard, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: Colors.border, gap: 16,
  },
  tierCardLeft: { flex: 1, gap: 5 },
  tierCardLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  tierCardName: { fontFamily: "Inter_700Bold", fontSize: 28, letterSpacing: -1 },
  tierCardDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  tierCardRight: { alignItems: "center" },
  tierScoreRing: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 2,
    alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgElevated,
  },
  tierScoreNum: { fontFamily: "Inter_700Bold", fontSize: 22 },
  tierScoreLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted },

  // Tier progress bar
  tierBarWrap: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  tierBarItem: { alignItems: "center", gap: 5 },
  tierBarDot:  { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  tierBarLabel: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted },

  // Section header
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 4,
  },
  sectionHeaderText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 2 },

  // Dimensions grid
  dimsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  // Room card
  roomCard:     { backgroundColor: Colors.bgCard, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },
  roomGradient: { height: 130 },
  roomScene:    { flex: 1, position: "relative" },
  roomWall:     { position: "absolute", top: 0, left: 0, right: 0, height: 90, backgroundColor: "#0E0E20" },
  roomFloor:    { position: "absolute", bottom: 0, left: 0, right: 0, height: 40, backgroundColor: "#0A0A16" },
  roomWindow:   {
    position: "absolute", top: 15, right: 24, width: 50, height: 55,
    backgroundColor: "#1A1A35", borderRadius: 4, borderWidth: 1, borderColor: "#2A2A45",
    overflow: "hidden",
  },
  roomWindowPane: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#0D1525" },
  roomWindowCross: { position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, backgroundColor: "#2A2A45", marginLeft: -0.5 },
  roomWindowCrossH: { position: "absolute", left: 0, right: 0, top: "50%", height: 1, backgroundColor: "#2A2A45", marginTop: -0.5 },
  roomDesk:     {
    position: "absolute", bottom: 38, left: 20, width: 80, height: 10,
    backgroundColor: "#2A1A0A", borderRadius: 3,
  },
  roomDeskLeg:  { position: "absolute", bottom: 28, left: 25, width: 8, height: 12, backgroundColor: "#2A1A0A", borderRadius: 2 },
  roomLamp:     { position: "absolute", bottom: 38, left: 130, width: 4, height: 36, backgroundColor: "#353545", borderRadius: 2 },
  roomLampHead: { position: "absolute", bottom: 70, left: 120, width: 22, height: 12, backgroundColor: "#3A3A50", borderRadius: 8, borderTopLeftRadius: 2 },

  roomInfo:     { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  roomName:     { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  roomDesc:     { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  roomBtn:      {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.accentGlow, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.accentDim,
  },
  roomBtnText:  { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.accent },
  roomHintRow:  { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  roomHintText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, flex: 1 },

  // Evolution hint
  evolutionCard: {
    backgroundColor: Colors.accentGlow, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.accentDim, gap: 12,
  },
  evolutionHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  evolutionIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.accent + "20", alignItems: "center", justifyContent: "center",
  },
  evolutionLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },
  evolutionDimension: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.accent },
  evolutionHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  evolutionAction: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: Colors.bgCard, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  evolutionActionText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.accent },

  // Quick actions
  quickActions: { flexDirection: "row", gap: 10 },
  quickActionBtn: {
    flex: 1, alignItems: "center", gap: 8,
    backgroundColor: Colors.bgCard, borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  quickActionIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center",
  },
  quickActionLabel: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textSecondary, textAlign: "center" },

  // Coming soon
  comingSoonCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border, borderStyle: "dashed",
  },
  comingSoonTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textMuted },
  comingSoonDesc:  { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  comingSoonPill:  { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.bgElevated, borderRadius: 10 },
  comingSoonPillText: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },
});

// ─── Phase 28 — Evolution Explanation Styles ──────────────────────────────────

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

const evolStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 18, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  sourcePill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minWidth: 70, alignItems: "center", flexShrink: 0 },
  sourceText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2 },
  text: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 19 },
});

const dimStyles = StyleSheet.create({
  card: {
    width: "48.5%" as any,
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconWrap:    { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  score:       { fontFamily: "Inter_700Bold", fontSize: 22 },
  name:        { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5 },
  barBg:       { height: 4, backgroundColor: Colors.bgElevated, borderRadius: 2 },
  barFill:     { height: 4, borderRadius: 2 },
  label:       { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  description: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textSecondary, lineHeight: 16 },
});

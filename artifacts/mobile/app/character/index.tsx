import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, RefreshControl,
  Modal, TouchableOpacity, Animated as RNAnimated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn, FadeInDown, FadeOut, SlideInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Rect, Path, G, Line } from "react-native-svg";
import { Colors } from "@/constants/colors";
import { LoadingScreen, Button } from "@/design-system";
import { useAuth } from "@/context/AuthContext";
import { useCharacterStatus, useUpdateCharacterAppearance } from "@/hooks/useApi";
import type { DimensionLevel, DimensionDetail, CharacterVisualState } from "@/lib/characterEngine";
import { computeCharacterState } from "@/lib/characterEngine";
import { CharacterRenderer } from "@/components/character";

const PREMIUM_BG = "#07071A";

// ─── Phase 29 — Wearable State Types ──────────────────────────────────────────

export type WearableTop = { id: string; slug: string; name: string; outfitTierOverride: number | null; styleEffect: string | null; colorVariant?: string } | null;
export type WearableWatch = { id: string; slug: string; name: string; watchStyle: "basic" | "refined" | "elite"; styleEffect: string | null; colorVariant?: string } | null;
export type WearableAccessory = { id: string; slug: string; name: string; accessoryStyle: "chain" | "pin" | "ring"; styleEffect: string | null; colorVariant?: string } | null;
export type WearableOuterwear = { id: string; slug: string; name: string; rarity?: string; colorVariant?: string } | null;
export type WearableBottom = { id: string; slug: string; name: string; colorVariant?: string } | null;
export type EquippedWearableState = { top: WearableTop; watch: WearableWatch; accessory: WearableAccessory; outerwear?: WearableOuterwear; bottom?: WearableBottom } | null;

// ─── Phase 28 — Visual State Types ────────────────────────────────────────────

export type VisualState = {
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

// ─── Phase 32 — Appearance color maps ─────────────────────────────────────────

const SKIN_TONE_COLORS: Record<string, [string, string]> = {
  "tone-1": ["#FDDCB5", "#EDCB9A"],
  "tone-2": ["#EDB98A", "#D49F70"],
  "tone-3": ["#C8956C", "#B07E58"],
  "tone-4": ["#8B5E3C", "#7A4E2E"],
  "tone-5": ["#5C3317", "#4A2510"],
};

const HAIR_COLOR_HEX: Record<string, string> = {
  "black":         "#141414",
  "dark-brown":    "#2C1A0E",
  "medium-brown":  "#5C3A1E",
  "light-brown":   "#8B5E3C",
  "dirty-blonde":  "#BF9B5A",
  "blonde":        "#E8D090",
  "auburn":        "#7B3F20",
  "platinum":      "#DCDCDC",
};

const SKIN_TONE_DISPLAY: { key: string; label: string }[] = [
  { key: "tone-1", label: "Ivory"  },
  { key: "tone-2", label: "Fair"   },
  { key: "tone-3", label: "Medium" },
  { key: "tone-4", label: "Brown"  },
  { key: "tone-5", label: "Deep"   },
];

const HAIR_STYLE_MALE_DISPLAY: { key: string; label: string }[] = [
  { key: "clean_cut",      label: "Clean Cut"   },
  { key: "side_part",      label: "Side Part"   },
  { key: "textured_crop",  label: "Textured"    },
  { key: "buzz_cut",       label: "Buzz"        },
  { key: "medium_natural", label: "Natural"     },
  { key: "slicked_back",   label: "Slicked"     },
];

const HAIR_STYLE_FEMALE_DISPLAY: { key: string; label: string }[] = [
  { key: "short_bob",       label: "Bob"       },
  { key: "side_part_long",  label: "Side Part" },
  { key: "textured_pixie",  label: "Pixie"     },
  { key: "ponytail_sleek",  label: "Ponytail"  },
  { key: "natural_medium",  label: "Natural"   },
  { key: "bun_top",         label: "Bun"       },
];

const HAIR_STYLE_DISPLAY: { key: string; label: string }[] = HAIR_STYLE_MALE_DISPLAY;

const BODY_TYPE_DISPLAY: { key: string; label: string; icon: string }[] = [
  { key: "male",   label: "Male",   icon: "man-outline"   },
  { key: "female", label: "Female", icon: "woman-outline" },
];

const HAIR_COLOR_DISPLAY: { key: string; label: string }[] = [
  { key: "black",         label: "Black"     },
  { key: "dark-brown",    label: "Dk Brown"  },
  { key: "medium-brown",  label: "Brown"     },
  { key: "light-brown",   label: "Lt Brown"  },
  { key: "dirty-blonde",  label: "Blonde"    },
  { key: "blonde",        label: "Platinum"  },
  { key: "auburn",        label: "Auburn"    },
  { key: "platinum",      label: "Silver"    },
];

// Outfit per tier
const OC = [
  { s: "#EEEEEE", ss: "#E4E4E4", p: "#1A1A2E", ps: "#20203A", seam: "#1C1C30", cr: "#151528", belt: "#3A3A52", bk: "#52526A", bk2: "#6A6A80", btn: true,  col: false },
  { s: "#F0F0F2", ss: "#E6E6E8", p: "#181928", ps: "#1E1E36", seam: "#1A1A2C", cr: "#131326", belt: "#3C3C54", bk: "#545470", bk2: "#686882", btn: true,  col: false },
  { s: "#C8C8D5", ss: "#BCBCC8", p: "#151525", ps: "#1C1C32", seam: "#121222", cr: "#0F0F1E", belt: "#484858", bk: "#606078", bk2: "#747492", btn: false, col: true  },
  { s: "#4A4A56", ss: "#42424E", p: "#111120", ps: "#17172C", seam: "#0E0E1A", cr: "#0B0B16", belt: "#504858", bk: "#6A6070", bk2: "#888096", btn: false, col: true  },
  { s: "#1E1E2A", ss: "#1A1A22", p: "#0A0A14", ps: "#10101E", seam: "#07070F", cr: "#05050C", belt: "#4A3E52", bk: "#786A82", bk2: "#C0A030", btn: false, col: true  },
];

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

// ─── Hair Layer Renderer ───────────────────────────────────────────────────────

function HairLayer({ style, color, hCY, hsRx, hsRy, hcRy }: {
  style: string; color: string;
  hCY: number; hsRx: number; hsRy: number; hcRy: number;
}) {
  const shade = "#00000040";
  if (style === "bald") return null;

  if (style === "natural") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 20} rx="22" ry="18" fill={color} />
        <Rect x="28" y={hCY - 20} width="44" height="18" fill={color} />
        <Ellipse cx="29" cy={hCY - 9} rx="5.5" ry="13" fill={color} />
        <Ellipse cx="71" cy={hCY - 9} rx="5.5" ry="13" fill={color} />
        <Path d={`M34 ${hCY - 22} Q50 ${hCY - 28} 66 ${hCY - 22}`} stroke={shade} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </G>
    );
  }
  if (style === "waves") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 16} rx="20" ry={hcRy} fill={color} />
        <Rect x="30" y={hCY - 16} width="40" height="14" fill={color} />
        <Ellipse cx="31" cy={hCY - 8} rx={hsRx} ry={hsRy} fill={color} />
        <Ellipse cx="69" cy={hCY - 8} rx={hsRx} ry={hsRy} fill={color} />
        <Path d={`M35 ${hCY - 19} Q41 ${hCY - 23} 47 ${hCY - 19} Q53 ${hCY - 15} 59 ${hCY - 19} Q65 ${hCY - 23} 67 ${hCY - 19}`} stroke={shade} strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <Path d={`M36 ${hCY - 15} Q42 ${hCY - 19} 48 ${hCY - 15} Q54 ${hCY - 11} 60 ${hCY - 15}`} stroke={shade} strokeWidth="0.9" fill="none" strokeLinecap="round" />
      </G>
    );
  }
  if (style === "caesar") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 15} rx="20" ry="11" fill={color} />
        <Rect x="30" y={hCY - 15} width="40" height="13" fill={color} />
        <Ellipse cx="50" cy={hCY - 20} rx="19" ry="5.5" fill={color} />
        <Ellipse cx="31" cy={hCY - 8} rx="3" ry="7" fill={color} />
        <Ellipse cx="69" cy={hCY - 8} rx="3" ry="7" fill={color} />
        <Path d={`M31 ${hCY - 20} Q50 ${hCY - 25} 69 ${hCY - 20}`} fill={color} />
        <Path d={`M33 ${hCY - 22} Q50 ${hCY - 26} 67 ${hCY - 22}`} stroke={shade} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      </G>
    );
  }
  if (style === "low-fade") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 16} rx="20" ry={hcRy} fill={color} />
        <Rect x="30" y={hCY - 16} width="40" height="14" fill={color} />
        <Ellipse cx="31" cy={hCY - 8} rx={Math.min(hsRx, 3)} ry={Math.min(hsRy, 6)} fill={color} />
        <Ellipse cx="69" cy={hCY - 8} rx={Math.min(hsRx, 3)} ry={Math.min(hsRy, 6)} fill={color} />
        <Path d={`M38 ${hCY - 20} Q50 ${hCY - 24} 62 ${hCY - 20}`} stroke={shade} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <Path d={`M36 ${hCY - 16} Q50 ${hCY - 21} 64 ${hCY - 16}`} stroke={shade} strokeWidth="1" fill="none" strokeLinecap="round" />
      </G>
    );
  }
  return (
    <G>
      <Ellipse cx="50" cy={hCY - 16} rx="20" ry={hcRy} fill={color} />
      <Rect x="30" y={hCY - 16} width="40" height="14" fill={color} />
      <Ellipse cx="31" cy={hCY - 8} rx={hsRx} ry={hsRy} fill={color} />
      <Ellipse cx="69" cy={hCY - 8} rx={hsRx} ry={hsRy} fill={color} />
      <Path d={`M38 ${hCY - 20} Q50 ${hCY - 24} 62 ${hCY - 20}`} stroke={shade} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Path d={`M36 ${hCY - 16} Q50 ${hCY - 21} 64 ${hCY - 16}`} stroke={shade} strokeWidth="1" fill="none" strokeLinecap="round" />
    </G>
  );
}

// ─── Hair Style Mini Preview SVG ──────────────────────────────────────────────

function HairStylePreview({ style, color, size = 44 }: { style: string; color: string; size?: number }) {
  const shade = "#00000050";
  const headFill = "#C8956C";
  const cx = 20; const cy = 20; const r = 12;
  const hTop = cy - r - 3;
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Ellipse cx={cx} cy={cy + 2} rx={r} ry={r + 1} fill={headFill} />
      {style === "natural" && (
        <G>
          <Ellipse cx={cx} cy={hTop - 2} rx="12" ry="9" fill={color} />
          <Rect x={cx - 12} y={hTop - 2} width="24" height="9" fill={color} />
          <Ellipse cx={cx - 11} cy={hTop + 5} rx="3.5" ry="7" fill={color} />
          <Ellipse cx={cx + 11} cy={hTop + 5} rx="3.5" ry="7" fill={color} />
          <Path d={`M9 ${hTop - 2} Q20 ${hTop - 7} 31 ${hTop - 2}`} stroke={shade} strokeWidth="1" fill="none" strokeLinecap="round" />
        </G>
      )}
      {style === "waves" && (
        <G>
          <Ellipse cx={cx} cy={hTop} rx="11" ry="7" fill={color} />
          <Rect x={cx - 11} y={hTop} width="22" height="7" fill={color} />
          <Ellipse cx={cx - 10} cy={hTop + 5} rx="3" ry="5" fill={color} />
          <Ellipse cx={cx + 10} cy={hTop + 5} rx="3" ry="5" fill={color} />
          <Path d={`M10 ${hTop - 2} Q14 ${hTop - 6} 18 ${hTop - 2} Q22 ${hTop + 2} 26 ${hTop - 2} Q30 ${hTop - 6} 31 ${hTop - 2}`} stroke={shade} strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </G>
      )}
      {style === "caesar" && (
        <G>
          <Ellipse cx={cx} cy={hTop} rx="11" ry="6" fill={color} />
          <Rect x={cx - 11} y={hTop} width="22" height="7" fill={color} />
          <Ellipse cx={cx} cy={hTop - 3} rx="10" ry="3.5" fill={color} />
          <Ellipse cx={cx - 10} cy={hTop + 5} rx="2" ry="5" fill={color} />
          <Ellipse cx={cx + 10} cy={hTop + 5} rx="2" ry="5" fill={color} />
          <Path d={`M10 ${hTop - 2} Q20 ${hTop - 7} 30 ${hTop - 2}`} stroke={shade} strokeWidth="1" fill="none" strokeLinecap="round" />
        </G>
      )}
      {style === "low-fade" && (
        <G>
          <Ellipse cx={cx} cy={hTop} rx="11" ry="7" fill={color} />
          <Rect x={cx - 11} y={hTop} width="22" height="7" fill={color} />
          <Ellipse cx={cx - 10} cy={hTop + 5} rx="2" ry="4" fill={color} />
          <Ellipse cx={cx + 10} cy={hTop + 5} rx="2" ry="4" fill={color} />
          <Path d={`M12 ${hTop - 3} Q20 ${hTop - 7} 28 ${hTop - 3}`} stroke={shade} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </G>
      )}
      {(style === "taper" || (!["natural","waves","caesar","low-fade","bald"].includes(style))) && (
        <G>
          <Ellipse cx={cx} cy={hTop} rx="11" ry="7" fill={color} />
          <Rect x={cx - 11} y={hTop} width="22" height="7" fill={color} />
          <Ellipse cx={cx - 10} cy={hTop + 5} rx="2.5" ry="5.5" fill={color} />
          <Ellipse cx={cx + 10} cy={hTop + 5} rx="2.5" ry="5.5" fill={color} />
          <Path d={`M13 ${hTop - 3} Q20 ${hTop - 7} 27 ${hTop - 3}`} stroke={shade} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </G>
      )}
      {style === "bald" && (
        <Ellipse cx={cx} cy={hTop + 1} rx="11.5" ry="5" fill={headFill} opacity="0.25" />
      )}
    </Svg>
  );
}

// ─── Evolved Character Renderer ───────────────────────────────────────────────

export function EvolvedCharacter({
  visualState,
  equippedWearables,
  skinTone = "tone-3",
  bodyType = "male",
  hairStyle = "clean_cut",
  hairColor = "black",
  size = 190,
}: {
  visualState?: VisualState | null;
  equippedWearables?: EquippedWearableState;
  skinTone?: string;
  bodyType?: string;
  hairStyle?: string;
  hairColor?: string;
  size?: number;
}) {
  const v = visualState ?? DEFAULT_VS;
  const effectiveOutfitTier = equippedWearables?.top?.outfitTierOverride != null
    ? equippedWearables.top.outfitTierOverride
    : v.outfitTier;
  const watchStyle: "basic" | "refined" | "elite" = equippedWearables?.watch?.watchStyle ?? "basic";
  const accessoryStyle: "chain" | "pin" | "ring" | null = equippedWearables?.accessory?.accessoryStyle ?? null;
  const oc = OC[Math.min(effectiveOutfitTier, 4)];

  const [skin, skinS] = SKIN_TONE_COLORS[skinTone] ?? SKIN_TONE_COLORS["tone-3"];
  const hairFill = HAIR_COLOR_HEX[hairColor] ?? "#141414";

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
      {(() => {
        const bottomHex = equippedWearables?.bottom?.colorVariant;
        const pFill = bottomHex ?? oc.p;
        const psFill = bottomHex ? bottomHex + "CC" : oc.ps;
        const seamFill = bottomHex ? bottomHex + "88" : oc.seam;
        const crFill = bottomHex ? "#00000015" : oc.cr;
        return (
          <G>
            <Rect x="26" y="118" width="21" height="80" rx="4" fill={pFill} />
            <Rect x="53" y="118" width="21" height="80" rx="4" fill={pFill} />
            <Rect x="46" y="118" width="8"  height="80" rx="0" fill={seamFill} />
            {oc.btn && (
              <>
                <Rect x="28" y="122" width="11" height="8" rx="2" fill={psFill} />
                <Rect x="61" y="122" width="11" height="8" rx="2" fill={psFill} />
              </>
            )}
            <Rect x="35" y="140" width="1.5" height="50" rx="0.75" fill={crFill} />
            <Rect x="63" y="140" width="1.5" height="50" rx="0.75" fill={crFill} />
          </G>
        );
      })()}
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
      <Ellipse cx={aLX + 2}      cy="106" rx="3" ry="2.5" fill={skinS} />
      <Ellipse cx={aRX + aW - 2} cy="106" rx="3" ry="2.5" fill={skinS} />
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
      {equippedWearables?.outerwear && (
        <G opacity={0.92}>
          <Rect x={tX - 2} y="50" width={tW + 4} height="68" rx="7" fill={equippedWearables.outerwear.colorVariant ?? "#36363C"} />
          <Rect x={aLX - 1} y="52" width={aW + 2} height="52" rx="9" fill={equippedWearables.outerwear.colorVariant ?? "#36363C"} />
          <Rect x={aRX - 1} y="52" width={aW + 2} height="52" rx="9" fill={equippedWearables.outerwear.colorVariant ?? "#36363C"} />
          <Line x1="50" y1="54" x2="50" y2="118" stroke="#00000018" strokeWidth="1.5" />
          <Path d={`M${tX + 10} 50 L50 62 L${tX + tW - 10} 50`} stroke="#00000020" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </G>
      )}
      {equippedWearables?.accessory?.accessoryStyle === "ring" && (
        <G>
          <Ellipse cx={aLX + aW / 2} cy="104" rx="4" ry="2.5" fill={equippedWearables.accessory.colorVariant ?? "#8A8A8A"} opacity={0.85} />
          <Ellipse cx={aLX + aW / 2} cy="104" rx="3" ry="1.8" fill={equippedWearables.accessory.colorVariant ?? "#8A8A8A"} opacity={0.5} />
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
      <Path d={mouth} stroke="#6A3A2A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {hairStyle !== "bald" && v.grooming >= 1 && (
        <G>
          <Path d={`M30 ${hCY - 14} Q31 ${hCY - 8} 32 ${hCY - 2}`}  stroke="#00000030" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <Path d={`M70 ${hCY - 14} Q69 ${hCY - 8} 68 ${hCY - 2}`}  stroke="#00000030" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </G>
      )}
      {hairStyle !== "bald" && v.grooming >= 2 && (
        <G>
          <Path d={`M32 ${hCY - 11} Q33 ${hCY - 4} 35 ${hCY + 1}`} stroke="#00000040" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <Path d={`M68 ${hCY - 11} Q67 ${hCY - 4} 65 ${hCY + 1}`} stroke="#00000040" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </G>
      )}
      <HairLayer
        style={hairStyle}
        color={hairFill}
        hCY={hCY}
        hsRx={hsRx}
        hsRy={hsRy}
        hcRy={hcRy}
      />
    </Svg>
  );
}

// ─── Score Display (editorial large number) ────────────────────────────────────

function ScoreDisplay({ score, tierName, tierColor }: { score: number; tierName: string; tierColor: string }) {
  return (
    <View style={scoreDisplayStyles.wrap}>
      <Text style={scoreDisplayStyles.number}>{score}</Text>
      <View style={scoreDisplayStyles.right}>
        <View style={[scoreDisplayStyles.tierBadge, { borderColor: tierColor + "50" }]}>
          <Text style={[scoreDisplayStyles.tierText, { color: tierColor }]}>{tierName}</Text>
        </View>
        <Text style={scoreDisplayStyles.label}>STATUS SCORE</Text>
      </View>
    </View>
  );
}

// ─── Section Label ────────────────────────────────────────────────────────────

function SectionLabel({
  label, linkLabel, onLinkPress,
}: {
  label: string; linkLabel?: string; onLinkPress?: () => void;
}) {
  return (
    <View style={sectionLabelStyles.row}>
      <Text style={sectionLabelStyles.label}>{label}</Text>
      {linkLabel && onLinkPress && (
        <Pressable onPress={onLinkPress} style={sectionLabelStyles.link}>
          <Text style={sectionLabelStyles.linkText}>{linkLabel}</Text>
          <Ionicons name="chevron-forward" size={10} color={Colors.accent} />
        </Pressable>
      )}
    </View>
  );
}

const sectionLabelStyles = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", marginBottom: 10, marginTop: 2 },
  label:    { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.8, flex: 1 },
  link:     { flexDirection: "row", alignItems: "center", gap: 2 },
  linkText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.accent },
});

const scoreDisplayStyles = StyleSheet.create({
  wrap:      { flexDirection: "row", alignItems: "center", gap: 16, paddingTop: 4 },
  number:    { fontFamily: "Inter_700Bold", fontSize: 52, color: Colors.textPrimary, letterSpacing: -2 },
  right:     { gap: 6, justifyContent: "center" },
  tierBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, alignSelf: "flex-start" },
  tierText:  { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 0.8 },
  label:     { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5 },
});

// ─── Premium Dimension Row ─────────────────────────────────────────────────────

function PremiumDimensionRow({ dim, badge, delay = 0, onPress }: {
  dim: DimensionLevel;
  badge?: "LOWEST" | "TOP";
  delay?: number;
  onPress?: () => void;
}) {
  const barAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      RNAnimated.timing(barAnim, {
        toValue: dim.progressPct / 100,
        duration: 700,
        useNativeDriver: false,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      }).start();
    }, delay + 100);
    return () => clearTimeout(timer);
  }, [dim.progressPct]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", `${dim.progressPct}%`],
  });

  return (
    <Pressable onPress={onPress}>
      <Animated.View entering={FadeInDown.delay(delay).duration(350)} style={dimRowStyles.row}>
        <View style={dimRowStyles.iconWrap}>
          <Ionicons name={dim.icon as any} size={17} color={Colors.textSecondary} />
        </View>

        <View style={dimRowStyles.center}>
          <View style={dimRowStyles.nameRow}>
            <Text style={dimRowStyles.name}>{dim.label}</Text>
            {badge && (
              <View style={[dimRowStyles.badge, { backgroundColor: Colors.bgElevated, borderColor: Colors.border }]}>
                <Text style={[dimRowStyles.badgeText, {
                  color: badge === "LOWEST" ? Colors.textSecondary : Colors.textMuted,
                }]}>
                  {badge === "LOWEST" ? "FOCUS" : "PEAK"}
                </Text>
              </View>
            )}
          </View>

          <View style={dimRowStyles.barBg}>
            <RNAnimated.View
              style={[
                dimRowStyles.barFill,
                { width: barWidth, backgroundColor: Colors.accent },
              ]}
            />
          </View>

          <Text style={dimRowStyles.xpText}>{dim.totalXp} XP · {dim.progressPct}%</Text>
        </View>

        <View style={dimRowStyles.right}>
          <Text style={dimRowStyles.levelNum}>{dim.level}</Text>
          <Text style={dimRowStyles.levelLabel}>LVL</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Character Customization Bottom Sheet ─────────────────────────────────────

function CharacterCustomizeSheet({
  visible,
  onClose,
  currentSkinTone,
  currentBodyType,
  currentHairStyle,
  currentHairColor,
  visualState,
  equippedWearables,
  characterVisualState,
  onSave,
  isSaving,
}: {
  visible: boolean;
  onClose: () => void;
  currentSkinTone: string;
  currentBodyType: string;
  currentHairStyle: string;
  currentHairColor: string;
  visualState: VisualState | null;
  equippedWearables: EquippedWearableState;
  characterVisualState: CharacterVisualState | null;
  onSave: (skinTone: string, bodyType: string, hairStyle: string, hairColor: string) => void;
  isSaving: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [skinTone,  setSkinTone]  = useState(currentSkinTone);
  const [bodyType,  setBodyType]  = useState(currentBodyType);
  const [hairStyle, setHairStyle] = useState(currentHairStyle);
  const [hairColor, setHairColor] = useState(currentHairColor);

  React.useEffect(() => {
    if (visible) {
      setSkinTone(currentSkinTone);
      setBodyType(currentBodyType);
      setHairStyle(currentHairStyle);
      setHairColor(currentHairColor);
    }
  }, [visible, currentSkinTone, currentBodyType, currentHairStyle, currentHairColor]);

  const activeHairStyles = bodyType === "female" ? HAIR_STYLE_FEMALE_DISPLAY : HAIR_STYLE_MALE_DISPLAY;

  const hasChanges =
    skinTone !== currentSkinTone ||
    bodyType !== currentBodyType ||
    hairStyle !== currentHairStyle ||
    hairColor !== currentHairColor;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View entering={SlideInDown.springify().damping(18)} style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>

        <View style={sheetStyles.handle} />

        <View style={sheetStyles.header}>
          <View>
            <Text style={sheetStyles.headerEyebrow}>APPEARANCE</Text>
            <Text style={sheetStyles.headerTitle}>Customize</Text>
          </View>
          <Pressable style={sheetStyles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>

        <View style={sheetStyles.previewWrap}>
          {characterVisualState ? (
            <CharacterRenderer
              visualState={{ ...characterVisualState, skinTone, bodyType: bodyType as any, hairStyle, hairColor }}
              size="medium"
              showShadow={false}
            />
          ) : (
            <EvolvedCharacter
              visualState={visualState}
              equippedWearables={equippedWearables}
              skinTone={skinTone}
              bodyType={bodyType}
              hairStyle={hairStyle}
              hairColor={hairColor}
              size={160}
            />
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>

          <View style={sheetStyles.sectionRow}>
            <View style={sheetStyles.sectionAccent} />
            <Text style={sheetStyles.sectionLabel}>BODY TYPE</Text>
          </View>
          <View style={sheetStyles.swatchRow}>
            {BODY_TYPE_DISPLAY.map((bt) => {
              const active = bodyType === bt.key;
              return (
                <Pressable
                  key={bt.key}
                  style={[sheetStyles.swatchItem, active && { opacity: 1 }]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setBodyType(bt.key);
                    const newStyles = bt.key === "female" ? HAIR_STYLE_FEMALE_DISPLAY : HAIR_STYLE_MALE_DISPLAY;
                    if (!newStyles.find(s => s.key === hairStyle)) {
                      setHairStyle(newStyles[0].key);
                    }
                  }}
                >
                  <View style={[
                    sheetStyles.swatchCircle,
                    { backgroundColor: Colors.bgElevated },
                    active && { borderColor: Colors.accent, borderWidth: 2.5, shadowColor: Colors.accent, shadowRadius: 6, shadowOpacity: 0.35, shadowOffset: { width: 0, height: 0 } },
                  ]}>
                    <Ionicons name={bt.icon as any} size={18} color={active ? Colors.accent : Colors.textMuted} />
                  </View>
                  <Text style={[sheetStyles.swatchLabel, active && { color: Colors.textPrimary }]}>
                    {bt.label}
                  </Text>
                  {active && <View style={sheetStyles.swatchCheck}><Ionicons name="checkmark" size={10} color={Colors.textOnAccent} /></View>}
                </Pressable>
              );
            })}
          </View>

          <View style={sheetStyles.sectionRow}>
            <View style={sheetStyles.sectionAccent} />
            <Text style={sheetStyles.sectionLabel}>SKIN TONE</Text>
          </View>
          <View style={sheetStyles.swatchRow}>
            {SKIN_TONE_DISPLAY.map((s) => {
              const [bg] = SKIN_TONE_COLORS[s.key] ?? ["#C8956C"];
              const active = skinTone === s.key;
              return (
                <Pressable
                  key={s.key}
                  style={[sheetStyles.swatchItem, active && { opacity: 1 }]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setSkinTone(s.key); }}
                >
                  <View style={[
                    sheetStyles.swatchCircle,
                    { backgroundColor: bg },
                    active && { borderColor: "#FFFFFF", borderWidth: 2.5, shadowColor: bg, shadowRadius: 8, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 } },
                  ]} />
                  <Text style={[sheetStyles.swatchLabel, active && { color: Colors.textPrimary }]}>
                    {s.label}
                  </Text>
                  {active && <View style={sheetStyles.swatchCheck}><Ionicons name="checkmark" size={10} color={Colors.textOnAccent} /></View>}
                </Pressable>
              );
            })}
          </View>

          <View style={sheetStyles.sectionRow}>
            <View style={sheetStyles.sectionAccent} />
            <Text style={sheetStyles.sectionLabel}>HAIR STYLE</Text>
          </View>
          <View style={sheetStyles.styleGrid}>
            {activeHairStyles.map((s) => {
              const active = hairStyle === s.key;
              const previewColor = HAIR_COLOR_HEX[hairColor] ?? "#3B2314";
              return (
                <Pressable
                  key={s.key}
                  style={[sheetStyles.styleCard, active && sheetStyles.styleCardActive]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setHairStyle(s.key); }}
                >
                  <View style={[sheetStyles.styleIconWrap, active && { backgroundColor: Colors.accent + "30" }]}>
                    <HairStylePreview style={s.key} color={previewColor} size={44} />
                  </View>
                  <Text style={[sheetStyles.styleCardLabel, active && { color: Colors.accent }]}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={sheetStyles.sectionRow}>
            <View style={sheetStyles.sectionAccent} />
            <Text style={sheetStyles.sectionLabel}>HAIR COLOR</Text>
          </View>
          <View style={sheetStyles.colorGrid}>
            {HAIR_COLOR_DISPLAY.map((c) => {
              const hex = HAIR_COLOR_HEX[c.key] ?? "#141414";
              const active = hairColor === c.key;
              return (
                <Pressable
                  key={c.key}
                  style={sheetStyles.colorItem}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setHairColor(c.key); }}
                >
                  <View style={[
                    sheetStyles.colorCircle,
                    { backgroundColor: hex },
                    active && { borderColor: Colors.accent, borderWidth: 2.5, shadowColor: Colors.accent, shadowRadius: 6, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 0 } },
                    c.key === "platinum" && !active && { borderWidth: 1.5, borderColor: Colors.border },
                  ]} />
                  <Text style={[sheetStyles.colorLabel, active && { color: Colors.textPrimary }]}>
                    {c.label}
                  </Text>
                  {active && <View style={sheetStyles.colorCheck}><Ionicons name="checkmark" size={10} color={Colors.textOnAccent} /></View>}
                </Pressable>
              );
            })}
          </View>

        </ScrollView>

        <View style={sheetStyles.saveRow}>
          <Button
            label={isSaving ? "Saving…" : hasChanges ? "Save Look" : "No Changes"}
            onPress={() => {
              if (!hasChanges || isSaving) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              onSave(skinTone, bodyType, hairStyle, hairColor);
            }}
            variant="primary"
            fullWidth
            disabled={!hasChanges || isSaving}
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

// ─── Dimension Detail Bottom Sheet ──────────────────────────────────────────────

function DimensionDetailSheet({ visible, onClose, dim, detail }: {
  visible: boolean;
  onClose: () => void;
  dim: DimensionLevel | null;
  detail: DimensionDetail | null;
}) {
  const insets = useSafeAreaInsets();
  if (!dim) return null;

  const xpIntoLevel = dim.totalXp - dim.xpForCurrentLevel;
  const xpNeeded = dim.xpForNextLevel - dim.xpForCurrentLevel;
  const xpRemaining = dim.level >= 10 ? 0 : dim.xpForNextLevel - dim.totalXp;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={detailSheetStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View entering={SlideInDown.springify().damping(18)} style={[detailSheetStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={detailSheetStyles.handle} />

        <View style={detailSheetStyles.header}>
          <View style={[detailSheetStyles.dimIconWrap, { backgroundColor: dim.color + "18" }]}>
            <Ionicons name={dim.icon as any} size={22} color={dim.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={detailSheetStyles.dimName}>{dim.label}</Text>
            <Text style={[detailSheetStyles.dimLevel, { color: dim.color }]}>Level {dim.level} / 10</Text>
          </View>
          <Pressable style={detailSheetStyles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>

        <View style={detailSheetStyles.xpSection}>
          <View style={detailSheetStyles.xpBarBg}>
            <View style={[detailSheetStyles.xpBarFill, { width: `${dim.progressPct}%` as any, backgroundColor: dim.color }]} />
          </View>
          <View style={detailSheetStyles.xpRow}>
            <Text style={detailSheetStyles.xpText}>{dim.totalXp} XP total</Text>
            {dim.level < 10 && (
              <Text style={detailSheetStyles.xpRemaining}>{xpRemaining} XP to Lv {dim.level + 1}</Text>
            )}
            {dim.level >= 10 && (
              <Text style={[detailSheetStyles.xpRemaining, { color: Colors.gold }]}>MAX LEVEL</Text>
            )}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
          {detail?.improvementSources && detail.improvementSources.length > 0 && (
            <View style={detailSheetStyles.section}>
              <Text style={detailSheetStyles.sectionTitle}>WHAT IMPROVES THIS</Text>
              {detail.improvementSources.map((src, i) => (
                <View key={i} style={detailSheetStyles.sourceRow}>
                  <Ionicons name="add-circle-outline" size={14} color={dim.color} />
                  <Text style={detailSheetStyles.sourceText}>{src}</Text>
                </View>
              ))}
            </View>
          )}

          {detail?.holdingBack && detail.holdingBack.length > 0 && (
            <View style={detailSheetStyles.section}>
              <Text style={[detailSheetStyles.sectionTitle, { color: Colors.crimson }]}>HOLDING YOU BACK</Text>
              {detail.holdingBack.map((msg, i) => (
                <View key={i} style={detailSheetStyles.sourceRow}>
                  <Ionicons name="warning-outline" size={14} color={Colors.crimson} />
                  <Text style={[detailSheetStyles.sourceText, { color: Colors.crimson }]}>{msg}</Text>
                </View>
              ))}
            </View>
          )}

          {detail?.recentEvents && detail.recentEvents.length > 0 && (
            <View style={detailSheetStyles.section}>
              <Text style={detailSheetStyles.sectionTitle}>RECENT XP</Text>
              {detail.recentEvents.map((ev, i) => (
                <View key={i} style={detailSheetStyles.eventRow}>
                  <Text style={[detailSheetStyles.eventXp, { color: dim.color }]}>+{ev.xpAmount}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={detailSheetStyles.eventDesc} numberOfLines={2}>{ev.description}</Text>
                    <Text style={detailSheetStyles.eventTime}>
                      {new Date(ev.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {(!detail?.recentEvents || detail.recentEvents.length === 0) && (
            <View style={detailSheetStyles.section}>
              <Text style={detailSheetStyles.sectionTitle}>RECENT XP</Text>
              <Text style={detailSheetStyles.emptyText}>No recent activity in this dimension.</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ─── Tier Celebration Overlay ────────────────────────────────────────────────────

function TierCelebration({ tier, color, visible }: { tier: string; color: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(800)}
      exiting={FadeOut.duration(800)}
      style={celebrationStyles.overlay}
    >
      <Animated.View entering={FadeInUp.delay(200).duration(800)} style={celebrationStyles.content}>
        <View
          style={[celebrationStyles.glow, { backgroundColor: color + "20" }]}
        />
        <Text style={[celebrationStyles.label, { color }]}>TIER UP</Text>
        <Text style={[celebrationStyles.tierName, { color }]}>{tier}</Text>
        <Text style={celebrationStyles.sub}>Your character is evolving</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Equipped Style Row ────────────────────────────────────────────────────────

const SLOT_ICONS: Record<string, any> = { watch: "watch-outline", top: "shirt-outline", outerwear: "cloudy-outline", bottom: "resize-outline", accessory: "diamond-outline" };
const SLOT_LABELS: Record<string, string> = { watch: "WATCH", top: "TOP", outerwear: "OUTER", bottom: "BOTTOM", accessory: "PIECE" };

function EquippedStyleRow({ equippedWearables }: { equippedWearables: any }) {
  const slots = ["watch", "top", "outerwear", "bottom", "accessory"] as const;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
      {slots.map((slot) => {
        const item = equippedWearables?.[slot] ?? null;
        return (
          <Pressable
            key={slot}
            style={({ pressed }) => ({
              width: 72,
              backgroundColor: Colors.bgCard,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: item ? Colors.accent + "50" : Colors.border,
              paddingVertical: 11,
              paddingHorizontal: 6,
              alignItems: "center",
              gap: 5,
              opacity: pressed ? 0.75 : 1,
              shadowColor: item ? Colors.accent : "transparent",
              shadowRadius: item ? 6 : 0,
              shadowOpacity: item ? 0.2 : 0,
              shadowOffset: { width: 0, height: 0 },
            })}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/wardrobe" as any); }}
          >
            <Ionicons name={SLOT_ICONS[slot]} size={17} color={item ? Colors.accent : Colors.textMuted} />
            <Text style={{ fontSize: 7, color: Colors.textMuted, fontFamily: "Inter_700Bold", letterSpacing: 0.8 }}>
              {SLOT_LABELS[slot]}
            </Text>
            {item ? (
              <Text style={{ fontSize: 8, color: Colors.textPrimary, fontFamily: "Inter_600SemiBold", textAlign: "center" }} numberOfLines={2}>
                {item.name}
              </Text>
            ) : (
              <Text style={{ fontSize: 8, color: Colors.textMuted, fontFamily: "Inter_400Regular", fontStyle: "italic" }}>None</Text>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function hasPrestigeWearable(equippedWearables: any): boolean {
  if (!equippedWearables) return false;
  const prestigeRarities = ["rare", "epic", "legendary"];
  for (const slot of Object.values(equippedWearables)) {
    if (slot && typeof slot === "object" && "rarity" in (slot as any)) {
      if (prestigeRarities.includes((slot as any).rarity)) return true;
    }
  }
  return false;
}

// ─── Tier constants ────────────────────────────────────────────────────────────

const TIER_ORDER = ["Starter", "Hustle", "Rising", "Refined", "Elite"];


// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CharacterStatusScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useCharacterStatus();
  const updateAppearance = useUpdateCharacterAppearance();

  const [showCustomize, setShowCustomize] = useState(false);
  const [selectedDim, setSelectedDim] = useState<DimensionLevel | null>(null);
  const [showDimDetail, setShowDimDetail] = useState(false);
  const [showTierCelebration, setShowTierCelebration] = useState(false);
  const prevTierRef = useRef<string | null>(null);

  const characterOpacity = useSharedValue(1);
  const prevCharOpacity = useSharedValue(0);
  const prevVisualStateRef = useRef<string | null>(null);
  const prevCharacterVS = useRef<CharacterVisualState | null>(null);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const botPad = insets.bottom + (Platform.OS === "web" ? 34 : 100);

  const de = data?.dimensionEngine;
  const dims: DimensionLevel[] = de?.dimensions ?? [];
  const deTier = de?.tier;
  const tierName = deTier?.tier ?? data?.statusTier ?? "Starter";
  const tierColor = deTier?.color ?? data?.statusTierColor ?? Colors.textMuted;
  const tierMessage = deTier?.message ?? "";
  const currentTierIdx = TIER_ORDER.indexOf(tierName);
  const deScore = de?.statusScore ?? data?.overallScore ?? 0;
  const nextEvolution = de?.nextEvolution ?? null;
  const dimensionDetails = de?.details ?? {};

  const charState = data ? computeCharacterState(data) : null;
  const characterVS: CharacterVisualState | null = charState?.visualState ?? null;

  let weakestIdx = -1;
  let strongestIdx = -1;
  if (dims.length > 0) {
    let minLevel = Infinity, maxLevel = -Infinity;
    dims.forEach((d, i) => {
      if (d.level < minLevel || (d.level === minLevel && d.totalXp < (dims[weakestIdx]?.totalXp ?? Infinity))) { minLevel = d.level; weakestIdx = i; }
      if (d.level > maxLevel || (d.level === maxLevel && d.totalXp > (dims[strongestIdx]?.totalXp ?? -1))) { maxLevel = d.level; strongestIdx = i; }
    });
  }

  useEffect(() => {
    if (!tierName || !prevTierRef.current) {
      prevTierRef.current = tierName;
      return;
    }
    const prevIdx = TIER_ORDER.indexOf(prevTierRef.current);
    const newIdx = TIER_ORDER.indexOf(tierName);
    let tierTimer: ReturnType<typeof setTimeout> | null = null;
    if (newIdx > prevIdx && prevIdx >= 0) {
      setShowTierCelebration(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      tierTimer = setTimeout(() => setShowTierCelebration(false), 2500);
    }
    prevTierRef.current = tierName;
    return () => { if (tierTimer) clearTimeout(tierTimer); };
  }, [tierName]);

  const vsKeyForFade = characterVS
    ? `${characterVS.postureStage}-${characterVS.outfitTier}-${characterVS.prestigeStage}-${characterVS.refinementStage}-${characterVS.skinTone}-${characterVS.hairStyle}-${characterVS.hairColor}-${characterVS.equippedTopStyle}-${characterVS.equippedWatchStyle}-${characterVS.equippedAccessoryStyle}-${characterVS.equippedOuterwearStyle}-${characterVS.outerwearColor}-${characterVS.bottomColor}-${characterVS.equippedBottomStyle}`
    : JSON.stringify(data?.visualState);
  const [fadingOutVS, setFadingOutVS] = useState<CharacterVisualState | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (prevVisualStateRef.current && prevVisualStateRef.current !== vsKeyForFade && prevCharacterVS.current) {
      setFadingOutVS(prevCharacterVS.current);
      prevCharOpacity.value = 1;
      prevCharOpacity.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) });
      characterOpacity.value = 0;
      characterOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
      timer = setTimeout(() => setFadingOutVS(null), 850);
    }
    prevVisualStateRef.current = vsKeyForFade;
    if (characterVS) prevCharacterVS.current = characterVS;
    return () => { if (timer) clearTimeout(timer); };
  }, [vsKeyForFade]);

  const characterAnimStyle = useAnimatedStyle(() => ({
    opacity: characterOpacity.value,
  }));
  const prevCharAnimStyle = useAnimatedStyle(() => ({
    opacity: prevCharOpacity.value,
    position: "absolute" as const,
  }));

  const appearance = (data as any)?.appearance;
  const currentSkinTone  = appearance?.skinTone  ?? "tone-3";
  const currentBodyType  = appearance?.bodyType  ?? "male";
  const currentHairStyle = appearance?.hairStyle ?? "clean_cut";
  const currentHairColor = appearance?.hairColor ?? "black";

  function handleSaveAppearance(skinTone: string, bodyType: string, hairStyle: string, hairColor: string) {
    updateAppearance.mutate({ skinTone, bodyType, hairStyle, hairColor }, {
      onSuccess: () => {
        setShowCustomize(false);
        refetch();
      },
    });
  }

  const handleDimPress = useCallback((dim: DimensionLevel) => {
    setSelectedDim(dim);
    setShowDimDetail(true);
    Haptics.selectionAsync().catch(() => {});
  }, []);

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
        <View style={styles.tierPillHeader}>
          <Text style={styles.tierPillHeaderText}>{tierName}</Text>
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
          <Animated.View entering={FadeInDown.duration(400)} style={styles.heroCard}>
            {/* Faint spotlight — one subtle radial glow, nothing animated */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute", top: 0, alignSelf: "center",
                width: 240, height: 240, borderRadius: 120,
                backgroundColor: Colors.accent + "08",
              }}
            />

            {/* Customize button */}
            <Pressable
              style={styles.customizeBtn}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setShowCustomize(true);
              }}
            >
              <Ionicons name="color-palette-outline" size={16} color={Colors.textSecondary} />
            </Pressable>

            {/* Character voxel — free rotation via drag */}
            <View style={styles.characterStageWrap}>
              <Animated.View style={[styles.characterWrap, characterAnimStyle]}>
                {characterVS && (
                  <CharacterRenderer visualState={characterVS} size="full" />
                )}
                <Pressable
                  style={{
                    position: "absolute", bottom: 0, right: 0,
                    width: 34, height: 34, borderRadius: 10,
                    backgroundColor: Colors.bgElevated + "CC",
                    borderWidth: 1, borderColor: Colors.border,
                    alignItems: "center", justifyContent: "center",
                  }}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    router.push("/wardrobe?tab=equipped" as any);
                  }}
                >
                  <Ionicons name="shirt-outline" size={16} color={Colors.accent} />
                </Pressable>
              </Animated.View>

            </View>

            {/* Identity */}
            <Text style={styles.characterName}>{user?.username ?? "Character"}</Text>
            {charState?.arcLabel && (
              <View style={styles.arcPill}>
                <Text style={styles.arcPillText}>
                  {charState.arcLabel.toUpperCase()}{charState.arcStageLabel ? " · " + charState.arcStageLabel.toUpperCase() : ""}
                </Text>
              </View>
            )}
            <Text style={styles.outfitLabel}>{data?.character?.outfitLabel ?? "Starter Kit"}</Text>

            {/* Score — large editorial number */}
            <ScoreDisplay score={deScore} tierColor={tierColor} tierName={tierName} />
          </Animated.View>

          {/* ── 2. STATUS + TIER CARD ── */}
          <Animated.View entering={FadeInDown.delay(50).duration(350)} style={styles.tierCard}>
            <View style={styles.tierCardTop}>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={styles.tierCardEyebrow}>CURRENT STATUS</Text>
                <Text style={styles.tierCardName}>{tierName}</Text>
                <Text style={styles.tierCardDesc}>
                  {tierMessage || data?.statusTierDescription || "Keep pushing. Your status is earned through consistent action."}
                </Text>
              </View>
              <View style={styles.statsCol}>
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatNum}>{data?.completedSessions ?? 0}</Text>
                  <Text style={styles.miniStatLabel}>Sessions</Text>
                </View>
                <View style={styles.miniStatDivider} />
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatNum}>{data?.badgeCount ?? 0}</Text>
                  <Text style={styles.miniStatLabel}>Badges</Text>
                </View>
                <View style={styles.miniStatDivider} />
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatNum}>{data?.totalSkillXp ? (data.totalSkillXp >= 1000 ? Math.floor(data.totalSkillXp / 1000) + "k" : String(data.totalSkillXp)) : "0"}</Text>
                  <Text style={styles.miniStatLabel}>XP</Text>
                </View>
              </View>
            </View>

            {/* Vertical Prestige Ladder */}
            <View style={styles.tierLadder}>
              {TIER_ORDER.map((tier, i) => {
                const isActive = i === currentTierIdx;
                const isPast = i < currentTierIdx;
                const isLast = i === TIER_ORDER.length - 1;
                return (
                  <View key={tier} style={styles.tierLadderRow}>
                    {/* Left: dot + connecting rail */}
                    <View style={styles.tierLadderLeft}>
                      <View style={[
                        styles.tierStepDot,
                        isActive ? {
                          width: 14, height: 14, borderRadius: 7,
                          backgroundColor: Colors.accent,
                          borderColor: Colors.accent,
                        } : isPast ? {
                          backgroundColor: Colors.textMuted + "50", borderColor: Colors.textMuted, borderWidth: 1.5,
                        } : {
                          backgroundColor: "transparent", borderColor: Colors.border, borderWidth: 1.5,
                        },
                      ]} />
                      {!isLast && (
                        <View style={[
                          styles.tierRail,
                          { backgroundColor: isPast ? Colors.textMuted + "30" : Colors.border },
                        ]} />
                      )}
                    </View>
                    {/* Right: tier info */}
                    <View style={[styles.tierLadderContent, !isLast && { paddingBottom: 14 }]}>
                      <Text style={[
                        styles.tierStepLabel,
                        isActive && { color: Colors.textPrimary, fontFamily: "Inter_700Bold", fontSize: 12 },
                        isPast  && { color: Colors.textSecondary, fontSize: 11 },
                        !isPast && !isActive && { fontSize: 11, color: Colors.textMuted },
                      ]}>
                        {tier}
                      </Text>
                      {isActive && (
                        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, marginTop: 2 }}>
                          Current tier
                        </Text>
                      )}
                    </View>
                    {/* Score badge on active */}
                    {isActive && (
                      <View style={[styles.tierActiveBadge, { borderColor: Colors.border, backgroundColor: Colors.bgElevated }]}>
                        <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textPrimary }}>{deScore}</Text>
                        <Text style={{ fontFamily: "Inter_400Regular", fontSize: 8, color: Colors.textMuted, marginTop: -1 }}>score</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {/* ── 3. NEXT EVOLUTION ── */}
          {nextEvolution && (
            <Animated.View entering={FadeInDown.delay(100).duration(350)}>
              <View style={styles.evolutionCard}>
                <View style={styles.evolutionTopRow}>
                  <View style={styles.evolutionIconWrap}>
                    <Ionicons name="trending-up" size={21} color={Colors.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.evolutionEyebrow}>NEXT EVOLUTION</Text>
                    <Text style={styles.evolutionDimension}>{nextEvolution.dimension}</Text>
                  </View>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.accent }}>
                    Lv {nextEvolution.currentLevel}→{nextEvolution.targetLevel}
                  </Text>
                </View>
                <Text style={styles.evolutionHint}>{charState?.evolutionHints?.[0]?.message ?? nextEvolution.hint}</Text>
                <View style={{ marginTop: 12 }}>
                  <Button
                    label={nextEvolution.action}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                      router.push("/(tabs)/missions");
                    }}
                    variant="primary"
                    iconLeft="flash"
                  />
                </View>
              </View>
            </Animated.View>
          )}

          {/* ── 4. EQUIPPED STYLE ── */}
          <Animated.View entering={FadeInDown.delay(150).duration(350)}>
            <SectionLabel
              label="EQUIPPED STYLE"
              linkLabel="Manage"
              onLinkPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/wardrobe?tab=equipped" as any); }}
            />
            <EquippedStyleRow equippedWearables={(data as any)?.equippedWearables ?? null} />
            {hasPrestigeWearable((data as any)?.equippedWearables) && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start", backgroundColor: Colors.bgElevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.border }}>
                <Ionicons name="sparkles" size={12} color={Colors.accent} />
                <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.textSecondary, letterSpacing: 0.6 }}>Wardrobe Boost</Text>
              </View>
            )}
          </Animated.View>

          {/* ── 5. STATUS DIMENSIONS ── */}
          <Animated.View entering={FadeInDown.delay(200).duration(350)}>
            <SectionLabel label="STATUS DIMENSIONS" />
            <View style={styles.dimsStack}>
              {dims.map((dim, i) => {
                const badge =
                  i === weakestIdx ? "LOWEST" as const :
                  i === strongestIdx ? "TOP" as const :
                  undefined;
                return (
                  <PremiumDimensionRow
                    key={dim.id}
                    dim={dim}
                    badge={badge}
                    delay={220 + i * 50}
                    onPress={() => handleDimPress(dim)}
                  />
                );
              })}
            </View>
          </Animated.View>

          {/* ── 6. EVOLUTION LOG ── */}
          {(() => {
            let evoExplanations: { source: string; text: string }[] = [];
            const vs = charState?.visualState;
            if (vs) {
              if (vs.postureStage === "upright") evoExplanations.push({ source: "Fitness", text: "Consistent training is improving your posture and physical confidence." });
              if (vs.postureStage === "athletic") evoExplanations.push({ source: "Fitness", text: "Athletic posture and peak energy. Strong physique signal." });
              if (vs.postureStage === "peak") evoExplanations.push({ source: "Fitness", text: "Elite conditioning. Commanding physical presence unlocked." });
              if (vs.refinementStage === "composed") evoExplanations.push({ source: "Discipline", text: "Self-discipline is adding composure and control to your presence." });
              if (vs.refinementStage === "sharp") evoExplanations.push({ source: "Discipline", text: "High discipline. Sharp, composed presence defining your character." });
              if (vs.refinementStage === "commanding") evoExplanations.push({ source: "Discipline", text: "Mastery-level self-control. Commanding presence achieved." });
              if (vs.outfitTier === "rising") evoExplanations.push({ source: "Finance", text: "Your lifestyle progress is visibly upgrading your style quality." });
              if (vs.outfitTier === "premium") evoExplanations.push({ source: "Finance", text: "Premium lifestyle tier. Elevated outfit class unlocked." });
              if (vs.outfitTier === "elite") evoExplanations.push({ source: "Finance", text: "Elite presence. Resources and ambition fully aligned." });
              if (vs.prestigeStage === "subtle") evoExplanations.push({ source: "Prestige", text: "Earned milestones showing subtle identity accents." });
              if (vs.prestigeStage === "visible") evoExplanations.push({ source: "Prestige", text: "Visible prestige markers unlocked. Elite signals present." });
              if (vs.prestigeStage === "legendary") evoExplanations.push({ source: "Prestige", text: "Legendary prestige aura. A legacy is being written." });
              if (vs.equippedWatchStyle != null) evoExplanations.push({ source: "Wardrobe", text: "Equipped watch is boosting your style signal." });
              if (vs.equippedOuterwearStyle != null) evoExplanations.push({ source: "Wardrobe", text: "Outerwear is elevating your overall look and tier presence." });
            }
            if (evoExplanations.length === 0) {
              evoExplanations = data?.visualState?.evolutionExplanations ?? [];
            }
            if (evoExplanations.length === 0) return null;
            return (
              <Animated.View entering={FadeInDown.delay(250).duration(350)}>
                <SectionLabel label="EVOLUTION LOG" />
                <View style={logStyles.card}>
                  {evoExplanations.map((ex, i) => (
                    <View
                      key={i}
                      style={[
                        logStyles.row,
                        i > 0 && logStyles.rowBorder,
                      ]}
                    >
                      <View style={logStyles.sourcePill}>
                        <Text style={logStyles.sourceText}>
                          {ex.source.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={logStyles.text}>{ex.text}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            );
          })()}

          {/* ── 6b. FEATURED CAR ── */}
          {data?.featuredCar && (
            <Animated.View entering={FadeInDown.delay(270).duration(350)}>
              <SectionLabel label="FEATURED CAR" />
              <Pressable
                style={({ pressed }) => [
                  featuredCarStyles.card,
                  { borderColor: featuredCarStyles.rarityColors[data.featuredCar.rarity as keyof typeof featuredCarStyles.rarityColors] ?? Colors.border },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/cars" as any); }}
              >
                <View style={featuredCarStyles.iconWrap}>
                  <Ionicons name="car-sport" size={22} color={featuredCarStyles.rarityColors[data.featuredCar.rarity as keyof typeof featuredCarStyles.rarityColors] ?? Colors.textSecondary} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={featuredCarStyles.name}>{data.featuredCar.name}</Text>
                  <Text style={featuredCarStyles.classLabel}>{data.featuredCar.carClass}</Text>
                </View>
                {data.carPrestigeBonus > 0 && (
                  <View style={featuredCarStyles.prestigeBadge}>
                    <Ionicons name="sparkles" size={10} color={Colors.accent} />
                    <Text style={featuredCarStyles.prestigeText}>+{data.carPrestigeBonus} Prestige</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
              </Pressable>
            </Animated.View>
          )}

          {/* ── 7. YOUR SPACE ── */}
          <Animated.View entering={FadeInDown.delay(300).duration(350)}>
            <SectionLabel label="YOUR SPACE" />
            <View style={styles.spaceRow}>
              <Pressable
                style={({ pressed }) => [styles.spaceChip, pressed && { opacity: 0.82 }]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/world"); }}
              >
                <View style={styles.spaceChipIcon}>
                  <Ionicons name="cube-outline" size={19} color={Colors.textSecondary} />
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
                <View style={styles.spaceChipIcon}>
                  <Ionicons name="car-sport-outline" size={19} color={Colors.textSecondary} />
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
          <Animated.View entering={FadeInDown.delay(350).duration(350)} style={styles.quickActions}>
            {[
              { icon: "radio-button-on-outline", label: "Missions",  onPress: () => router.push("/(tabs)/missions") },
              { icon: "cart-outline",            label: "Store",     onPress: () => router.push("/(tabs)/rewards")  },
              { icon: "trophy-outline",          label: "Profile",   onPress: () => router.push("/(tabs)/profile")  },
              { icon: "shirt-outline",           label: "Wardrobe",  onPress: () => router.push("/wardrobe" as any) },
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

      {/* ── Customization Sheet ── */}
      <CharacterCustomizeSheet
        visible={showCustomize}
        onClose={() => setShowCustomize(false)}
        currentSkinTone={currentSkinTone}
        currentBodyType={currentBodyType}
        currentHairStyle={currentHairStyle}
        currentHairColor={currentHairColor}
        visualState={data?.visualState as VisualState | null ?? null}
        equippedWearables={(data as any)?.equippedWearables ?? null}
        characterVisualState={characterVS}
        onSave={handleSaveAppearance}
        isSaving={updateAppearance.isPending}
      />

      {/* ── Dimension Detail Sheet ── */}
      <DimensionDetailSheet
        visible={showDimDetail}
        onClose={() => setShowDimDetail(false)}
        dim={selectedDim}
        detail={selectedDim ? dimensionDetails[selectedDim.id] ?? null : null}
      />

      {/* ── Tier Celebration ── */}
      <TierCelebration tier={tierName} color={tierColor} visible={showTierCelebration} />
    </View>
  );
}

// ─── Core Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: PREMIUM_BG },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText:      { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },

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
    color: Colors.textPrimary, letterSpacing: 2, flex: 1,
  },
  tierPillHeader: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.border,
  },
  tierPillHeaderText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.2 },

  scroll: { paddingHorizontal: 16, gap: 16 },

  // ── Hero Card ──
  heroCard: {
    backgroundColor: PREMIUM_BG,
    borderRadius: 24, borderWidth: 1, borderColor: Colors.border,
    paddingTop: 52, paddingBottom: 28, paddingHorizontal: 20,
    alignItems: "center", gap: 10, position: "relative",
    overflow: "hidden",
  },
  customizeBtn: {
    position: "absolute", top: 14, right: 14,
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.bgElevated + "CC",
    borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
    zIndex: 10,
  },
  characterStageWrap: {
    flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "stretch",
  },
  characterWrap: { flex: 1, alignItems: "center" },
  characterName: {
    fontFamily: "Inter_700Bold", fontSize: 26,
    color: Colors.textPrimary, letterSpacing: 0.5,
  },
  outfitLabel: {
    fontFamily: "Inter_500Medium", fontSize: 12,
    color: Colors.textMuted, letterSpacing: 0.5,
  },
  arcPill: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  arcPillText: {
    fontFamily: "Inter_700Bold", fontSize: 10,
    color: Colors.textSecondary, letterSpacing: 0.8,
  },

  // ── Status Tier Card ──
  tierCard: {
    backgroundColor: Colors.bgCard, borderRadius: 22,
    padding: 20, borderWidth: 1, borderColor: Colors.border, gap: 20,
  },
  tierCardTop:    { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  tierCardEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  tierCardName:   { fontFamily: "Inter_700Bold", fontSize: 34, letterSpacing: -1.5, color: Colors.textPrimary },
  tierCardDesc:   { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  statsCol:       { alignItems: "center", gap: 6, minWidth: 52 },
  miniStat:       { alignItems: "center" },
  miniStatNum:    { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  miniStatLabel:  { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted },
  miniStatDivider: { width: 28, height: 1, backgroundColor: Colors.border },

  tierLadder: { flexDirection: "column", gap: 0 },
  tierLadderRow: { flexDirection: "row", alignItems: "flex-start" },
  tierLadderLeft: { width: 26, alignItems: "center" },
  tierLadderContent: { flex: 1, paddingLeft: 12, paddingTop: 1 },
  tierActiveBadge: {
    alignItems: "center", borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 4, marginTop: 2,
  },
  tierStep:   { alignItems: "center", gap: 6 },
  tierStepDot: { width: 13, height: 13, borderRadius: 7, borderWidth: 1.5 },
  tierStepLabel: {
    fontFamily: "Inter_400Regular", fontSize: 8,
    color: Colors.textMuted, letterSpacing: 0.3,
  },
  tierRail: { width: 2, flex: 1, minHeight: 20, backgroundColor: Colors.border, marginTop: 2 },

  // Dims
  dimsStack: { gap: 6 },

  // ── Next Evolution CTA ──
  evolutionCard: {
    backgroundColor: Colors.bgCard,
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
  evolutionMissionsRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.amberDim,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    alignSelf: "flex-start",
  },
  evolutionMissionsText: {
    fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.amber,
  },
  evolutionCTA: {
    flexDirection: "row", alignItems: "center", gap: 8,
    alignSelf: "flex-start", backgroundColor: Colors.accent,
    borderRadius: 24, paddingHorizontal: 20, paddingVertical: 11,
  },
  evolutionCTAText: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textOnAccent },

  // ── Your Space ──
  spaceRow: { gap: 10 },
  spaceChip: {
    flexDirection: "row", alignItems: "center", gap: 13,
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  spaceChipIcon: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgElevated },
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


// ─── Premium Dimension Row Styles ──────────────────────────────────────────────

const dimRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: Colors.bgElevated,
    alignItems: "center", justifyContent: "center",
  },
  center: { flex: 1, gap: 5 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  badge: {
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1,
  },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 7, letterSpacing: 0.8 },
  barBg: {
    height: 4, backgroundColor: Colors.bgElevated, borderRadius: 2,
    overflow: "hidden",
  },
  barFill: { height: 4, borderRadius: 2 },
  xpText: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted },
  right: { alignItems: "center", minWidth: 36 },
  levelNum: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  levelLabel: { fontFamily: "Inter_700Bold", fontSize: 8, color: Colors.textMuted, letterSpacing: 1 },
});

// ─── Evolution Log Styles ──────────────────────────────────────────────────────

const logStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  row: {
    flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 14,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  sourcePill: {
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    minWidth: 70, alignItems: "center", flexShrink: 0,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.border,
  },
  sourceText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 1.2, color: Colors.textMuted },
  text: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 19 },
});

const featuredCarStyles = {
  card: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 13,
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: Colors.bgElevated,
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.textPrimary },
  classLabel: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, letterSpacing: 0.3 },
  prestigeBadge: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 4,
    backgroundColor: Colors.bgElevated, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  prestigeText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.accent, letterSpacing: 0.4 },
  rarityColors: {
    common: "#8888AA",
    uncommon: "#00E676",
    rare: "#2196F3",
    epic: "#9C27B0",
    legendary: "#F5C842",
  } as Record<string, string>,
};

// ─── Customize Sheet Styles ────────────────────────────────────────────────────

const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlayHeavy,
  },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: Colors.border,
    borderBottomWidth: 0,
    paddingTop: 12, paddingHorizontal: 20,
    maxHeight: "90%",
  },
  handle: {
    width: 44, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center", marginBottom: 16,
  },
  header: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between", marginBottom: 4,
  },
  headerEyebrow: {
    fontFamily: "Inter_700Bold", fontSize: 9,
    color: Colors.gold, letterSpacing: 2,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold", fontSize: 22,
    color: Colors.textPrimary, marginTop: 2,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.bgElevated,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border,
  },
  previewWrap: {
    alignItems: "center", paddingVertical: 12,
    backgroundColor: PREMIUM_BG,
    borderRadius: 18, marginVertical: 12,
    borderWidth: 1, borderColor: Colors.border + "80",
  },
  sectionRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 18, marginBottom: 12,
  },
  sectionAccent: {
    width: 3, height: 12, borderRadius: 2, backgroundColor: Colors.gold,
  },
  sectionLabel: {
    fontFamily: "Inter_700Bold", fontSize: 9,
    color: Colors.textSecondary, letterSpacing: 2,
  },
  // Skin tone / body type swatches
  swatchRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  swatchItem: { alignItems: "center", gap: 6, opacity: 0.75 },
  swatchCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: "transparent" },
  swatchLabel: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textMuted },
  swatchCheck: {
    position: "absolute", top: 0, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.accent,
    alignItems: "center", justifyContent: "center",
  },
  // Hair style grid (3-column)
  styleGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
  },
  styleCard: {
    alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 12,
    backgroundColor: Colors.bg, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.border,
    width: "30.5%" as any,
  },
  styleCardActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + "12" },
  styleIconWrap: {
    width: 52, height: 52, borderRadius: 13,
    backgroundColor: Colors.bgElevated,
    alignItems: "center", justifyContent: "center",
  },
  styleCardLabel: {
    fontFamily: "Inter_600SemiBold", fontSize: 11,
    color: Colors.textMuted, textAlign: "center",
  },
  // Hair color grid
  colorGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 4, marginBottom: 8,
  },
  colorItem: { alignItems: "center", gap: 6, width: "21%" as any },
  colorCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "transparent" },
  colorLabel: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textMuted, textAlign: "center" },
  colorCheck: {
    position: "absolute", top: 0, right: 2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.accent,
    alignItems: "center", justifyContent: "center",
  },
  saveRow: { paddingTop: 16, paddingBottom: 4 },
});

// ─── Dimension Detail Sheet Styles ──────────────────────────────────────────────

const detailSheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlayHeavy,
  },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: Colors.border,
    borderBottomWidth: 0,
    paddingTop: 12, paddingHorizontal: 20,
    maxHeight: "80%",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center", marginBottom: 16,
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20,
  },
  dimIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  dimName: {
    fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary,
  },
  dimLevel: {
    fontFamily: "Inter_700Bold", fontSize: 13, marginTop: 2,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.bgElevated,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border,
  },
  xpSection: { marginBottom: 20 },
  xpBarBg: {
    height: 8, backgroundColor: Colors.bgElevated, borderRadius: 4,
  },
  xpBarFill: { height: 8, borderRadius: 4 },
  xpRow: {
    flexDirection: "row", justifyContent: "space-between", marginTop: 6,
  },
  xpText: {
    fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textSecondary,
  },
  xpRemaining: {
    fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted,
    letterSpacing: 1.8, marginBottom: 10,
  },
  sourceRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8,
  },
  sourceText: {
    fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary,
    flex: 1, lineHeight: 19,
  },
  eventRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10,
    backgroundColor: Colors.bg, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  eventXp: {
    fontFamily: "Inter_700Bold", fontSize: 14, minWidth: 40,
  },
  eventDesc: {
    fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17,
  },
  eventTime: {
    fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, marginTop: 3,
  },
  emptyText: {
    fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, fontStyle: "italic",
  },
});

// ─── Tier Celebration Styles ──────────────────────────────────────────────────────

const celebrationStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center", justifyContent: "center",
    zIndex: 100,
  },
  content: {
    alignItems: "center", gap: 12, paddingHorizontal: 40,
  },
  glow: {
    position: "absolute", width: 300, height: 300, borderRadius: 150,
    top: -100, alignSelf: "center",
  },
  label: {
    fontFamily: "Inter_700Bold", fontSize: 14, letterSpacing: 4,
  },
  tierName: {
    fontFamily: "Inter_700Bold", fontSize: 48, letterSpacing: -2,
  },
  sub: {
    fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary,
  },
});

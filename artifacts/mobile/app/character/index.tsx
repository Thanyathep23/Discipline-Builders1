import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform, RefreshControl,
  Modal, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, SlideInDown } from "react-native-reanimated";
import Svg, { Circle, Ellipse, Rect, Path, G, Line } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { LoadingScreen, Button } from "@/design-system";
import { useAuth } from "@/context/AuthContext";
import { useCharacterStatus, useUpdateCharacterAppearance } from "@/hooks/useApi";

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

const HAIR_STYLE_DISPLAY: { key: string; label: string }[] = [
  { key: "low-fade", label: "Low Fade" },
  { key: "caesar",   label: "Caesar"   },
  { key: "taper",    label: "Taper"    },
  { key: "waves",    label: "Waves"    },
  { key: "natural",  label: "Natural"  },
  { key: "bald",     label: "Bald"     },
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
  // taper (default)
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
      {/* head */}
      <Ellipse cx={cx} cy={cy + 2} rx={r} ry={r + 1} fill={headFill} />
      {/* hair per style */}
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
  hairStyle = "taper",
  hairColor = "black",
  size = 190,
}: {
  visualState?: VisualState | null;
  equippedWearables?: EquippedWearableState;
  skinTone?: string;
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

  // User-chosen skin tone overrides stat-driven skin color
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
      {/* Fitness glow for high body tone */}
      {v.bodyTone >= 3 && (
        <Ellipse cx="50" cy="130" rx="36" ry="90" fill="rgba(0,230,118,0.035)" />
      )}
      {/* Shadow */}
      <Ellipse cx="50" cy="212" rx="30" ry="5" fill="#00000055" />
      {/* Shoes */}
      <Ellipse cx="36" cy="197" rx="16" ry="7.5" fill="#0C0C1A" />
      <Ellipse cx="25" cy="195" rx="8"  ry="5"   fill="#0C0C1A" />
      <Ellipse cx="64" cy="197" rx="16" ry="7.5" fill="#0C0C1A" />
      <Ellipse cx="75" cy="195" rx="8"  ry="5"   fill="#0C0C1A" />
      <Ellipse cx="28" cy="192" rx="5"  ry="2.5" fill="#1A1A2A" />
      <Ellipse cx="72" cy="192" rx="5"  ry="2.5" fill="#1A1A2A" />
      {/* Trousers */}
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
      {/* Belt */}
      <Rect x="25" y="113" width="50" height="7" rx="2.5" fill={oc.belt} />
      <Rect x="43" y="113" width="14" height="7" rx="1.5" fill={oc.bk} />
      <Rect x="47" y="115" width="6"  height="3" rx="1"   fill={oc.bk2} />
      {/* Shirt/Top */}
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
      {/* Arms */}
      <Rect x={aLX}      y="54" width={aW} height="50" rx="8" fill={oc.s} />
      <Rect x={aRX}      y="54" width={aW} height="50" rx="8" fill={oc.s} />
      <Rect x={aLX}      y="54" width={4}  height="50" rx="2" fill={oc.ss} />
      <Rect x={aRX + aW - 4} y="54" width={4} height="50" rx="2" fill={oc.ss} />
      {/* Hands */}
      <Ellipse cx={aLX + aW / 2} cy="106" rx="9" ry="7" fill={skin} />
      <Ellipse cx={aRX + aW / 2} cy="106" rx="9" ry="7" fill={skin} />
      <Ellipse cx={aLX + 2}      cy="106" rx="3" ry="2.5" fill={skinS} />
      <Ellipse cx={aRX + aW - 2} cy="106" rx="3" ry="2.5" fill={skinS} />
      {/* Watch */}
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
      {/* Outerwear layer (coat/jacket over shirt) */}
      {equippedWearables?.outerwear && (
        <G opacity={0.92}>
          <Rect x={tX - 2} y="50" width={tW + 4} height="68" rx="7" fill={equippedWearables.outerwear.colorVariant ?? "#36363C"} />
          <Rect x={aLX - 1} y="52" width={aW + 2} height="52" rx="9" fill={equippedWearables.outerwear.colorVariant ?? "#36363C"} />
          <Rect x={aRX - 1} y="52" width={aW + 2} height="52" rx="9" fill={equippedWearables.outerwear.colorVariant ?? "#36363C"} />
          <Line x1="50" y1="54" x2="50" y2="118" stroke="#00000018" strokeWidth="1.5" />
          <Path d={`M${tX + 10} 50 L50 62 L${tX + tW - 10} 50`} stroke="#00000020" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </G>
      )}
      {/* Accessory ring on hand */}
      {equippedWearables?.accessory?.accessoryStyle === "ring" && (
        <G>
          <Ellipse cx={aLX + aW / 2} cy="104" rx="4" ry="2.5" fill={equippedWearables.accessory.colorVariant ?? "#8A8A8A"} opacity={0.85} />
          <Ellipse cx={aLX + aW / 2} cy="104" rx="3" ry="1.8" fill={equippedWearables.accessory.colorVariant ?? "#8A8A8A"} opacity={0.5} />
        </G>
      )}
      {/* Collar */}
      {oc.col ? (
        <Path
          d={`M${tX + 16} 52 L50 60 L${tX + tW - 16} 52`}
          stroke={oc.ss} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
      ) : (
        <Path d="M42 52 L50 62 L58 52" stroke="#DDDDDD" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {/* Chain/Lapel */}
      {hasChain && (
        <Path
          d={`M44 ${nBottom + 2} Q50 ${nBottom + 6} 56 ${nBottom + 2}`}
          stroke="#C0A030" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.85"
        />
      )}
      {hasGold && (
        <Circle cx={tX + 10} cy="61" r="2.2" fill="#C0A030" />
      )}
      {/* Neck */}
      <Rect x="44" y={nY} width="12" height={nH} rx="4" fill={skin} />
      {/* Ears */}
      <Ellipse cx="31" cy={eCY} rx="4" ry="6"   fill={skin} />
      <Ellipse cx="69" cy={eCY} rx="4" ry="6"   fill={skin} />
      <Ellipse cx="31" cy={eCY} rx="2" ry="3.5" fill={skinS} />
      <Ellipse cx="69" cy={eCY} rx="2" ry="3.5" fill={skinS} />
      {/* Face */}
      <Ellipse cx="50" cy={hCY}      rx="19" ry="21" fill={skin} />
      <Ellipse cx="50" cy={hCY + 16} rx="14" ry="5"  fill={skinS} />
      {/* Eyes */}
      <Ellipse cx="43" cy={hCY - 2} rx="3"   ry="3.2" fill="#2A2A3A" />
      <Ellipse cx="57" cy={hCY - 2} rx="3"   ry="3.2" fill="#2A2A3A" />
      <Ellipse cx="43" cy={hCY - 2} rx="2.2" ry="2.4" fill="#1A1A28" />
      <Ellipse cx="57" cy={hCY - 2} rx="2.2" ry="2.4" fill="#1A1A28" />
      <Circle  cx={44.2} cy={hCY - 3.2} r="0.9" fill="#FFFFFF" />
      <Circle  cx={58.2} cy={hCY - 3.2} r="0.9" fill="#FFFFFF" />
      {/* Eyebrows */}
      <Path d={bl} stroke="#252535" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <Path d={br} stroke="#252535" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* Nose */}
      <Path
        d={`M50 ${hCY + 3} L48 ${hCY + 8} L52 ${hCY + 8}`}
        stroke="#C09070" strokeWidth="0.9" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      <Ellipse cx="50" cy={hCY + 7.5} rx="3" ry="1.5" fill={skin} />
      {/* Mouth */}
      <Path d={mouth} stroke="#B07A5A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <Ellipse cx="50" cy={hCY + 14} rx="4" ry="1.2" fill="#C98C6C" />
      {/* Hair — separate colorable layer */}
      <HairLayer
        style={hairStyle}
        color={hairFill}
        hCY={hCY}
        hsRx={hsRx}
        hsRy={hsRy}
        hcRy={hcRy}
      />
      {/* Grooming details (fade lines) drawn on top of hair */}
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
    </Svg>
  );
}

// ─── Character Customization Bottom Sheet ─────────────────────────────────────

function CharacterCustomizeSheet({
  visible,
  onClose,
  currentSkinTone,
  currentHairStyle,
  currentHairColor,
  visualState,
  equippedWearables,
  onSave,
  isSaving,
}: {
  visible: boolean;
  onClose: () => void;
  currentSkinTone: string;
  currentHairStyle: string;
  currentHairColor: string;
  visualState: VisualState | null;
  equippedWearables: EquippedWearableState;
  onSave: (skinTone: string, hairStyle: string, hairColor: string) => void;
  isSaving: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [skinTone,  setSkinTone]  = useState(currentSkinTone);
  const [hairStyle, setHairStyle] = useState(currentHairStyle);
  const [hairColor, setHairColor] = useState(currentHairColor);

  React.useEffect(() => {
    if (visible) {
      setSkinTone(currentSkinTone);
      setHairStyle(currentHairStyle);
      setHairColor(currentHairColor);
    }
  }, [visible, currentSkinTone, currentHairStyle, currentHairColor]);

  const hasChanges =
    skinTone !== currentSkinTone ||
    hairStyle !== currentHairStyle ||
    hairColor !== currentHairColor;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View entering={SlideInDown.springify().damping(18)} style={[sheetStyles.sheet, { paddingBottom: insets.bottom + 16 }]}>

        {/* Handle */}
        <View style={sheetStyles.handle} />

        {/* Header */}
        <View style={sheetStyles.header}>
          <View>
            <Text style={sheetStyles.headerTitle}>CUSTOMIZE</Text>
            <Text style={sheetStyles.headerSub}>Appearance</Text>
          </View>
          <Pressable style={sheetStyles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>

        {/* Live preview */}
        <View style={sheetStyles.previewWrap}>
          <EvolvedCharacter
            visualState={visualState}
            equippedWearables={equippedWearables}
            skinTone={skinTone}
            hairStyle={hairStyle}
            hairColor={hairColor}
            size={160}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>

          {/* ── Skin Tone ── */}
          <Text style={sheetStyles.sectionLabel}>SKIN TONE</Text>
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
                    active && { borderColor: Colors.accent, borderWidth: 2.5 },
                  ]} />
                  <Text style={[sheetStyles.swatchLabel, active && { color: Colors.textPrimary }]}>
                    {s.label}
                  </Text>
                  {active && <View style={sheetStyles.swatchCheck}><Ionicons name="checkmark" size={10} color={Colors.textOnAccent} /></View>}
                </Pressable>
              );
            })}
          </View>

          {/* ── Hair Style ── */}
          <Text style={sheetStyles.sectionLabel}>HAIR STYLE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={sheetStyles.styleScroll} contentContainerStyle={sheetStyles.styleScrollContent}>
            {HAIR_STYLE_DISPLAY.map((s) => {
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
          </ScrollView>

          {/* ── Hair Color ── */}
          <Text style={sheetStyles.sectionLabel}>HAIR COLOR</Text>
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
                    active && { borderColor: Colors.accent, borderWidth: 2.5 },
                    c.key === "platinum" && { borderWidth: 1.5, borderColor: Colors.border },
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

        {/* Save */}
        <View style={sheetStyles.saveRow}>
          <Button
            label={isSaving ? "Saving…" : hasChanges ? "Save Appearance" : "No Changes"}
            onPress={() => {
              if (!hasChanges || isSaving) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              onSave(skinTone, hairStyle, hairColor);
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

// ─── Dimension Card ────────────────────────────────────────────────────────────

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
  const updateAppearance = useUpdateCharacterAppearance();

  const [showCustomize, setShowCustomize] = useState(false);

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

  // Current appearance from API (with fallbacks)
  const appearance = (data as any)?.appearance;
  const currentSkinTone  = appearance?.skinTone  ?? "tone-3";
  const currentHairStyle = appearance?.hairStyle ?? "taper";
  const currentHairColor = appearance?.hairColor ?? "black";

  function handleSaveAppearance(skinTone: string, hairStyle: string, hairColor: string) {
    updateAppearance.mutate({ skinTone, hairStyle, hairColor }, {
      onSuccess: () => {
        setShowCustomize(false);
        refetch();
      },
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
              <View style={[styles.glowRing, { width: 320, height: 320, borderColor: tierColor + "14", marginLeft: -160, marginTop: -160 }]} />
              <View style={[styles.glowRing, { width: 220, height: 220, borderColor: tierColor + "10", marginLeft: -110, marginTop: -110 }]} />

              {/* Customize button — top right */}
              <Pressable
                style={styles.customizeBtn}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setShowCustomize(true);
                }}
              >
                <Ionicons name="color-palette-outline" size={16} color={Colors.textSecondary} />
              </Pressable>

              {/* The character — full hero presence */}
              <View style={styles.characterWrap}>
                <EvolvedCharacter
                  visualState={data?.visualState as VisualState | null}
                  equippedWearables={(data as any)?.equippedWearables as EquippedWearableState ?? null}
                  skinTone={currentSkinTone}
                  hairStyle={currentHairStyle}
                  hairColor={currentHairColor}
                  size={250}
                />
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
              </View>

              {/* Identity beneath the figure */}
              <Text style={styles.characterName}>{user?.username ?? "Character"}</Text>
              <Text style={styles.outfitLabel}>{data?.character?.outfitLabel ?? "Starter Kit"}</Text>

              {/* Status score pill — with glow */}
              <View style={[
                styles.scoreChip,
                { borderColor: tierColor + "60", backgroundColor: tierColor + "18" },
                { shadowColor: tierColor, shadowRadius: 14, shadowOpacity: 0.45, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
              ]}>
                <Text style={[styles.scoreChipNum, { color: tierColor }]}>{data?.overallScore ?? 0}</Text>
                <Text style={styles.scoreChipLabel}> STATUS SCORE</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── 2. STATUS + TIER CARD ── */}
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
                <View style={styles.miniStatDivider} />
                <View style={styles.miniStat}>
                  <Text style={[styles.miniStatNum, { color: Colors.cyan }]}>{data?.badgeCount ?? 0}</Text>
                  <Text style={styles.miniStatLabel}>Badges</Text>
                </View>
              </View>
            </View>

            {/* Tier progression ladder */}
            <View style={styles.tierLadder}>
              {TIER_ORDER.map((tier, i) => {
                const tc = TIER_COLORS[tier];
                const isActive = i === currentTierIdx;
                const isPast = i < currentTierIdx;
                const isLast = i === TIER_ORDER.length - 1;
                return (
                  <React.Fragment key={tier}>
                    <View style={styles.tierStep}>
                      <View style={[
                        styles.tierStepDot,
                        isActive
                          ? { backgroundColor: tc, borderColor: tc, width: 16, height: 16, borderRadius: 8, shadowColor: tc, shadowRadius: 8, shadowOpacity: 0.6, shadowOffset: { width: 0, height: 0 }, elevation: 6 }
                          : isPast
                            ? { backgroundColor: tc + "60", borderColor: tc + "80" }
                            : { backgroundColor: "transparent", borderColor: Colors.border + "80" },
                      ]} />
                      <Text style={[
                        styles.tierStepLabel,
                        isActive && { color: tc, fontFamily: "Inter_700Bold" },
                        isPast  && { color: tc + "80" },
                      ]}>
                        {tier}
                      </Text>
                    </View>
                    {!isLast && (
                      <View style={[
                        styles.tierRail,
                        isPast && { backgroundColor: TIER_COLORS[TIER_ORDER[i + 1]] + "40" },
                      ]} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </Animated.View>

          {/* ── 3. NEXT EVOLUTION ── */}
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
                  <Ionicons name="chevron-forward" size={18} color={Colors.accent + "80"} />
                </View>
                <Text style={styles.evolutionHint}>{data.nextEvolutionHint.hint}</Text>
                {data.nextEvolutionHint.missionsRequired != null && (
                  <View style={styles.evolutionMissionsRow}>
                    <Ionicons name="flame-outline" size={13} color={Colors.amber} />
                    <Text style={styles.evolutionMissionsText}>
                      {data.nextEvolutionHint.missionsRequired} {data.nextEvolutionHint.missionsRequired === 1 ? "mission" : "missions"} away from your next evolution
                    </Text>
                  </View>
                )}
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
                onPress={() => { Haptics.selectionAsync().catch(() => {}); router.push("/wardrobe?tab=equipped" as any); }}
              >
                <Text style={styles.sectionLinkText}>Manage</Text>
                <Ionicons name="chevron-forward" size={11} color={Colors.accent} />
              </Pressable>
            </View>
            <EquippedStyleRow equippedWearables={(data as any)?.equippedWearables ?? null} />
            {hasPrestigeWearable((data as any)?.equippedWearables) && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, alignSelf: "flex-start", backgroundColor: Colors.gold + "14", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.gold + "30" }}>
                <Ionicons name="sparkles" size={12} color={Colors.gold} />
                <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: Colors.gold, letterSpacing: 0.6 }}>Wardrobe Boost</Text>
              </View>
            )}
          </Animated.View>

          {/* ── 5. STATUS DIMENSIONS ── */}
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

          {/* ── 6. WHY YOU LOOK LIKE THIS ── */}
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

          {/* ── 7. YOUR SPACE ── */}
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
        currentHairStyle={currentHairStyle}
        currentHairColor={currentHairColor}
        visualState={data?.visualState as VisualState | null ?? null}
        equippedWearables={(data as any)?.equippedWearables ?? null}
        onSave={handleSaveAppearance}
        isSaving={updateAppearance.isPending}
      />
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
    paddingTop: 44, paddingBottom: 28, paddingHorizontal: 20,
    alignItems: "center", gap: 8, position: "relative",
  },
  glowRing: {
    position: "absolute", borderRadius: 1000, borderWidth: 1,
    top: "50%", left: "50%",
  },
  customizeBtn: {
    position: "absolute", top: 14, right: 14,
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.bgElevated + "CC",
    borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
    zIndex: 10,
  },
  characterWrap: { alignItems: "center", zIndex: 1 },
  characterName: {
    fontFamily: "Inter_700Bold", fontSize: 24,
    color: Colors.textPrimary, letterSpacing: -0.3, zIndex: 1,
  },
  outfitLabel: {
    fontFamily: "Inter_500Medium", fontSize: 12,
    color: Colors.textSecondary, zIndex: 1, letterSpacing: 0.3,
  },
  scoreChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 22, borderWidth: 1, marginTop: 8, zIndex: 1,
  },
  scoreChipNum:   { fontFamily: "Inter_700Bold", fontSize: 18 },
  scoreChipLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },

  // ── Status Tier Card ──
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
  tierStepDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
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
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center", marginBottom: 16,
  },
  header: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between", marginBottom: 4,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold", fontSize: 10,
    color: Colors.textMuted, letterSpacing: 2,
  },
  headerSub: {
    fontFamily: "Inter_700Bold", fontSize: 20,
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
    backgroundColor: Colors.bg,
    borderRadius: 18, marginVertical: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionLabel: {
    fontFamily: "Inter_700Bold", fontSize: 9,
    color: Colors.textMuted, letterSpacing: 2,
    marginTop: 16, marginBottom: 12,
  },
  // Skin tone swatches
  swatchRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  swatchItem: { alignItems: "center", gap: 6, opacity: 0.75 },
  swatchCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: "transparent" },
  swatchLabel: { fontFamily: "Inter_500Medium", fontSize: 10, color: Colors.textMuted },
  swatchCheck: {
    position: "absolute", top: 0, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: "center", justifyContent: "center",
  },
  // Hair style cards
  styleScroll: { marginHorizontal: -20 },
  styleScrollContent: { paddingHorizontal: 20, gap: 10, flexDirection: "row" },
  styleCard: {
    alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: Colors.bg, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.border, minWidth: 80,
  },
  styleCardActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + "10" },
  styleIconWrap: {
    width: 44, height: 44, borderRadius: 12,
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
  colorCircle: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: "transparent" },
  colorLabel: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textMuted, textAlign: "center" },
  colorCheck: {
    position: "absolute", top: 0, right: 2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.accent,
    alignItems: "center", justifyContent: "center",
  },
  // Save
  saveRow: { paddingTop: 16, paddingBottom: 4 },
});

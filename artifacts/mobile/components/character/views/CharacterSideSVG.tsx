import React from "react";
import Svg, { G, Path, Rect, Circle, Ellipse, Line, Defs, LinearGradient, Stop, RadialGradient } from "react-native-svg";
import type { OutfitTier, PostureStage } from "@/lib/characterEngine";

const SKIN_TONES: Record<string, [string, string, string]> = {
  "tone-1": ["#FDDCB5", "#EDCB9A", "#E0BC88"],
  "tone-2": ["#EDB98A", "#D49F70", "#C09060"],
  "tone-3": ["#C8956C", "#B07E58", "#9A6E4C"],
  "tone-4": ["#8B5E3C", "#7A4E2E", "#6A4024"],
  "tone-5": ["#5C3317", "#4A2510", "#3E1E0C"],
};

const HAIR_COLORS: Record<string, [string, string]> = {
  "black": ["#1A1A1A", "#2A2A2A"],
  "dark-brown": ["#2C1A0E", "#4A2E1C"],
  "medium-brown": ["#5C3A1E", "#7A5030"],
  "light-brown": ["#8B5E3C", "#A07050"],
  "dirty-blonde": ["#BF9B5A", "#D4B070"],
  "blonde": ["#E8D090", "#F0DCA0"],
  "auburn": ["#7B3F20", "#944830"],
  "platinum": ["#DCDCDC", "#ECECEC"],
};

const OUTFIT: Record<OutfitTier, { shirt: string; shirtShadow: string; pants: string; pantsShadow: string; shoe: string; shoeSole: string }> = {
  starter: { shirt: "#F5F5F5", shirtShadow: "#E0E0E0", pants: "#1A2744", pantsShadow: "#0F1A30", shoe: "#C8BFA8", shoeSole: "#E8E8E8" },
  rising: { shirt: "#FFFFFF", shirtShadow: "#EAEAEE", pants: "#0D1A35", pantsShadow: "#080F20", shoe: "#E8E8E8", shoeSole: "#F5F5F5" },
  premium: { shirt: "#F0EDE8", shirtShadow: "#DDD8D0", pants: "#2A2520", pantsShadow: "#1A1510", shoe: "#3A3028", shoeSole: "#5A5048" },
  elite: { shirt: "#1A1A2E", shirtShadow: "#10101E", pants: "#0A0A14", pantsShadow: "#05050A", shoe: "#1A1612", shoeSole: "#2A2622" },
};

const POSTURE: Record<PostureStage, { shoulderScale: number; headLift: number; chestY: number; stanceSpread: number }> = {
  neutral: { shoulderScale: 1.0, headLift: 0, chestY: 0, stanceSpread: 0 },
  upright: { shoulderScale: 1.02, headLift: -1, chestY: -0.5, stanceSpread: 0.5 },
  athletic: { shoulderScale: 1.05, headLift: -1.5, chestY: -1, stanceSpread: 1 },
  peak: { shoulderScale: 1.10, headLift: -2, chestY: -1.5, stanceSpread: 1.5 },
};

interface Props {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  outfitTier: OutfitTier;
  postureStage: PostureStage;
}

export function CharacterSideSVG({ skinTone, hairStyle, hairColor, outfitTier, postureStage }: Props) {
  const skin = SKIN_TONES[skinTone] ?? SKIN_TONES["tone-3"];
  const hair = HAIR_COLORS[hairColor] ?? HAIR_COLORS["dark-brown"];
  const outfit = OUTFIT[outfitTier];
  const p = POSTURE[postureStage];

  return (
    <Svg viewBox="0 0 100 280" width="100%" height="100%">
      <Defs>
        <LinearGradient id="sSkinGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={skin[0]} />
          <Stop offset="1" stopColor={skin[1]} />
        </LinearGradient>
        <LinearGradient id="sHairGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={hair[1]} />
          <Stop offset="1" stopColor={hair[0]} />
        </LinearGradient>
        <LinearGradient id="sShirtGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={outfit.shirt} />
          <Stop offset="0.7" stopColor={outfit.shirt} />
          <Stop offset="1" stopColor={outfit.shirtShadow} />
        </LinearGradient>
        <LinearGradient id="sPantsGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={outfit.pants} />
          <Stop offset="0.7" stopColor={outfit.pants} />
          <Stop offset="1" stopColor={outfit.pantsShadow} />
        </LinearGradient>
      </Defs>

      <G transform={`translate(0, ${p.headLift})`}>
        {/* Head - side profile */}
        <Path d="M42 14 Q42 10 50 10 Q58 10 58 14 L58 32 Q58 40 54 44 L52 44 Q48 42 46 38 L42 34 Z" fill="url(#sSkinGrad)" />

        {/* Jaw definition */}
        <Path d="M46 38 Q50 44 54 44 L54 42 Q50 42 48 38" fill="none" stroke={skin[2]} strokeWidth="0.4" opacity="0.4" />

        {/* Ear */}
        <Ellipse cx="42" cy="27" rx="2.5" ry="4" fill={skin[1]} />
        <Ellipse cx="42.3" cy="27" rx="1.2" ry="2.2" fill={skin[2]} opacity="0.3" />

        {/* Eye - profile */}
        <Path d="M53 24 Q56 22 57 24 Q56 26 53 24" fill="#FFFFFF" />
        <Circle cx="55" cy="24" r="1" fill="#2C1810" />
        <Circle cx="55.3" cy="23.7" r="0.3" fill="#FFFFFF" />
        {/* Brow */}
        <Path d="M53 22 Q55 20.5 57.5 22" fill="none" stroke={skin[2]} strokeWidth="0.6" strokeLinecap="round" opacity="0.5" />

        {/* Nose - profile */}
        <Path d="M58 26 L60 30 L58 32 Q57 33 56 32" fill={skin[0]} stroke={skin[2]} strokeWidth="0.4" opacity="0.6" />

        {/* Mouth */}
        <Path d="M53 35 L56 34 Q57 35 56 36" fill="none" stroke={skin[2]} strokeWidth="0.5" opacity="0.5" strokeLinecap="round" />

        {/* Hair - side */}
        <HairSide style={hairStyle} hair={hair} />
      </G>

      {/* Neck */}
      <Rect x="46" y={42 + p.headLift} width="7" height="7" rx="2" fill="url(#sSkinGrad)" />

      {/* Torso - side profile (thinner) */}
      <G transform={`translate(0, ${p.chestY})`}>
        <Path d="M40 49 L40 102 L56 102 L56 49 Q52 46 48 46 Q44 46 40 49 Z" fill="url(#sShirtGrad)" />

        {/* Chest contour */}
        <Path d="M56 54 Q58 58 56 62" fill="none" stroke={outfit.shirtShadow} strokeWidth="0.4" opacity="0.3" />
        <Path d="M56 68 Q56.5 70 56 72" fill="none" stroke={outfit.shirtShadow} strokeWidth="0.5" fill="none" opacity="0.4" />

        {/* Dog tag from side */}
        <Line x1="50" y1="46" x2="52" y2="58" stroke="#8A8A90" strokeWidth="0.5" opacity="0.6" />
        <Rect x="51" y="58" width="2" height="4" rx="0.3" fill="#A8A8B0" />
      </G>

      {/* Belt */}
      <Rect x="40" y={100 + p.chestY} width="16" height="3" rx="0.5" fill="#4A3828" />

      {/* Arm - side view (one visible, slightly forward) */}
      <G transform={`translate(0, ${p.chestY})`}>
        <Path d="M38 50 L36 68 L35 96 Q34.5 98 35.5 99 L39.5 99 Q40.5 98 40 96 L41 68 L42 56 Z" fill="url(#sShirtGrad)" />
        {/* Forearm skin */}
        <Path d="M36 74 L35 96 L40 96 L41 74 Z" fill="url(#sSkinGrad)" />
        {/* Hand */}
        <Ellipse cx="37.5" cy="99" rx="2.8" ry="3.2" fill={skin[0]} />
        {/* Bracelet */}
        <Rect x="34" y="88" width="6" height="3" rx="1" fill="#5C3317" stroke="#4A2810" strokeWidth="0.3" />
      </G>

      {/* Legs - side */}
      <G transform={`translate(0, ${p.chestY})`}>
        {/* Front leg */}
        <Path d="M42 103 L43 180 Q43.5 182 44.5 182 L54 182 Q55 182 55 180 L54 103 Z" fill="url(#sPantsGrad)" />
        {/* Back leg (slightly behind) */}
        <Path d="M38 103 L37 180 Q36.5 182 37.5 182 L42 182 L42 103 Z" fill={outfit.pantsShadow} />

        {/* Knee definition */}
        <Path d="M44 142 Q47 140 50 142" fill="none" stroke={outfit.pantsShadow} strokeWidth="0.4" opacity="0.3" />
      </G>

      {/* Shoes - side profile */}
      <G transform={`translate(0, ${p.chestY})`}>
        {/* Front shoe */}
        <Path d="M42 180 L42 186 Q42 190 44 190 L58 190 Q60 190 60 188 L58 182 L55 180 Z" fill={outfit.shoe} />
        <Line x1="42" y1="188" x2="60" y2="188" stroke={outfit.shoeSole} strokeWidth="1.5" opacity="0.8" />

        {/* Back shoe */}
        <Path d="M36 180 L36 186 Q36 190 38 190 L44 190 L43 180 Z" fill={outfit.shoe} opacity="0.7" />
        <Line x1="36" y1="188" x2="44" y2="188" stroke={outfit.shoeSole} strokeWidth="1.5" opacity="0.6" />
      </G>

      {/* Ground shadow */}
      <Ellipse cx="48" cy={194 + p.chestY} rx="18" ry="3" fill="#000000" opacity="0.12" />
    </Svg>
  );
}

function HairSide({ style, hair }: { style: string; hair: [string, string] }) {
  const base = (
    <Path d="M42 14 Q42 8 50 8 Q58 8 58 14 L58 18 Q58 10 50 9.5 Q42 10 42 18 Z" fill="url(#sHairGrad)" />
  );

  switch (style) {
    case "bald":
      return null;
    case "buzz_cut":
      return <Path d="M42 18 Q42 10 50 9 Q58 10 58 18 L58 16 Q58 11 50 10 Q42 11 42 16 Z" fill="url(#sHairGrad)" opacity="0.85" />;
    case "slick_back":
    case "slicked_back":
    case "undercut":
      return (
        <G>
          {base}
          <Path d="M42 14 Q42 20 40 24" fill="url(#sHairGrad)" stroke="none" opacity="0.7" />
        </G>
      );
    case "textured_crop":
    case "french_crop":
    case "taper":
      return (
        <G>
          {base}
          <Path d="M50 8 Q52 6 54 8" fill="url(#sHairGrad)" stroke="none" />
        </G>
      );
    case "side_part":
    case "classic_side_part":
    case "caesar":
      return (
        <G>
          {base}
          <Path d="M58 14 Q56 10 50 9 Q46 10 44 14" fill="url(#sHairGrad)" opacity="0.8" />
        </G>
      );
    case "crew_cut":
    case "low-fade":
      return (
        <G>
          <Path d="M42 20 Q42 10 50 9 Q58 10 58 20 L58 16 Q58 11 50 10 Q42 11 42 16 Z" fill="url(#sHairGrad)" />
        </G>
      );
    case "pompadour":
      return (
        <G>
          {base}
          <Path d="M50 8 Q54 3 56 6 Q58 4 58 10 L58 8 Q56 4 54 5 Q52 4 50 8 Z" fill="url(#sHairGrad)" />
        </G>
      );
    case "man_bun":
      return (
        <G>
          {base}
          <Circle cx="44" cy="10" r="4.5" fill="url(#sHairGrad)" />
        </G>
      );
    case "medium_waves":
    case "flow":
    case "medium_natural":
    case "natural_medium":
    case "natural":
    case "waves":
      return (
        <G>
          <Path d="M40 28 Q40 8 50 6 Q60 8 60 28 L60 18 Q60 10 50 8 Q40 10 40 18 Z" fill="url(#sHairGrad)" />
          <Path d="M40 24 Q38 30 40 32" fill="url(#sHairGrad)" stroke="none" />
        </G>
      );
    case "ponytail_sleek":
      return (
        <G>
          {base}
          <Path d="M42 14 Q40 16 38 30 Q38 38 42 40 Q44 38 42 30 Q42 20 42 14 Z" fill="url(#sHairGrad)" />
        </G>
      );
    case "textured_pixie":
    case "natural_medium":
      return (
        <G>
          <Path d="M40 28 Q40 8 50 6 Q60 8 60 28 L60 18 Q60 10 50 8 Q40 10 40 18 Z" fill="url(#sHairGrad)" />
        </G>
      );
    case "short_bob":
    case "side_part_long":
      return (
        <G>
          <Path d="M38 30 Q38 8 50 6 Q62 8 62 30 L62 18 Q62 10 50 8 Q38 10 38 18 Z" fill="url(#sHairGrad)" />
        </G>
      );
    case "bun_top":
      return (
        <G>
          {base}
          <Circle cx="50" cy="5" r="5" fill="url(#sHairGrad)" />
        </G>
      );
    default:
      return base;
  }
}

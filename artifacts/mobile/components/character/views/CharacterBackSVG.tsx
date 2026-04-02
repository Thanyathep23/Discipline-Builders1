import React from "react";
import Svg, { G, Path, Rect, Circle, Ellipse, Line, Defs, LinearGradient, Stop } from "react-native-svg";
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

export function CharacterBackSVG({ skinTone, hairStyle, hairColor, outfitTier, postureStage }: Props) {
  const skin = SKIN_TONES[skinTone] ?? SKIN_TONES["tone-3"];
  const hair = HAIR_COLORS[hairColor] ?? HAIR_COLORS["dark-brown"];
  const outfit = OUTFIT[outfitTier];
  const p = POSTURE[postureStage];

  return (
    <Svg viewBox="0 0 100 280" width="100%" height="100%">
      <Defs>
        <LinearGradient id="bSkinGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={skin[1]} />
          <Stop offset="1" stopColor={skin[2]} />
        </LinearGradient>
        <LinearGradient id="bHairGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={hair[0]} />
          <Stop offset="1" stopColor={hair[1]} />
        </LinearGradient>
        <LinearGradient id="bShirtGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={outfit.shirtShadow} />
          <Stop offset="0.3" stopColor={outfit.shirt} />
          <Stop offset="0.7" stopColor={outfit.shirt} />
          <Stop offset="1" stopColor={outfit.shirtShadow} />
        </LinearGradient>
        <LinearGradient id="bPantsGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={outfit.pantsShadow} />
          <Stop offset="0.3" stopColor={outfit.pants} />
          <Stop offset="0.7" stopColor={outfit.pants} />
          <Stop offset="1" stopColor={outfit.pantsShadow} />
        </LinearGradient>
      </Defs>

      <G transform={`translate(0, ${p.headLift})`}>
        {/* Head back */}
        <Ellipse cx="50" cy="28" rx="12" ry="14.5" fill="url(#bSkinGrad)" />

        {/* Ears */}
        <Ellipse cx="38" cy="28" rx="2.2" ry="3.5" fill={skin[1]} />
        <Ellipse cx="62" cy="28" rx="2.2" ry="3.5" fill={skin[1]} />

        {/* Hair - back view */}
        <HairBack style={hairStyle} hair={hair} />
      </G>

      {/* Neck */}
      <Rect x="46" y={43 + p.headLift} width="8" height="6" rx="2" fill="url(#bSkinGrad)" />
      <Line x1="50" y1={44 + p.headLift} x2="50" y2={48 + p.headLift} stroke={skin[2]} strokeWidth="0.3" opacity="0.2" />

      {/* Torso back */}
      <G transform={`translate(50, ${68 + p.chestY}) scale(${p.shoulderScale}, 1) translate(-50, 0)`}>
        <Path d="M34 49 L34 102 Q34 102 36 102 L64 102 Q66 102 66 100 L66 49 Q60 46 50 46 Q40 46 34 49 Z" fill="url(#bShirtGrad)" />

        {/* Collar back */}
        <Path d="M44 46 Q50 48 56 46" fill="none" stroke={outfit.shirtShadow} strokeWidth="0.6" />

        {/* Shoulder blades */}
        <Path d="M40 58 Q44 62 44 68" fill="none" stroke={outfit.shirtShadow} strokeWidth="0.3" opacity="0.25" />
        <Path d="M60 58 Q56 62 56 68" fill="none" stroke={outfit.shirtShadow} strokeWidth="0.3" opacity="0.25" />

        {/* Spine line */}
        <Line x1="50" y1="52" x2="50" y2="98" stroke={outfit.shirtShadow} strokeWidth="0.3" opacity="0.15" />

        {/* Shirt hem */}
        <Path d="M34 100 Q50 103 66 100" fill="none" stroke={outfit.shirtShadow} strokeWidth="0.4" opacity="0.3" />
      </G>

      {/* Belt */}
      <Rect x="34" y={100 + p.chestY} width="32" height="3" rx="0.5" fill="#4A3828" />

      {/* Arms back */}
      <G>
        {/* Left arm */}
        <Path d={`M34 ${50 + p.chestY} L${30 - p.stanceSpread} ${68 + p.chestY} L${29 - p.stanceSpread} ${96 + p.chestY} L${34 - p.stanceSpread} ${96 + p.chestY} L${35 - p.stanceSpread} ${68 + p.chestY} L34 ${56 + p.chestY} Z`}
          fill="url(#bShirtGrad)" />
        <Path d={`M${30 - p.stanceSpread} ${74 + p.chestY} L${29 - p.stanceSpread} ${96 + p.chestY} L${34 - p.stanceSpread} ${96 + p.chestY} L${35 - p.stanceSpread} ${74 + p.chestY} Z`}
          fill="url(#bSkinGrad)" />
        <Ellipse cx={31.5 - p.stanceSpread} cy={99 + p.chestY} rx="3" ry="3.5" fill={skin[1]} />

        {/* Right arm */}
        <Path d={`M66 ${50 + p.chestY} L${70 + p.stanceSpread} ${68 + p.chestY} L${71 + p.stanceSpread} ${96 + p.chestY} L${66 + p.stanceSpread} ${96 + p.chestY} L${65 + p.stanceSpread} ${68 + p.chestY} L66 ${56 + p.chestY} Z`}
          fill="url(#bShirtGrad)" />
        <Path d={`M${70 + p.stanceSpread} ${74 + p.chestY} L${71 + p.stanceSpread} ${96 + p.chestY} L${66 + p.stanceSpread} ${96 + p.chestY} L${65 + p.stanceSpread} ${74 + p.chestY} Z`}
          fill="url(#bSkinGrad)" />
        <Ellipse cx={68.5 + p.stanceSpread} cy={99 + p.chestY} rx="3" ry="3.5" fill={skin[1]} />
        {/* Bracelet visible from back */}
        <Rect x={65.5 + p.stanceSpread} y={88 + p.chestY} width="6" height="3" rx="1" fill="#5C3317" stroke="#4A2810" strokeWidth="0.3" />
      </G>

      {/* Legs back */}
      <G>
        <Path d={`M36 ${103 + p.chestY} L${35.5 - p.stanceSpread * 0.5} ${180 + p.chestY} L${49 - p.stanceSpread * 0.5} ${180 + p.chestY} L50 ${103 + p.chestY} Z`}
          fill="url(#bPantsGrad)" />
        <Path d={`M50 ${103 + p.chestY} L${51.5 + p.stanceSpread * 0.5} ${180 + p.chestY} L${65 + p.stanceSpread * 0.5} ${180 + p.chestY} L64 ${103 + p.chestY} Z`}
          fill="url(#bPantsGrad)" />

        {/* Back pockets */}
        <Rect x="38" y={110 + p.chestY} width="8" height="7" rx="1" fill="none" stroke={outfit.pantsShadow} strokeWidth="0.5" opacity="0.4" />
        <Rect x="54" y={110 + p.chestY} width="8" height="7" rx="1" fill="none" stroke={outfit.pantsShadow} strokeWidth="0.5" opacity="0.4" />
        {/* Pocket stitch detail */}
        <Path d={`M39 ${114 + p.chestY} L42 ${112 + p.chestY} L45 ${114 + p.chestY}`} fill="none" stroke={outfit.pantsShadow} strokeWidth="0.3" opacity="0.3" />
        <Path d={`M55 ${114 + p.chestY} L58 ${112 + p.chestY} L61 ${114 + p.chestY}`} fill="none" stroke={outfit.pantsShadow} strokeWidth="0.3" opacity="0.3" />

        {/* Knee creases */}
        <Path d={`M39 ${142 + p.chestY} Q43 ${140 + p.chestY} 47 ${142 + p.chestY}`} fill="none" stroke={outfit.pantsShadow} strokeWidth="0.4" opacity="0.3" />
        <Path d={`M53 ${142 + p.chestY} Q57 ${140 + p.chestY} 61 ${142 + p.chestY}`} fill="none" stroke={outfit.pantsShadow} strokeWidth="0.4" opacity="0.3" />
      </G>

      {/* Shoes back - heel view */}
      <G>
        <Path d={`M${34 - p.stanceSpread * 0.5} ${180 + p.chestY} L${33 - p.stanceSpread * 0.5} ${186 + p.chestY} Q${33 - p.stanceSpread * 0.5} ${190 + p.chestY} ${36 - p.stanceSpread * 0.5} ${190 + p.chestY} L${49 - p.stanceSpread * 0.5} ${190 + p.chestY} Q${51 - p.stanceSpread * 0.5} ${190 + p.chestY} ${50 - p.stanceSpread * 0.5} ${186 + p.chestY} L${49 - p.stanceSpread * 0.5} ${180 + p.chestY} Z`}
          fill={outfit.shoe} />
        <Line x1={33 - p.stanceSpread * 0.5} y1={188 + p.chestY} x2={51 - p.stanceSpread * 0.5} y2={188 + p.chestY} stroke={outfit.shoeSole} strokeWidth="1.5" opacity="0.8" />
        {/* Heel tab */}
        <Rect x={39 - p.stanceSpread * 0.5} y={180 + p.chestY} width="5" height="2.5" rx="0.5" fill={outfit.shoeSole} opacity="0.6" />

        <Path d={`M${51 + p.stanceSpread * 0.5} ${180 + p.chestY} L${50 + p.stanceSpread * 0.5} ${186 + p.chestY} Q${50 + p.stanceSpread * 0.5} ${190 + p.chestY} ${52 + p.stanceSpread * 0.5} ${190 + p.chestY} L${65 + p.stanceSpread * 0.5} ${190 + p.chestY} Q${67 + p.stanceSpread * 0.5} ${190 + p.chestY} ${67 + p.stanceSpread * 0.5} ${186 + p.chestY} L${65 + p.stanceSpread * 0.5} ${180 + p.chestY} Z`}
          fill={outfit.shoe} />
        <Line x1={50 + p.stanceSpread * 0.5} y1={188 + p.chestY} x2={67 + p.stanceSpread * 0.5} y2={188 + p.chestY} stroke={outfit.shoeSole} strokeWidth="1.5" opacity="0.8" />
        <Rect x={56 + p.stanceSpread * 0.5} y={180 + p.chestY} width="5" height="2.5" rx="0.5" fill={outfit.shoeSole} opacity="0.6" />
      </G>

      {/* Ground shadow */}
      <Ellipse cx="50" cy={194 + p.chestY} rx="22" ry="3" fill="#000000" opacity="0.12" />
    </Svg>
  );
}

function HairBack({ style, hair }: { style: string; hair: [string, string] }) {
  const fullCap = <Path d="M38 28 Q38 10 50 8 Q62 10 62 28 L62 16 Q62 11 50 9 Q38 11 38 16 Z" fill="url(#bHairGrad)" />;

  switch (style) {
    case "bald":
      return null;
    case "buzz_cut":
      return <Path d="M39 24 Q39 12 50 10 Q61 12 61 24 L61 18 Q61 14 50 12 Q39 14 39 18 Z" fill="url(#bHairGrad)" opacity="0.85" />;
    case "slick_back":
    case "slicked_back":
    case "undercut":
      return (
        <G>
          {fullCap}
          <Path d="M40 20 Q50 22 60 20" fill="url(#bHairGrad)" opacity="0.7" />
        </G>
      );
    case "textured_crop":
    case "french_crop":
    case "taper":
      return fullCap;
    case "side_part":
    case "classic_side_part":
    case "caesar":
      return (
        <G>
          {fullCap}
          <Path d="M42 16 Q50 14 58 16" fill="url(#bHairGrad)" opacity="0.6" />
        </G>
      );
    case "crew_cut":
    case "low-fade":
      return (
        <G>
          <Path d="M39 24 Q39 12 50 10 Q61 12 61 24 L61 20 Q61 14 50 12 Q39 14 39 20 Z" fill="url(#bHairGrad)" />
        </G>
      );
    case "textured_pixie":
    case "natural_medium":
      return (
        <G>
          <Path d="M36 32 Q36 8 50 6 Q64 8 64 32 L64 18 Q64 10 50 8 Q36 10 36 18 Z" fill="url(#bHairGrad)" />
        </G>
      );
    case "man_bun":
      return (
        <G>
          <Path d="M39 24 Q39 12 50 10 Q61 12 61 24 L61 18 Q61 14 50 12 Q39 14 39 18 Z" fill="url(#bHairGrad)" />
          <Circle cx="50" cy="12" r="5" fill="url(#bHairGrad)" />
          <Rect x="49" y="16" width="2" height="3" rx="0.5" fill={hair[0]} opacity="0.5" />
        </G>
      );
    case "ponytail_sleek":
      return (
        <G>
          {fullCap}
          <Path d="M46 18 Q50 20 54 18 L52 44 Q50 48 48 44 Z" fill="url(#bHairGrad)" />
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
          <Path d="M36 32 Q36 8 50 6 Q64 8 64 32 L64 18 Q64 10 50 8 Q36 10 36 18 Z" fill="url(#bHairGrad)" />
          <Path d="M38 30 Q40 32 42 30" fill="none" stroke={hair[1]} strokeWidth="0.8" opacity="0.4" />
          <Path d="M58 30 Q60 32 62 30" fill="none" stroke={hair[1]} strokeWidth="0.8" opacity="0.4" />
        </G>
      );
    case "short_bob":
    case "side_part_long":
      return (
        <G>
          <Path d="M36 34 Q36 8 50 6 Q64 8 64 34 L64 18 Q64 10 50 8 Q36 10 36 18 Z" fill="url(#bHairGrad)" />
        </G>
      );
    case "bun_top":
      return (
        <G>
          {fullCap}
          <Circle cx="50" cy="5" r="5" fill="url(#bHairGrad)" />
        </G>
      );
    case "pompadour":
      return (
        <G>
          {fullCap}
          <Path d="M42 16 Q50 12 58 16" fill="url(#bHairGrad)" />
        </G>
      );
    default:
      return fullCap;
  }
}

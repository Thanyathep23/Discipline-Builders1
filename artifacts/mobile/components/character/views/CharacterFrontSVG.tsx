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

const OUTFIT: Record<OutfitTier, { shirt: string; shirtShadow: string; pants: string; pantsShadow: string; shoe: string; shoeSole: string; isElite: boolean; isPremium: boolean }> = {
  starter: { shirt: "#F5F5F5", shirtShadow: "#E0E0E0", pants: "#1A2744", pantsShadow: "#0F1A30", shoe: "#C8BFA8", shoeSole: "#E8E8E8", isElite: false, isPremium: false },
  rising: { shirt: "#FFFFFF", shirtShadow: "#EAEAEE", pants: "#0D1A35", pantsShadow: "#080F20", shoe: "#E8E8E8", shoeSole: "#F5F5F5", isElite: false, isPremium: false },
  premium: { shirt: "#F0EDE8", shirtShadow: "#DDD8D0", pants: "#2A2520", pantsShadow: "#1A1510", shoe: "#3A3028", shoeSole: "#5A5048", isElite: false, isPremium: true },
  elite: { shirt: "#1A1A2E", shirtShadow: "#10101E", pants: "#0A0A14", pantsShadow: "#05050A", shoe: "#1A1612", shoeSole: "#2A2622", isElite: true, isPremium: false },
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

export function CharacterFrontSVG({ skinTone, hairStyle, hairColor, outfitTier, postureStage }: Props) {
  const skin = SKIN_TONES[skinTone] ?? SKIN_TONES["tone-3"];
  const hair = HAIR_COLORS[hairColor] ?? HAIR_COLORS["dark-brown"];
  const outfit = OUTFIT[outfitTier];
  const p = POSTURE[postureStage];

  return (
    <Svg viewBox="0 0 100 280" width="100%" height="100%">
      <Defs>
        <LinearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={skin[0]} />
          <Stop offset="1" stopColor={skin[1]} />
        </LinearGradient>
        <LinearGradient id="skinShadow" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={skin[2]} />
          <Stop offset="0.5" stopColor={skin[1]} />
          <Stop offset="1" stopColor={skin[2]} />
        </LinearGradient>
        <LinearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={hair[1]} />
          <Stop offset="1" stopColor={hair[0]} />
        </LinearGradient>
        <LinearGradient id="shirtGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={outfit.shirtShadow} />
          <Stop offset="0.3" stopColor={outfit.shirt} />
          <Stop offset="0.7" stopColor={outfit.shirt} />
          <Stop offset="1" stopColor={outfit.shirtShadow} />
        </LinearGradient>
        <LinearGradient id="pantsGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={outfit.pantsShadow} />
          <Stop offset="0.3" stopColor={outfit.pants} />
          <Stop offset="0.7" stopColor={outfit.pants} />
          <Stop offset="1" stopColor={outfit.pantsShadow} />
        </LinearGradient>
        <RadialGradient id="faceShadow" cx="0.5" cy="0.3" r="0.6">
          <Stop offset="0" stopColor={skin[0]} />
          <Stop offset="1" stopColor={skin[1]} />
        </RadialGradient>
        <LinearGradient id="shoeGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={outfit.shoe} />
          <Stop offset="1" stopColor={outfit.shoeSole} />
        </LinearGradient>
      </Defs>

      <G transform={`translate(0, ${p.headLift})`}>
        {/* Head */}
        <Ellipse cx="50" cy="28" rx="12" ry="14.5" fill="url(#faceShadow)" />
        <Ellipse cx="50" cy="27" rx="11.5" ry="14" fill="url(#skinGrad)" />

        {/* Jaw definition */}
        <Path d="M39 32 Q42 44 50 46 Q58 44 61 32" fill="none" stroke={skin[2]} strokeWidth="0.4" opacity="0.4" />

        {/* Ears */}
        <Ellipse cx="38.5" cy="28" rx="2.2" ry="3.5" fill={skin[1]} />
        <Ellipse cx="38.8" cy="28" rx="1.2" ry="2" fill={skin[2]} opacity="0.3" />
        <Ellipse cx="61.5" cy="28" rx="2.2" ry="3.5" fill={skin[1]} />
        <Ellipse cx="61.2" cy="28" rx="1.2" ry="2" fill={skin[2]} opacity="0.3" />

        {/* Brow ridge */}
        <Path d="M42.5 23 Q44.5 21.5 47 22" fill="none" stroke={skin[2]} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
        <Path d="M53 22 Q55.5 21.5 57.5 23" fill="none" stroke={skin[2]} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />

        {/* Eyes */}
        <Ellipse cx="45" cy="25" rx="2.8" ry="1.6" fill="#FFFFFF" />
        <Circle cx="45.2" cy="25" r="1.2" fill="#2C1810" />
        <Circle cx="45.5" cy="24.7" r="0.35" fill="#FFFFFF" />
        <Ellipse cx="55" cy="25" rx="2.8" ry="1.6" fill="#FFFFFF" />
        <Circle cx="54.8" cy="25" r="1.2" fill="#2C1810" />
        <Circle cx="55.1" cy="24.7" r="0.35" fill="#FFFFFF" />
        <Path d="M42 25 Q45 23 48 25" fill="none" stroke={skin[2]} strokeWidth="0.3" opacity="0.4" />
        <Path d="M52 25 Q55 23 58 25" fill="none" stroke={skin[2]} strokeWidth="0.3" opacity="0.4" />

        {/* Nose */}
        <Path d="M49 27 L48.5 31 Q50 32.5 51.5 31 L51 27" fill="none" stroke={skin[2]} strokeWidth="0.5" opacity="0.4" strokeLinecap="round" />
        <Circle cx="48.8" cy="31.2" r="0.8" fill={skin[1]} opacity="0.3" />
        <Circle cx="51.2" cy="31.2" r="0.8" fill={skin[1]} opacity="0.3" />

        {/* Mouth */}
        <Path d="M46 35 Q48 33.5 50 34 Q52 33.5 54 35" fill="none" stroke={skin[2]} strokeWidth="0.6" strokeLinecap="round" opacity="0.5" />
        <Path d="M47 35.5 Q50 37 53 35.5" fill={skin[2]} opacity="0.15" />

        {/* Hair */}
        <HairFront style={hairStyle} gradId="hairGrad" />
      </G>

      {/* Neck */}
      <Rect x="46" y={43 + p.headLift} width="8" height="6" rx="2" fill="url(#skinGrad)" />
      <Path d={`M46 ${44 + p.headLift} L46 ${49 + p.headLift}`} stroke={skin[2]} strokeWidth="0.3" opacity="0.3" />
      <Path d={`M54 ${44 + p.headLift} L54 ${49 + p.headLift}`} stroke={skin[2]} strokeWidth="0.3" opacity="0.3" />

      {/* Torso */}
      <G transform={`translate(50, ${68 + p.chestY}) scale(${p.shoulderScale}, 1) translate(-50, 0)`}>
        {/* Shirt body */}
        <Path d="M34 49 L34 100 Q34 102 36 102 L64 102 Q66 102 66 100 L66 49 Q60 46 50 46 Q40 46 34 49 Z" fill="url(#shirtGrad)" />

        {/* Collar */}
        {outfit.isPremium || outfit.isElite ? (
          <>
            <Path d="M44 46 L44 52 L48 49 Z" fill={outfit.shirt} stroke={outfit.shirtShadow} strokeWidth="0.3" />
            <Path d="M56 46 L56 52 L52 49 Z" fill={outfit.shirt} stroke={outfit.shirtShadow} strokeWidth="0.3" />
          </>
        ) : (
          <Path d="M45 46 Q50 52 55 46" fill="none" stroke={outfit.shirtShadow} strokeWidth="0.6" />
        )}

        {/* Sleeve hems */}
        <Line x1="34" y1="56" x2="34" y2="68" stroke={outfit.shirtShadow} strokeWidth="0.4" opacity="0.5" />
        <Line x1="66" y1="56" x2="66" y2="68" stroke={outfit.shirtShadow} strokeWidth="0.4" opacity="0.5" />
        <Path d="M34 68 Q35 69 37 68" stroke={outfit.shirtShadow} strokeWidth="0.5" fill="none" opacity="0.4" />
        <Path d="M66 68 Q65 69 63 68" stroke={outfit.shirtShadow} strokeWidth="0.5" fill="none" opacity="0.4" />

        {/* Chest shadow/depth */}
        <Path d="M44 55 Q50 60 56 55" fill="none" stroke={outfit.shirtShadow} strokeWidth="0.3" opacity="0.2" />
        <Path d="M46 70 Q50 74 54 70" fill="none" stroke={outfit.shirtShadow} strokeWidth="0.3" opacity="0.15" />

        {/* Dog tag chain */}
        <Line x1="48" y1="46" x2="50" y2="62" stroke="#8A8A90" strokeWidth="0.5" opacity="0.7" />
        <Line x1="52" y1="46" x2="50" y2="62" stroke="#8A8A90" strokeWidth="0.5" opacity="0.7" />
        <Rect x="48.5" y="62" width="3" height="4.5" rx="0.5" fill="#A8A8B0" stroke="#8A8A90" strokeWidth="0.3" />
      </G>

      {/* Belt */}
      <Rect x="34" y={100 + p.chestY} width="32" height="3" rx="0.5" fill="#4A3828" />
      <Rect x="48.5" y={100.3 + p.chestY} width="3.5" height="2.4" rx="0.3" fill="#8A7A62" stroke="#6A5A42" strokeWidth="0.3" />

      {/* Arms */}
      <G>
        {/* Left arm */}
        <Path d={`M34 ${50 + p.chestY} L${30 - p.stanceSpread} ${68 + p.chestY} L${29 - p.stanceSpread} ${96 + p.chestY} Q${28.5 - p.stanceSpread} ${98 + p.chestY} ${29.5 - p.stanceSpread} ${99 + p.chestY} L${33.5 - p.stanceSpread} ${99 + p.chestY} Q${34.5 - p.stanceSpread} ${98 + p.chestY} ${34 - p.stanceSpread} ${96 + p.chestY} L${35 - p.stanceSpread} ${68 + p.chestY} L34 ${56 + p.chestY} Z`}
          fill="url(#shirtGrad)" />
        {/* Forearm skin */}
        <Path d={`M${30 - p.stanceSpread} ${74 + p.chestY} L${29 - p.stanceSpread} ${96 + p.chestY} L${34 - p.stanceSpread} ${96 + p.chestY} L${35 - p.stanceSpread} ${74 + p.chestY} Z`}
          fill="url(#skinGrad)" />
        {/* Hand */}
        <Ellipse cx={31.5 - p.stanceSpread} cy={99 + p.chestY} rx="3" ry="3.5" fill={skin[0]} />

        {/* Right arm */}
        <Path d={`M66 ${50 + p.chestY} L${70 + p.stanceSpread} ${68 + p.chestY} L${71 + p.stanceSpread} ${96 + p.chestY} Q${71.5 + p.stanceSpread} ${98 + p.chestY} ${70.5 + p.stanceSpread} ${99 + p.chestY} L${66.5 + p.stanceSpread} ${99 + p.chestY} Q${65.5 + p.stanceSpread} ${98 + p.chestY} ${66 + p.stanceSpread} ${96 + p.chestY} L${65 + p.stanceSpread} ${68 + p.chestY} L66 ${56 + p.chestY} Z`}
          fill="url(#shirtGrad)" />
        <Path d={`M${70 + p.stanceSpread} ${74 + p.chestY} L${71 + p.stanceSpread} ${96 + p.chestY} L${66 + p.stanceSpread} ${96 + p.chestY} L${65 + p.stanceSpread} ${74 + p.chestY} Z`}
          fill="url(#skinGrad)" />
        <Ellipse cx={68.5 + p.stanceSpread} cy={99 + p.chestY} rx="3" ry="3.5" fill={skin[0]} />
        {/* Leather bracelet */}
        <Rect x={65.5 + p.stanceSpread} y={88 + p.chestY} width="6" height="3" rx="1" fill="#5C3317" stroke="#4A2810" strokeWidth="0.3" />
      </G>

      {/* Legs */}
      <G>
        {/* Left leg */}
        <Path d={`M36 ${103 + p.chestY} L${35.5 - p.stanceSpread * 0.5} ${180 + p.chestY} Q${35 - p.stanceSpread * 0.5} ${182 + p.chestY} ${36 - p.stanceSpread * 0.5} ${182 + p.chestY} L${48 - p.stanceSpread * 0.5} ${182 + p.chestY} Q${49 - p.stanceSpread * 0.5} ${182 + p.chestY} ${49 - p.stanceSpread * 0.5} ${180 + p.chestY} L50 ${103 + p.chestY} Z`}
          fill="url(#pantsGrad)" />
        {/* Knee line */}
        <Path d={`M39 ${142 + p.chestY} Q43 ${140 + p.chestY} 47 ${142 + p.chestY}`} fill="none" stroke={outfit.pantsShadow} strokeWidth="0.4" opacity="0.3" />

        {/* Right leg */}
        <Path d={`M50 ${103 + p.chestY} L${51.5 + p.stanceSpread * 0.5} ${180 + p.chestY} Q${51 + p.stanceSpread * 0.5} ${182 + p.chestY} ${52 + p.stanceSpread * 0.5} ${182 + p.chestY} L${64 + p.stanceSpread * 0.5} ${182 + p.chestY} Q${65 + p.stanceSpread * 0.5} ${182 + p.chestY} ${65 + p.stanceSpread * 0.5} ${180 + p.chestY} L64 ${103 + p.chestY} Z`}
          fill="url(#pantsGrad)" />
        <Path d={`M53 ${142 + p.chestY} Q57 ${140 + p.chestY} 61 ${142 + p.chestY}`} fill="none" stroke={outfit.pantsShadow} strokeWidth="0.4" opacity="0.3" />
      </G>

      {/* Shoes */}
      <G>
        {/* Left shoe */}
        <Path d={`M${34 - p.stanceSpread * 0.5} ${180 + p.chestY} L${33 - p.stanceSpread * 0.5} ${186 + p.chestY} Q${33 - p.stanceSpread * 0.5} ${190 + p.chestY} ${36 - p.stanceSpread * 0.5} ${190 + p.chestY} L${49 - p.stanceSpread * 0.5} ${190 + p.chestY} Q${51 - p.stanceSpread * 0.5} ${190 + p.chestY} ${50 - p.stanceSpread * 0.5} ${186 + p.chestY} L${49 - p.stanceSpread * 0.5} ${180 + p.chestY} Z`}
          fill={outfit.shoe} />
        <Line x1={33 - p.stanceSpread * 0.5} y1={188 + p.chestY} x2={51 - p.stanceSpread * 0.5} y2={188 + p.chestY} stroke={outfit.shoeSole} strokeWidth="1.5" opacity="0.8" />
        {/* Lace detail */}
        <Line x1={40 - p.stanceSpread * 0.5} y1={181 + p.chestY} x2={43 - p.stanceSpread * 0.5} y2={183 + p.chestY} stroke={outfit.shoeSole} strokeWidth="0.3" opacity="0.5" />
        <Line x1={43 - p.stanceSpread * 0.5} y1={181 + p.chestY} x2={40 - p.stanceSpread * 0.5} y2={183 + p.chestY} stroke={outfit.shoeSole} strokeWidth="0.3" opacity="0.5" />

        {/* Right shoe */}
        <Path d={`M${51 + p.stanceSpread * 0.5} ${180 + p.chestY} L${50 + p.stanceSpread * 0.5} ${186 + p.chestY} Q${50 + p.stanceSpread * 0.5} ${190 + p.chestY} ${52 + p.stanceSpread * 0.5} ${190 + p.chestY} L${65 + p.stanceSpread * 0.5} ${190 + p.chestY} Q${67 + p.stanceSpread * 0.5} ${190 + p.chestY} ${67 + p.stanceSpread * 0.5} ${186 + p.chestY} L${65 + p.stanceSpread * 0.5} ${180 + p.chestY} Z`}
          fill={outfit.shoe} />
        <Line x1={50 + p.stanceSpread * 0.5} y1={188 + p.chestY} x2={67 + p.stanceSpread * 0.5} y2={188 + p.chestY} stroke={outfit.shoeSole} strokeWidth="1.5" opacity="0.8" />
        <Line x1={56 + p.stanceSpread * 0.5} y1={181 + p.chestY} x2={59 + p.stanceSpread * 0.5} y2={183 + p.chestY} stroke={outfit.shoeSole} strokeWidth="0.3" opacity="0.5" />
        <Line x1={59 + p.stanceSpread * 0.5} y1={181 + p.chestY} x2={56 + p.stanceSpread * 0.5} y2={183 + p.chestY} stroke={outfit.shoeSole} strokeWidth="0.3" opacity="0.5" />
      </G>

      {/* Ground shadow */}
      <Ellipse cx="50" cy={194 + p.chestY} rx="22" ry="3" fill="#000000" opacity="0.12" />
    </Svg>
  );
}

function HairFront({ style, gradId }: { style: string; gradId: string }) {
  switch (style) {
    case "buzz_cut":
      return <Path d="M39 22 Q39 12 50 10 Q61 12 61 22 L61 19 Q61 14 50 12 Q39 14 39 19 Z" fill={`url(#${gradId})`} opacity="0.85" />;
    case "crew_cut":
      return (
        <G>
          <Path d="M39 24 Q39 12 50 10 Q61 12 61 24 L61 20 Q61 13 50 11 Q39 13 39 20 Z" fill={`url(#${gradId})`} />
          <Path d="M42 16 Q50 13 58 16" fill={`url(#${gradId})`} stroke="none" />
        </G>
      );
    case "textured_crop":
    case "french_crop":
    case "taper":
      return (
        <G>
          <Path d="M38 25 Q38 11 50 9 Q62 11 62 25 L62 18 Q62 12 50 10 Q38 12 38 18 Z" fill={`url(#${gradId})`} />
          <Path d="M40 18 L42 15 L44 17 L46 14 L48 16 L50 13 L52 16 L54 14 L56 17 L58 15 L60 18" fill={`url(#${gradId})`} stroke="none" />
        </G>
      );
    case "side_part":
    case "classic_side_part":
    case "caesar":
      return (
        <G>
          <Path d="M38 25 Q38 11 50 9 Q62 11 62 25 L62 18 Q62 12 50 10 Q38 12 38 18 Z" fill={`url(#${gradId})`} />
          <Path d="M38 20 Q40 14 50 12 Q55 13 58 17 L62 19 L62 16 Q60 12 50 10 Q38 12 38 18 Z" fill={`url(#${gradId})`} />
          <Line x1="42" y1="16" x2="55" y2="14" stroke={`url(#${gradId})`} strokeWidth="0.3" opacity="0.5" />
        </G>
      );
    case "pompadour":
      return (
        <G>
          <Path d="M38 25 Q38 11 50 9 Q62 11 62 25 L62 18 Q62 12 50 10 Q38 12 38 18 Z" fill={`url(#${gradId})`} />
          <Path d="M40 18 Q42 6 50 5 Q58 6 60 18 Q56 10 50 9 Q44 10 40 18 Z" fill={`url(#${gradId})`} />
        </G>
      );
    case "slick_back":
    case "slicked_back":
    case "undercut":
      return (
        <G>
          <Path d="M39 24 Q39 12 50 10 Q61 12 61 24 L61 18 Q61 13 50 11 Q39 13 39 18 Z" fill={`url(#${gradId})`} />
          <Path d="M39 20 Q42 16 50 15 Q58 16 61 20 L61 18 Q58 14 50 13 Q42 14 39 18 Z" fill={`url(#${gradId})`} opacity="0.7" />
        </G>
      );
    case "medium_waves":
    case "flow":
    case "medium_natural":
    case "natural":
    case "waves":
      return (
        <G>
          <Path d="M36 28 Q36 10 50 8 Q64 10 64 28 L64 20 Q64 12 50 9 Q36 12 36 20 Z" fill={`url(#${gradId})`} />
          <Path d="M36 26 Q38 28 40 26 Q42 28 44 26" fill="none" stroke={`url(#${gradId})`} strokeWidth="1" opacity="0.5" />
          <Path d="M56 26 Q58 28 60 26 Q62 28 64 26" fill="none" stroke={`url(#${gradId})`} strokeWidth="1" opacity="0.5" />
        </G>
      );
    case "man_bun":
      return (
        <G>
          <Path d="M39 22 Q39 12 50 10 Q61 12 61 22 L61 19 Q61 14 50 12 Q39 14 39 19 Z" fill={`url(#${gradId})`} opacity="0.85" />
        </G>
      );
    case "short_bob":
      return (
        <G>
          <Path d="M36 30 Q36 10 50 8 Q64 10 64 30 L64 20 Q64 12 50 9 Q36 12 36 20 Z" fill={`url(#${gradId})`} />
          <Path d="M36 28 Q36 32 38 33" fill={`url(#${gradId})`} stroke="none" />
          <Path d="M64 28 Q64 32 62 33" fill={`url(#${gradId})`} stroke="none" />
        </G>
      );
    case "ponytail_sleek":
      return (
        <G>
          <Path d="M38 25 Q38 11 50 9 Q62 11 62 25 L62 18 Q62 12 50 10 Q38 12 38 18 Z" fill={`url(#${gradId})`} />
        </G>
      );
    case "bun_top":
      return (
        <G>
          <Path d="M39 24 Q39 12 50 10 Q61 12 61 24 L61 18 Q61 13 50 11 Q39 13 39 18 Z" fill={`url(#${gradId})`} />
          <Circle cx="50" cy="8" r="5" fill={`url(#${gradId})`} />
        </G>
      );
    case "side_part_long":
      return (
        <G>
          <Path d="M36 30 Q36 10 50 8 Q64 10 64 30 L64 20 Q64 12 50 9 Q36 12 36 20 Z" fill={`url(#${gradId})`} />
          <Path d="M36 24 Q38 14 50 12 Q55 13 58 17 L64 20 L64 16 Q60 12 50 10 Q36 12 36 20 Z" fill={`url(#${gradId})`} />
        </G>
      );
    case "textured_pixie":
      return (
        <G>
          <Path d="M37 26 Q37 11 50 9 Q63 11 63 26 L63 18 Q63 12 50 10 Q37 12 37 18 Z" fill={`url(#${gradId})`} />
          <Path d="M39 18 L41 14 L43 17 L45 13 L47 16 L49 12 L51 16 L53 13 L55 17 L57 14 L59 18" fill={`url(#${gradId})`} stroke="none" />
        </G>
      );
    case "natural_medium":
      return (
        <G>
          <Path d="M35 30 Q35 9 50 7 Q65 9 65 30 L65 20 Q65 11 50 8 Q35 11 35 20 Z" fill={`url(#${gradId})`} />
        </G>
      );
    case "bald":
      return null;
    case "low-fade":
    case "clean_cut":
    default:
      return (
        <G>
          <Path d="M38 24 Q38 12 50 10 Q62 12 62 24 L62 18 Q62 12 50 10 Q38 12 38 18 Z" fill={`url(#${gradId})`} />
          <Path d="M40 17 Q50 13 60 17" fill={`url(#${gradId})`} stroke="none" />
        </G>
      );
  }
}

import React, { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  G, Path, Rect, Ellipse, Circle, Line, Defs,
  RadialGradient, LinearGradient, Stop,
} from "react-native-svg";
import type {
  CharacterVisualState, BodyType, CharacterView,
  PostureStage, OutfitTier, PrestigeStage, RefinementStage,
} from "@/lib/characterEngine";

const SIZE_MAP = {
  small:  { w: 80,  h: 240 },
  medium: { w: 140, h: 420 },
  large:  { w: 180, h: 540 },
  full:   { w: 240, h: 720 },
};

const SKIN: Record<string, { base: string; shadow: string; deep: string }> = {
  "tone-1": { base: "#FDDCB5", shadow: "#E8C49A", deep: "#D4A882" },
  "tone-2": { base: "#EDB98A", shadow: "#D49F70", deep: "#BC8858" },
  "tone-3": { base: "#C8956C", shadow: "#B07E58", deep: "#966644" },
  "tone-4": { base: "#8B5E3C", shadow: "#7A4E2E", deep: "#5E3820" },
  "tone-5": { base: "#5C3317", shadow: "#4A2510", deep: "#3A1808" },
};

interface OutfitPalette {
  shirt: string; shirtShadow: string; collar: string;
  pants: string; pantsShadow: string;
  belt: string; buckle: string;
  shoeBase: string;
}

const OUTFITS: Record<OutfitTier, OutfitPalette> = {
  starter: {
    shirt: "#EEEEEE", shirtShadow: "#D8D8D8", collar: "#E0E0E0",
    pants: "#1A1A2E", pantsShadow: "#0F0F1E",
    belt: "#5A4020", buckle: "#C8A030",
    shoeBase: "#6B6B80",
  },
  rising: {
    shirt: "#F0F0F8", shirtShadow: "#D8D8E8", collar: "#E4E4F0",
    pants: "#181828", pantsShadow: "#0E0E1C",
    belt: "#3A3048", buckle: "#8080C0",
    shoeBase: "#3A3A50",
  },
  premium: {
    shirt: "#C8C8D8", shirtShadow: "#ACACBC", collar: "#D4D4E4",
    pants: "#141422", pantsShadow: "#0A0A16",
    belt: "#4A3858", buckle: "#A090D0",
    shoeBase: "#1A1A2A",
  },
  elite: {
    shirt: "#1E1E28", shirtShadow: "#141420", collar: "#28283A",
    pants: "#0E0E16", pantsShadow: "#080810",
    belt: "#3A2A42", buckle: "#C0A030",
    shoeBase: "#0A0A14",
  },
};

const HAIR_COLORS: Record<string, { base: string; shadow: string; highlight: string; strand: string }> = {
  "black":        { base: "#1A1A1A", shadow: "#0A0A0A", highlight: "#2E2E2E", strand: "#383838" },
  "dark-brown":   { base: "#2C1A0E", shadow: "#1A0E06", highlight: "#4A3020", strand: "#5A3A24" },
  "medium-brown": { base: "#5C3A1E", shadow: "#3E2610", highlight: "#7A5030", strand: "#8A6040" },
  "light-brown":  { base: "#8B5E3C", shadow: "#6A4828", highlight: "#A87850", strand: "#B88860" },
  "dirty-blonde": { base: "#BF9B5A", shadow: "#9A7E44", highlight: "#D8B870", strand: "#E0C880" },
  "blonde":       { base: "#E8D090", shadow: "#C8B070", highlight: "#F8E8B0", strand: "#F0E0A0" },
  "auburn":       { base: "#7B3F20", shadow: "#5A2E14", highlight: "#9A5430", strand: "#A86438" },
  "platinum":     { base: "#DCDCDC", shadow: "#B0B0B0", highlight: "#F0F0F0", strand: "#E8E8E8" },
};

const GROOMING: Record<RefinementStage, number> = { casual: 0, composed: 1, sharp: 2, commanding: 3 };
const CONFIDENCE: Record<RefinementStage, number> = { casual: 0, composed: 1, sharp: 1, commanding: 2 };

interface PostureOffsets { headCY: number; torsoTopY: number; }
const POSTURE_OFFSETS: Record<PostureStage, PostureOffsets> = {
  neutral:  { headCY: 52, torsoTopY: 94 },
  upright:  { headCY: 50, torsoTopY: 92 },
  athletic: { headCY: 48, torsoTopY: 90 },
  peak:     { headCY: 46, torsoTopY: 88 },
};

interface Props {
  visualState: CharacterVisualState;
  size?: "small" | "medium" | "large" | "full";
  showShadow?: boolean;
  view?: CharacterView;
}

function CharacterRendererInner({ visualState, size = "large", showShadow = true, view = "front" }: Props) {
  const vs = visualState;
  const bodyType: BodyType = vs.bodyType ?? "male";
  const isMale = bodyType === "male";

  const skin = SKIN[vs.skinTone] ?? SKIN["tone-3"];
  const outfit = OUTFITS[vs.outfitTier] ?? OUTFITS.starter;
  const hairC = HAIR_COLORS[vs.hairColor] ?? HAIR_COLORS["black"];
  const groomingLevel = GROOMING[vs.refinementStage] ?? 0;
  const confidenceFace = CONFIDENCE[vs.refinementStage] ?? 0;
  const faceShape = vs.faceShape ?? "oval";
  const eyeShape = vs.eyeShape ?? "almond";

  const po = POSTURE_OFFSETS[vs.postureStage] ?? POSTURE_OFFSETS.neutral;
  const headCY = po.headCY;
  const torsoTopY = po.torsoTopY;

  const shoulderW = isMale ? 76 : 68;
  const torsoLX = 60 - shoulderW / 2;
  const torsoRX = 60 + shoulderW / 2;
  const waistLX = isMale ? 30 : 33;
  const waistRX = isMale ? 90 : 87;

  const neckX = 52;
  const neckW = 16;
  const neckY = headCY + 22;

  const baseHeadRX = isMale ? 24 : 22;
  const baseHeadRY = isMale ? 26 : 25;
  const headRX = faceShape === "round" ? baseHeadRX + 1 : faceShape === "square" ? baseHeadRX + 2 : baseHeadRX;
  const headRY = faceShape === "round" ? baseHeadRY - 1 : faceShape === "square" ? baseHeadRY - 2 : baseHeadRY;

  const browY = headCY - 15;
  const eyeY = headCY - 2;
  const noseTopY = headCY + 8;
  const noseBotY = headCY + 16;
  const mouthY = headCY + 23;
  const faceShadowY = headCY + 16;

  const { w, h } = SIZE_MAP[size] ?? SIZE_MAP.large;

  const hasFitnessGlow = vs.postureStage === "athletic" || vs.postureStage === "peak";

  const mouthD = useMemo(() => {
    const my = mouthY;
    if (confidenceFace === 0) return `M52 ${my} Q60 ${my + 3} 68 ${my}`;
    if (confidenceFace === 1) return `M51 ${my} Q60 ${my + 5} 69 ${my}`;
    return `M50 ${my - 1} Q60 ${my + 7} 70 ${my - 1}`;
  }, [confidenceFace, mouthY]);

  const browD = useMemo(() => {
    const by = browY;
    if (faceShape === "square") {
      return { l: `M43 ${by} Q50 ${by - 2} 57 ${by}`, r: `M63 ${by} Q70 ${by - 2} 77 ${by}` };
    }
    return { l: `M43 ${by} Q50 ${by - 4} 57 ${by}`, r: `M63 ${by} Q70 ${by - 4} 77 ${by}` };
  }, [faceShape, browY]);

  const eyesEl = useMemo(() => {
    const ey = eyeY;
    if (eyeShape === "round") {
      return (
        <G>
          <Ellipse cx="50" cy={String(ey)} rx="7" ry="7" fill="#FAFAFF" />
          <Ellipse cx="70" cy={String(ey)} rx="7" ry="7" fill="#FAFAFF" />
          <Circle cx="51" cy={String(ey)} r="4" fill="#1A1A2E" />
          <Circle cx="71" cy={String(ey)} r="4" fill="#1A1A2E" />
          <Circle cx="53" cy={String(ey - 2)} r="1.5" fill="white" />
          <Circle cx="73" cy={String(ey - 2)} r="1.5" fill="white" />
        </G>
      );
    }
    if (eyeShape === "wide") {
      return (
        <G>
          <Ellipse cx="50" cy={String(ey)} rx="8" ry="6" fill="#FAFAFF" />
          <Ellipse cx="70" cy={String(ey)} rx="8" ry="6" fill="#FAFAFF" />
          <Circle cx="51" cy={String(ey)} r="4" fill="#1A1A2E" />
          <Circle cx="71" cy={String(ey)} r="4" fill="#1A1A2E" />
          <Circle cx="53" cy={String(ey - 2)} r="1.5" fill="white" />
          <Circle cx="73" cy={String(ey - 2)} r="1.5" fill="white" />
        </G>
      );
    }
    return (
      <G>
        <Path d={`M43 ${ey} Q50 ${ey - 5} 57 ${ey} Q50 ${ey + 5} 43 ${ey}`} fill="#FAFAFF" />
        <Path d={`M63 ${ey} Q70 ${ey - 5} 77 ${ey} Q70 ${ey + 5} 63 ${ey}`} fill="#FAFAFF" />
        <Ellipse cx="50" cy={String(ey)} rx="4" ry="3.5" fill="#1A1A2E" />
        <Ellipse cx="70" cy={String(ey)} rx="4" ry="3.5" fill="#1A1A2E" />
        <Circle cx="52" cy={String(ey - 1.5)} r="1.5" fill="white" />
        <Circle cx="72" cy={String(ey - 1.5)} r="1.5" fill="white" />
      </G>
    );
  }, [eyeShape, eyeY]);

  const hairEl = useMemo(() => {
    const hCY = headCY;
    const topY = hCY - headRY;
    const hRX = headRX;
    const hRY = headRY;
    const style = vs.hairStyle;
    const c = hairC;

    const strandPaths = (ox: number, baseY: number, count: number) => {
      const elems = [];
      for (let i = 0; i < count; i++) {
        const x = ox + (i * 6) - ((count - 1) * 3);
        const sway = i % 2 === 0 ? 2 : -2;
        elems.push(
          <Path
            key={`s${i}`}
            d={`M${x} ${baseY} Q${x + sway} ${baseY + 8} ${x + sway * 0.5} ${baseY + 16}`}
            stroke={c.strand} strokeWidth="0.6" fill="none" strokeLinecap="round" opacity={0.2 + groomingLevel * 0.06}
          />
        );
      }
      return elems;
    };

    if (style === "bald") return { back: null, front: null };

    if (style === "buzz_cut") {
      return {
        back: null,
        front: (
          <G>
            <Ellipse cx="60" cy={topY + 9} rx={hRX} ry="12" fill={c.base} opacity={0.45} />
            <Ellipse cx="60" cy={topY + 5} rx={hRX - 3} ry="6" fill={c.highlight} opacity={0.1} />
          </G>
        ),
      };
    }

    if (style === "clean_cut" || style === "low-fade") {
      return {
        back: null,
        front: (
          <G>
            <Defs>
              <LinearGradient id="hairG" x1="0.3" y1="0" x2="0.7" y2="1">
                <Stop offset="0" stopColor={c.highlight} />
                <Stop offset="0.35" stopColor={c.base} />
                <Stop offset="0.7" stopColor={c.base} />
                <Stop offset="1" stopColor={c.shadow} />
              </LinearGradient>
            </Defs>
            <Path
              d={`M${60 - hRX - 1} ${hCY - 4} Q${60 - hRX - 1} ${topY + 5} ${60 - hRX + 5} ${topY} Q60 ${topY - 6} ${60 + hRX - 5} ${topY} Q${60 + hRX + 1} ${topY + 5} ${60 + hRX + 1} ${hCY - 4} Q${60 + hRX} ${hCY - 12} ${60 + hRX - 3} ${hCY - 16} L${60 - hRX + 3} ${hCY - 16} Q${60 - hRX} ${hCY - 12} ${60 - hRX - 1} ${hCY - 4} Z`}
              fill="url(#hairG)"
            />
            <Ellipse cx="60" cy={topY + 3} rx={hRX - 4} ry="6" fill={c.highlight} opacity={0.15} />
            {strandPaths(60, topY + 4, 4)}
          </G>
        ),
      };
    }

    if (style === "side_part" || style === "caesar") {
      return {
        back: null,
        front: (
          <G>
            <Defs>
              <LinearGradient id="hairG" x1="0.3" y1="0" x2="0.7" y2="1">
                <Stop offset="0" stopColor={c.highlight} />
                <Stop offset="0.35" stopColor={c.base} />
                <Stop offset="0.7" stopColor={c.base} />
                <Stop offset="1" stopColor={c.shadow} />
              </LinearGradient>
            </Defs>
            <Path
              d={`M${60 - hRX - 1} ${hCY - 4} Q${60 - hRX - 2} ${topY + 4} ${60 - hRX + 4} ${topY - 1} Q${60 - 5} ${topY - 7} ${60 + hRX - 4} ${topY - 1} Q${60 + hRX + 2} ${topY + 4} ${60 + hRX + 1} ${hCY - 4} L${60 + hRX} ${hCY - 12} L${60 - hRX} ${hCY - 12} Z`}
              fill="url(#hairG)"
            />
            <Path
              d={`M${60 - hRX + 5} ${topY + 1} Q${60 - 3} ${topY - 5} ${60 + hRX - 3} ${topY + 3}`}
              stroke={c.shadow} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity={0.3}
            />
            <Ellipse cx={60 - 5} cy={topY + 2} rx={hRX - 6} ry="5" fill={c.highlight} opacity={0.12} />
            {strandPaths(58, topY + 3, 5)}
          </G>
        ),
      };
    }

    if (style === "textured_crop" || style === "taper") {
      return {
        back: null,
        front: (
          <G>
            <Defs>
              <LinearGradient id="hairG" x1="0.3" y1="0" x2="0.7" y2="1">
                <Stop offset="0" stopColor={c.highlight} />
                <Stop offset="0.35" stopColor={c.base} />
                <Stop offset="0.7" stopColor={c.base} />
                <Stop offset="1" stopColor={c.shadow} />
              </LinearGradient>
            </Defs>
            <Path
              d={`M${60 - hRX - 1} ${hCY - 5} Q${60 - hRX - 1} ${topY + 3} ${60 - hRX + 5} ${topY - 2} Q60 ${topY - 8} ${60 + hRX - 5} ${topY - 2} Q${60 + hRX + 1} ${topY + 3} ${60 + hRX + 1} ${hCY - 5} L${60 + hRX - 2} ${hCY - 14} L${60 - hRX + 2} ${hCY - 14} Z`}
              fill="url(#hairG)"
            />
            <Path d={`M${60 - 8} ${topY - 4} Q${60 - 3} ${topY - 8} ${60 + 5} ${topY - 6} Q${60 + 10} ${topY - 4} ${60 + 12} ${topY}`} fill={c.base} />
            <Ellipse cx="60" cy={topY} rx={hRX - 4} ry="5" fill={c.highlight} opacity={0.12} />
            {strandPaths(60, topY, 6)}
          </G>
        ),
      };
    }

    if (style === "medium_natural" || style === "natural" || style === "waves") {
      return {
        back: null,
        front: (
          <G>
            <Defs>
              <LinearGradient id="hairG" x1="0.3" y1="0" x2="0.7" y2="1">
                <Stop offset="0" stopColor={c.highlight} />
                <Stop offset="0.35" stopColor={c.base} />
                <Stop offset="0.7" stopColor={c.base} />
                <Stop offset="1" stopColor={c.shadow} />
              </LinearGradient>
            </Defs>
            <Path
              d={`M${60 - hRX - 4} ${hCY + 2} Q${60 - hRX - 5} ${topY + 3} ${60 - hRX + 3} ${topY - 3} Q60 ${topY - 10} ${60 + hRX - 3} ${topY - 3} Q${60 + hRX + 5} ${topY + 3} ${60 + hRX + 4} ${hCY + 2} Q${60 + hRX + 3} ${hCY - 8} ${60 + hRX + 1} ${hCY - 14} L${60 - hRX - 1} ${hCY - 14} Q${60 - hRX - 3} ${hCY - 8} ${60 - hRX - 4} ${hCY + 2} Z`}
              fill="url(#hairG)"
            />
            <Ellipse cx={60 - hRX - 2} cy={hCY - 5} rx="5" ry="12" fill={c.base} />
            <Ellipse cx={60 + hRX + 2} cy={hCY - 5} rx="5" ry="12" fill={c.base} />
            <Ellipse cx="60" cy={topY} rx={hRX - 3} ry="6" fill={c.highlight} opacity={0.1} />
            {strandPaths(60, topY, 5)}
          </G>
        ),
      };
    }

    if (style === "slicked_back") {
      return {
        back: null,
        front: (
          <G>
            <Defs>
              <LinearGradient id="hairG" x1="0.3" y1="0" x2="0.7" y2="1">
                <Stop offset="0" stopColor={c.highlight} />
                <Stop offset="0.35" stopColor={c.base} />
                <Stop offset="0.7" stopColor={c.base} />
                <Stop offset="1" stopColor={c.shadow} />
              </LinearGradient>
            </Defs>
            <Path
              d={`M${60 - hRX} ${hCY - 6} Q${60 - hRX - 1} ${topY + 7} ${60 - hRX + 5} ${topY + 1} Q60 ${topY - 4} ${60 + hRX - 5} ${topY + 1} Q${60 + hRX + 1} ${topY + 7} ${60 + hRX} ${hCY - 6} L${60 + hRX - 2} ${hCY - 14} L${60 - hRX + 2} ${hCY - 14} Z`}
              fill="url(#hairG)"
            />
            <Ellipse cx="60" cy={topY + 5} rx={hRX - 4} ry="6" fill={c.highlight} opacity={0.2} />
            <Path d={`M${60 - 10} ${topY + 3} Q60 ${topY - 2} ${60 + 10} ${topY + 3}`} stroke={c.highlight} strokeWidth="0.9" fill="none" opacity={0.15} />
            {strandPaths(60, topY + 4, 4)}
          </G>
        ),
      };
    }

    if (style === "short_bob") {
      return {
        back: (
          <G>
            <Defs>
              <LinearGradient id="hairG" x1="0.3" y1="0" x2="0.7" y2="1">
                <Stop offset="0" stopColor={c.highlight} />
                <Stop offset="0.35" stopColor={c.base} />
                <Stop offset="0.7" stopColor={c.base} />
                <Stop offset="1" stopColor={c.shadow} />
              </LinearGradient>
            </Defs>
            <Path
              d={`M${60 - hRX - 4} ${hCY + 8} Q${60 - hRX - 5} ${topY + 3} ${60 - hRX + 4} ${topY - 2} Q60 ${topY - 8} ${60 + hRX - 4} ${topY - 2} Q${60 + hRX + 5} ${topY + 3} ${60 + hRX + 4} ${hCY + 8} Q${60 + hRX + 3} ${hCY + 14} ${60 + hRX + 1} ${hCY + 16} L${60 - hRX - 1} ${hCY + 16} Q${60 - hRX - 3} ${hCY + 14} ${60 - hRX - 4} ${hCY + 8} Z`}
              fill="url(#hairG)"
            />
          </G>
        ),
        front: (
          <G>
            <Ellipse cx="60" cy={topY + 2} rx={hRX - 3} ry="6" fill={hairC.highlight} opacity={0.12} />
            {strandPaths(60, topY + 2, 5)}
          </G>
        ),
      };
    }

    if (style === "side_part_long") {
      return {
        back: (
          <G>
            <Defs>
              <LinearGradient id="hairG" x1="0.3" y1="0" x2="0.7" y2="1">
                <Stop offset="0" stopColor={c.highlight} />
                <Stop offset="0.35" stopColor={c.base} />
                <Stop offset="0.7" stopColor={c.base} />
                <Stop offset="1" stopColor={c.shadow} />
              </LinearGradient>
            </Defs>
            <Path
              d={`M${60 - hRX - 4} ${hCY + 16} Q${60 - hRX - 5} ${topY + 3} ${60 - hRX + 4} ${topY - 2} Q${60 - 5} ${topY - 8} ${60 + hRX - 4} ${topY - 1} Q${60 + hRX + 5} ${topY + 4} ${60 + hRX + 4} ${hCY + 16} Q${60 + hRX + 3} ${hCY + 26} ${60 + hRX - 3} ${hCY + 30} L${60 - hRX + 3} ${hCY + 30} Q${60 - hRX - 3} ${hCY + 26} ${60 - hRX - 4} ${hCY + 16} Z`}
              fill="url(#hairG)"
            />
          </G>
        ),
        front: (
          <G>
            <Path d={`M${60 - 5} ${topY + 1} Q${60 + 7} ${topY - 4} ${60 + hRX} ${topY + 5}`} stroke={c.shadow} strokeWidth="1" fill="none" opacity={0.25} />
            <Ellipse cx={60 + 3} cy={topY + 3} rx={hRX - 5} ry="5" fill={c.highlight} opacity={0.1} />
            {strandPaths(60, topY + 3, 6)}
          </G>
        ),
      };
    }

    if (style === "textured_pixie") {
      return {
        back: null,
        front: (
          <G>
            <Defs>
              <LinearGradient id="hairG" x1="0.3" y1="0" x2="0.7" y2="1">
                <Stop offset="0" stopColor={c.highlight} />
                <Stop offset="0.35" stopColor={c.base} />
                <Stop offset="0.7" stopColor={c.base} />
                <Stop offset="1" stopColor={c.shadow} />
              </LinearGradient>
            </Defs>
            <Path
              d={`M${60 - hRX - 3} ${hCY + 2} Q${60 - hRX - 3} ${topY + 3} ${60 - hRX + 5} ${topY - 3} Q60 ${topY - 9} ${60 + hRX - 5} ${topY - 3} Q${60 + hRX + 3} ${topY + 3} ${60 + hRX + 3} ${hCY + 2} L${60 + hRX + 1} ${hCY - 12} L${60 - hRX - 1} ${hCY - 12} Z`}
              fill="url(#hairG)"
            />
            <Path d={`M${60 - 6} ${topY - 4} Q60 ${topY - 9} ${60 + 8} ${topY - 3}`} fill={c.base} />
            <Ellipse cx={60 - hRX} cy={hCY - 5} rx="4" ry="9" fill={c.base} />
            <Ellipse cx={60 + hRX} cy={hCY - 5} rx="4" ry="9" fill={c.base} />
            {strandPaths(60, topY, 5)}
          </G>
        ),
      };
    }

    if (style === "ponytail_sleek") {
      return {
        back: (
          <G>
            <Defs>
              <LinearGradient id="hairG" x1="0.3" y1="0" x2="0.7" y2="1">
                <Stop offset="0" stopColor={c.highlight} />
                <Stop offset="0.35" stopColor={c.base} />
                <Stop offset="0.7" stopColor={c.base} />
                <Stop offset="1" stopColor={c.shadow} />
              </LinearGradient>
            </Defs>
            <Path
              d={`M${60 - hRX} ${hCY - 6} Q${60 - hRX - 1} ${topY + 5} ${60 - hRX + 5} ${topY} Q60 ${topY - 5} ${60 + hRX - 5} ${topY} Q${60 + hRX + 1} ${topY + 5} ${60 + hRX} ${hCY - 6} L${60 + hRX - 2} ${hCY - 14} L${60 - hRX + 2} ${hCY - 14} Z`}
              fill="url(#hairG)"
            />
            <Path
              d={`M60 ${hCY - 2} Q68 ${hCY + 4} 69 ${hCY + 22} Q68 ${hCY + 40} 63 ${hCY + 50}`}
              stroke={c.base} strokeWidth="6.5" fill="none" strokeLinecap="round"
            />
            <Path
              d={`M60 ${hCY - 2} Q68 ${hCY + 4} 69 ${hCY + 22} Q68 ${hCY + 40} 63 ${hCY + 50}`}
              stroke={c.shadow} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity={0.3}
            />
            <Ellipse cx="61" cy={hCY - 1} rx="4" ry="2.5" fill={c.base} />
          </G>
        ),
        front: (
          <G>
            <Ellipse cx="60" cy={topY + 4} rx={hRX - 4} ry="5" fill={hairC.highlight} opacity={0.15} />
          </G>
        ),
      };
    }

    if (style === "natural_medium") {
      return {
        back: (
          <G>
            <Defs>
              <LinearGradient id="hairG" x1="0.3" y1="0" x2="0.7" y2="1">
                <Stop offset="0" stopColor={c.highlight} />
                <Stop offset="0.35" stopColor={c.base} />
                <Stop offset="0.7" stopColor={c.base} />
                <Stop offset="1" stopColor={c.shadow} />
              </LinearGradient>
            </Defs>
            <Path
              d={`M${60 - hRX - 4} ${hCY + 10} Q${60 - hRX - 5} ${topY + 3} ${60 - hRX + 4} ${topY - 2} Q60 ${topY - 10} ${60 + hRX - 4} ${topY - 2} Q${60 + hRX + 5} ${topY + 3} ${60 + hRX + 4} ${hCY + 10} Q${60 + hRX + 3} ${hCY + 22} ${60 + hRX - 2} ${hCY + 26} L${60 - hRX + 2} ${hCY + 26} Q${60 - hRX - 3} ${hCY + 22} ${60 - hRX - 4} ${hCY + 10} Z`}
              fill="url(#hairG)"
            />
            <Ellipse cx={60 - hRX - 2} cy={hCY + 3} rx="6" ry="18" fill={c.base} />
            <Ellipse cx={60 + hRX + 2} cy={hCY + 3} rx="6" ry="18" fill={c.base} />
          </G>
        ),
        front: (
          <G>
            <Ellipse cx="60" cy={topY + 2} rx={hRX - 3} ry="6" fill={hairC.highlight} opacity={0.1} />
            {strandPaths(60, topY + 2, 5)}
          </G>
        ),
      };
    }

    if (style === "bun_top") {
      return {
        back: null,
        front: (
          <G>
            <Defs>
              <LinearGradient id="hairG" x1="0.3" y1="0" x2="0.7" y2="1">
                <Stop offset="0" stopColor={c.highlight} />
                <Stop offset="0.35" stopColor={c.base} />
                <Stop offset="0.7" stopColor={c.base} />
                <Stop offset="1" stopColor={c.shadow} />
              </LinearGradient>
            </Defs>
            <Path
              d={`M${60 - hRX} ${hCY - 6} Q${60 - hRX - 1} ${topY + 5} ${60 - hRX + 5} ${topY} Q60 ${topY - 5} ${60 + hRX - 5} ${topY} Q${60 + hRX + 1} ${topY + 5} ${60 + hRX} ${hCY - 6} L${60 + hRX - 2} ${hCY - 14} L${60 - hRX + 2} ${hCY - 14} Z`}
              fill="url(#hairG)"
            />
            <Ellipse cx="60" cy={topY - 8} rx="9" ry="9" fill={c.base} />
            <Ellipse cx="60" cy={topY - 10} rx="6" ry="5" fill={c.highlight} opacity={0.15} />
            <Path d={`M57 ${topY - 8} Q60 ${topY - 4} 63 ${topY - 8}`} stroke={c.shadow} strokeWidth="0.6" fill="none" opacity={0.2} />
            <Ellipse cx="60" cy={topY + 3} rx={hRX - 4} ry="5" fill={c.highlight} opacity={0.1} />
          </G>
        ),
      };
    }

    return {
      back: null,
      front: (
        <G>
          <Defs>
            <LinearGradient id="hairG" x1="0.3" y1="0" x2="0.7" y2="1">
              <Stop offset="0" stopColor={c.highlight} />
              <Stop offset="0.35" stopColor={c.base} />
              <Stop offset="0.7" stopColor={c.base} />
              <Stop offset="1" stopColor={c.shadow} />
            </LinearGradient>
          </Defs>
          <Path
            d={`M${60 - hRX - 1} ${hCY - 4} Q${60 - hRX - 1} ${topY + 5} ${60 - hRX + 5} ${topY} Q60 ${topY - 6} ${60 + hRX - 5} ${topY} Q${60 + hRX + 1} ${topY + 5} ${60 + hRX + 1} ${hCY - 4} Q${60 + hRX} ${hCY - 12} ${60 + hRX - 3} ${hCY - 16} L${60 - hRX + 3} ${hCY - 16} Q${60 - hRX} ${hCY - 12} ${60 - hRX - 1} ${hCY - 4} Z`}
            fill="url(#hairG)"
          />
          {strandPaths(60, topY + 4, 4)}
        </G>
      ),
    };
  }, [vs.hairStyle, hairC, headCY, headRX, headRY, groomingLevel]);

  const shoesFill = useMemo(() => {
    const s = vs.equippedShoesStyle;
    if (s === "casual") return { fill: "#D0C8B8", sole: "#B0A898", accent: "#C0B8A8" };
    if (s === "sneaker") return { fill: "#F0F0F0", sole: "#E0E0E0", accent: "#C0C0C0" };
    if (s === "formal") return { fill: "#0A0A0A", sole: "#1A1A1A", accent: "#222222" };
    if (s === "boot") return { fill: "#1A1210", sole: "#0E0A08", accent: "#2A2018" };
    return { fill: outfit.shoeBase, sole: outfit.pantsShadow, accent: outfit.shoeBase };
  }, [vs.equippedShoesStyle, outfit]);

  const isBootStyle = vs.equippedShoesStyle === "boot";
  const bootTopY = isBootStyle ? 295 : 305;

  return (
    <View style={[styles.container, size === "full" && styles.fullContainer]}>
      <Svg width={w} height={h} viewBox="0 0 120 360">
        <Defs>
          <RadialGradient id="fitnessGlow" cx="0.5" cy="0.45" rx="0.45" ry="0.4">
            <Stop offset="0" stopColor="#00E676" stopOpacity="0.06" />
            <Stop offset="1" stopColor="#00E676" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* 1. Ground shadow */}
        {showShadow && (
          <Ellipse cx="60" cy="340" rx="36" ry="5" fill="#00000040" />
        )}

        {/* 2. Prestige aura */}
        {vs.prestigeStage === "subtle" && (
          <Ellipse cx="60" cy="190" rx="50" ry="160" fill="none" stroke="#7C5CFC" strokeWidth="1" opacity="0.15" />
        )}
        {vs.prestigeStage === "visible" && (
          <G>
            <Ellipse cx="60" cy="190" rx="50" ry="160" fill="none" stroke="#7C5CFC" strokeWidth="2" opacity="0.3" />
            <Rect x="18" y="60" width="3" height="3" rx="1" fill="#C8A030" opacity="0.6" transform="rotate(45 19.5 61.5)" />
            <Rect x="97" y="80" width="3" height="3" rx="1" fill="#C8A030" opacity="0.6" transform="rotate(45 98.5 81.5)" />
            <Rect x="12" y="180" width="3" height="3" rx="1" fill="#C8A030" opacity="0.6" transform="rotate(45 13.5 181.5)" />
            <Rect x="104" y="200" width="3" height="3" rx="1" fill="#C8A030" opacity="0.6" transform="rotate(45 105.5 201.5)" />
            <Rect x="25" y="280" width="3" height="3" rx="1" fill="#C8A030" opacity="0.6" transform="rotate(45 26.5 281.5)" />
            <Rect x="92" y="300" width="3" height="3" rx="1" fill="#C8A030" opacity="0.6" transform="rotate(45 93.5 301.5)" />
          </G>
        )}
        {vs.prestigeStage === "legendary" && (
          <G>
            <Ellipse cx="60" cy="190" rx="52" ry="162" fill="none" stroke="#F5C842" strokeWidth="2.5" opacity="0.12" />
            <Ellipse cx="60" cy="190" rx="48" ry="156" fill="none" stroke="#F5C842" strokeWidth="1.5" opacity="0.08" />
            <Ellipse cx="60" cy="190" rx="44" ry="150" fill="none" stroke="#F5C842" strokeWidth="1" opacity="0.05" />
            <Rect x="10" y="50" width="3" height="3" rx="1" fill="#F5C842" opacity="0.6" transform="rotate(45 11.5 51.5)" />
            <Rect x="105" y="60" width="3" height="3" rx="1" fill="#F5C842" opacity="0.6" transform="rotate(45 106.5 61.5)" />
            <Rect x="8" y="140" width="3" height="3" rx="1" fill="#F5C842" opacity="0.6" transform="rotate(45 9.5 141.5)" />
            <Rect x="108" y="150" width="3" height="3" rx="1" fill="#F5C842" opacity="0.6" transform="rotate(45 109.5 151.5)" />
            <Rect x="12" y="230" width="3" height="3" rx="1" fill="#F5C842" opacity="0.6" transform="rotate(45 13.5 231.5)" />
            <Rect x="104" y="240" width="3" height="3" rx="1" fill="#F5C842" opacity="0.6" transform="rotate(45 105.5 241.5)" />
            <Rect x="18" y="290" width="3" height="3" rx="1" fill="#F5C842" opacity="0.6" transform="rotate(45 19.5 291.5)" />
            <Rect x="98" y="300" width="3" height="3" rx="1" fill="#F5C842" opacity="0.6" transform="rotate(45 99.5 301.5)" />
            <Rect x="30" y="320" width="3" height="3" rx="1" fill="#F5C842" opacity="0.6" transform="rotate(45 31.5 321.5)" />
            <Rect x="86" y="325" width="3" height="3" rx="1" fill="#F5C842" opacity="0.6" transform="rotate(45 87.5 326.5)" />
            <Rect x="55" y="22" width="3" height="3" rx="1" fill="#F5C842" opacity="0.6" transform="rotate(45 56.5 23.5)" />
            <Rect x="65" y="340" width="3" height="3" rx="1" fill="#F5C842" opacity="0.6" transform="rotate(45 66.5 341.5)" />
          </G>
        )}

        {hasFitnessGlow && (
          <Ellipse cx="60" cy="190" rx="50" ry="140" fill="url(#fitnessGlow)" />
        )}

        {/* 3. Shoes */}
        <G>
          {isBootStyle ? (
            <G>
              <Path d={`M24 ${bootTopY} L24 314 Q24 320 36 320 L62 320 Q66 320 66 314 L66 ${bootTopY} Z`} fill={shoesFill.fill} />
              <Path d={`M56 ${bootTopY} L56 314 Q56 320 60 320 L88 320 Q96 320 96 314 L96 ${bootTopY} Z`} fill={shoesFill.fill} />
              <Rect x="24" y="318" width="42" height="3" rx="1" fill={shoesFill.sole} />
              <Rect x="56" y="318" width="40" height="3" rx="1" fill={shoesFill.sole} />
              <Line x1="35" y1={bootTopY + 3} x2="50" y2={bootTopY + 3} stroke={shoesFill.accent} strokeWidth="0.8" opacity="0.5" />
              <Line x1="35" y1={bootTopY + 7} x2="50" y2={bootTopY + 7} stroke={shoesFill.accent} strokeWidth="0.8" opacity="0.5" />
              <Line x1="35" y1={bootTopY + 11} x2="50" y2={bootTopY + 11} stroke={shoesFill.accent} strokeWidth="0.8" opacity="0.5" />
              <Line x1="35" y1={bootTopY + 15} x2="50" y2={bootTopY + 15} stroke={shoesFill.accent} strokeWidth="0.8" opacity="0.4" />
              <Line x1="67" y1={bootTopY + 3} x2="82" y2={bootTopY + 3} stroke={shoesFill.accent} strokeWidth="0.8" opacity="0.5" />
              <Line x1="67" y1={bootTopY + 7} x2="82" y2={bootTopY + 7} stroke={shoesFill.accent} strokeWidth="0.8" opacity="0.5" />
              <Line x1="67" y1={bootTopY + 11} x2="82" y2={bootTopY + 11} stroke={shoesFill.accent} strokeWidth="0.8" opacity="0.5" />
              <Line x1="67" y1={bootTopY + 15} x2="82" y2={bootTopY + 15} stroke={shoesFill.accent} strokeWidth="0.8" opacity="0.4" />
            </G>
          ) : (
            <G>
              <Path d={`M24 304 Q24 318 36 320 L62 320 Q66 320 66 314 L66 305 Z`} fill={shoesFill.fill} />
              <Path d={`M56 304 L56 314 Q56 320 60 320 L88 320 Q96 320 96 314 L96 304 Z`} fill={shoesFill.fill} />
              <Rect x="24" y="318" width="42" height="3" rx="1" fill={shoesFill.sole} />
              <Rect x="56" y="318" width="40" height="3" rx="1" fill={shoesFill.sole} />
              {vs.equippedShoesStyle === "sneaker" && (
                <G>
                  <Path d="M30 310 Q40 306 50 312" stroke={shoesFill.accent} strokeWidth="1.2" fill="none" opacity="0.5" />
                  <Path d="M62 310 Q72 306 82 312" stroke={shoesFill.accent} strokeWidth="1.2" fill="none" opacity="0.5" />
                  <Ellipse cx="40" cy="307" rx="8" ry="3" fill="white" opacity="0.08" />
                  <Ellipse cx="72" cy="307" rx="8" ry="3" fill="white" opacity="0.08" />
                </G>
              )}
              {vs.equippedShoesStyle === "formal" && (
                <G>
                  <Path d="M30 308 Q42 306 52 308" stroke="white" strokeWidth="0.8" fill="none" opacity="0.15" />
                  <Path d="M64 308 Q76 306 86 308" stroke="white" strokeWidth="0.8" fill="none" opacity="0.15" />
                  <Path d="M36 312 L54 312" stroke="#222222" strokeWidth="0.6" fill="none" opacity="0.3" />
                  <Path d="M68 312 L86 312" stroke="#222222" strokeWidth="0.6" fill="none" opacity="0.3" />
                </G>
              )}
              {vs.equippedShoesStyle === "casual" && (
                <G>
                  <Line x1="36" y1="308" x2="48" y2="308" stroke={shoesFill.accent} strokeWidth="0.6" opacity="0.4" />
                  <Line x1="36" y1="310" x2="48" y2="310" stroke={shoesFill.accent} strokeWidth="0.6" opacity="0.4" />
                  <Line x1="36" y1="312" x2="48" y2="312" stroke={shoesFill.accent} strokeWidth="0.6" opacity="0.4" />
                  <Line x1="68" y1="308" x2="80" y2="308" stroke={shoesFill.accent} strokeWidth="0.6" opacity="0.4" />
                  <Line x1="68" y1="310" x2="80" y2="310" stroke={shoesFill.accent} strokeWidth="0.6" opacity="0.4" />
                  <Line x1="68" y1="312" x2="80" y2="312" stroke={shoesFill.accent} strokeWidth="0.6" opacity="0.4" />
                </G>
              )}
            </G>
          )}
        </G>

        {/* 4. Legs / Pants */}
        <G>
          <Rect x="32" y="194" width="24" height="112" rx="4" fill={outfit.pants} />
          <Rect x="64" y="194" width="24" height="112" rx="4" fill={outfit.pants} />
          <Rect x="42" y="194" width="36" height="18" rx="0" fill={outfit.pants} />
          <Line x1="44" y1="200" x2="44" y2="304" stroke={outfit.pantsShadow} strokeWidth="1" />
          <Line x1="76" y1="200" x2="76" y2="304" stroke={outfit.pantsShadow} strokeWidth="1" />
        </G>

        {/* 5. Belt */}
        <Rect x="30" y="186" width="60" height="10" rx="2" fill={outfit.belt} />
        <Rect x="53" y="187" width="14" height="8" rx="1.5" fill={outfit.buckle} />

        {/* 6. Torso / Shirt */}
        <Path d={`M${torsoLX} ${torsoTopY} L${torsoRX} ${torsoTopY} L${waistRX} 188 L${waistLX} 188 Z`} fill={outfit.shirt} />

        {/* 7. Arms */}
        <Path d={`M${torsoLX} ${torsoTopY} L10 ${torsoTopY} L6 172 L${torsoLX} 176 Z`} fill={outfit.shirt} />
        <Path d={`M${torsoRX} ${torsoTopY} L110 ${torsoTopY} L114 172 L${torsoRX} 176 Z`} fill={outfit.shirt} />

        {/* 8. Collar */}
        <Ellipse cx="60" cy={torsoTopY} rx="12" ry="5" fill={outfit.collar} />

        {/* 9. Shirt details */}
        <Line x1="60" y1={torsoTopY + 4} x2="60" y2="184" stroke={outfit.shirtShadow} strokeWidth="1.5" />
        <Line x1={String(torsoLX)} y1={String(torsoTopY)} x2={String(torsoLX + 10)} y2={String(torsoTopY + 10)} stroke={outfit.shirtShadow} strokeWidth="1" />
        <Line x1={String(torsoRX)} y1={String(torsoTopY)} x2={String(torsoRX - 10)} y2={String(torsoTopY + 10)} stroke={outfit.shirtShadow} strokeWidth="1" />
        <Rect x={String(waistLX)} y="184" width={String(waistRX - waistLX)} height="5" fill={outfit.shirtShadow} />

        {/* 10. Sleeve cuffs */}
        <Rect x="6" y="166" width="16" height="9" rx="2" fill={outfit.collar} />
        <Rect x="98" y="166" width="16" height="9" rx="2" fill={outfit.collar} />

        {/* 11. Neck */}
        <Rect x={String(neckX)} y={String(neckY)} width={String(neckW)} height="18" rx="3" fill={skin.base} />

        {/* 12. Head base (skin) — shape varies by faceShape */}
        <Ellipse cx="60" cy={String(headCY)} rx={String(headRX)} ry={String(headRY)} fill={skin.base} />
        {faceShape === "square" && (
          <Path
            d={`M${60 - headRX + 3} ${headCY + 4} L${60 - headRX + 1} ${headCY + headRY - 4} L${60 - headRX + 6} ${headCY + headRY} L${60 + headRX - 6} ${headCY + headRY} L${60 + headRX - 1} ${headCY + headRY - 4} L${60 + headRX - 3} ${headCY + 4}`}
            fill={skin.base}
            stroke="none"
          />
        )}

        {/* 13. Ears */}
        <Ellipse cx="36" cy={String(headCY)} rx="5" ry="7" fill={skin.base} />
        <Ellipse cx="84" cy={String(headCY)} rx="5" ry="7" fill={skin.base} />
        <Ellipse cx="36" cy={String(headCY)} rx="2.5" ry="3.5" fill={skin.shadow} opacity="0.35" />
        <Ellipse cx="84" cy={String(headCY)} rx="2.5" ry="3.5" fill={skin.shadow} opacity="0.35" />

        {/* 14. Hair (back layer if long hair) */}
        {hairEl.back}

        {/* 15. Face shadow */}
        <Ellipse cx="60" cy={String(faceShadowY)} rx="20" ry="6" fill={skin.shadow} opacity="0.25" />

        {/* 16. Eyebrows */}
        <Path d={browD.l} stroke={hairC.base} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <Path d={browD.r} stroke={hairC.base} strokeWidth="2.2" fill="none" strokeLinecap="round" />

        {/* 17. Eyes */}
        {eyesEl}

        {/* 18. Nose */}
        <Path d={`M58 ${noseTopY} L56 ${noseBotY} Q60 ${noseBotY + 3} 64 ${noseBotY} L62 ${noseTopY}`} stroke={skin.shadow} strokeWidth="1.2" fill="none" />

        {/* 19. Mouth */}
        <Path d={mouthD} stroke="#C07060" strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* 20. Hair front layer */}
        {hairEl.front}

        {/* Hands (skin) */}
        <Ellipse cx="14" cy="180" rx="9" ry="7" fill={skin.base} />
        <Ellipse cx="106" cy="180" rx="9" ry="7" fill={skin.base} />

        {/* 21. Chain / Necklace */}
        {vs.equippedAccessoryStyle === "chain" && (
          <G>
            <Path d="M52 90 Q60 106 60 116 Q60 106 68 90" stroke="#C8A030" strokeWidth="2" fill="none" strokeLinecap="round" />
            <Circle cx="60" cy="118" r="4" fill="#C8A030" />
            <Circle cx="60" cy="118" r="2" fill="#8A6010" />
          </G>
        )}

        {/* 22. Watch */}
        {vs.equippedWatchStyle === "basic" && (
          <G>
            <Rect x="98" y="163" width="16" height="14" rx="2" fill="#5A4020" />
            <Rect x="100" y="164" width="12" height="10" rx="2" fill="#C8A030" />
            <Rect x="101" y="165" width="10" height="8" rx="1.5" fill="#0A0A18" />
            <Line x1="106" y1="169" x2="106" y2="166" stroke="#C8A030" strokeWidth="1.2" />
            <Line x1="106" y1="169" x2="109" y2="169" stroke="#C8A030" strokeWidth="1" />
          </G>
        )}
        {(vs.equippedWatchStyle === "refined" || vs.equippedWatchStyle === "sport_watch" || vs.equippedWatchStyle === "premium_watch") && (
          <G>
            <Rect x="97" y="161" width="18" height="18" rx="3" fill="#8A7040" />
            <Rect x="99" y="162" width="14" height="14" rx="3" fill="#D4A840" />
            <Circle cx="106" cy="169" r="5" fill="#0A0A18" />
            <Circle cx="106" cy="165" r="0.8" fill="#D4A840" />
            <Circle cx="110" cy="169" r="0.8" fill="#D4A840" />
            <Circle cx="106" cy="173" r="0.8" fill="#D4A840" />
            <Circle cx="102" cy="169" r="0.8" fill="#D4A840" />
            <Line x1="106" y1="166" x2="106" y2="169" stroke="#D4A840" strokeWidth="0.5" />
            <Line x1="106" y1="169" x2="108.5" y2="169" stroke="#D4A840" strokeWidth="0.4" />
          </G>
        )}
        {(vs.equippedWatchStyle === "elite" || vs.equippedWatchStyle === "luxury_watch") && (
          <G>
            <Rect x="97" y="161" width="18" height="18" rx="3" fill="#303040" />
            <Rect x="98" y="162" width="16" height="14" rx="4" fill="#5050A0" opacity="0.8" />
            <Rect x="100" y="163" width="12" height="12" rx="3" fill="#1A1A30" />
            <Circle cx="106" cy="169" r="4.5" fill="#0A0A20" />
            <Rect x="114" y="167" width="3" height="4" rx="1" fill="#4040A0" />
            <Circle cx="106" cy="169" r="5.5" fill="none" stroke="#6060FF" strokeWidth="0.8" opacity="0.6" />
            <Line x1="106" y1="165.5" x2="106" y2="169" stroke="#8080FF" strokeWidth="0.5" />
            <Line x1="106" y1="169" x2="109" y2="169" stroke="#8080FF" strokeWidth="0.4" />
          </G>
        )}

        {/* 23. Ring */}
        {vs.equippedAccessoryStyle === "ring" && (
          <G>
            <Ellipse cx="109" cy="184" rx="4" ry="2.5" stroke="#D4A840" strokeWidth="2" fill="none" />
            <Circle cx="109" cy="182" r="1.8" fill="#4488FF" />
          </G>
        )}

        {/* 24. Eyewear */}
        {vs.equippedEyewearStyle === "thin-frame" && (
          <G>
            <Rect x="41" y={String(eyeY - 5)} width="18" height="12" rx="4" fill="none" stroke="#D4A840" strokeWidth="1.5" />
            <Rect x="61" y={String(eyeY - 5)} width="18" height="12" rx="4" fill="none" stroke="#D4A840" strokeWidth="1.5" />
            <Line x1="59" y1={String(eyeY + 1)} x2="61" y2={String(eyeY + 1)} stroke="#D4A840" strokeWidth="1.5" />
            <Line x1="41" y1={String(eyeY + 1)} x2="34" y2={String(eyeY + 3)} stroke="#D4A840" strokeWidth="1.2" />
            <Line x1="79" y1={String(eyeY + 1)} x2="86" y2={String(eyeY + 3)} stroke="#D4A840" strokeWidth="1.2" />
          </G>
        )}
        {vs.equippedEyewearStyle === "bold-frame" && (
          <G>
            <Rect x="41" y={String(eyeY - 5)} width="18" height="12" rx="5" fill="#FFFFFF08" stroke="#1A1A1A" strokeWidth="3" />
            <Rect x="61" y={String(eyeY - 5)} width="18" height="12" rx="5" fill="#FFFFFF08" stroke="#1A1A1A" strokeWidth="3" />
            <Line x1="59" y1={String(eyeY + 1)} x2="61" y2={String(eyeY + 1)} stroke="#1A1A1A" strokeWidth="3" />
            <Line x1="41" y1={String(eyeY + 1)} x2="34" y2={String(eyeY + 3)} stroke="#1A1A1A" strokeWidth="2" />
            <Line x1="79" y1={String(eyeY + 1)} x2="86" y2={String(eyeY + 3)} stroke="#1A1A1A" strokeWidth="2" />
          </G>
        )}
        {vs.equippedEyewearStyle === "sunglasses" && (
          <G>
            <Rect x="40" y={String(eyeY - 5)} width="20" height="13" rx="6" fill="#00000080" stroke="#1A1A2A" strokeWidth="2" />
            <Rect x="60" y={String(eyeY - 5)} width="20" height="13" rx="6" fill="#00000080" stroke="#1A1A2A" strokeWidth="2" />
            <Rect x="59" y={String(eyeY)} width="2" height="3" rx="1" fill="#1A1A2A" />
            <Line x1="40" y1={String(eyeY + 1)} x2="34" y2={String(eyeY + 3)} stroke="#1A1A2A" strokeWidth="1.5" />
            <Line x1="80" y1={String(eyeY + 1)} x2="86" y2={String(eyeY + 3)} stroke="#1A1A2A" strokeWidth="1.5" />
            <Line x1="44" y1={String(eyeY - 2)} x2="50" y2={String(eyeY - 2)} stroke="white" strokeWidth="1" opacity="0.3" />
            <Line x1="64" y1={String(eyeY - 2)} x2="70" y2={String(eyeY - 2)} stroke="white" strokeWidth="1" opacity="0.3" />
          </G>
        )}

        {/* 25. Lapel pin */}
        {vs.equippedAccessoryStyle === "pin" && (
          <G>
            <Circle cx="40" cy="108" r="5" fill="#C8A030" />
            <Circle cx="40" cy="108" r="3" fill="#0A0A18" />
            <Path d="M40 105 L41 107.5 L43 106.5 L41 108 L43 109.5 L41 108.5 L40 111 L39 108.5 L37 109.5 L39 108 L37 106.5 L39 107.5 Z" fill="#C8A030" />
          </G>
        )}

        {/* Default dog-tag + bracelet when no accessory equipped */}
        {!vs.equippedAccessoryStyle && (
          <G>
            <Path d="M52 90 Q56 100 57 105 Q58 100 62 90" stroke="#9A9AA0" strokeWidth="0.8" fill="none" opacity="0.5" />
            <Rect x="54" y="103" width="6" height="10" rx="1.5" fill="#A8A8B0" opacity="0.6" />
            <Line x1="55.5" y1="106" x2="58.5" y2="106" stroke="#C0C0C8" strokeWidth="0.3" opacity="0.4" />
            <Line x1="55.5" y1="108" x2="58.5" y2="108" stroke="#C0C0C8" strokeWidth="0.3" opacity="0.3" />
            <Line x1="55.5" y1="110" x2="58.5" y2="110" stroke="#C0C0C8" strokeWidth="0.3" opacity="0.25" />
            <Rect x="2" y="170" width="14" height="6" rx="2.5" fill="#6B4226" opacity="0.82" />
            <Rect x="3.5" y="171" width="11" height="4" rx="1.5" fill="#8B5A30" opacity="0.5" />
            <Line x1="4" y1="173" x2="14" y2="173" stroke="#5A3418" strokeWidth="0.4" opacity="0.35" />
            <Circle cx="9" cy="173" r="0.8" fill="#8B6A40" opacity="0.5" />
          </G>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullContainer: {
    flex: 1,
  },
});

export const CharacterRenderer = memo(CharacterRendererInner);

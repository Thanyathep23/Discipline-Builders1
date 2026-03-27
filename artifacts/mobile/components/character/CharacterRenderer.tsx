import React, { memo, useMemo, useId } from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  G, Path, Rect, Ellipse, Circle, Line, Defs,
  LinearGradient, RadialGradient, Stop,
} from "react-native-svg";
import type {
  CharacterVisualState, BodyType, CharacterView,
  PostureStage, OutfitTier, PrestigeStage, RefinementStage,
} from "@/lib/characterEngine";

const SIZE_MAP = {
  small:  { w: 90,  h: 285 },
  medium: { w: 150, h: 475 },
  large:  { w: 192, h: 608 },
  full:   { w: 240, h: 760 },
};

interface SkinPalette { light: string; base: string; deep: string; shadow: string; }
const SKIN: Record<string, SkinPalette> = {
  "tone-1": { light: "#FFF0D8", base: "#FDDCB5", deep: "#E8C090", shadow: "#D4A870" },
  "tone-2": { light: "#F5C898", base: "#EDB98A", deep: "#D4986A", shadow: "#BC7840" },
  "tone-3": { light: "#DCA878", base: "#C8956C", deep: "#A87248", shadow: "#8A5828" },
  "tone-4": { light: "#9A7050", base: "#8B5E3C", deep: "#6A4020", shadow: "#501E08" },
  "tone-5": { light: "#703820", base: "#5C3317", deep: "#3E1E0A", shadow: "#280C00" },
};

interface ShirtPalette {
  highlight: string; mid: string; base: string;
  shadow: string; deepShadow: string; cuff: string;
}
interface PantsPalette { base: string; mid: string; deep: string; }
interface OutfitPalette { shirt: ShirtPalette; pants: PantsPalette; }

const OUTFITS: Record<OutfitTier, OutfitPalette> = {
  starter: {
    shirt: { highlight: "#FAFAFA", mid: "#F0F0F0", base: "#E8E8E8", shadow: "#D0D0D0", deepShadow: "#B0B0B0", cuff: "#F4F4F4" },
    pants: { base: "#161628", mid: "#1E1E36", deep: "#0E0E1C" },
  },
  rising: {
    shirt: { highlight: "#EEEEF8", mid: "#E4E4F0", base: "#D8D8E8", shadow: "#C0C0D0", deepShadow: "#9898B0", cuff: "#E8E8F4" },
    pants: { base: "#141422", mid: "#1C1C30", deep: "#0A0A14" },
  },
  premium: {
    shirt: { highlight: "#D8D8E8", mid: "#C4C4D4", base: "#B0B0C4", shadow: "#9090A8", deepShadow: "#606078", cuff: "#CCCCDC" },
    pants: { base: "#101018", mid: "#181826", deep: "#080810" },
  },
  elite: {
    shirt: { highlight: "#303042", mid: "#242436", base: "#1A1A2A", shadow: "#10101E", deepShadow: "#070710", cuff: "#2A2A3E" },
    pants: { base: "#0A0A12", mid: "#121220", deep: "#05050A" },
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

interface PostureParams { headCY: number; torsoTopY: number; shoulderW: number; widthFactor: number; }
const POSTURE: Record<PostureStage, PostureParams> = {
  neutral:  { headCY: 46, torsoTopY: 96, shoulderW: 80, widthFactor: 1.0 },
  upright:  { headCY: 44, torsoTopY: 94, shoulderW: 82, widthFactor: 1.01 },
  athletic: { headCY: 42, torsoTopY: 92, shoulderW: 86, widthFactor: 1.03 },
  peak:     { headCY: 40, torsoTopY: 90, shoulderW: 90, widthFactor: 1.05 },
};

interface Props {
  visualState: CharacterVisualState;
  size?: "small" | "medium" | "large" | "full";
  showShadow?: boolean;
  view?: CharacterView;
}

function CharacterRendererInner({ visualState, size = "large", showShadow = true, view: _view = "front" }: Props) {
  const vs = visualState;
  const uid = useId().replace(/:/g, "_");
  const bodyType: BodyType = vs.bodyType ?? "male";
  const isMale = bodyType === "male";

  const skin = SKIN[vs.skinTone] ?? SKIN["tone-3"];
  const outfit = OUTFITS[vs.outfitTier] ?? OUTFITS.starter;
  const hairC = HAIR_COLORS[vs.hairColor] ?? HAIR_COLORS["black"];
  const groomingLevel = GROOMING[vs.refinementStage] ?? 0;
  const confidenceFace = CONFIDENCE[vs.refinementStage] ?? 0;
  const faceShape = vs.faceShape ?? "oval";
  const eyeShape = vs.eyeShape ?? "almond";

  const po = POSTURE[vs.postureStage] ?? POSTURE.neutral;
  const headCY = po.headCY;
  const torsoTopY = po.torsoTopY;
  const shoulderW = isMale ? po.shoulderW : po.shoulderW - 8;
  const wf = po.widthFactor;

  const fc = headCY;
  const headRX = faceShape === "round" ? 22 : 21;
  const headRY = faceShape === "round" ? 23 : 24;

  const hipLX = isMale ? 28 : 25;
  const hipRX = isMale ? 92 : 95;

  const { w, h } = SIZE_MAP[size] ?? SIZE_MAP.large;

  const shirtS = outfit.shirt;
  const pantsP = outfit.pants;

  const gid = (name: string) => `${uid}${name}`;

  const defsEl = useMemo(() => (
    <Defs>
      <RadialGradient id={gid("skinFace")} cx="40%" cy="35%">
        <Stop offset="0%" stopColor={skin.light} />
        <Stop offset="60%" stopColor={skin.base} />
        <Stop offset="100%" stopColor={skin.deep} />
      </RadialGradient>
      <LinearGradient id={gid("skinBody")} x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%" stopColor={skin.deep} />
        <Stop offset="30%" stopColor={skin.base} />
        <Stop offset="70%" stopColor={skin.base} />
        <Stop offset="100%" stopColor={skin.deep} />
      </LinearGradient>
      <RadialGradient id={gid("skinHand")} cx="50%" cy="40%">
        <Stop offset="0%" stopColor={skin.light} />
        <Stop offset="100%" stopColor={skin.base} />
      </RadialGradient>
      <LinearGradient id={gid("shirtBody")} x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%" stopColor={shirtS.shadow} />
        <Stop offset="15%" stopColor={shirtS.mid} />
        <Stop offset="50%" stopColor={shirtS.highlight} />
        <Stop offset="85%" stopColor={shirtS.mid} />
        <Stop offset="100%" stopColor={shirtS.shadow} />
      </LinearGradient>
      <LinearGradient id={gid("shirtFold")} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="transparent" />
        <Stop offset="100%" stopColor={shirtS.deepShadow} stopOpacity="0.4" />
      </LinearGradient>
      <LinearGradient id={gid("pantsGrad")} x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%" stopColor={pantsP.deep} />
        <Stop offset="25%" stopColor={pantsP.mid} />
        <Stop offset="75%" stopColor={pantsP.mid} />
        <Stop offset="100%" stopColor={pantsP.deep} />
      </LinearGradient>
      <LinearGradient id={gid("beltTex")} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.12" />
        <Stop offset="100%" stopColor="transparent" />
      </LinearGradient>
      <RadialGradient id={gid("irisL")} cx="55%" cy="45%">
        <Stop offset="0%" stopColor="#4466AA" />
        <Stop offset="100%" stopColor="#1A1A36" />
      </RadialGradient>
      <RadialGradient id={gid("irisR")} cx="55%" cy="45%">
        <Stop offset="0%" stopColor="#4466AA" />
        <Stop offset="100%" stopColor="#1A1A36" />
      </RadialGradient>
      <LinearGradient id={gid("hairGrad")} x1="0.3" y1="0" x2="0.7" y2="1">
        <Stop offset="0%" stopColor={hairC.highlight} />
        <Stop offset="35%" stopColor={hairC.base} />
        <Stop offset="70%" stopColor={hairC.base} />
        <Stop offset="100%" stopColor={hairC.shadow} />
      </LinearGradient>
      <LinearGradient id={gid("sungradL")} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#000000" stopOpacity="0.58" />
        <Stop offset="100%" stopColor="#000000" stopOpacity="0.37" />
      </LinearGradient>
    </Defs>
  ), [uid, skin, shirtS, pantsP, hairC]);

  const shlL = 60 - shoulderW * wf / 2;
  const shlR = 60 + shoulderW * wf / 2;
  const torsoW = (shlR - shlL);

  const armLX = shlL;
  const armRX = shlR;

  const eyesEl = useMemo(() => {
    const ey = fc - 2;
    const lCx = 49;
    const rCx = 71;
    if (eyeShape === "round") {
      return (
        <G>
          <Ellipse cx={String(lCx)} cy={String(ey)} rx="6" ry="6" fill="#F8F8F8" />
          <Ellipse cx={String(rCx)} cy={String(ey)} rx="6" ry="6" fill="#F8F8F8" />
          <Ellipse cx={String(lCx)} cy={String(ey)} rx="5" ry="5.5" fill={`url(#${gid("irisL")})`} />
          <Ellipse cx={String(rCx)} cy={String(ey)} rx="5" ry="5.5" fill={`url(#${gid("irisR")})`} />
          <Circle cx={String(lCx + 0.5)} cy={String(ey)} r="3" fill="#0A0A14" />
          <Circle cx={String(rCx + 0.5)} cy={String(ey)} r="3" fill="#0A0A14" />
          <Circle cx={String(lCx + 2)} cy={String(ey - 2)} r="1.8" fill="#FFFFFF" />
          <Circle cx={String(rCx + 2)} cy={String(ey - 2)} r="1.8" fill="#FFFFFF" />
          <Circle cx={String(lCx - 1.5)} cy={String(ey + 1)} r="0.8" fill="#FFFFFF" opacity="0.5" />
          <Circle cx={String(rCx - 1.5)} cy={String(ey + 1)} r="0.8" fill="#FFFFFF" opacity="0.5" />
          <Path d={`M${lCx - 6} ${ey} Q${lCx} ${ey - 7} ${lCx + 6} ${ey}`} stroke={skin.deep} strokeWidth="1.2" fill="none" opacity="0.6" />
          <Path d={`M${rCx - 6} ${ey} Q${rCx} ${ey - 7} ${rCx + 6} ${ey}`} stroke={skin.deep} strokeWidth="1.2" fill="none" opacity="0.6" />
          <Path d={`M${lCx - 6} ${ey} Q${lCx} ${ey + 3} ${lCx + 6} ${ey}`} stroke={skin.shadow} strokeWidth="0.6" fill="none" opacity="0.4" />
          <Path d={`M${rCx - 6} ${ey} Q${rCx} ${ey + 3} ${rCx + 6} ${ey}`} stroke={skin.shadow} strokeWidth="0.6" fill="none" opacity="0.4" />
        </G>
      );
    }
    if (eyeShape === "wide") {
      return (
        <G>
          <Path d={`M${lCx - 10} ${ey + 1} Q${lCx} ${ey - 9} ${lCx + 10} ${ey + 1} Q${lCx} ${ey + 5} ${lCx - 10} ${ey + 1} Z`} fill="#F8F8F8" />
          <Path d={`M${rCx - 10} ${ey + 1} Q${rCx} ${ey - 9} ${rCx + 10} ${ey + 1} Q${rCx} ${ey + 5} ${rCx - 10} ${ey + 1} Z`} fill="#F8F8F8" />
          <Ellipse cx={String(lCx)} cy={String(ey)} rx="5" ry="5.5" fill={`url(#${gid("irisL")})`} />
          <Ellipse cx={String(rCx)} cy={String(ey)} rx="5" ry="5.5" fill={`url(#${gid("irisR")})`} />
          <Circle cx={String(lCx + 0.5)} cy={String(ey)} r="3" fill="#0A0A14" />
          <Circle cx={String(rCx + 0.5)} cy={String(ey)} r="3" fill="#0A0A14" />
          <Circle cx={String(lCx + 2)} cy={String(ey - 2)} r="1.8" fill="#FFFFFF" />
          <Circle cx={String(rCx + 2)} cy={String(ey - 2)} r="1.8" fill="#FFFFFF" />
          <Circle cx={String(lCx - 1.5)} cy={String(ey + 1)} r="0.8" fill="#FFFFFF" opacity="0.5" />
          <Circle cx={String(rCx - 1.5)} cy={String(ey + 1)} r="0.8" fill="#FFFFFF" opacity="0.5" />
          <Path d={`M${lCx - 10} ${ey + 1} Q${lCx} ${ey - 9} ${lCx + 10} ${ey + 1}`} stroke={skin.deep} strokeWidth="1.2" fill="none" opacity="0.6" />
          <Path d={`M${rCx - 10} ${ey + 1} Q${rCx} ${ey - 9} ${rCx + 10} ${ey + 1}`} stroke={skin.deep} strokeWidth="1.2" fill="none" opacity="0.6" />
          <Path d={`M${lCx - 10} ${ey + 1} Q${lCx} ${ey + 5} ${lCx + 10} ${ey + 1}`} stroke={skin.shadow} strokeWidth="0.6" fill="none" opacity="0.4" />
          <Path d={`M${rCx - 10} ${ey + 1} Q${rCx} ${ey + 5} ${rCx + 10} ${ey + 1}`} stroke={skin.shadow} strokeWidth="0.6" fill="none" opacity="0.4" />
        </G>
      );
    }
    return (
      <G>
        <Path d={`M${lCx - 8} ${ey} Q${lCx} ${ey - 8} ${lCx + 8} ${ey} Q${lCx} ${ey + 4} ${lCx - 8} ${ey} Z`} fill="#F8F8F8" />
        <Path d={`M${rCx - 8} ${ey} Q${rCx} ${ey - 8} ${rCx + 8} ${ey} Q${rCx} ${ey + 4} ${rCx - 8} ${ey} Z`} fill="#F8F8F8" />
        <Ellipse cx={String(lCx)} cy={String(ey)} rx="5" ry="5.5" fill={`url(#${gid("irisL")})`} />
        <Ellipse cx={String(rCx)} cy={String(ey)} rx="5" ry="5.5" fill={`url(#${gid("irisR")})`} />
        <Circle cx={String(lCx + 0.5)} cy={String(ey)} r="3" fill="#0A0A14" />
        <Circle cx={String(rCx + 0.5)} cy={String(ey)} r="3" fill="#0A0A14" />
        <Circle cx={String(lCx + 2)} cy={String(ey - 2)} r="1.8" fill="#FFFFFF" />
        <Circle cx={String(rCx + 2)} cy={String(ey - 2)} r="1.8" fill="#FFFFFF" />
        <Circle cx={String(lCx - 1.5)} cy={String(ey)} r="0.8" fill="#FFFFFF" opacity="0.5" />
        <Circle cx={String(rCx - 1.5)} cy={String(ey)} r="0.8" fill="#FFFFFF" opacity="0.5" />
        <Path d={`M${lCx - 8} ${ey} Q${lCx} ${ey - 9} ${lCx + 8} ${ey}`} stroke={skin.deep} strokeWidth="1.2" fill="none" opacity="0.6" />
        <Path d={`M${rCx - 8} ${ey} Q${rCx} ${ey - 9} ${rCx + 8} ${ey}`} stroke={skin.deep} strokeWidth="1.2" fill="none" opacity="0.6" />
        <Path d={`M${lCx - 8} ${ey} Q${lCx} ${ey + 3} ${lCx + 8} ${ey}`} stroke={skin.shadow} strokeWidth="0.6" fill="none" opacity="0.4" />
        <Path d={`M${rCx - 8} ${ey} Q${rCx} ${ey + 3} ${rCx + 8} ${ey}`} stroke={skin.shadow} strokeWidth="0.6" fill="none" opacity="0.4" />
      </G>
    );
  }, [eyeShape, fc, skin, uid]);

  const browEl = useMemo(() => {
    const by = fc - 10;
    if (faceShape === "square") {
      return (
        <G>
          <Path d={`M41 ${fc - 11} Q49 ${fc - 14} 57 ${fc - 12}`} stroke={hairC.base} strokeWidth="3" fill="none" strokeLinecap="round" />
          <Path d={`M63 ${fc - 12} Q71 ${fc - 14} 79 ${fc - 11}`} stroke={hairC.base} strokeWidth="3" fill="none" strokeLinecap="round" />
          <Path d={`M41 ${fc - 11} Q49 ${fc - 14} 57 ${fc - 12} Q57 ${fc - 10} 49 ${fc - 12} Q41 ${fc - 9} 41 ${fc - 11} Z`} fill={hairC.base} opacity="0.7" />
          <Path d={`M63 ${fc - 12} Q71 ${fc - 14} 79 ${fc - 11} Q79 ${fc - 9} 71 ${fc - 12} Q63 ${fc - 10} 63 ${fc - 12} Z`} fill={hairC.base} opacity="0.7" />
        </G>
      );
    }
    return (
      <G>
        <Path d={`M42 ${by} Q49 ${fc - 14} 57 ${fc - 11}`} stroke={hairC.base} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <Path d={`M63 ${fc - 11} Q71 ${fc - 14} 78 ${by}`} stroke={hairC.base} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <Path d={`M42 ${by} Q49 ${fc - 14} 57 ${fc - 11} Q57 ${fc - 9} 49 ${fc - 12} Q42 ${by - 1} 42 ${by} Z`} fill={hairC.base} opacity="0.7" />
        <Path d={`M63 ${fc - 11} Q71 ${fc - 14} 78 ${by} Q78 ${by - 1} 71 ${fc - 12} Q63 ${fc - 9} 63 ${fc - 11} Z`} fill={hairC.base} opacity="0.7" />
      </G>
    );
  }, [faceShape, fc, hairC]);

  const noseEl = useMemo(() => (
    <G>
      <Path d={`M57 ${fc + 2} Q57.5 ${fc + 8} 56 ${fc + 12}`} stroke={skin.deep} strokeWidth="0.8" fill="none" opacity="0.5" />
      <Path d={`M63 ${fc + 2} Q62.5 ${fc + 8} 64 ${fc + 12}`} stroke={skin.deep} strokeWidth="0.8" fill="none" opacity="0.5" />
      <Path d={`M55 ${fc + 12} Q53 ${fc + 14} 54 ${fc + 15}`} stroke={skin.deep} strokeWidth="1" fill="none" strokeLinecap="round" />
      <Path d={`M65 ${fc + 12} Q67 ${fc + 14} 66 ${fc + 15}`} stroke={skin.deep} strokeWidth="1" fill="none" strokeLinecap="round" />
    </G>
  ), [fc, skin]);

  const mouthEl = useMemo(() => {
    const my = fc + 18;
    return (
      <G>
        <Path d={`M52 ${my} Q56 ${my - 3} 60 ${my - 1} Q64 ${my - 3} 68 ${my}`} fill="#C07860" opacity="0.85" />
        <Path d={`M52 ${my} Q60 ${my + 6} 68 ${my} Q60 ${my + 4} 52 ${my} Z`} fill="#B56852" opacity="0.7" />
        <Path d={`M52 ${my} Q60 ${my + 1.5} 68 ${my}`} stroke="#903040" strokeWidth="0.7" fill="none" opacity="0.6" />
        <Path d={`M55 ${my + 3} Q60 ${my + 5} 65 ${my + 3}`} stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity="0.2" />
      </G>
    );
  }, [fc]);

  const hairEl = useMemo(() => {
    const hCY = headCY;
    const topY = hCY - headRY;
    const hRX = headRX;
    const hRY = headRY;
    const style = vs.hairStyle;
    const c = hairC;
    const hg = `url(#${gid("hairGrad")})`;

    const strandPaths = (ox: number, baseY: number, count: number) => {
      const elems = [];
      for (let i = 0; i < count; i++) {
        const x = ox + (i * 6) - ((count - 1) * 3);
        const sway = i % 2 === 0 ? 2 : -2;
        elems.push(
          <Path
            key={`s${i}`}
            d={`M${x} ${baseY} Q${x + sway} ${baseY + 8} ${x + sway * 0.5} ${baseY + 16}`}
            stroke={c.strand} strokeWidth="0.6" fill="none" strokeLinecap="round" opacity={String(0.2 + groomingLevel * 0.06)}
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
            <Ellipse cx="60" cy={String(topY + 9)} rx={String(hRX)} ry="12" fill={c.base} opacity="0.45" />
            <Ellipse cx="55" cy={String(topY + 5)} rx={String(hRX - 3)} ry="5" fill={c.highlight} opacity="0.4" />
            <Path d={`M${60 - hRX + 2} ${hCY - 8} Q${60 - hRX} ${topY + 8} ${60 - hRX + 4} ${topY + 4}`} stroke={c.shadow} strokeWidth="2" fill="none" opacity="0.4" />
            <Path d={`M${60 + hRX - 2} ${hCY - 8} Q${60 + hRX} ${topY + 8} ${60 + hRX - 4} ${topY + 4}`} stroke={c.shadow} strokeWidth="2" fill="none" opacity="0.4" />
          </G>
        ),
      };
    }

    if (style === "clean_cut" || style === "low-fade") {
      return {
        back: null,
        front: (
          <G>
            <Path
              d={`M${60 - hRX - 1} ${hCY - 4} Q${60 - hRX - 1} ${topY + 5} ${60 - hRX + 5} ${topY} Q60 ${topY - 6} ${60 + hRX - 5} ${topY} Q${60 + hRX + 1} ${topY + 5} ${60 + hRX + 1} ${hCY - 4} Q${60 + hRX} ${hCY - 12} ${60 + hRX - 3} ${hCY - 16} L${60 - hRX + 3} ${hCY - 16} Q${60 - hRX} ${hCY - 12} ${60 - hRX - 1} ${hCY - 4} Z`}
              fill={hg}
            />
            <Ellipse cx="55" cy={String(topY + 3)} rx={String(hRX - 4)} ry="6" fill={c.highlight} opacity="0.3" />
            <Path d={`M${60 - hRX + 2} ${hCY - 6} Q${60 - hRX} ${topY + 8} ${60 - hRX + 5} ${topY + 2}`} stroke={c.shadow} strokeWidth="1.5" fill="none" opacity="0.3" />
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
            <Path
              d={`M${60 - hRX - 1} ${hCY - 4} Q${60 - hRX - 2} ${topY + 4} ${60 - hRX + 4} ${topY - 1} Q${60 - 5} ${topY - 7} ${60 + hRX - 4} ${topY - 1} Q${60 + hRX + 2} ${topY + 4} ${60 + hRX + 1} ${hCY - 4} L${60 + hRX} ${hCY - 12} L${60 - hRX} ${hCY - 12} Z`}
              fill={hg}
            />
            <Path
              d={`M${60 - hRX + 5} ${topY + 1} Q${60 - 3} ${topY - 5} ${60 + hRX - 3} ${topY + 3}`}
              stroke={c.shadow} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.3"
            />
            <Ellipse cx={String(60 - 5)} cy={String(topY + 2)} rx={String(hRX - 6)} ry="5" fill={c.highlight} opacity="0.25" />
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
            <Path
              d={`M${60 - hRX - 1} ${hCY - 5} Q${60 - hRX - 1} ${topY + 3} ${60 - hRX + 5} ${topY - 2} Q60 ${topY - 8} ${60 + hRX - 5} ${topY - 2} Q${60 + hRX + 1} ${topY + 3} ${60 + hRX + 1} ${hCY - 5} L${60 + hRX - 2} ${hCY - 14} L${60 - hRX + 2} ${hCY - 14} Z`}
              fill={hg}
            />
            <Path d={`M${60 - 8} ${topY - 4} Q${60 - 3} ${topY - 8} ${60 + 5} ${topY - 6} Q${60 + 10} ${topY - 4} ${60 + 12} ${topY}`} fill={c.base} />
            <Ellipse cx="60" cy={String(topY)} rx={String(hRX - 4)} ry="5" fill={c.highlight} opacity="0.2" />
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
            <Path
              d={`M${60 - hRX - 4} ${hCY + 2} Q${60 - hRX - 5} ${topY + 3} ${60 - hRX + 3} ${topY - 3} Q60 ${topY - 10} ${60 + hRX - 3} ${topY - 3} Q${60 + hRX + 5} ${topY + 3} ${60 + hRX + 4} ${hCY + 2} Q${60 + hRX + 3} ${hCY - 8} ${60 + hRX + 1} ${hCY - 14} L${60 - hRX - 1} ${hCY - 14} Q${60 - hRX - 3} ${hCY - 8} ${60 - hRX - 4} ${hCY + 2} Z`}
              fill={hg}
            />
            <Ellipse cx={String(60 - hRX - 2)} cy={String(hCY - 5)} rx="5" ry="12" fill={c.base} />
            <Ellipse cx={String(60 + hRX + 2)} cy={String(hCY - 5)} rx="5" ry="12" fill={c.base} />
            <Ellipse cx="60" cy={String(topY)} rx={String(hRX - 3)} ry="6" fill={c.highlight} opacity="0.15" />
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
            <Path
              d={`M${60 - hRX} ${hCY - 6} Q${60 - hRX - 1} ${topY + 7} ${60 - hRX + 5} ${topY + 1} Q60 ${topY - 4} ${60 + hRX - 5} ${topY + 1} Q${60 + hRX + 1} ${topY + 7} ${60 + hRX} ${hCY - 6} L${60 + hRX - 2} ${hCY - 14} L${60 - hRX + 2} ${hCY - 14} Z`}
              fill={hg}
            />
            <Ellipse cx="60" cy={String(topY + 5)} rx={String(hRX - 4)} ry="6" fill={c.highlight} opacity="0.35" />
            <Path d={`M${60 - 10} ${topY + 3} Q60 ${topY - 2} ${60 + 10} ${topY + 3}`} stroke={c.highlight} strokeWidth="0.9" fill="none" opacity="0.2" />
            <Path d={`M${60 - hRX + 3} ${topY + 5} Q${60 - hRX + 1} ${hCY - 4} ${60 - hRX + 2} ${hCY}`} stroke={c.shadow} strokeWidth="1.5" fill="none" opacity="0.3" />
            <Path d={`M${60 + hRX - 3} ${topY + 5} Q${60 + hRX - 1} ${hCY - 4} ${60 + hRX - 2} ${hCY}`} stroke={c.shadow} strokeWidth="1.5" fill="none" opacity="0.3" />
            {strandPaths(60, topY + 4, 4)}
          </G>
        ),
      };
    }

    if (style === "short_bob") {
      return {
        back: (
          <G>
            <Path
              d={`M${60 - hRX - 4} ${hCY + 8} Q${60 - hRX - 5} ${topY + 3} ${60 - hRX + 4} ${topY - 2} Q60 ${topY - 8} ${60 + hRX - 4} ${topY - 2} Q${60 + hRX + 5} ${topY + 3} ${60 + hRX + 4} ${hCY + 8} Q${60 + hRX + 3} ${hCY + 14} ${60 + hRX + 1} ${hCY + 16} L${60 - hRX - 1} ${hCY + 16} Q${60 - hRX - 3} ${hCY + 14} ${60 - hRX - 4} ${hCY + 8} Z`}
              fill={hg}
            />
          </G>
        ),
        front: (
          <G>
            <Ellipse cx="60" cy={String(topY + 2)} rx={String(hRX - 3)} ry="6" fill={c.highlight} opacity="0.2" />
            {strandPaths(60, topY + 2, 5)}
          </G>
        ),
      };
    }

    if (style === "side_part_long") {
      return {
        back: (
          <G>
            <Path
              d={`M${60 - hRX - 4} ${hCY + 16} Q${60 - hRX - 5} ${topY + 3} ${60 - hRX + 4} ${topY - 2} Q${60 - 5} ${topY - 8} ${60 + hRX - 4} ${topY - 1} Q${60 + hRX + 5} ${topY + 4} ${60 + hRX + 4} ${hCY + 16} Q${60 + hRX + 3} ${hCY + 26} ${60 + hRX - 3} ${hCY + 30} L${60 - hRX + 3} ${hCY + 30} Q${60 - hRX - 3} ${hCY + 26} ${60 - hRX - 4} ${hCY + 16} Z`}
              fill={hg}
            />
          </G>
        ),
        front: (
          <G>
            <Path d={`M${60 - 5} ${topY + 1} Q${60 + 7} ${topY - 4} ${60 + hRX} ${topY + 5}`} stroke={c.shadow} strokeWidth="1" fill="none" opacity="0.25" />
            <Ellipse cx={String(60 + 3)} cy={String(topY + 3)} rx={String(hRX - 5)} ry="5" fill={c.highlight} opacity="0.15" />
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
            <Path
              d={`M${60 - hRX - 3} ${hCY + 2} Q${60 - hRX - 3} ${topY + 3} ${60 - hRX + 5} ${topY - 3} Q60 ${topY - 9} ${60 + hRX - 5} ${topY - 3} Q${60 + hRX + 3} ${topY + 3} ${60 + hRX + 3} ${hCY + 2} L${60 + hRX + 1} ${hCY - 12} L${60 - hRX - 1} ${hCY - 12} Z`}
              fill={hg}
            />
            <Path d={`M${60 - 6} ${topY - 4} Q60 ${topY - 9} ${60 + 8} ${topY - 3}`} fill={c.base} />
            <Ellipse cx={String(60 - hRX)} cy={String(hCY - 5)} rx="4" ry="9" fill={c.base} />
            <Ellipse cx={String(60 + hRX)} cy={String(hCY - 5)} rx="4" ry="9" fill={c.base} />
            {strandPaths(60, topY, 5)}
          </G>
        ),
      };
    }

    if (style === "ponytail_sleek") {
      return {
        back: (
          <G>
            <Path
              d={`M${60 - hRX} ${hCY - 6} Q${60 - hRX - 1} ${topY + 5} ${60 - hRX + 5} ${topY} Q60 ${topY - 5} ${60 + hRX - 5} ${topY} Q${60 + hRX + 1} ${topY + 5} ${60 + hRX} ${hCY - 6} L${60 + hRX - 2} ${hCY - 14} L${60 - hRX + 2} ${hCY - 14} Z`}
              fill={hg}
            />
            <Path
              d={`M60 ${hCY - 2} Q68 ${hCY + 4} 69 ${hCY + 22} Q68 ${hCY + 40} 63 ${hCY + 50}`}
              stroke={c.base} strokeWidth="6.5" fill="none" strokeLinecap="round"
            />
            <Path
              d={`M60 ${hCY - 2} Q68 ${hCY + 4} 69 ${hCY + 22} Q68 ${hCY + 40} 63 ${hCY + 50}`}
              stroke={c.shadow} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.3"
            />
            <Ellipse cx="61" cy={String(hCY - 1)} rx="4" ry="2.5" fill={c.base} />
          </G>
        ),
        front: (
          <G>
            <Ellipse cx="60" cy={String(topY + 4)} rx={String(hRX - 4)} ry="5" fill={c.highlight} opacity="0.2" />
          </G>
        ),
      };
    }

    if (style === "natural_medium") {
      return {
        back: (
          <G>
            <Path
              d={`M${60 - hRX - 4} ${hCY + 10} Q${60 - hRX - 5} ${topY + 3} ${60 - hRX + 4} ${topY - 2} Q60 ${topY - 10} ${60 + hRX - 4} ${topY - 2} Q${60 + hRX + 5} ${topY + 3} ${60 + hRX + 4} ${hCY + 10} Q${60 + hRX + 3} ${hCY + 22} ${60 + hRX - 2} ${hCY + 26} L${60 - hRX + 2} ${hCY + 26} Q${60 - hRX - 3} ${hCY + 22} ${60 - hRX - 4} ${hCY + 10} Z`}
              fill={hg}
            />
            <Ellipse cx={String(60 - hRX - 2)} cy={String(hCY + 3)} rx="6" ry="18" fill={c.base} />
            <Ellipse cx={String(60 + hRX + 2)} cy={String(hCY + 3)} rx="6" ry="18" fill={c.base} />
          </G>
        ),
        front: (
          <G>
            <Ellipse cx="60" cy={String(topY + 2)} rx={String(hRX - 3)} ry="6" fill={c.highlight} opacity="0.15" />
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
            <Path
              d={`M${60 - hRX} ${hCY - 4} Q${60 - hRX - 1} ${topY + 5} ${60 - hRX + 5} ${topY + 1} Q60 ${topY - 3} ${60 + hRX - 5} ${topY + 1} Q${60 + hRX + 1} ${topY + 5} ${60 + hRX} ${hCY - 4} L${60 + hRX - 2} ${hCY - 12} L${60 - hRX + 2} ${hCY - 12} Z`}
              fill={hg}
            />
            <Circle cx="60" cy={String(topY - 6)} r="9" fill={c.base} />
            <Ellipse cx="60" cy={String(topY - 8)} rx="6" ry="4" fill={c.highlight} opacity="0.2" />
            <Circle cx="60" cy={String(topY - 6)} r="9" fill="none" stroke={c.shadow} strokeWidth="0.8" opacity="0.3" />
          </G>
        ),
      };
    }

    return {
      back: null,
      front: (
        <G>
          <Path
            d={`M${60 - hRX - 1} ${hCY - 4} Q${60 - hRX - 1} ${topY + 5} ${60 - hRX + 5} ${topY} Q60 ${topY - 6} ${60 + hRX - 5} ${topY} Q${60 + hRX + 1} ${topY + 5} ${60 + hRX + 1} ${hCY - 4} Q${60 + hRX} ${hCY - 12} ${60 + hRX - 3} ${hCY - 16} L${60 - hRX + 3} ${hCY - 16} Q${60 - hRX} ${hCY - 12} ${60 - hRX - 1} ${hCY - 4} Z`}
            fill={hg}
          />
          <Ellipse cx="60" cy={String(topY + 3)} rx={String(hRX - 4)} ry="6" fill={c.highlight} opacity="0.2" />
          {strandPaths(60, topY + 4, 4)}
        </G>
      ),
    };
  }, [headCY, headRX, headRY, vs.hairStyle, hairC, groomingLevel, uid]);

  const watchEl = useMemo(() => {
    const ws = vs.equippedWatchStyle;
    if (!ws) return null;
    if (ws === "basic" || ws === "leather" || ws === "bracelet") {
      return (
        <G>
          <Rect x="98" y="160" width="14" height="6" rx="1" fill="#4A3010" />
          <Rect x="98" y="174" width="14" height="6" rx="1" fill="#4A3010" />
          <Rect x="96" y="163" width="18" height="14" rx="3" fill="#8A7030" stroke="#C8A030" strokeWidth="0.8" />
          <Rect x="98" y="165" width="14" height="10" rx="2" fill="#D4B840" />
          <Rect x="99" y="166" width="12" height="8" rx="1.5" fill="#0C0C1C" />
          <Rect x="104" y="166" width="1" height="2" rx="0.3" fill="#C8A030" />
          <Rect x="110" y="169.5" width="2" height="1" rx="0.3" fill="#C8A030" />
          <Rect x="104" y="172" width="1" height="2" rx="0.3" fill="#C8A030" />
          <Rect x="99.5" y="169.5" width="2" height="1" rx="0.3" fill="#C8A030" />
          <Line x1="105" y1="170" x2="105" y2="167.5" stroke="#C8A030" strokeWidth="1.2" />
          <Line x1="105" y1="170" x2="108" y2="170.5" stroke="#C8A030" strokeWidth="0.8" />
          <Rect x="114" y="168" width="2.5" height="4" rx="0.8" fill="#7A6020" />
        </G>
      );
    }
    if (ws === "refined" || ws === "dress") {
      return (
        <G>
          <Rect x="99" y="158" width="12" height="22" rx="1" fill="#2A1808" />
          <Line x1="100" y1="161" x2="110" y2="161" stroke="#3A2818" strokeWidth="0.4" opacity="0.5" />
          <Line x1="100" y1="164" x2="110" y2="164" stroke="#3A2818" strokeWidth="0.4" opacity="0.5" />
          <Line x1="100" y1="176" x2="110" y2="176" stroke="#3A2818" strokeWidth="0.4" opacity="0.5" />
          <Rect x="97" y="162" width="16" height="14" rx="4" fill="#C8A030" stroke="#E8C050" strokeWidth="0.5" />
          <Rect x="99" y="163" width="12" height="11" rx="3" fill="#D4B840" opacity="0.9" />
          <Rect x="100" y="164" width="10" height="9" rx="2.5" fill="#F0EEE4" />
          {[0,30,60,90,120,150,180,210,240,270,300,330].map((a, i) => {
            const cx = 105, cy = 168.5, r = 3.8;
            const rad = (a * Math.PI) / 180;
            return <Circle key={i} cx={String(cx + r * Math.sin(rad))} cy={String(cy - r * Math.cos(rad))} r="0.5" fill="#8A7020" />;
          })}
          <Line x1="105" y1="168.5" x2="105" y2="165.5" stroke="#4A3020" strokeWidth="0.8" />
          <Line x1="105" y1="168.5" x2="108" y2="169" stroke="#4A3020" strokeWidth="0.5" />
          <Path d="M98 163 Q100 162 102 163.5" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity="0.3" />
        </G>
      );
    }
    return (
      <G>
        <Circle cx="105" cy="170" r="10" fill="#303040" stroke="#5050A0" strokeWidth="1" />
        {[0,30,60,90,120,150,180,210,240,270,300,330].map((a, i) => {
          const cx = 105, cy = 170, r = 9;
          const rad = (a * Math.PI) / 180;
          const ix = cx + r * Math.sin(rad), iy = cy - r * Math.cos(rad);
          const ox = cx + (r + 1.5) * Math.sin(rad), oy = cy - (r + 1.5) * Math.cos(rad);
          return <Line key={i} x1={String(ix)} y1={String(iy)} x2={String(ox)} y2={String(oy)} stroke="#8080C0" strokeWidth="0.6" />;
        })}
        <Circle cx="105" cy="170" r="8" fill="#1A1A30" />
        <Ellipse cx="105" cy="169" rx="7" ry="6.5" fill="#0A0A20" />
        <Circle cx="110" cy="170" r="1.5" fill="none" stroke="#3A3A50" strokeWidth="0.4" />
        <Circle cx="105" cy="175" r="1.5" fill="none" stroke="#3A3A50" strokeWidth="0.4" />
        <Circle cx="100" cy="170" r="1.5" fill="none" stroke="#3A3A50" strokeWidth="0.4" />
        <Line x1="105" y1="170" x2="105" y2="164" stroke="#00FF88" strokeWidth="1.2" strokeLinecap="round" />
        <Line x1="105" y1="170" x2="110" y2="168" stroke="#00FF88" strokeWidth="0.8" strokeLinecap="round" />
        <Rect x="115.5" y="167" width="2" height="3" rx="0.5" fill="#404060" />
        <Rect x="115.5" y="171" width="2" height="2.5" rx="0.5" fill="#404060" />
        <Rect x="96" y="160" width="4" height="5" rx="0.8" fill="#404060" />
        <Rect x="100" y="160" width="4" height="5" rx="0.8" fill="#505070" />
        <Rect x="104" y="160" width="4" height="5" rx="0.8" fill="#404060" />
        <Rect x="96" y="175" width="4" height="5" rx="0.8" fill="#404060" />
        <Rect x="100" y="175" width="4" height="5" rx="0.8" fill="#505070" />
        <Rect x="104" y="175" width="4" height="5" rx="0.8" fill="#404060" />
        <Circle cx="105" cy="170" r="11" fill="none" stroke="#4040CC" strokeWidth="0.5" opacity="0.5" />
      </G>
    );
  }, [vs.equippedWatchStyle]);

  const shoesEl = useMemo(() => {
    const ss = vs.equippedShoesStyle;
    if (ss === "casual") {
      return (
        <G>
          <Path d="M20 316 Q18 322 24 326 L56 326 Q62 326 62 320 L62 314 Z" fill="#E8E0D0" stroke="#B0A890" strokeWidth="0.8" />
          <Path d="M24 316 Q24 322 30 324 L56 324 Q60 322 60 316 Z" fill="#D8CFC0" />
          <Path d="M22 318 Q28 316 36 318" stroke="#A09880" strokeWidth="0.8" fill="none" opacity="0.7" />
          <Line x1="28" y1="318" x2="48" y2="318" stroke="#A09880" strokeWidth="0.8" opacity="0.5" />
          <Line x1="30" y1="320" x2="50" y2="320" stroke="#A09880" strokeWidth="0.8" opacity="0.5" />
          <Line x1="28" y1="322" x2="46" y2="322" stroke="#A09880" strokeWidth="0.8" opacity="0.4" />
          <Line x1="26" y1="324" x2="44" y2="324" stroke="#A09880" strokeWidth="0.8" opacity="0.3" />
          <Path d="M58 316 Q58 322 64 326 L96 326 Q102 326 100 320 L98 314 Z" fill="#E8E0D0" stroke="#B0A890" strokeWidth="0.8" />
          <Path d="M60 316 Q60 322 66 324 L96 324 Q98 322 98 316 Z" fill="#D8CFC0" />
          <Path d="M62 318 Q68 316 76 318" stroke="#A09880" strokeWidth="0.8" fill="none" opacity="0.7" />
          <Line x1="66" y1="318" x2="88" y2="318" stroke="#A09880" strokeWidth="0.8" opacity="0.5" />
          <Line x1="68" y1="320" x2="90" y2="320" stroke="#A09880" strokeWidth="0.8" opacity="0.5" />
          <Line x1="66" y1="322" x2="86" y2="322" stroke="#A09880" strokeWidth="0.8" opacity="0.4" />
          <Line x1="64" y1="324" x2="84" y2="324" stroke="#A09880" strokeWidth="0.8" opacity="0.3" />
        </G>
      );
    }
    if (ss === "sneaker") {
      return (
        <G>
          <Path d="M18 316 Q16 324 22 328 L58 328 Q64 328 64 322 L64 314 Z" fill="#E8E8E8" />
          <Path d="M22 316 Q22 322 28 326 L56 326 Q62 324 62 316 Z" fill="#F4F4F4" stroke="#E0E0E0" strokeWidth="0.5" />
          <Path d="M22 316 Q30 314 38 316" fill="#EEEEEE" stroke="#D8D8D8" strokeWidth="0.5" />
          <Path d="M20 322 Q30 326 44 324" stroke="#C0A030" strokeWidth="1.5" fill="none" />
          <Path d="M30 318 Q40 316 50 320" stroke="#D0D0D0" strokeWidth="1.5" fill="none" opacity="0.8" />
          <Circle cx="32" cy="317" r="0.8" fill="#D0D0D0" /><Circle cx="36" cy="316.5" r="0.8" fill="#D0D0D0" />
          <Circle cx="40" cy="316.5" r="0.8" fill="#D0D0D0" /><Circle cx="34" cy="319" r="0.8" fill="#D0D0D0" />
          <Circle cx="38" cy="318.5" r="0.8" fill="#D0D0D0" /><Circle cx="42" cy="318.5" r="0.8" fill="#D0D0D0" />
          <Path d="M56 316 Q54 324 60 328 L96 328 Q102 328 100 322 L98 314 Z" fill="#E8E8E8" />
          <Path d="M58 316 Q58 322 64 326 L94 326 Q100 324 100 316 Z" fill="#F4F4F4" stroke="#E0E0E0" strokeWidth="0.5" />
          <Path d="M60 316 Q68 314 76 316" fill="#EEEEEE" stroke="#D8D8D8" strokeWidth="0.5" />
          <Path d="M58 322 Q68 326 82 324" stroke="#C0A030" strokeWidth="1.5" fill="none" />
          <Path d="M68 318 Q78 316 88 320" stroke="#D0D0D0" strokeWidth="1.5" fill="none" opacity="0.8" />
          <Circle cx="70" cy="317" r="0.8" fill="#D0D0D0" /><Circle cx="74" cy="316.5" r="0.8" fill="#D0D0D0" />
          <Circle cx="78" cy="316.5" r="0.8" fill="#D0D0D0" /><Circle cx="72" cy="319" r="0.8" fill="#D0D0D0" />
          <Circle cx="76" cy="318.5" r="0.8" fill="#D0D0D0" /><Circle cx="80" cy="318.5" r="0.8" fill="#D0D0D0" />
        </G>
      );
    }
    if (ss === "formal") {
      return (
        <G>
          <Path d="M20 316 Q18 322 24 326 L56 326 Q62 326 62 320 L62 314 Z" fill="#1A1208" />
          <Path d="M24 316 Q24 322 30 324 L56 324 Q60 322 60 316 Z" fill="#0A0A0A" stroke="#1A1A1A" strokeWidth="0.5" />
          <Path d="M24 320 Q39 318 55 319" stroke="#1E1E1E" strokeWidth="1" fill="none" />
          <Circle cx="28" cy="319" r="0.4" fill="#2A2A2A" /><Circle cx="32" cy="318.5" r="0.4" fill="#2A2A2A" />
          <Circle cx="36" cy="318.3" r="0.4" fill="#2A2A2A" /><Circle cx="40" cy="318.5" r="0.4" fill="#2A2A2A" />
          <Path d="M26 318 Q32 316 40 318" stroke="#FFFFFF" strokeWidth="1" fill="none" opacity="0.18" />
          <Path d="M28 316 Q42 315 56 318" stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity="0.08" />
          <Line x1="22" y1="325" x2="60" y2="325" stroke="#3A2A10" strokeWidth="1" />
          <Path d="M58 316 Q56 322 62 326 L96 326 Q102 326 100 320 L98 314 Z" fill="#1A1208" />
          <Path d="M60 316 Q60 322 66 324 L94 324 Q98 322 98 316 Z" fill="#0A0A0A" stroke="#1A1A1A" strokeWidth="0.5" />
          <Path d="M62 320 Q77 318 93 319" stroke="#1E1E1E" strokeWidth="1" fill="none" />
          <Circle cx="66" cy="319" r="0.4" fill="#2A2A2A" /><Circle cx="70" cy="318.5" r="0.4" fill="#2A2A2A" />
          <Circle cx="74" cy="318.3" r="0.4" fill="#2A2A2A" /><Circle cx="78" cy="318.5" r="0.4" fill="#2A2A2A" />
          <Path d="M64 318 Q70 316 78 318" stroke="#FFFFFF" strokeWidth="1" fill="none" opacity="0.18" />
          <Path d="M66 316 Q80 315 94 318" stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity="0.08" />
          <Line x1="60" y1="325" x2="98" y2="325" stroke="#3A2A10" strokeWidth="1" />
        </G>
      );
    }
    if (ss === "boot") {
      return (
        <G>
          <Path d="M22 288 L22 320 Q22 326 28 328 L54 328 Q60 326 60 320 L60 288 Z" fill="#1A1210" />
          <Path d="M30 288 L30 320" stroke="#2A2018" strokeWidth="0.6" opacity="0.4" />
          <Path d="M50 288 L50 320" stroke="#2A2018" strokeWidth="0.6" opacity="0.4" />
          <Line x1="38" y1="288" x2="40" y2="290" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity="0.1" />
          <Rect x="54" y="290" width="4" height="8" rx="1" fill="#2A1E14" opacity="0.6" />
          <Path d="M20 320 Q18 328 26 330 L56 330 Q62 330 62 324 L62 318 Z" fill="#0E0E0A" />
          <Path d="M22 322 Q40 320 58 322" stroke="#4A3020" strokeWidth="0.8" strokeDasharray="1.5,1.5" fill="none" />
          <Path d="M60 288 L60 320 Q60 326 66 328 L92 328 Q98 326 98 320 L98 288 Z" fill="#1A1210" />
          <Path d="M68 288 L68 320" stroke="#2A2018" strokeWidth="0.6" opacity="0.4" />
          <Path d="M88 288 L88 320" stroke="#2A2018" strokeWidth="0.6" opacity="0.4" />
          <Line x1="76" y1="288" x2="78" y2="290" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity="0.1" />
          <Rect x="92" y="290" width="4" height="8" rx="1" fill="#2A1E14" opacity="0.6" />
          <Path d="M58 320 Q56 328 64 330 L94 330 Q100 330 100 324 L100 318 Z" fill="#0E0E0A" />
          <Path d="M60 322 Q78 320 96 322" stroke="#4A3020" strokeWidth="0.8" strokeDasharray="1.5,1.5" fill="none" />
        </G>
      );
    }
    return (
      <G>
        <Path d="M20 316 Q18 322 24 326 L56 326 Q62 326 62 320 L62 314 Z" fill="#1A1A24" />
        <Path d="M24 316 Q24 322 30 324 L56 324 Q60 322 60 316 Z" fill="#252530" />
        <Path d="M26 318 Q32 316 40 318" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity="0.15" />
        <Path d="M58 316 Q56 322 64 326 L96 326 Q102 326 100 320 L98 314 Z" fill="#1A1A24" />
        <Path d="M60 316 Q60 322 66 324 L94 324 Q98 322 98 316 Z" fill="#252530" />
        <Path d="M64 318 Q70 316 78 318" stroke="#FFFFFF" strokeWidth="0.8" fill="none" opacity="0.15" />
      </G>
    );
  }, [vs.equippedShoesStyle]);

  const auraEl = useMemo(() => {
    const ps = vs.prestigeStage;
    if (ps === "none" || !ps) return null;
    if (ps === "subtle") {
      return (
        <G>
          <Defs>
            <RadialGradient id={gid("aura1")} cx="50%" cy="45%" r="50%">
              <Stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.06" />
              <Stop offset="100%" stopColor="#7C5CFC" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx="60" cy="190" rx="55" ry="170" fill={`url(#${gid("aura1")})`} />
        </G>
      );
    }
    const diamondPositions = ps === "legendary"
      ? [[20,60],[100,60],[10,150],[110,150],[15,250],[105,250],[30,30],[90,30],[5,200],[115,200],[25,320],[95,320]]
      : [[20,60],[100,60],[10,150],[110,150],[15,250],[105,250]];
    return (
      <G>
        <Defs>
          <RadialGradient id={gid("aura2")} cx="50%" cy="45%" r="50%">
            <Stop offset="0%" stopColor="#7C5CFC" stopOpacity={ps === "legendary" ? "0.18" : "0.15"} />
            <Stop offset="100%" stopColor="#7C5CFC" stopOpacity="0" />
          </RadialGradient>
          {ps === "legendary" && (
            <>
              <RadialGradient id={gid("aura3")} cx="50%" cy="45%" r="40%">
                <Stop offset="0%" stopColor="#C8A030" stopOpacity="0.10" />
                <Stop offset="100%" stopColor="#C8A030" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id={gid("aura4")} cx="50%" cy="45%" r="30%">
                <Stop offset="0%" stopColor="#E8C050" stopOpacity="0.06" />
                <Stop offset="100%" stopColor="#E8C050" stopOpacity="0" />
              </RadialGradient>
            </>
          )}
        </Defs>
        <Ellipse cx="60" cy="190" rx="55" ry="170" fill={`url(#${gid("aura2")})`} />
        {ps === "legendary" && (
          <>
            <Ellipse cx="60" cy="190" rx="48" ry="155" fill={`url(#${gid("aura3")})`} />
            <Ellipse cx="60" cy="190" rx="40" ry="140" fill={`url(#${gid("aura4")})`} />
          </>
        )}
        {diamondPositions.map(([dx, dy], i) => (
          <Rect key={i} x={String(dx - 1.5)} y={String(dy - 1.5)} width="3" height="3" fill="#C8A030" opacity="0.7" transform={`rotate(45 ${dx} ${dy})`} />
        ))}
      </G>
    );
  }, [vs.prestigeStage, uid]);

  const outerwearEl = useMemo(() => {
    const ow = vs.equippedOuterwearStyle;
    if (!ow) return null;
    const owColor = vs.outerwearColor ?? "#1A1A2A";
    if (ow === "blazer") {
      return (
        <G>
          <Path d={`M${armLX - 2} ${torsoTopY - 2} L${armRX + 2} ${torsoTopY - 2} L${hipRX + 2} 192 L${hipLX - 2} 192 Z`} fill={owColor} />
          <Path d={`M60 ${torsoTopY - 4} L44 ${torsoTopY + 4} L42 ${torsoTopY + 40} L60 ${torsoTopY + 36} Z`} fill={owColor} opacity="0.9" />
          <Path d={`M60 ${torsoTopY - 4} L76 ${torsoTopY + 4} L78 ${torsoTopY + 40} L60 ${torsoTopY + 36} Z`} fill={owColor} opacity="0.9" />
          <Line x1="44" y1={String(torsoTopY + 4)} x2="42" y2={String(torsoTopY + 40)} stroke="#FFFFFF" strokeWidth="0.6" opacity="0.15" />
          <Line x1="76" y1={String(torsoTopY + 4)} x2="78" y2={String(torsoTopY + 40)} stroke="#FFFFFF" strokeWidth="0.6" opacity="0.15" />
          <Rect x="34" y={String(torsoTopY + 30)} width="10" height="7" rx="1.5" fill={owColor} stroke="#FFFFFF08" strokeWidth="0.4" />
          <Circle cx="60" cy={String(torsoTopY + 35)} r="2.5" fill={owColor} stroke="#80808040" strokeWidth="0.5" />
          <Circle cx="60" cy={String(torsoTopY + 55)} r="2.5" fill={owColor} stroke="#80808040" strokeWidth="0.5" />
          <Path d={`M${armLX - 2} ${torsoTopY - 2} Q${armLX - 4} ${torsoTopY} ${armLX - 6} ${torsoTopY + 4}`} stroke="#FFFFFF" strokeWidth="0.5" fill="none" opacity="0.1" />
          <Path d={`M${armRX + 2} ${torsoTopY - 2} Q${armRX + 4} ${torsoTopY} ${armRX + 6} ${torsoTopY + 4}`} stroke="#FFFFFF" strokeWidth="0.5" fill="none" opacity="0.1" />
        </G>
      );
    }
    return (
      <G>
        <Path d={`M${armLX - 2} ${torsoTopY - 2} L${armRX + 2} ${torsoTopY - 2} L${hipRX + 2} 192 L${hipLX - 2} 192 Z`} fill={owColor} />
        <Line x1="60" y1={String(torsoTopY)} x2="60" y2="190" stroke="#808080" strokeWidth="1.5" />
        <Path d={`M${hipLX - 2} 186 L${hipRX + 2} 186 L${hipRX + 2} 192 L${hipLX - 2} 192 Z`} fill={owColor} />
        {[187, 188, 189, 190].map(y => (
          <Line key={y} x1={String(hipLX)} y1={String(y)} x2={String(hipRX)} y2={String(y)} stroke="#808080" strokeWidth="0.3" opacity="0.4" />
        ))}
        <Path d={`M${armLX - 6} 170 L${armLX - 6} 182`} stroke={owColor} strokeWidth="8" strokeLinecap="round" />
        <Path d={`M${armRX + 6} 170 L${armRX + 6} 182`} stroke={owColor} strokeWidth="8" strokeLinecap="round" />
        {[171, 173, 175, 177].map(y => (
          <React.Fragment key={y}>
            <Line x1={String(armLX - 9)} y1={String(y)} x2={String(armLX - 3)} y2={String(y)} stroke="#808080" strokeWidth="0.3" opacity="0.4" />
            <Line x1={String(armRX + 3)} y1={String(y)} x2={String(armRX + 9)} y2={String(y)} stroke="#808080" strokeWidth="0.3" opacity="0.4" />
          </React.Fragment>
        ))}
        <Path d={`M48 ${torsoTopY - 2} Q54 ${torsoTopY + 2} 60 ${torsoTopY - 4} Q66 ${torsoTopY + 2} 72 ${torsoTopY - 2}`} fill={owColor} stroke={owColor} strokeWidth="2" />
      </G>
    );
  }, [vs.equippedOuterwearStyle, vs.outerwearColor, armLX, armRX, hipLX, hipRX, torsoTopY]);

  const eyewearEl = useMemo(() => {
    const ew = vs.equippedEyewearStyle;
    if (!ew) return null;
    const ey = fc - 2;
    if (ew === "thin-frame") {
      return (
        <G>
          <Rect x="40" y={String(ey - 6)} width="19" height="13" rx="4.5" fill="none" stroke="#C8A030" strokeWidth="1.8" />
          <Rect x="61" y={String(ey - 6)} width="19" height="13" rx="4.5" fill="none" stroke="#C8A030" strokeWidth="1.8" />
          <Path d={`M59 ${ey + 1} Q60 ${ey - 1} 61 ${ey + 1}`} stroke="#C8A030" strokeWidth="1.5" fill="none" />
          <Line x1="40" y1={String(ey + 1)} x2="32" y2={String(ey + 4)} stroke="#C8A030" strokeWidth="1.5" />
          <Line x1="80" y1={String(ey + 1)} x2="88" y2={String(ey + 4)} stroke="#C8A030" strokeWidth="1.5" />
          <Path d={`M42 ${ey - 4} Q46 ${ey - 6} 50 ${ey - 4}`} stroke="#FFFFFF" strokeWidth="0.6" fill="none" opacity="0.25" />
          <Path d={`M63 ${ey - 4} Q67 ${ey - 6} 71 ${ey - 4}`} stroke="#FFFFFF" strokeWidth="0.6" fill="none" opacity="0.25" />
        </G>
      );
    }
    if (ew === "bold-frame") {
      return (
        <G>
          <Rect x="40" y={String(ey - 6)} width="19" height="13" rx="4.5" fill="#10101410" stroke="#101018" strokeWidth="3" />
          <Rect x="61" y={String(ey - 6)} width="19" height="13" rx="4.5" fill="#10101410" stroke="#101018" strokeWidth="3" />
          <Path d={`M59 ${ey + 1} Q60 ${ey - 1} 61 ${ey + 1}`} stroke="#101018" strokeWidth="2.5" fill="none" />
          <Line x1="40" y1={String(ey + 1)} x2="32" y2={String(ey + 4)} stroke="#101018" strokeWidth="2" />
          <Line x1="80" y1={String(ey + 1)} x2="88" y2={String(ey + 4)} stroke="#101018" strokeWidth="2" />
          <Ellipse cx="56" cy={String(ey + 3)} rx="1.5" ry="1" fill="#101018" />
          <Ellipse cx="64" cy={String(ey + 3)} rx="1.5" ry="1" fill="#101018" />
        </G>
      );
    }
    return (
      <G>
        <Defs>
          <LinearGradient id={gid("sgL")} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#000000" stopOpacity="0.58" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.37" />
          </LinearGradient>
        </Defs>
        <Rect x="39" y={String(ey - 6)} width="21" height="14" rx="7" fill={`url(#${gid("sgL")})`} stroke="#1A1A2A" strokeWidth="2.5" />
        <Rect x="60" y={String(ey - 6)} width="21" height="14" rx="7" fill={`url(#${gid("sgL")})`} stroke="#1A1A2A" strokeWidth="2.5" />
        <Path d={`M41 ${ey - 3} Q47 ${ey - 6} 53 ${ey - 3}`} stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity="0.2" />
        <Path d={`M62 ${ey - 3} Q68 ${ey - 6} 74 ${ey - 3}`} stroke="#FFFFFF" strokeWidth="1.5" fill="none" opacity="0.2" />
        <Rect x="59" y={String(ey)} width="2" height="3" rx="1" fill="#1A1A2A" />
        <Line x1="39" y1={String(ey + 1)} x2="32" y2={String(ey + 4)} stroke="#1A1A2A" strokeWidth="1.5" />
        <Line x1="81" y1={String(ey + 1)} x2="88" y2={String(ey + 4)} stroke="#1A1A2A" strokeWidth="1.5" />
        <Circle cx="39" cy={String(ey + 1)} r="1.2" fill="#2A2A3A" />
        <Circle cx="81" cy={String(ey + 1)} r="1.2" fill="#2A2A3A" />
      </G>
    );
  }, [vs.equippedEyewearStyle, fc, uid]);

  return (
    <View style={[styles.container, size === "full" && styles.fullContainer]}>
      <Svg width={w} height={h} viewBox="0 0 120 380" preserveAspectRatio="xMidYMid meet">
        {defsEl}

        {/* 1. Ground drop shadow */}
        {showShadow && <Ellipse cx="60" cy="372" rx="32" ry="5" fill="#000000" opacity="0.35" />}

        {/* 2. Prestige aura */}
        {auraEl}

        {/* 3. Shoes */}
        {shoesEl}

        {/* 4. Legs / pants with gradients */}
        <Path d={`M${hipLX} 194 L52 194 L54 318 L${hipLX - 4} 318 Z`} fill={`url(#${gid("pantsGrad")})`} />
        <Path d={`M68 194 L${hipRX} 194 L${hipRX + 4} 318 L66 318 Z`} fill={`url(#${gid("pantsGrad")})`} />
        <Path d={`M36 194 Q60 208 84 194`} fill={`url(#${gid("pantsGrad")})`} />
        <Line x1="39" y1="200" x2="37" y2="314" stroke={pantsP.deep} strokeWidth="1.2" opacity="0.6" />
        <Line x1="81" y1="200" x2="83" y2="314" stroke={pantsP.deep} strokeWidth="1.2" opacity="0.6" />

        {/* 5. Belt + buckle */}
        <Rect x="26" y="187" width="68" height="9" rx="2" fill="#3D2810" />
        <Rect x="26" y="187" width="68" height="9" rx="2" fill={`url(#${gid("beltTex")})`} />
        <Rect x="51" y="186" width="18" height="11" rx="2" fill="#5A3C18" />
        <Rect x="53" y="188" width="14" height="7" rx="1.5" fill="none" stroke="#C8A030" strokeWidth="1.5" />
        <Line x1="60" y1="188" x2="60" y2="195" stroke="#C8A030" strokeWidth="1" />

        {/* 6. Torso / shirt with gradient */}
        <Path d={`M${armLX} ${torsoTopY} L${armRX} ${torsoTopY} L${hipRX} 190 L${hipLX} 190 Z`} fill={`url(#${gid("shirtBody")})`} />
        <Path d={`M${armLX} ${torsoTopY} L${armRX} ${torsoTopY} L${hipRX} 190 L${hipLX} 190 Z`} fill={`url(#${gid("shirtFold")})`} />

        {/* 7. Outerwear */}
        {outerwearEl}

        {/* 8. Left + right arms */}
        <Path d={`M${armLX} ${torsoTopY} Q${armLX - 10} ${torsoTopY + 2} ${armLX - 12} ${torsoTopY + 6} L${armLX - 12} 178 Q${armLX - 10} 182 ${armLX - 2} 182 L${armLX + 2} 182 L${hipLX} ${torsoTopY + 6} Z`} fill={`url(#${gid("shirtBody")})`} />
        <Path d={`M${armRX} ${torsoTopY} Q${armRX + 10} ${torsoTopY + 2} ${armRX + 12} ${torsoTopY + 6} L${armRX + 12} 178 Q${armRX + 10} 182 ${armRX + 2} 182 L${armRX - 2} 182 L${hipRX} ${torsoTopY + 6} Z`} fill={`url(#${gid("shirtBody")})`} />

        {/* 9. Armpit fold shadows */}
        <Ellipse cx={String(armLX + 2)} cy={String(torsoTopY + 12)} rx="6" ry="10" fill={shirtS.deepShadow} opacity="0.25" />
        <Ellipse cx={String(armRX - 2)} cy={String(torsoTopY + 12)} rx="6" ry="10" fill={shirtS.deepShadow} opacity="0.25" />

        {/* 10. Chain / necklace (under collar) */}
        {vs.equippedAccessoryStyle === "chain" && (
          <G>
            <Path d="M51 88 Q48 100 50 112 Q54 122 60 126 Q66 122 70 112 Q72 100 69 88" stroke="#8A6010" strokeWidth="4" fill="none" opacity="0.3" />
            <Path d="M51 88 Q48 100 50 112 Q54 122 60 126 Q66 122 70 112 Q72 100 69 88" stroke="#C8A030" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="1,2" />
            <Circle cx="60" cy="128" r="5.5" fill="#C8A030" stroke="#E8C050" strokeWidth="0.5" />
            <Circle cx="60" cy="128" r="3.5" fill="#0A0A14" />
            <Circle cx="60" cy="128" r="1.5" fill="#4488FF" />
            <Circle cx="58" cy="126" r="1" fill="white" opacity="0.4" />
          </G>
        )}

        {/* 11. Collar */}
        <Path d={`M60 82 L72 90 L72 94 L60 92 L48 94 L48 90 Z`} fill={shirtS.deepShadow} opacity="0.35" />
        <Path d={`M60 82 L72 90 L74 ${torsoTopY + 4} L60 ${torsoTopY + 2} Z`} fill={shirtS.highlight} />
        <Path d={`M60 82 L48 90 L46 ${torsoTopY + 4} L60 ${torsoTopY + 2} Z`} fill={shirtS.highlight} />
        <Circle cx="60" cy={String(torsoTopY)} r="2.5" fill={shirtS.mid} stroke={shirtS.shadow} strokeWidth="0.5" />

        {/* 12. Shirt construction details */}
        <Rect x="58.5" y={String(torsoTopY + 4)} width="3" height="88" rx="0" fill={shirtS.shadow} opacity="0.15" />
        <Circle cx="60" cy={String(torsoTopY + 18)} r="2.2" fill={shirtS.mid} stroke={shirtS.shadow} strokeWidth="0.4" />
        <Circle cx="60" cy={String(torsoTopY + 36)} r="2.2" fill={shirtS.mid} stroke={shirtS.shadow} strokeWidth="0.4" />
        <Circle cx="60" cy={String(torsoTopY + 54)} r="2.2" fill={shirtS.mid} stroke={shirtS.shadow} strokeWidth="0.4" />
        <Path d={`M26 187 Q40 184 60 185 Q80 184 94 187`} stroke={shirtS.shadow} strokeWidth="1" fill="none" opacity="0.4" />
        <Path d={`M${armLX} ${torsoTopY} Q${armLX + 6} ${torsoTopY + 2} ${armLX + 10} ${torsoTopY + 10}`} stroke={shirtS.shadow} strokeWidth="1" fill="none" opacity="0.5" />
        <Path d={`M${armRX} ${torsoTopY} Q${armRX - 6} ${torsoTopY + 2} ${armRX - 10} ${torsoTopY + 10}`} stroke={shirtS.shadow} strokeWidth="1" fill="none" opacity="0.5" />

        {/* Sleeve cuffs */}
        <Path d={`M${armLX - 12} 170 Q${armLX - 12} 180 ${armLX - 6} 182 L${armLX + 2} 182 Q${armLX + 6} 180 ${armLX + 6} 170`} fill={shirtS.cuff} stroke={shirtS.shadow} strokeWidth="0.5" />
        <Path d={`M${armRX + 12} 170 Q${armRX + 12} 180 ${armRX + 6} 182 L${armRX - 2} 182 Q${armRX - 6} 180 ${armRX - 6} 170`} fill={shirtS.cuff} stroke={shirtS.shadow} strokeWidth="0.5" />
        <Circle cx={String(armLX - 5)} cy="177" r="1.5" fill={shirtS.mid} />
        <Circle cx={String(armRX + 5)} cy="177" r="1.5" fill={shirtS.mid} />

        {/* 13. Neck */}
        <Path d={`M53 ${fc + 22} Q53 ${fc + 36} 55 ${fc + 38} L65 ${fc + 38} Q67 ${fc + 36} 67 ${fc + 22}`} fill={skin.base} />
        <Path d={`M53 ${fc + 22} Q53 ${fc + 28} 54 ${fc + 30}`} stroke={skin.deep} strokeWidth="0.6" fill="none" opacity="0.4" />
        <Path d={`M67 ${fc + 22} Q67 ${fc + 28} 66 ${fc + 30}`} stroke={skin.deep} strokeWidth="0.6" fill="none" opacity="0.4" />

        {/* 14. Head base + ears */}
        <Ellipse cx="60" cy={String(fc)} rx={String(headRX)} ry={String(headRY)} fill={`url(#${gid("skinFace")})`} />
        {faceShape === "square" && (
          <Path d={`M39 ${fc + 8} Q39 ${fc + 22} 60 ${fc + 24} Q81 ${fc + 22} 81 ${fc + 8}`} fill={`url(#${gid("skinFace")})`} />
        )}
        <Ellipse cx="39" cy={String(fc)} rx="4.5" ry="6.5" fill={skin.base} />
        <Ellipse cx="39.5" cy={String(fc)} rx="2.5" ry="4" fill={skin.shadow} opacity="0.3" />
        <Ellipse cx="81" cy={String(fc)} rx="4.5" ry="6.5" fill={skin.base} />
        <Ellipse cx="80.5" cy={String(fc)} rx="2.5" ry="4" fill={skin.shadow} opacity="0.3" />

        {/* 15. Hair back layer */}
        {hairEl.back}

        {/* 16. Face gradient / shading */}
        <Ellipse cx="60" cy={String(fc + 18)} rx="18" ry="5" fill={skin.deep} opacity="0.2" />

        {/* 17. Cheekbone highlights */}
        <Ellipse cx="44" cy={String(fc + 4)} rx="7" ry="4" fill={skin.light} opacity="0.25" />
        <Ellipse cx="76" cy={String(fc + 4)} rx="7" ry="4" fill={skin.light} opacity="0.25" />

        {/* 18. Eyebrows */}
        {browEl}

        {/* 19. Eyes */}
        {eyesEl}

        {/* 20. Nose */}
        {noseEl}

        {/* 21. Mouth */}
        {mouthEl}

        {/* 22. Hair front layer */}
        {hairEl.front}

        {/* 23. Hands with finger hints */}
        <Path d={`M${armLX - 12} 178 Q${armLX - 14} 182 ${armLX - 13} 188 Q${armLX - 10} 194 ${armLX - 2} 192 Q${armLX + 2} 190 ${armLX + 2} 186 L${armLX - 2} 180 Z`} fill={`url(#${gid("skinHand")})`} />
        <Path d={`M${armLX - 11} 183 Q${armLX - 12} 179 ${armLX - 10} 178`} stroke={skin.deep} strokeWidth="0.8" fill="none" />
        <Path d={`M${armLX - 7} 185 Q${armLX - 8} 180 ${armLX - 6} 179`} stroke={skin.deep} strokeWidth="0.8" fill="none" />
        <Path d={`M${armLX - 3} 185 Q${armLX - 3} 180 ${armLX - 2} 180`} stroke={skin.deep} strokeWidth="0.8" fill="none" />
        <Ellipse cx={String(armLX - 13)} cy="186" rx="2.5" ry="4" fill={skin.base} />

        <Path d={`M${armRX + 12} 178 Q${armRX + 14} 182 ${armRX + 13} 188 Q${armRX + 10} 194 ${armRX + 2} 192 Q${armRX - 2} 190 ${armRX - 2} 186 L${armRX + 2} 180 Z`} fill={`url(#${gid("skinHand")})`} />
        <Path d={`M${armRX + 11} 183 Q${armRX + 12} 179 ${armRX + 10} 178`} stroke={skin.deep} strokeWidth="0.8" fill="none" />
        <Path d={`M${armRX + 7} 185 Q${armRX + 8} 180 ${armRX + 6} 179`} stroke={skin.deep} strokeWidth="0.8" fill="none" />
        <Path d={`M${armRX + 3} 185 Q${armRX + 3} 180 ${armRX + 2} 180`} stroke={skin.deep} strokeWidth="0.8" fill="none" />
        <Ellipse cx={String(armRX + 13)} cy="186" rx="2.5" ry="4" fill={skin.base} />

        {/* 24. Watch */}
        {watchEl}

        {/* 25. Ring */}
        {vs.equippedAccessoryStyle === "ring" && (
          <G>
            <Ellipse cx="109" cy="187" rx="5" ry="3" fill="none" stroke="#D4A840" strokeWidth="2.5" />
            <Ellipse cx="109" cy="187" rx="5" ry="3" fill="none" stroke="#8A5820" strokeWidth="1" opacity="0.5" />
            <Ellipse cx="109" cy="184" rx="3.5" ry="2" fill="#1A1A2A" stroke="#D4A840" strokeWidth="1" />
            <Ellipse cx="109" cy="184" rx="2.5" ry="1.5" fill="#3366CC" />
            <Line x1="107" y1="184" x2="111" y2="184" stroke="#6699FF" strokeWidth="0.5" />
            <Line x1="109" y1="182.5" x2="109" y2="185.5" stroke="#6699FF" strokeWidth="0.5" />
            <Circle cx="108" cy="183" r="0.6" fill="#FFFFFF" opacity="0.5" />
          </G>
        )}

        {/* 26. Lapel pin */}
        {vs.equippedAccessoryStyle === "pin" && (
          <G>
            <Circle cx="38" cy="110" r="6" fill="#C8A030" />
            <Circle cx="38" cy="110" r="4.5" fill="none" stroke="#8A6010" strokeWidth="0.8" />
            <Path d="M38 106 L42 110 L38 114 L34 110 Z" fill="#0A0A14" />
            <Line x1="36" y1="108" x2="40" y2="112" stroke="#3A3A4A" strokeWidth="0.5" opacity="0.5" />
            <Line x1="40" y1="108" x2="36" y2="112" stroke="#3A3A4A" strokeWidth="0.5" opacity="0.5" />
            <Circle cx="36" cy="108" r="1.2" fill="#FFFFFF" opacity="0.5" />
          </G>
        )}

        {/* 27. Eyewear */}
        {eyewearEl}

        {/* 28. Prestige particles (legendary golden tint overlay) */}
        {vs.prestigeStage === "legendary" && (
          <Rect x="0" y="0" width="120" height="380" fill="#C8A030" opacity="0.03" />
        )}

        {/* Default dog-tag + bracelet when no accessory equipped */}
        {!vs.equippedAccessoryStyle && (
          <G>
            <Path d="M52 90 Q56 100 57 105 Q58 100 62 90" stroke="#9A9AA0" strokeWidth="0.8" fill="none" opacity="0.5" />
            <Rect x="54" y="103" width="6" height="10" rx="1.5" fill="#A8A8B0" opacity="0.6" />
            <Line x1="55.5" y1="106" x2="58.5" y2="106" stroke="#C0C0C8" strokeWidth="0.3" opacity="0.4" />
            <Line x1="55.5" y1="108" x2="58.5" y2="108" stroke="#C0C0C8" strokeWidth="0.3" opacity="0.3" />
            <Line x1="55.5" y1="110" x2="58.5" y2="110" stroke="#C0C0C8" strokeWidth="0.3" opacity="0.25" />
            <Rect x={String(armLX - 10)} y="170" width="14" height="6" rx="2.5" fill="#6B4226" opacity="0.82" />
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

import React, { memo } from "react";
import { G, Ellipse, Rect, Path, Defs, LinearGradient, Stop, RadialGradient } from "react-native-svg";
import type { BodyType } from "@/lib/characterEngine";

const SKIN_TONE_COLORS: Record<string, { base: string; shadow: string; highlight: string; deep: string }> = {
  "tone-1": { base: "#F5D5B8", highlight: "#FFEEDD", shadow: "#E0BC9A", deep: "#D4A882" },
  "tone-2": { base: "#E8B48A", highlight: "#F5CDAA", shadow: "#D49F70", deep: "#C08A5C" },
  "tone-3": { base: "#C68A5E", highlight: "#DCA478", shadow: "#B07A50", deep: "#9A6840" },
  "tone-4": { base: "#8D5524", highlight: "#A66E3C", shadow: "#7A4820", deep: "#6A3A16" },
  "tone-5": { base: "#4A2C0A", highlight: "#644020", shadow: "#3C2208", deep: "#2E1A04" },
};

interface Props {
  skinTone: string;
  bodyType: BodyType;
  headCY: number;
  earCY: number;
  neckY: number;
  neckH: number;
  neckW: number;
  armLX: number;
  armRX: number;
  armW: number;
  shoulderW: number;
}

function BodyBaseLayerInner({ skinTone, bodyType, headCY, earCY, neckY, neckH, neckW, armLX, armRX, armW, shoulderW }: Props) {
  const colors = SKIN_TONE_COLORS[skinTone] ?? SKIN_TONE_COLORS["tone-3"];
  const isMale = bodyType === "male";
  const headRX = isMale ? 17 : 16;
  const headRY = isMale ? 19 : 18;
  const jawW = isMale ? 13 : 11;
  const jawH = isMale ? 5 : 3.5;
  const earRX = isMale ? 3.5 : 3;
  const earRY = isMale ? 5.5 : 5;
  const handRX = isMale ? 8 : 7;
  const handRY = isMale ? 6.5 : 5.5;

  return (
    <G>
      <Defs>
        <LinearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.highlight} />
          <Stop offset="0.4" stopColor={colors.base} />
          <Stop offset="1" stopColor={colors.shadow} />
        </LinearGradient>
        <RadialGradient id="faceGrad" cx="0.5" cy="0.35" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor={colors.highlight} />
          <Stop offset="0.7" stopColor={colors.base} />
          <Stop offset="1" stopColor={colors.shadow} />
        </RadialGradient>
      </Defs>

      <Rect x={50 - neckW / 2} y={neckY} width={neckW} height={neckH} rx={neckW / 3} fill="url(#skinGrad)" />
      <Rect x={50 - neckW / 2 + 1} y={neckY} width={neckW - 2} height={neckH * 0.4} fill={colors.highlight} opacity={0.3} />

      <Ellipse cx={50 - headRX - 2} cy={earCY} rx={earRX} ry={earRY} fill={colors.base} />
      <Ellipse cx={50 + headRX + 2} cy={earCY} rx={earRX} ry={earRY} fill={colors.base} />
      <Ellipse cx={50 - headRX - 2} cy={earCY} rx={earRX * 0.55} ry={earRY * 0.55} fill={colors.shadow} />
      <Ellipse cx={50 + headRX + 2} cy={earCY} rx={earRX * 0.55} ry={earRY * 0.55} fill={colors.shadow} />

      <Ellipse cx="50" cy={headCY} rx={headRX} ry={headRY} fill="url(#faceGrad)" />
      <Ellipse cx="50" cy={headCY + headRY * 0.7} rx={jawW} ry={jawH} fill={colors.shadow} opacity={0.25} />

      <Path
        d={`M50 ${headCY - 5} Q48 ${headCY + 3} 47 ${headCY + 6} L53 ${headCY + 6} Q52 ${headCY + 3} 50 ${headCY - 5}`}
        fill={colors.shadow} opacity={0.2}
      />
      <Ellipse cx="50" cy={headCY + 5.5} rx="3.5" ry="2" fill={colors.base} />
      <Ellipse cx="48.5" cy={headCY + 6.5} rx="1" ry="0.6" fill={colors.deep} opacity={0.5} />
      <Ellipse cx="51.5" cy={headCY + 6.5} rx="1" ry="0.6" fill={colors.deep} opacity={0.5} />

      <G>
        <Ellipse cx="42" cy={headCY - 3} rx="4" ry="3" fill="#F8F8FF" />
        <Ellipse cx="58" cy={headCY - 3} rx="4" ry="3" fill="#F8F8FF" />
        <Ellipse cx="42" cy={headCY - 3} rx="2.8" ry="2.8" fill="#1C1C28" />
        <Ellipse cx="58" cy={headCY - 3} rx="2.8" ry="2.8" fill="#1C1C28" />
        <Ellipse cx="42" cy={headCY - 3} rx="1.8" ry="1.8" fill="#0A0A14" />
        <Ellipse cx="58" cy={headCY - 3} rx="1.8" ry="1.8" fill="#0A0A14" />
        <Ellipse cx={43} cy={headCY - 4.2} rx="0.8" ry="0.8" fill="#FFFFFF" />
        <Ellipse cx={59} cy={headCY - 4.2} rx="0.8" ry="0.8" fill="#FFFFFF" />
        <Ellipse cx={41.5} cy={headCY - 2.5} rx="0.4" ry="0.4" fill="#FFFFFF" opacity={0.6} />
        <Ellipse cx={57.5} cy={headCY - 2.5} rx="0.4" ry="0.4" fill="#FFFFFF" opacity={0.6} />

        <Path d={`M38 ${headCY - 3} Q42 ${headCY - 5.5} 46 ${headCY - 3}`} stroke={colors.deep} strokeWidth="0.6" fill="none" opacity={0.3} />
        <Path d={`M54 ${headCY - 3} Q58 ${headCY - 5.5} 62 ${headCY - 3}`} stroke={colors.deep} strokeWidth="0.6" fill="none" opacity={0.3} />
      </G>

      <Ellipse cx={armLX + armW / 2} cy="148" rx={handRX} ry={handRY} fill={colors.base} />
      <Ellipse cx={armRX + armW / 2} cy="148" rx={handRX} ry={handRY} fill={colors.base} />
      <Path d={`M${armLX + armW / 2 - 2} 146 Q${armLX + armW / 2} 150 ${armLX + armW / 2 + 2} 146`} stroke={colors.shadow} strokeWidth="0.5" fill="none" opacity={0.4} />
      <Path d={`M${armRX + armW / 2 - 2} 146 Q${armRX + armW / 2} 150 ${armRX + armW / 2 + 2} 146`} stroke={colors.shadow} strokeWidth="0.5" fill="none" opacity={0.4} />
    </G>
  );
}

export const BodyBaseLayer = memo(BodyBaseLayerInner);

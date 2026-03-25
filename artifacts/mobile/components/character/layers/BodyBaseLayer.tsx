import React, { memo } from "react";
import { G, Ellipse, Rect, Path, Defs, LinearGradient, RadialGradient, Stop } from "react-native-svg";
import type { BodyType } from "@/lib/characterEngine";

const SKIN_TONE_COLORS: Record<string, { base: string; shadow: string; highlight: string; deep: string; blush: string; lip: string }> = {
  "tone-1": { base: "#F5D5B8", highlight: "#FFEEDD", shadow: "#E0BC9A", deep: "#D4A882", blush: "#F0B0A0", lip: "#D4887A" },
  "tone-2": { base: "#E8B48A", highlight: "#F5CDAA", shadow: "#D49F70", deep: "#C08A5C", blush: "#E0A090", lip: "#C47868" },
  "tone-3": { base: "#C68A5E", highlight: "#DCA478", shadow: "#B07A50", deep: "#9A6840", blush: "#C08070", lip: "#A86858" },
  "tone-4": { base: "#8D5524", highlight: "#A66E3C", shadow: "#7A4820", deep: "#6A3A16", blush: "#905848", lip: "#7A4A3A" },
  "tone-5": { base: "#4A2C0A", highlight: "#644020", shadow: "#3C2208", deep: "#2E1A04", blush: "#5A3828", lip: "#4A3020" },
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
  const c = SKIN_TONE_COLORS[skinTone] ?? SKIN_TONE_COLORS["tone-3"];
  const isMale = bodyType === "male";
  const headRX = isMale ? 16.5 : 15.5;
  const headRY = isMale ? 20 : 19;
  const jawW = isMale ? 14.5 : 12.5;
  const jawH = isMale ? 7 : 5;
  const chinY = headCY + headRY - 4;
  const earRX = isMale ? 3.2 : 2.8;
  const earRY = isMale ? 5.5 : 5;
  const handRX = isMale ? 7 : 6;
  const handRY = isMale ? 6 : 5;
  const handY = 148;

  return (
    <G>
      <Defs>
        <LinearGradient id="skinNeck" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.shadow} />
          <Stop offset="0.3" stopColor={c.base} />
          <Stop offset="1" stopColor={c.shadow} />
        </LinearGradient>
        <RadialGradient id="faceMain" cx="0.5" cy="0.38" rx="0.52" ry="0.52">
          <Stop offset="0" stopColor={c.highlight} />
          <Stop offset="0.55" stopColor={c.base} />
          <Stop offset="0.85" stopColor={c.shadow} />
          <Stop offset="1" stopColor={c.deep} />
        </RadialGradient>
        <RadialGradient id="cheekL" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor={c.blush} stopOpacity="0.18" />
          <Stop offset="1" stopColor={c.blush} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="cheekR" cx="0.5" cy="0.5" rx="0.5" ry="0.5">
          <Stop offset="0" stopColor={c.blush} stopOpacity="0.18" />
          <Stop offset="1" stopColor={c.blush} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Path
        d={`M${50 - neckW / 2} ${neckY} L${50 - neckW / 2 + 1} ${neckY + neckH} L${50 + neckW / 2 - 1} ${neckY + neckH} L${50 + neckW / 2} ${neckY} Z`}
        fill="url(#skinNeck)"
      />
      {isMale && (
        <Ellipse cx="50" cy={neckY + neckH * 0.55} rx="2.5" ry="1.8" fill={c.shadow} opacity={0.2} />
      )}
      <Path
        d={`M${50 - neckW / 2 + 2} ${neckY + 1} Q50 ${neckY + 3} ${50 + neckW / 2 - 2} ${neckY + 1}`}
        stroke={c.shadow} strokeWidth="0.4" fill="none" opacity={0.15}
      />

      <Ellipse cx={50 - headRX - 1.5} cy={earCY} rx={earRX} ry={earRY} fill={c.base} />
      <Ellipse cx={50 + headRX + 1.5} cy={earCY} rx={earRX} ry={earRY} fill={c.base} />
      <Ellipse cx={50 - headRX - 1.5} cy={earCY} rx={earRX * 0.5} ry={earRY * 0.5} fill={c.shadow} opacity={0.35} />
      <Ellipse cx={50 + headRX + 1.5} cy={earCY} rx={earRX * 0.5} ry={earRY * 0.5} fill={c.shadow} opacity={0.35} />
      <Path d={`M${50 - headRX - 1.5 - earRX * 0.3} ${earCY - earRY * 0.6} Q${50 - headRX - 1.5} ${earCY} ${50 - headRX - 1.5 - earRX * 0.3} ${earCY + earRY * 0.6}`} stroke={c.deep} strokeWidth="0.4" fill="none" opacity={0.2} />
      <Path d={`M${50 + headRX + 1.5 + earRX * 0.3} ${earCY - earRY * 0.6} Q${50 + headRX + 1.5} ${earCY} ${50 + headRX + 1.5 + earRX * 0.3} ${earCY + earRY * 0.6}`} stroke={c.deep} strokeWidth="0.4" fill="none" opacity={0.2} />

      <Ellipse cx="50" cy={headCY} rx={headRX} ry={headRY} fill="url(#faceMain)" />

      <Path
        d={`M${50 - jawW * 0.7} ${chinY - 2} Q${50 - jawW * 0.3} ${chinY + jawH * 0.4} 50 ${chinY + jawH} Q${50 + jawW * 0.3} ${chinY + jawH * 0.4} ${50 + jawW * 0.7} ${chinY - 2}`}
        fill={c.shadow} opacity={0.12}
      />
      {isMale && (
        <Path
          d={`M${50 - jawW * 0.6} ${chinY - 4} L${50 - jawW * 0.1} ${chinY + jawH - 2} L50 ${chinY + jawH} L${50 + jawW * 0.1} ${chinY + jawH - 2} L${50 + jawW * 0.6} ${chinY - 4}`}
          stroke={c.shadow} strokeWidth="0.5" fill="none" opacity={0.08}
        />
      )}

      <Ellipse cx="41" cy={headCY + 4} rx="6" ry="5" fill="url(#cheekL)" />
      <Ellipse cx="59" cy={headCY + 4} rx="6" ry="5" fill="url(#cheekR)" />

      <Path
        d={`M50 ${headCY - 4} Q49.2 ${headCY} 48.5 ${headCY + 4} L48 ${headCY + 6} Q50 ${headCY + 7.5} 52 ${headCY + 6} L51.5 ${headCY + 4} Q50.8 ${headCY} 50 ${headCY - 4}`}
        fill={c.shadow} opacity={0.12}
      />
      <Ellipse cx="50" cy={headCY + 5.8} rx="3.8" ry="2.2" fill={c.base} />
      <Ellipse cx="48.3" cy={headCY + 6.8} rx="1.2" ry="0.7" fill={c.deep} opacity={0.4} />
      <Ellipse cx="51.7" cy={headCY + 6.8} rx="1.2" ry="0.7" fill={c.deep} opacity={0.4} />
      <Path d={`M48 ${headCY + 6.5} Q50 ${headCY + 7.8} 52 ${headCY + 6.5}`} stroke={c.deep} strokeWidth="0.3" fill="none" opacity={0.2} />

      <G>
        <Ellipse cx="42.5" cy={headCY - 3} rx="4.2" ry="2.5" fill="#FAFAFF" />
        <Ellipse cx="57.5" cy={headCY - 3} rx="4.2" ry="2.5" fill="#FAFAFF" />

        <Ellipse cx="42.5" cy={headCY - 3} rx="2.6" ry="2.6" fill="#3A2820" />
        <Ellipse cx="57.5" cy={headCY - 3} rx="2.6" ry="2.6" fill="#3A2820" />

        <Ellipse cx="42.5" cy={headCY - 3} rx="1.6" ry="1.6" fill="#0E0E16" />
        <Ellipse cx="57.5" cy={headCY - 3} rx="1.6" ry="1.6" fill="#0E0E16" />

        <Ellipse cx={43.2} cy={headCY - 4} rx="0.7" ry="0.7" fill="#FFFFFF" />
        <Ellipse cx={58.2} cy={headCY - 4} rx="0.7" ry="0.7" fill="#FFFFFF" />
        <Ellipse cx={41.8} cy={headCY - 2.4} rx="0.35" ry="0.35" fill="#FFFFFF" opacity={0.5} />
        <Ellipse cx={56.8} cy={headCY - 2.4} rx="0.35" ry="0.35" fill="#FFFFFF" opacity={0.5} />

        <Path d={`M38.2 ${headCY - 3} Q42.5 ${headCY - 0.5} 46.8 ${headCY - 3}`} stroke={c.deep} strokeWidth="0.3" fill="none" opacity={0.1} />
        <Path d={`M53.2 ${headCY - 3} Q57.5 ${headCY - 0.5} 61.8 ${headCY - 3}`} stroke={c.deep} strokeWidth="0.3" fill="none" opacity={0.1} />

        {!isMale && (
          <>
            <Path d={`M38 ${headCY - 2.5} Q42.5 ${headCY - 0.2} 47 ${headCY - 2.5}`} stroke={c.deep} strokeWidth="0.4" fill="none" opacity={0.08} />
            <Path d={`M53 ${headCY - 2.5} Q57.5 ${headCY - 0.2} 62 ${headCY - 2.5}`} stroke={c.deep} strokeWidth="0.4" fill="none" opacity={0.08} />
          </>
        )}
      </G>

      <Ellipse cx={armLX + armW / 2} cy={handY} rx={handRX} ry={handRY} fill={c.base} />
      <Ellipse cx={armRX + armW / 2} cy={handY} rx={handRX} ry={handRY} fill={c.base} />
      <Ellipse cx={armLX + armW / 2} cy={handY + 1} rx={handRX - 2} ry={handRY - 2} fill={c.shadow} opacity={0.1} />
      <Ellipse cx={armRX + armW / 2} cy={handY + 1} rx={handRX - 2} ry={handRY - 2} fill={c.shadow} opacity={0.1} />
      <Path d={`M${armLX + armW / 2 - 3} ${handY - 1} L${armLX + armW / 2 - 3} ${handY + 2}`} stroke={c.shadow} strokeWidth="0.3" opacity={0.2} />
      <Path d={`M${armLX + armW / 2 - 1} ${handY - 1.5} L${armLX + armW / 2 - 1} ${handY + 2.5}`} stroke={c.shadow} strokeWidth="0.3" opacity={0.15} />
      <Path d={`M${armLX + armW / 2 + 1} ${handY - 1.5} L${armLX + armW / 2 + 1} ${handY + 2.5}`} stroke={c.shadow} strokeWidth="0.3" opacity={0.15} />
      <Path d={`M${armRX + armW / 2 - 1} ${handY - 1.5} L${armRX + armW / 2 - 1} ${handY + 2.5}`} stroke={c.shadow} strokeWidth="0.3" opacity={0.15} />
      <Path d={`M${armRX + armW / 2 + 1} ${handY - 1.5} L${armRX + armW / 2 + 1} ${handY + 2.5}`} stroke={c.shadow} strokeWidth="0.3" opacity={0.15} />
      <Path d={`M${armRX + armW / 2 + 3} ${handY - 1} L${armRX + armW / 2 + 3} ${handY + 2}`} stroke={c.shadow} strokeWidth="0.3" opacity={0.2} />
    </G>
  );
}

export const BodyBaseLayer = memo(BodyBaseLayerInner);

import React, { memo } from "react";
import { G, Rect, Circle, Path, Ellipse, Defs, LinearGradient, Stop, Line } from "react-native-svg";
import type { OutfitTier, BodyType } from "@/lib/characterEngine";

interface OutfitColors {
  shirt: string; shirtShadow: string; shirtHighlight: string;
  pants: string; pantsShadow: string; pantsHighlight: string; pantsSeam: string;
  belt: string; buckle: string; buckleAccent: string;
  collar: boolean; buttons: boolean; distress: boolean;
  shoeUpper: string; shoeSole: string; shoeLace: string; shoeToe: string;
}

const OUTFIT_PALETTES: Record<OutfitTier, OutfitColors> = {
  starter: {
    shirt: "#F0EDE8", shirtShadow: "#D8D4CC", shirtHighlight: "#FAFAF8",
    pants: "#1C2842", pantsShadow: "#141E34", pantsHighlight: "#243252", pantsSeam: "#0E162A",
    belt: "#4A3828", buckle: "#8A7A62", buckleAccent: "#B0A080",
    collar: false, buttons: false, distress: true,
    shoeUpper: "#B8B0A4", shoeSole: "#E8E4DC", shoeLace: "#A8A098", shoeToe: "#C8C0B4",
  },
  rising: {
    shirt: "#EAEAEE", shirtShadow: "#D0D0D8", shirtHighlight: "#F6F6FA",
    pants: "#101828", pantsShadow: "#0A1018", pantsHighlight: "#182030", pantsSeam: "#060C14",
    belt: "#3A3040", buckle: "#706068", buckleAccent: "#908088",
    collar: true, buttons: false, distress: false,
    shoeUpper: "#F0F0F0", shoeSole: "#E0E0E0", shoeLace: "#DADADA", shoeToe: "#FAFAFA",
  },
  premium: {
    shirt: "#E8E4E0", shirtShadow: "#CCC8C0", shirtHighlight: "#F4F2EE",
    pants: "#1A1A24", pantsShadow: "#101018", pantsHighlight: "#24242E", pantsSeam: "#0A0A12",
    belt: "#2A2030", buckle: "#605058", buckleAccent: "#807078",
    collar: true, buttons: false, distress: false,
    shoeUpper: "#3A3028", shoeSole: "#2A2218", shoeLace: "#4A4038", shoeToe: "#504838",
  },
  elite: {
    shirt: "#1C1C28", shirtShadow: "#101018", shirtHighlight: "#2A2A38",
    pants: "#0A0A12", pantsShadow: "#050508", pantsHighlight: "#12121C", pantsSeam: "#03030A",
    belt: "#1A1420", buckle: "#C0A030", buckleAccent: "#E8C840",
    collar: true, buttons: false, distress: false,
    shoeUpper: "#1A1612", shoeSole: "#0E0C08", shoeLace: "#2A2420", shoeToe: "#242018",
  },
};

interface Props {
  tier: OutfitTier;
  bodyType: BodyType;
  equippedTopStyle: string | null;
  bottomColor: string | null;
  torsoX: number;
  torsoW: number;
  torsoH: number;
  armLX: number;
  armRX: number;
  armW: number;
  hipW: number;
  waistY: number;
  shoulderW: number;
}

function OutfitLayerInner({ tier, bodyType, equippedTopStyle, bottomColor, torsoX, torsoW, torsoH, armLX, armRX, armW, hipW, waistY, shoulderW }: Props) {
  const oc = OUTFIT_PALETTES[tier];
  const isMale = bodyType === "male";
  const topFill = equippedTopStyle ?? oc.shirt;
  const topShadow = equippedTopStyle ? equippedTopStyle + "AA" : oc.shirtShadow;
  const topHighlight = equippedTopStyle ? "#FFFFFF20" : oc.shirtHighlight;
  const pFill = bottomColor ?? oc.pants;
  const pShadow = bottomColor ? bottomColor + "AA" : oc.pantsShadow;
  const pHigh = bottomColor ? bottomColor + "30" : oc.pantsHighlight;
  const seamFill = bottomColor ? bottomColor + "66" : oc.pantsSeam;
  const legInset = isMale ? 1 : 2;
  const legW = isMale ? 19 : 17;
  const shoeW = 15;
  const shoeH = 8;
  const shoeY = 264;
  const lFootX = 50 - hipW / 4 + legInset;
  const rFootX = 50 + hipW / 4 - legInset;

  return (
    <G>
      <Defs>
        <LinearGradient id="shirtG" x1="0.3" y1="0" x2="0.7" y2="1">
          <Stop offset="0" stopColor={topHighlight} />
          <Stop offset="0.15" stopColor={topFill} />
          <Stop offset="0.5" stopColor={topFill} />
          <Stop offset="0.85" stopColor={topShadow} />
          <Stop offset="1" stopColor={topShadow} />
        </LinearGradient>
        <LinearGradient id="sleeveL" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={topFill} />
          <Stop offset="0.6" stopColor={topShadow} />
          <Stop offset="1" stopColor={topShadow} />
        </LinearGradient>
        <LinearGradient id="sleeveR" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={topFill} />
          <Stop offset="0.6" stopColor={topShadow} />
          <Stop offset="1" stopColor={topShadow} />
        </LinearGradient>
        <LinearGradient id="jeansG" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor={pHigh} />
          <Stop offset="0.15" stopColor={pFill} />
          <Stop offset="0.6" stopColor={pFill} />
          <Stop offset="0.85" stopColor={pShadow} />
          <Stop offset="1" stopColor={pShadow} />
        </LinearGradient>
        <LinearGradient id="shoeG" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0" stopColor={oc.shoeUpper} />
          <Stop offset="0.7" stopColor={oc.shoeUpper} />
          <Stop offset="1" stopColor={oc.shoeSole} />
        </LinearGradient>
      </Defs>

      <G>
        <Path
          d={`M${lFootX - shoeW / 2 - 3} ${shoeY + shoeH - 1} L${lFootX + shoeW / 2 + 1} ${shoeY + shoeH - 1} Q${lFootX + shoeW / 2 + 4} ${shoeY + shoeH - 1} ${lFootX + shoeW / 2 + 4} ${shoeY + shoeH - 4} L${lFootX + shoeW / 2 + 2} ${shoeY} L${lFootX - shoeW / 2} ${shoeY} L${lFootX - shoeW / 2 - 3} ${shoeY + shoeH - 4} Z`}
          fill="url(#shoeG)"
        />
        <Rect x={lFootX - shoeW / 2 - 3} y={shoeY + shoeH - 2} width={shoeW + 7} height="2.5" rx="1" fill={oc.shoeSole} />
        <Ellipse cx={lFootX + 2} cy={shoeY + 2} rx={shoeW / 2 - 3} ry="2" fill={oc.shoeToe} opacity={0.3} />
        <Path d={`M${lFootX - 2} ${shoeY + 2} L${lFootX} ${shoeY + 4} L${lFootX + 2} ${shoeY + 2}`} stroke={oc.shoeLace} strokeWidth="0.5" fill="none" opacity={0.6} />
        <Path d={`M${lFootX - 1} ${shoeY + 3} L${lFootX + 1} ${shoeY + 5}`} stroke={oc.shoeLace} strokeWidth="0.4" fill="none" opacity={0.4} />

        <Path
          d={`M${rFootX - shoeW / 2 - 1} ${shoeY + shoeH - 1} L${rFootX + shoeW / 2 + 3} ${shoeY + shoeH - 1} Q${rFootX + shoeW / 2 + 3} ${shoeY + shoeH - 1} ${rFootX + shoeW / 2 + 3} ${shoeY + shoeH - 4} L${rFootX + shoeW / 2} ${shoeY} L${rFootX - shoeW / 2 - 2} ${shoeY} L${rFootX - shoeW / 2 - 1} ${shoeY + shoeH - 4} Z`}
          fill="url(#shoeG)"
        />
        <Rect x={rFootX - shoeW / 2 - 1} y={shoeY + shoeH - 2} width={shoeW + 4} height="2.5" rx="1" fill={oc.shoeSole} />
        <Ellipse cx={rFootX} cy={shoeY + 2} rx={shoeW / 2 - 3} ry="2" fill={oc.shoeToe} opacity={0.3} />
        <Path d={`M${rFootX - 2} ${shoeY + 2} L${rFootX} ${shoeY + 4} L${rFootX + 2} ${shoeY + 2}`} stroke={oc.shoeLace} strokeWidth="0.5" fill="none" opacity={0.6} />
      </G>

      <G>
        <Rect x={lFootX - legW / 2} y={waistY + 5} width={legW} height="118" rx="4" fill="url(#jeansG)" />
        <Rect x={rFootX - legW / 2} y={waistY + 5} width={legW} height="118" rx="4" fill="url(#jeansG)" />

        <Path d={`M${lFootX + 2} ${waistY + 10} L${lFootX + 2} ${waistY + 100}`} stroke={seamFill} strokeWidth="0.6" opacity={0.4} />
        <Path d={`M${lFootX - 2} ${waistY + 10} L${lFootX - 2} ${waistY + 100}`} stroke={seamFill} strokeWidth="0.4" opacity={0.25} />
        <Path d={`M${rFootX + 2} ${waistY + 10} L${rFootX + 2} ${waistY + 100}`} stroke={seamFill} strokeWidth="0.6" opacity={0.4} />
        <Path d={`M${rFootX - 2} ${waistY + 10} L${rFootX - 2} ${waistY + 100}`} stroke={seamFill} strokeWidth="0.4" opacity={0.25} />

        <Path d={`M${lFootX - legW / 2 + 2} ${waistY + 8} L${lFootX + legW / 2 - 2} ${waistY + 8}`} stroke={pHigh} strokeWidth="0.5" opacity={0.15} />
        <Path d={`M${rFootX - legW / 2 + 2} ${waistY + 8} L${rFootX + legW / 2 - 2} ${waistY + 8}`} stroke={pHigh} strokeWidth="0.5" opacity={0.15} />

        <Rect x={50 - 4} y={waistY + 5} width="8" height="50" fill={seamFill} opacity={0.35} />

        <Path
          d={`M${lFootX - legW / 2 + 3} ${waistY + 55} Q${lFootX} ${waistY + 60} ${lFootX + legW / 2 - 3} ${waistY + 55}`}
          stroke={pShadow} strokeWidth="0.6" fill="none" opacity={0.2}
        />
        <Path
          d={`M${rFootX - legW / 2 + 3} ${waistY + 55} Q${rFootX} ${waistY + 60} ${rFootX + legW / 2 - 3} ${waistY + 55}`}
          stroke={pShadow} strokeWidth="0.6" fill="none" opacity={0.2}
        />

        {oc.distress && (
          <>
            <Rect x={lFootX - 4} y={waistY + 62} width="8" height="3" rx="1" fill={pHigh} opacity={0.12} />
            <Path d={`M${lFootX - 3} ${waistY + 63} L${lFootX + 3} ${waistY + 63.5}`} stroke={pHigh} strokeWidth="0.5" opacity={0.15} />
            <Path d={`M${lFootX - 2} ${waistY + 64} L${lFootX + 4} ${waistY + 64.5}`} stroke={pHigh} strokeWidth="0.4" opacity={0.1} />
            <Rect x={rFootX - 3} y={waistY + 58} width="7" height="4" rx="1" fill={pHigh} opacity={0.1} />
            <Path d={`M${rFootX - 2} ${waistY + 59} L${rFootX + 3} ${waistY + 59.5}`} stroke={pHigh} strokeWidth="0.5" opacity={0.12} />
            <Path d={`M${rFootX - 1} ${waistY + 60.5} L${rFootX + 4} ${waistY + 61}`} stroke={pHigh} strokeWidth="0.4" opacity={0.1} />
          </>
        )}

        <Path
          d={`M${lFootX - legW / 2 + 2} ${waistY + 90} Q${lFootX - 2} ${waistY + 95} ${lFootX - legW / 2 + 3} ${waistY + 100}`}
          stroke={pShadow} strokeWidth="0.5" fill="none" opacity={0.15}
        />
        <Path
          d={`M${rFootX + legW / 2 - 2} ${waistY + 88} Q${rFootX + 2} ${waistY + 93} ${rFootX + legW / 2 - 3} ${waistY + 98}`}
          stroke={pShadow} strokeWidth="0.5" fill="none" opacity={0.15}
        />
      </G>

      <Rect x={50 - hipW / 2 - 2} y={waistY} width={hipW + 4} height="7" rx="2.5" fill={oc.belt} />
      <Rect x={50 - hipW / 2 - 2} y={waistY} width={hipW + 4} height="2" rx="1" fill={oc.belt} opacity={0.7} />
      <Rect x="44" y={waistY + 1} width="12" height="5" rx="1.5" fill={oc.buckle} />
      <Rect x="46.5" y={waistY + 2} width="7" height="3" rx="1" fill={oc.buckleAccent} />
      <Rect x={50 - hipW / 2 + 3} y={waistY - 1} width="2" height="8" rx="0.5" fill={oc.belt} opacity={0.5} />
      <Rect x={50 + hipW / 2 - 5} y={waistY - 1} width="2" height="8" rx="0.5" fill={oc.belt} opacity={0.5} />
      <Rect x={50 - 8} y={waistY - 1} width="2" height="8" rx="0.5" fill={oc.belt} opacity={0.4} />
      <Rect x={50 + 6} y={waistY - 1} width="2" height="8" rx="0.5" fill={oc.belt} opacity={0.4} />

      <G>
        <Path
          d={`M${50 - shoulderW / 2} 56 Q${50 - shoulderW / 4} ${isMale ? 53 : 54} 50 ${isMale ? 52 : 53} Q${50 + shoulderW / 4} ${isMale ? 53 : 54} ${50 + shoulderW / 2} 56 L${torsoX + torsoW} ${waistY + 2} L${torsoX} ${waistY + 2} Z`}
          fill="url(#shirtG)"
        />

        {isMale ? (
          <>
            <Path d={`M${torsoX + 3} 62 Q${torsoX + 6} 80 ${torsoX + 4} ${waistY - 5}`} stroke={topShadow} strokeWidth="0.7" fill="none" opacity={0.2} />
            <Path d={`M${torsoX + torsoW - 3} 62 Q${torsoX + torsoW - 6} 80 ${torsoX + torsoW - 4} ${waistY - 5}`} stroke={topShadow} strokeWidth="0.7" fill="none" opacity={0.2} />
            <Path d={`M${torsoX + 8} 68 Q50 74 ${torsoX + torsoW - 8} 68`} stroke={topShadow} strokeWidth="0.4" fill="none" opacity={0.1} />
          </>
        ) : (
          <>
            <Path d={`M${torsoX + 5} 72 Q${torsoX + torsoW / 2} 68 ${torsoX + torsoW - 5} 72`} stroke={topShadow} strokeWidth="0.5" fill="none" opacity={0.15} />
            <Path d={`M${torsoX + 6} 82 Q${torsoX + torsoW / 2} 78 ${torsoX + torsoW - 6} 82`} stroke={topShadow} strokeWidth="0.4" fill="none" opacity={0.12} />
            <Path d={`M${torsoX + 3} 62 Q${torsoX + 5} 75 ${torsoX + 4} ${waistY - 8}`} stroke={topShadow} strokeWidth="0.5" fill="none" opacity={0.15} />
            <Path d={`M${torsoX + torsoW - 3} 62 Q${torsoX + torsoW - 5} 75 ${torsoX + torsoW - 4} ${waistY - 8}`} stroke={topShadow} strokeWidth="0.5" fill="none" opacity={0.15} />
          </>
        )}

        <Path d={`M${torsoX + 4} ${waistY - 8} Q50 ${waistY - 4} ${torsoX + torsoW - 4} ${waistY - 8}`} stroke={topShadow} strokeWidth="0.5" fill="none" opacity={0.12} />
        <Path d={`M${torsoX + 6} ${waistY - 3} Q50 ${waistY} ${torsoX + torsoW - 6} ${waistY - 3}`} stroke={topShadow} strokeWidth="0.4" fill="none" opacity={0.08} />
      </G>

      <G>
        <Rect x={armLX} y="58" width={armW} height="28" rx={armW / 2.5} fill="url(#sleeveL)" />
        <Rect x={armRX} y="58" width={armW} height="28" rx={armW / 2.5} fill="url(#sleeveR)" />

        <Path
          d={`M${armLX + 1} 84 Q${armLX + armW / 2} 87 ${armLX + armW - 1} 84`}
          stroke={topShadow} strokeWidth="0.6" fill="none" opacity={0.25}
        />
        <Path
          d={`M${armRX + 1} 84 Q${armRX + armW / 2} 87 ${armRX + armW - 1} 84`}
          stroke={topShadow} strokeWidth="0.6" fill="none" opacity={0.25}
        />

        <Path d={`M${armLX + 2} 62 Q${armLX + armW / 2} 65 ${armLX + armW - 2} 62`} stroke={topShadow} strokeWidth="0.3" fill="none" opacity={0.1} />
        <Path d={`M${armRX + 2} 62 Q${armRX + armW / 2} 65 ${armRX + armW - 2} 62`} stroke={topShadow} strokeWidth="0.3" fill="none" opacity={0.1} />
      </G>

      {oc.collar ? (
        <Path
          d={`M${50 - shoulderW / 4} 54 L50 64 L${50 + shoulderW / 4} 54`}
          stroke={topShadow} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
      ) : (
        <>
          <Path d={`M43 54 Q50 60 57 54`} stroke={topShadow} strokeWidth="1" fill="none" strokeLinecap="round" />
          <Path d={`M44 54.5 Q50 59 56 54.5`} stroke={topHighlight} strokeWidth="0.5" fill="none" strokeLinecap="round" opacity={0.3} />
        </>
      )}
    </G>
  );
}

export function OuterwearLayer({ style, color, torsoX, torsoW, armLX, armRX, armW, shoulderW }: {
  style: string | null; color: string | null;
  torsoX: number; torsoW: number; armLX: number; armRX: number; armW: number; shoulderW: number;
}) {
  if (!style) return null;
  const fill = color ?? "#36363C";
  const fillShadow = color ? color + "BB" : "#2A2A30";

  return (
    <G opacity={0.92}>
      <Path
        d={`M${50 - shoulderW / 2 - 2} 54 Q50 50 ${50 + shoulderW / 2 + 2} 54 L${torsoX + torsoW + 3} 118 L${torsoX - 3} 118 Z`}
        fill={fill}
      />
      <Rect x={armLX - 1} y="56" width={armW + 2} height="68" rx={armW / 2 + 1} fill={fill} />
      <Rect x={armRX - 1} y="56" width={armW + 2} height="68" rx={armW / 2 + 1} fill={fill} />
      <Path d="M50 56 L50 118" stroke={fillShadow} strokeWidth="1.5" opacity={0.35} />
      <Path
        d={`M${50 - shoulderW / 4} 54 L50 66 L${50 + shoulderW / 4} 54`}
        stroke={fillShadow} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity={0.45}
      />
    </G>
  );
}

export const OutfitLayer = memo(OutfitLayerInner);

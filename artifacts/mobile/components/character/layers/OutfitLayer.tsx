import React, { memo } from "react";
import { G, Rect, Circle, Path, Ellipse, Defs, LinearGradient, Stop } from "react-native-svg";
import type { OutfitTier, BodyType } from "@/lib/characterEngine";

interface OutfitColors {
  shirt: string; shirtShadow: string; shirtHighlight: string;
  pants: string; pantsShadow: string; pantsSeam: string;
  belt: string; buckle: string; buckleAccent: string;
  collar: boolean; buttons: boolean;
  shoeBase: string; shoeSole: string; shoeAccent: string;
}

const OUTFIT_PALETTES: Record<OutfitTier, OutfitColors> = {
  starter: {
    shirt: "#F2F0ED", shirtShadow: "#E4E0DA", shirtHighlight: "#FAFAF8",
    pants: "#1E2A4A", pantsShadow: "#162040", pantsSeam: "#14183A",
    belt: "#4A3828", buckle: "#8A7A62", buckleAccent: "#B0A080",
    collar: false, buttons: false,
    shoeBase: "#B8B0A4", shoeSole: "#3A3A3A", shoeAccent: "#D0C8BC",
  },
  rising: {
    shirt: "#E8E8EC", shirtShadow: "#D8D8DE", shirtHighlight: "#F4F4F8",
    pants: "#141428", pantsShadow: "#0E0E20", pantsSeam: "#0A0A1A",
    belt: "#3A3040", buckle: "#706068", buckleAccent: "#908088",
    collar: true, buttons: false,
    shoeBase: "#ECECEC", shoeSole: "#2A2A2A", shoeAccent: "#FFFFFF",
  },
  premium: {
    shirt: "#4A5060", shirtShadow: "#3A4050", shirtHighlight: "#5A6070",
    pants: "#1A1A24", pantsShadow: "#121218", pantsSeam: "#0E0E14",
    belt: "#2A2030", buckle: "#605058", buckleAccent: "#807078",
    collar: true, buttons: false,
    shoeBase: "#3A3028", shoeSole: "#1A1A1A", shoeAccent: "#504838",
  },
  elite: {
    shirt: "#1A1A24", shirtShadow: "#121218", shirtHighlight: "#2A2A36",
    pants: "#0A0A12", pantsShadow: "#060610", pantsSeam: "#04040A",
    belt: "#1A1420", buckle: "#C0A030", buckleAccent: "#E8C840",
    collar: true, buttons: false,
    shoeBase: "#1A1612", shoeSole: "#0A0A0A", shoeAccent: "#2A2420",
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
  const topShadow = equippedTopStyle ? equippedTopStyle + "CC" : oc.shirtShadow;
  const topHighlight = equippedTopStyle ? equippedTopStyle + "40" : oc.shirtHighlight;
  const pFill = bottomColor ?? oc.pants;
  const pShadow = bottomColor ? bottomColor + "CC" : oc.pantsShadow;
  const seamFill = bottomColor ? bottomColor + "88" : oc.pantsSeam;
  const legInset = isMale ? 1 : 2;
  const legGap = isMale ? 6 : 5;
  const legW = isMale ? 20 : 18;

  return (
    <G>
      <Defs>
        <LinearGradient id="shirtGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={topHighlight} />
          <Stop offset="0.3" stopColor={topFill} />
          <Stop offset="0.8" stopColor={topShadow} />
          <Stop offset="1" stopColor={topShadow} />
        </LinearGradient>
        <LinearGradient id="pantsGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={pFill} />
          <Stop offset="0.7" stopColor={pShadow} />
          <Stop offset="1" stopColor={pShadow} />
        </LinearGradient>
      </Defs>

      <Ellipse cx={50 - hipW / 4 + legInset} cy="268" rx="14" ry="7" fill={oc.shoeBase} />
      <Ellipse cx={50 + hipW / 4 - legInset} cy="268" rx="14" ry="7" fill={oc.shoeBase} />
      <Rect x={50 - hipW / 4 + legInset - 14} y="264" width="28" height="5" rx="2" fill={oc.shoeSole} />
      <Rect x={50 + hipW / 4 - legInset - 14} y="264" width="28" height="5" rx="2" fill={oc.shoeSole} />
      <Ellipse cx={50 - hipW / 4 + legInset} cy="263" rx="12" ry="4" fill={oc.shoeAccent} opacity={0.3} />
      <Ellipse cx={50 + hipW / 4 - legInset} cy="263" rx="12" ry="4" fill={oc.shoeAccent} opacity={0.3} />

      <Rect x={50 - hipW / 4 - legW / 2 + legInset} y={waistY + 5} width={legW} height="115" rx="5" fill="url(#pantsGrad)" />
      <Rect x={50 + hipW / 4 - legW / 2 - legInset} y={waistY + 5} width={legW} height="115" rx="5" fill="url(#pantsGrad)" />
      <Rect x={50 - legGap / 2 - 2} y={waistY + 5} width={legGap + 4} height="60" fill={seamFill} opacity={0.5} />
      <Path d={`M${50 - hipW / 4 + legInset - 2} ${waistY + 40} L${50 - hipW / 4 + legInset - 2} ${waistY + 100}`} stroke={pShadow} strokeWidth="0.6" opacity={0.3} />
      <Path d={`M${50 + hipW / 4 - legInset + 2} ${waistY + 40} L${50 + hipW / 4 - legInset + 2} ${waistY + 100}`} stroke={pShadow} strokeWidth="0.6" opacity={0.3} />
      {tier === "starter" && (
        <>
          <Path d={`M${50 - hipW / 4 + legInset + 3} ${waistY + 60} Q${50 - hipW / 4 + legInset + 5} ${waistY + 63} ${50 - hipW / 4 + legInset + 2} ${waistY + 66}`} stroke={pShadow} strokeWidth="0.5" fill="none" opacity={0.25} />
          <Path d={`M${50 + hipW / 4 - legInset - 1} ${waistY + 50} Q${50 + hipW / 4 - legInset + 1} ${waistY + 54} ${50 + hipW / 4 - legInset - 2} ${waistY + 57}`} stroke={pShadow} strokeWidth="0.5" fill="none" opacity={0.25} />
        </>
      )}

      <Rect x={50 - hipW / 2 - 2} y={waistY} width={hipW + 4} height="8" rx="3" fill={oc.belt} />
      <Rect x="44" y={waistY + 1} width="12" height="6" rx="2" fill={oc.buckle} />
      <Rect x="47" y={waistY + 2.5} width="6" height="3" rx="1" fill={oc.buckleAccent} />

      <Path
        d={`M${50 - shoulderW / 2} 56 Q50 ${isMale ? 52 : 54} ${50 + shoulderW / 2} 56 L${torsoX + torsoW} ${waistY + 2} L${torsoX} ${waistY + 2} Z`}
        fill="url(#shirtGrad)"
      />
      {isMale ? (
        <Path
          d={`M${torsoX + 2} 60 Q${torsoX + 4} 80 ${torsoX + 3} ${waistY}`}
          stroke={topShadow} strokeWidth="0.8" fill="none" opacity={0.3}
        />
      ) : (
        <>
          <Path
            d={`M${torsoX + 4} 70 Q${torsoX + torsoW / 2} 68 ${torsoX + torsoW - 4} 70`}
            stroke={topShadow} strokeWidth="0.6" fill="none" opacity={0.25}
          />
          <Path
            d={`M${torsoX + 6} 82 Q${torsoX + torsoW / 2} 78 ${torsoX + torsoW - 6} 82`}
            stroke={topShadow} strokeWidth="0.5" fill="none" opacity={0.2}
          />
        </>
      )}
      <Path
        d={`M${torsoX + torsoW - 2} 60 Q${torsoX + torsoW - 4} 80 ${torsoX + torsoW - 3} ${waistY}`}
        stroke={topShadow} strokeWidth="0.8" fill="none" opacity={0.3}
      />

      <Rect x={armLX} y="58" width={armW} height="72" rx={armW / 2} fill={topFill} />
      <Rect x={armRX} y="58" width={armW} height="72" rx={armW / 2} fill={topFill} />
      <Rect x={armLX} y="58" width={armW * 0.35} height="72" rx={armW / 4} fill={topShadow} opacity={0.2} />
      <Rect x={armRX + armW * 0.65} y="58" width={armW * 0.35} height="72" rx={armW / 4} fill={topShadow} opacity={0.2} />

      {oc.collar ? (
        <Path
          d={`M${50 - shoulderW / 4} 54 L50 64 L${50 + shoulderW / 4} 54`}
          stroke={topShadow} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
      ) : (
        <Path
          d={`M43 54 Q50 62 57 54`}
          stroke={topShadow} strokeWidth="1.2" fill="none" strokeLinecap="round"
        />
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
  const fillShadow = color ? color + "CC" : "#2A2A30";

  return (
    <G opacity={0.92}>
      <Path
        d={`M${50 - shoulderW / 2 - 2} 54 Q50 50 ${50 + shoulderW / 2 + 2} 54 L${torsoX + torsoW + 3} 118 L${torsoX - 3} 118 Z`}
        fill={fill}
      />
      <Rect x={armLX - 1} y="56" width={armW + 2} height="68" rx={armW / 2 + 1} fill={fill} />
      <Rect x={armRX - 1} y="56" width={armW + 2} height="68" rx={armW / 2 + 1} fill={fill} />
      <Path d="M50 56 L50 118" stroke={fillShadow} strokeWidth="1.5" opacity={0.4} />
      <Path
        d={`M${50 - shoulderW / 4} 54 L50 66 L${50 + shoulderW / 4} 54`}
        stroke={fillShadow} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity={0.5}
      />
    </G>
  );
}

export const OutfitLayer = memo(OutfitLayerInner);

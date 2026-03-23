import React, { memo } from "react";
import { G, Rect, Circle, Path, Line, Ellipse } from "react-native-svg";
import type { OutfitTier } from "@/lib/characterEngine";

interface OutfitColors {
  s: string; ss: string;
  p: string; ps: string; seam: string; cr: string;
  belt: string; bk: string; bk2: string;
  btn: boolean; col: boolean;
}

const OUTFIT_PALETTES: Record<OutfitTier, OutfitColors> = {
  starter: {
    s: "#EEEEEE", ss: "#E4E4E4", p: "#1A1A2E", ps: "#20203A",
    seam: "#1C1C30", cr: "#151528", belt: "#3A3A52", bk: "#52526A", bk2: "#6A6A80",
    btn: true, col: false,
  },
  rising: {
    s: "#C8C8D5", ss: "#BCBCC8", p: "#151525", ps: "#1C1C32",
    seam: "#121222", cr: "#0F0F1E", belt: "#484858", bk: "#606078", bk2: "#747492",
    btn: false, col: true,
  },
  premium: {
    s: "#4A4A56", ss: "#42424E", p: "#111120", ps: "#17172C",
    seam: "#0E0E1A", cr: "#0B0B16", belt: "#504858", bk: "#6A6070", bk2: "#888096",
    btn: false, col: true,
  },
  elite: {
    s: "#1E1E2A", ss: "#1A1A22", p: "#0A0A14", ps: "#10101E",
    seam: "#07070F", cr: "#05050C", belt: "#4A3E52", bk: "#786A82", bk2: "#C0A030",
    btn: false, col: true,
  },
};

interface Props {
  tier: OutfitTier;
  equippedTopStyle: string | null;
  bottomColor: string | null;
  torsoX: number;
  torsoW: number;
  armLX: number;
  armRX: number;
  armW: number;
}

function OutfitLayerInner({ tier, equippedTopStyle, bottomColor, torsoX, torsoW, armLX, armRX, armW }: Props) {
  const oc = OUTFIT_PALETTES[tier];
  const tX = torsoX;
  const tW = torsoW;

  const hasTopOverride = !!equippedTopStyle;
  const topFill = hasTopOverride ? equippedTopStyle! : oc.s;
  const topAccent = hasTopOverride ? equippedTopStyle! + "CC" : oc.ss;

  const pFill = bottomColor ?? oc.p;
  const psFill = bottomColor ? bottomColor + "CC" : oc.ps;
  const seamFill = bottomColor ? bottomColor + "88" : oc.seam;
  const crFill = bottomColor ? "#00000015" : oc.cr;

  return (
    <G>
      <Ellipse cx="36" cy="197" rx="16" ry="7.5" fill="#0C0C1A" />
      <Ellipse cx="25" cy="195" rx="8" ry="5" fill="#0C0C1A" />
      <Ellipse cx="64" cy="197" rx="16" ry="7.5" fill="#0C0C1A" />
      <Ellipse cx="75" cy="195" rx="8" ry="5" fill="#0C0C1A" />
      <Ellipse cx="28" cy="192" rx="5" ry="2.5" fill="#1A1A2A" />
      <Ellipse cx="72" cy="192" rx="5" ry="2.5" fill="#1A1A2A" />

      <Rect x="26" y="118" width="21" height="80" rx="4" fill={pFill} />
      <Rect x="53" y="118" width="21" height="80" rx="4" fill={pFill} />
      <Rect x="46" y="118" width="8" height="80" rx="0" fill={seamFill} />
      {oc.btn && (
        <>
          <Rect x="28" y="122" width="11" height="8" rx="2" fill={psFill} />
          <Rect x="61" y="122" width="11" height="8" rx="2" fill={psFill} />
        </>
      )}
      <Rect x="35" y="140" width="1.5" height="50" rx="0.75" fill={crFill} />
      <Rect x="63" y="140" width="1.5" height="50" rx="0.75" fill={crFill} />

      <Rect x="25" y="113" width="50" height="7" rx="2.5" fill={oc.belt} />
      <Rect x="43" y="113" width="14" height="7" rx="1.5" fill={oc.bk} />
      <Rect x="47" y="115" width="6" height="3" rx="1" fill={oc.bk2} />

      <Rect x={tX} y="52" width={tW} height="64" rx="6" fill={topFill} />
      <Rect x={tX} y="52" width={5} height="64" rx="2.5" fill={topAccent} />
      <Rect x={tX + tW - 5} y="52" width={5} height="64" rx="2.5" fill={topAccent} />
      {oc.btn && (
        <>
          <Circle cx="50" cy="70" r="1.6" fill={oc.ss} />
          <Circle cx="50" cy="83" r="1.6" fill={oc.ss} />
          <Circle cx="50" cy="96" r="1.6" fill={oc.ss} />
          <Rect x="49.2" y="60" width="1.5" height="52" rx="0.5" fill={oc.ss} />
        </>
      )}

      <Rect x={armLX} y="54" width={armW} height="50" rx="8" fill={topFill} />
      <Rect x={armRX} y="54" width={armW} height="50" rx="8" fill={topFill} />
      <Rect x={armLX} y="54" width={4} height="50" rx="2" fill={topAccent} />
      <Rect x={armRX + armW - 4} y="54" width={4} height="50" rx="2" fill={topAccent} />

      {oc.col ? (
        <Path
          d={`M${tX + 16} 52 L50 60 L${tX + tW - 16} 52`}
          stroke={oc.ss} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
        />
      ) : (
        <Path d="M42 52 L50 62 L58 52" stroke="#DDDDDD" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </G>
  );
}

export function OuterwearLayer({ style, color, torsoX, torsoW, armLX, armRX, armW }: {
  style: string | null;
  color: string | null;
  torsoX: number; torsoW: number;
  armLX: number; armRX: number; armW: number;
}) {
  if (!style) return null;
  const fill = color ?? "#36363C";
  return (
    <G opacity={0.92}>
      <Rect x={torsoX - 2} y="50" width={torsoW + 4} height="68" rx="7" fill={fill} />
      <Rect x={armLX - 1} y="52" width={armW + 2} height="52" rx="9" fill={fill} />
      <Rect x={armRX - 1} y="52" width={armW + 2} height="52" rx="9" fill={fill} />
      <Line x1="50" y1="54" x2="50" y2="118" stroke="#00000018" strokeWidth="1.5" />
      <Path
        d={`M${torsoX + 10} 50 L50 62 L${torsoX + torsoW - 10} 50`}
        stroke="#00000020" strokeWidth="1.5" fill="none" strokeLinecap="round"
      />
    </G>
  );
}

export const OutfitLayer = memo(OutfitLayerInner);

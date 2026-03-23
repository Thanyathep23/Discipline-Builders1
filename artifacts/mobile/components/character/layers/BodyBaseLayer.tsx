import React, { memo } from "react";
import { G, Ellipse, Rect, Path } from "react-native-svg";

const SKIN_TONE_COLORS: Record<string, [string, string]> = {
  "tone-1": ["#FDDCB5", "#EDCB9A"],
  "tone-2": ["#EDB98A", "#D49F70"],
  "tone-3": ["#C8956C", "#B07E58"],
  "tone-4": ["#8B5E3C", "#7A4E2E"],
  "tone-5": ["#5C3317", "#4A2510"],
};

interface Props {
  skinTone: string;
  headCY: number;
  earCY: number;
  neckY: number;
  neckH: number;
  armLX: number;
  armRX: number;
  armW: number;
}

function BodyBaseLayerInner({ skinTone, headCY, earCY, neckY, neckH, armLX, armRX, armW }: Props) {
  const [skin, skinS] = SKIN_TONE_COLORS[skinTone] ?? SKIN_TONE_COLORS["tone-3"];

  return (
    <G>
      <Rect x="44" y={neckY} width="12" height={neckH} rx="4" fill={skin} />
      <Ellipse cx="31" cy={earCY} rx="4" ry="6" fill={skin} />
      <Ellipse cx="69" cy={earCY} rx="4" ry="6" fill={skin} />
      <Ellipse cx="31" cy={earCY} rx="2" ry="3.5" fill={skinS} />
      <Ellipse cx="69" cy={earCY} rx="2" ry="3.5" fill={skinS} />

      <Ellipse cx="50" cy={headCY} rx="19" ry="21" fill={skin} />
      <Ellipse cx="50" cy={headCY + 16} rx="14" ry="5" fill={skinS} />

      <Ellipse cx="43" cy={headCY - 2} rx="3" ry="3.2" fill="#2A2A3A" />
      <Ellipse cx="57" cy={headCY - 2} rx="3" ry="3.2" fill="#2A2A3A" />
      <Ellipse cx="43" cy={headCY - 2} rx="2.2" ry="2.4" fill="#1A1A28" />
      <Ellipse cx="57" cy={headCY - 2} rx="2.2" ry="2.4" fill="#1A1A28" />
      <Ellipse cx={44.2} cy={headCY - 3.2} rx="0.9" ry="0.9" fill="#FFFFFF" />
      <Ellipse cx={58.2} cy={headCY - 3.2} rx="0.9" ry="0.9" fill="#FFFFFF" />

      <Path
        d={`M50 ${headCY + 3} L48 ${headCY + 8} L52 ${headCY + 8}`}
        stroke="#C09070" strokeWidth="0.9" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      <Ellipse cx="50" cy={headCY + 7.5} rx="3" ry="1.5" fill={skin} />

      <Ellipse cx={armLX + armW / 2} cy="106" rx="9" ry="7" fill={skin} />
      <Ellipse cx={armRX + armW / 2} cy="106" rx="9" ry="7" fill={skin} />
      <Ellipse cx={armLX + 2} cy="106" rx="3" ry="2.5" fill={skinS} />
      <Ellipse cx={armRX + armW - 2} cy="106" rx="3" ry="2.5" fill={skinS} />
    </G>
  );
}

export const BodyBaseLayer = memo(BodyBaseLayerInner);

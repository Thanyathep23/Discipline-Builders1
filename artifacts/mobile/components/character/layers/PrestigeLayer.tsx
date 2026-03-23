import React, { memo } from "react";
import { G, Ellipse, Circle, Path, Rect } from "react-native-svg";
import type { PrestigeStage } from "@/lib/characterEngine";

interface Props {
  stage: PrestigeStage;
  torsoX: number;
  torsoW: number;
  armRX: number;
  armW: number;
  headCY: number;
}

function PrestigeLayerInner({ stage, torsoX, torsoW, armRX, armW, headCY }: Props) {
  if (stage === "none") return null;

  return (
    <G>
      {(stage === "subtle" || stage === "visible" || stage === "legendary") && (
        <>
          <Path
            d={`M${torsoX + 14} 52 L50 58 L${torsoX + torsoW - 14} 52`}
            stroke="#C0A03060" strokeWidth="0.8" fill="none" strokeLinecap="round"
          />
          <Circle cx={torsoX + 4} cy="55" r="1" fill="#C0A03040" />
          <Circle cx={torsoX + torsoW - 4} cy="55" r="1" fill="#C0A03040" />
        </>
      )}

      {(stage === "visible" || stage === "legendary") && (
        <>
          <Ellipse cx={armRX + armW / 2 - 1} cy="103" rx="2" ry="1.2" fill="#C0A03080" />
          <Ellipse cx={torsoX + 2} cy="103" rx="2" ry="1.2" fill="#C0A03080" />
          <Rect x={torsoX + 3} y="52" width="1" height="3" rx="0.5" fill="#C0A03050" />
          <Rect x={torsoX + torsoW - 4} y="52" width="1" height="3" rx="0.5" fill="#C0A03050" />
        </>
      )}

      {stage === "legendary" && (
        <>
          <Ellipse cx={torsoX - 2} cy="62" rx="8" ry="20" fill="#C0A03008" />
          <Ellipse cx={torsoX + torsoW + 2} cy="62" rx="8" ry="20" fill="#C0A03008" />
          <Ellipse cx="50" cy={headCY - 28} rx="24" ry="8" fill="#C0A03006" />
        </>
      )}
    </G>
  );
}

export const PrestigeLayer = memo(PrestigeLayerInner);

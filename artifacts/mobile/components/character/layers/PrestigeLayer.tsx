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
            d={`M${torsoX + 14} 56 L50 62 L${torsoX + torsoW - 14} 56`}
            stroke="#C0A03060" strokeWidth="0.8" fill="none" strokeLinecap="round"
          />
          <Circle cx={torsoX + 5} cy="60" r="1.2" fill="#C0A03040" />
          <Circle cx={torsoX + torsoW - 5} cy="60" r="1.2" fill="#C0A03040" />
        </>
      )}

      {(stage === "visible" || stage === "legendary") && (
        <>
          <Ellipse cx={armRX + armW / 2 - 1} cy="140" rx="2.5" ry="1.5" fill="#C0A03080" />
          <Ellipse cx={torsoX + 3} cy="140" rx="2.5" ry="1.5" fill="#C0A03080" />
          <Rect x={torsoX + 4} y="56" width="1.2" height="4" rx="0.6" fill="#C0A03050" />
          <Rect x={torsoX + torsoW - 5} y="56" width="1.2" height="4" rx="0.6" fill="#C0A03050" />
        </>
      )}

      {stage === "legendary" && (
        <>
          <Ellipse cx={torsoX - 3} cy="70" rx="10" ry="24" fill="#C0A03008" />
          <Ellipse cx={torsoX + torsoW + 3} cy="70" rx="10" ry="24" fill="#C0A03008" />
          <Ellipse cx="50" cy={headCY - 30} rx="26" ry="10" fill="#C0A03006" />
        </>
      )}
    </G>
  );
}

export const PrestigeLayer = memo(PrestigeLayerInner);

import React, { memo } from "react";
import { G, Ellipse, Circle, Path, Rect, Defs, RadialGradient, Stop } from "react-native-svg";
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
      <Defs>
        <RadialGradient id="prestigeAura" cx="0.5" cy="0.4" rx="0.5" ry="0.45">
          <Stop offset="0" stopColor="#C0A030" stopOpacity="0.06" />
          <Stop offset="0.7" stopColor="#C0A030" stopOpacity="0.02" />
          <Stop offset="1" stopColor="#C0A030" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {(stage === "subtle" || stage === "visible" || stage === "legendary") && (
        <>
          <Path
            d={`M${torsoX + 14} 56 L50 62 L${torsoX + torsoW - 14} 56`}
            stroke="#C0A030" strokeWidth="0.7" fill="none" strokeLinecap="round" opacity={0.2}
          />
          <Circle cx={torsoX + 5} cy="60" r="1" fill="#C0A030" opacity={0.15} />
          <Circle cx={torsoX + torsoW - 5} cy="60" r="1" fill="#C0A030" opacity={0.15} />
        </>
      )}

      {(stage === "visible" || stage === "legendary") && (
        <>
          <Ellipse cx={armRX + armW / 2 - 1} cy="140" rx="2" ry="1.2" fill="#C0A030" opacity={0.25} />
          <Ellipse cx={torsoX + 3} cy="140" rx="2" ry="1.2" fill="#C0A030" opacity={0.25} />
          <Rect x={torsoX + 4} y="56" width="1" height="3.5" rx="0.5" fill="#C0A030" opacity={0.18} />
          <Rect x={torsoX + torsoW - 5} y="56" width="1" height="3.5" rx="0.5" fill="#C0A030" opacity={0.18} />
          <Circle cx={torsoX + 8} cy="58" r="0.6" fill="#E8D060" opacity={0.12} />
          <Circle cx={torsoX + torsoW - 8} cy="58" r="0.6" fill="#E8D060" opacity={0.12} />
        </>
      )}

      {stage === "legendary" && (
        <>
          <Ellipse cx="50" cy="140" rx="45" ry="100" fill="url(#prestigeAura)" />
          <Ellipse cx={torsoX - 3} cy="70" rx="8" ry="20" fill="#C0A030" opacity={0.03} />
          <Ellipse cx={torsoX + torsoW + 3} cy="70" rx="8" ry="20" fill="#C0A030" opacity={0.03} />
          <Ellipse cx="50" cy={headCY - 28} rx="22" ry="8" fill="#C0A030" opacity={0.025} />
          <Circle cx={torsoX - 2} cy="56" r="0.5" fill="#E8D060" opacity={0.15} />
          <Circle cx={torsoX + torsoW + 2} cy="56" r="0.5" fill="#E8D060" opacity={0.15} />
          <Circle cx="50" cy={headCY - 24} r="0.4" fill="#E8D060" opacity={0.1} />
        </>
      )}
    </G>
  );
}

export const PrestigeLayer = memo(PrestigeLayerInner);

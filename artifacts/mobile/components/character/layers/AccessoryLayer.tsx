import React, { memo } from "react";
import { G, Ellipse, Circle, Path } from "react-native-svg";

interface Props {
  style: string | null;
  armLX: number;
  armW: number;
  torsoX: number;
  neckBottom: number;
}

function AccessoryLayerInner({ style, armLX, armW, torsoX, neckBottom }: Props) {
  if (!style) return null;

  if (style === "ring") {
    return (
      <G>
        <Ellipse cx={armLX + armW / 2} cy="104" rx="4" ry="2.5" fill="#8A8A8A" opacity={0.85} />
        <Ellipse cx={armLX + armW / 2} cy="104" rx="3" ry="1.8" fill="#8A8A8A" opacity={0.5} />
      </G>
    );
  }

  if (style === "chain") {
    return (
      <Path
        d={`M44 ${neckBottom + 2} Q50 ${neckBottom + 6} 56 ${neckBottom + 2}`}
        stroke="#C0A030" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.85"
      />
    );
  }

  if (style === "pin") {
    return <Circle cx={torsoX + 10} cy="61" r="2.2" fill="#C0A030" />;
  }

  return null;
}

export const AccessoryLayer = memo(AccessoryLayerInner);

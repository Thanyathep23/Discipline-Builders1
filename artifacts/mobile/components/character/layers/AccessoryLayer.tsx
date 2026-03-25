import React, { memo } from "react";
import { G, Ellipse, Circle, Path, Rect } from "react-native-svg";

interface Props {
  style: string | null;
  armLX: number;
  armW: number;
  torsoX: number;
  neckBottom: number;
  showDogTag?: boolean;
  showBracelet?: boolean;
}

function AccessoryLayerInner({ style, armLX, armW, torsoX, neckBottom, showDogTag = true, showBracelet = true }: Props) {
  return (
    <G>
      {showDogTag && !style && (
        <G>
          <Path
            d={`M44 ${neckBottom - 2} Q47 ${neckBottom + 8} 50 ${neckBottom + 12} Q53 ${neckBottom + 8} 56 ${neckBottom - 2}`}
            stroke="#A0A0A8" strokeWidth="0.8" fill="none" opacity={0.7}
          />
          <Rect x="47" y={neckBottom + 10} width="6" height="10" rx="1.5" fill="#B0B0B8" opacity={0.8} />
          <Rect x="48" y={neckBottom + 12} width="4" height="4" rx="0.5" fill="#C8C8D0" opacity={0.5} />
          <Circle cx="50" cy={neckBottom + 11.5} r="0.6" fill="#888890" />
        </G>
      )}

      {showBracelet && !style && (
        <G>
          <Rect x={armLX + 1} y="138" width={armW - 2} height="5" rx="2" fill="#6B4226" opacity={0.85} />
          <Rect x={armLX + 2} y="139" width={armW - 4} height="3" rx="1" fill="#8B5A30" opacity={0.6} />
          <Path
            d={`M${armLX + 3} 140 L${armLX + armW - 3} 140`}
            stroke="#5A3418" strokeWidth="0.5" opacity={0.4}
          />
        </G>
      )}

      {style === "ring" && (
        <G>
          <Ellipse cx={armLX + armW / 2} cy="145" rx="4.5" ry="2.8" fill="#8A8A8A" opacity={0.85} />
          <Ellipse cx={armLX + armW / 2} cy="145" rx="3.2" ry="2" fill="#9A9A9A" opacity={0.5} />
        </G>
      )}

      {style === "chain" && (
        <G>
          <Path
            d={`M44 ${neckBottom} Q47 ${neckBottom + 6} 50 ${neckBottom + 10} Q53 ${neckBottom + 6} 56 ${neckBottom}`}
            stroke="#C0A030" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity={0.85}
          />
          <Rect x="47.5" y={neckBottom + 8} width="5" height="8" rx="1" fill="#C0A030" opacity={0.8} />
        </G>
      )}

      {style === "pin" && (
        <G>
          <Circle cx={torsoX + 10} cy="64" r="2.5" fill="#C0A030" />
          <Circle cx={torsoX + 10} cy="64" r="1.5" fill="#E8D060" opacity={0.6} />
        </G>
      )}
    </G>
  );
}

export const AccessoryLayer = memo(AccessoryLayerInner);

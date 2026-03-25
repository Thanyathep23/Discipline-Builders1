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
            d={`M46 ${neckBottom - 3} Q47 ${neckBottom + 2} 48 ${neckBottom + 6} Q49 ${neckBottom + 9} 50 ${neckBottom + 12} Q51 ${neckBottom + 9} 52 ${neckBottom + 6} Q53 ${neckBottom + 2} 54 ${neckBottom - 3}`}
            stroke="#9A9AA0" strokeWidth="0.7" fill="none" opacity={0.65}
          />
          <Path
            d={`M48.5 ${neckBottom + 4} L49 ${neckBottom + 6}`}
            stroke="#8A8A90" strokeWidth="0.4" fill="none" opacity={0.3}
          />
          <Path
            d={`M51.5 ${neckBottom + 4} L51 ${neckBottom + 6}`}
            stroke="#8A8A90" strokeWidth="0.4" fill="none" opacity={0.3}
          />

          <Rect x="47.5" y={neckBottom + 10} width="5" height="9" rx="1.2" fill="#A8A8B0" opacity={0.75} />
          <Rect x="48.2" y={neckBottom + 11.5} width="3.6" height="5" rx="0.5" fill="#B8B8C0" opacity={0.4} />
          <Path d={`M48.5 ${neckBottom + 12.5} L51.5 ${neckBottom + 12.5}`} stroke="#C0C0C8" strokeWidth="0.3" opacity={0.3} />
          <Path d={`M48.5 ${neckBottom + 14} L51.5 ${neckBottom + 14}`} stroke="#C0C0C8" strokeWidth="0.3" opacity={0.25} />
          <Path d={`M48.5 ${neckBottom + 15.5} L51.5 ${neckBottom + 15.5}`} stroke="#C0C0C8" strokeWidth="0.3" opacity={0.2} />
          <Circle cx="50" cy={neckBottom + 11} r="0.5" fill="#808088" />
        </G>
      )}

      {showBracelet && !style && (
        <G>
          <Rect x={armLX + 0.5} y="137" width={armW - 1} height="5.5" rx="2.2" fill="#6B4226" opacity={0.82} />
          <Rect x={armLX + 1.5} y="138" width={armW - 3} height="3.5" rx="1.2" fill="#8B5A30" opacity={0.5} />
          <Path d={`M${armLX + 2} 139.5 L${armLX + armW - 2} 139.5`} stroke="#5A3418" strokeWidth="0.4" opacity={0.35} />
          <Path d={`M${armLX + 2.5} 141 L${armLX + armW - 2.5} 141`} stroke="#5A3418" strokeWidth="0.3" opacity={0.25} />
          <Path d={`M${armLX + armW / 2 - 0.5} 137.5 L${armLX + armW / 2 - 0.5} 142`} stroke="#5A3418" strokeWidth="0.3" opacity={0.2} />
          <Path d={`M${armLX + armW / 2 + 0.5} 137.5 L${armLX + armW / 2 + 0.5} 142`} stroke="#5A3418" strokeWidth="0.3" opacity={0.2} />
          <Circle cx={armLX + armW / 2} cy="139.5" r="0.8" fill="#8B6A40" opacity={0.5} />
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
            d={`M44 ${neckBottom} Q47 ${neckBottom + 5} 50 ${neckBottom + 9} Q53 ${neckBottom + 5} 56 ${neckBottom}`}
            stroke="#C0A030" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity={0.85}
          />
          <Rect x="47.5" y={neckBottom + 7} width="5" height="8" rx="1" fill="#C0A030" opacity={0.8} />
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

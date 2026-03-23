import React, { memo } from "react";
import { G, Ellipse, Rect, Path } from "react-native-svg";

const HAIR_COLOR_HEX: Record<string, string> = {
  "black": "#141414",
  "dark-brown": "#2C1A0E",
  "medium-brown": "#5C3A1E",
  "light-brown": "#8B5E3C",
  "dirty-blonde": "#BF9B5A",
  "blonde": "#E8D090",
  "auburn": "#7B3F20",
  "platinum": "#DCDCDC",
};

interface Props {
  hairStyle: string;
  hairColor: string;
  headCY: number;
  groomingLevel: number;
}

function HairLayerInner({ hairStyle, hairColor, headCY, groomingLevel }: Props) {
  const color = HAIR_COLOR_HEX[hairColor] ?? "#141414";
  const shade = "#00000040";
  const hCY = headCY;

  const hsRx = [5, 4.5, 3.5, 2.5][groomingLevel] ?? 5;
  const hsRy = [12, 11, 9, 7][groomingLevel] ?? 12;
  const hcRy = [13, 13, 12, 11][groomingLevel] ?? 13;

  if (hairStyle === "bald") return null;

  return (
    <G>
      {hairStyle === "natural" && (
        <G>
          <Ellipse cx="50" cy={hCY - 20} rx="22" ry="18" fill={color} />
          <Rect x="28" y={hCY - 20} width="44" height="18" fill={color} />
          <Ellipse cx="29" cy={hCY - 9} rx="5.5" ry="13" fill={color} />
          <Ellipse cx="71" cy={hCY - 9} rx="5.5" ry="13" fill={color} />
          <Path d={`M34 ${hCY - 22} Q50 ${hCY - 28} 66 ${hCY - 22}`} stroke={shade} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </G>
      )}

      {hairStyle === "waves" && (
        <G>
          <Ellipse cx="50" cy={hCY - 16} rx="20" ry={hcRy} fill={color} />
          <Rect x="30" y={hCY - 16} width="40" height="14" fill={color} />
          <Ellipse cx="31" cy={hCY - 8} rx={hsRx} ry={hsRy} fill={color} />
          <Ellipse cx="69" cy={hCY - 8} rx={hsRx} ry={hsRy} fill={color} />
          <Path d={`M35 ${hCY - 19} Q41 ${hCY - 23} 47 ${hCY - 19} Q53 ${hCY - 15} 59 ${hCY - 19} Q65 ${hCY - 23} 67 ${hCY - 19}`} stroke={shade} strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <Path d={`M36 ${hCY - 15} Q42 ${hCY - 19} 48 ${hCY - 15} Q54 ${hCY - 11} 60 ${hCY - 15}`} stroke={shade} strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </G>
      )}

      {hairStyle === "caesar" && (
        <G>
          <Ellipse cx="50" cy={hCY - 15} rx="20" ry="11" fill={color} />
          <Rect x="30" y={hCY - 15} width="40" height="13" fill={color} />
          <Ellipse cx="50" cy={hCY - 20} rx="19" ry="5.5" fill={color} />
          <Ellipse cx="31" cy={hCY - 8} rx="3" ry="7" fill={color} />
          <Ellipse cx="69" cy={hCY - 8} rx="3" ry="7" fill={color} />
          <Path d={`M31 ${hCY - 20} Q50 ${hCY - 25} 69 ${hCY - 20}`} fill={color} />
          <Path d={`M33 ${hCY - 22} Q50 ${hCY - 26} 67 ${hCY - 22}`} stroke={shade} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </G>
      )}

      {hairStyle === "low-fade" && (
        <G>
          <Ellipse cx="50" cy={hCY - 16} rx="20" ry={hcRy} fill={color} />
          <Rect x="30" y={hCY - 16} width="40" height="14" fill={color} />
          <Ellipse cx="31" cy={hCY - 8} rx={Math.min(hsRx, 3)} ry={Math.min(hsRy, 6)} fill={color} />
          <Ellipse cx="69" cy={hCY - 8} rx={Math.min(hsRx, 3)} ry={Math.min(hsRy, 6)} fill={color} />
          <Path d={`M38 ${hCY - 20} Q50 ${hCY - 24} 62 ${hCY - 20}`} stroke={shade} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d={`M36 ${hCY - 16} Q50 ${hCY - 21} 64 ${hCY - 16}`} stroke={shade} strokeWidth="1" fill="none" strokeLinecap="round" />
        </G>
      )}

      {hairStyle === "taper" && (
        <G>
          <Ellipse cx="50" cy={hCY - 16} rx="20" ry={hcRy} fill={color} />
          <Rect x="30" y={hCY - 16} width="40" height="14" fill={color} />
          <Ellipse cx="31" cy={hCY - 8} rx={hsRx} ry={hsRy} fill={color} />
          <Ellipse cx="69" cy={hCY - 8} rx={hsRx} ry={hsRy} fill={color} />
          <Path d={`M38 ${hCY - 20} Q50 ${hCY - 24} 62 ${hCY - 20}`} stroke={shade} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <Path d={`M36 ${hCY - 16} Q50 ${hCY - 21} 64 ${hCY - 16}`} stroke={shade} strokeWidth="1" fill="none" strokeLinecap="round" />
        </G>
      )}

      {groomingLevel >= 1 && (
        <G>
          <Path d={`M30 ${hCY - 14} Q31 ${hCY - 8} 32 ${hCY - 2}`} stroke="#00000030" strokeWidth="0.9" fill="none" strokeLinecap="round" />
          <Path d={`M70 ${hCY - 14} Q69 ${hCY - 8} 68 ${hCY - 2}`} stroke="#00000030" strokeWidth="0.9" fill="none" strokeLinecap="round" />
        </G>
      )}

      {groomingLevel >= 2 && (
        <G>
          <Path d={`M32 ${hCY - 11} Q33 ${hCY - 4} 35 ${hCY + 1}`} stroke="#00000040" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <Path d={`M68 ${hCY - 11} Q67 ${hCY - 4} 65 ${hCY + 1}`} stroke="#00000040" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </G>
      )}
    </G>
  );
}

export const HairLayer = memo(HairLayerInner);

import React, { memo } from "react";
import { G, Ellipse, Rect, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import type { BodyType } from "@/lib/characterEngine";

const HAIR_COLOR_HEX: Record<string, { base: string; shadow: string; highlight: string; strand: string }> = {
  "black":        { base: "#1A1A1A", shadow: "#0A0A0A", highlight: "#2E2E2E", strand: "#383838" },
  "dark-brown":   { base: "#2C1A0E", shadow: "#1A0E06", highlight: "#4A3020", strand: "#5A3A24" },
  "medium-brown": { base: "#5C3A1E", shadow: "#3E2610", highlight: "#7A5030", strand: "#8A6040" },
  "light-brown":  { base: "#8B5E3C", shadow: "#6A4828", highlight: "#A87850", strand: "#B88860" },
  "dirty-blonde": { base: "#BF9B5A", shadow: "#9A7E44", highlight: "#D8B870", strand: "#E0C880" },
  "blonde":       { base: "#E8D090", shadow: "#C8B070", highlight: "#F8E8B0", strand: "#F0E0A0" },
  "auburn":       { base: "#7B3F20", shadow: "#5A2E14", highlight: "#9A5430", strand: "#A86438" },
  "platinum":     { base: "#DCDCDC", shadow: "#B0B0B0", highlight: "#F0F0F0", strand: "#E8E8E8" },
};

interface Props {
  hairStyle: string;
  hairColor: string;
  bodyType: BodyType;
  headCY: number;
  groomingLevel: number;
}

function HairLayerInner({ hairStyle, hairColor, bodyType, headCY, groomingLevel }: Props) {
  const c = HAIR_COLOR_HEX[hairColor] ?? HAIR_COLOR_HEX["black"];
  const hCY = headCY;
  const isMale = bodyType === "male";
  const headRX = isMale ? 16.5 : 15.5;
  const headRY = isMale ? 20 : 19;
  const topY = hCY - headRY;

  const strandDetails = (ox: number, baseY: number, count: number) => {
    const paths = [];
    for (let i = 0; i < count; i++) {
      const x = ox + (i * 5) - ((count - 1) * 2.5);
      const sway = (i % 2 === 0 ? 1.5 : -1.5);
      paths.push(
        <Path
          key={`s${i}`}
          d={`M${x} ${baseY} Q${x + sway} ${baseY + 6} ${x + sway * 0.5} ${baseY + 12}`}
          stroke={c.strand} strokeWidth="0.5" fill="none" strokeLinecap="round" opacity={0.25 + groomingLevel * 0.05}
        />
      );
    }
    return paths;
  };

  if (hairStyle === "bald") return null;

  if (hairStyle === "buzz_cut") {
    return (
      <G>
        <Ellipse cx="50" cy={topY + 7} rx={headRX} ry="10" fill={c.base} opacity={0.45} />
        <Ellipse cx="50" cy={topY + 4} rx={headRX - 2} ry="5" fill={c.highlight} opacity={0.1} />
        <Path d={`M${50 - headRX + 3} ${topY + 10} Q50 ${topY + 6} ${50 + headRX - 3} ${topY + 10}`} stroke={c.shadow} strokeWidth="0.5" fill="none" opacity={0.15} />
      </G>
    );
  }

  return (
    <G>
      <Defs>
        <LinearGradient id="hairMainG" x1="0.3" y1="0" x2="0.7" y2="1">
          <Stop offset="0" stopColor={c.highlight} />
          <Stop offset="0.35" stopColor={c.base} />
          <Stop offset="0.7" stopColor={c.base} />
          <Stop offset="1" stopColor={c.shadow} />
        </LinearGradient>
      </Defs>

      {(hairStyle === "clean_cut" || hairStyle === "low-fade") && (
        <G>
          <Path
            d={`M${50 - headRX - 0.5} ${hCY - 2} Q${50 - headRX - 1} ${topY + 4} ${50 - headRX + 4} ${topY} Q50 ${topY - 5} ${50 + headRX - 4} ${topY} Q${50 + headRX + 1} ${topY + 4} ${50 + headRX + 0.5} ${hCY - 2} Q${50 + headRX} ${hCY - 8} ${50 + headRX - 2} ${hCY - 12} L${50 - headRX + 2} ${hCY - 12} Q${50 - headRX} ${hCY - 8} ${50 - headRX - 0.5} ${hCY - 2} Z`}
            fill="url(#hairMainG)"
          />
          <Ellipse cx="50" cy={topY + 2} rx={headRX - 2} ry="5" fill={c.highlight} opacity={0.15} />
          {strandDetails(50, topY + 3, 4)}
          {hairStyle === "low-fade" && (
            <>
              <Path d={`M${50 - headRX} ${hCY - 4} Q${50 - headRX + 2} ${hCY} ${50 - headRX + 1} ${hCY + 4}`} stroke={c.shadow} strokeWidth="1" fill="none" opacity={0.2} />
              <Path d={`M${50 + headRX} ${hCY - 4} Q${50 + headRX - 2} ${hCY} ${50 + headRX - 1} ${hCY + 4}`} stroke={c.shadow} strokeWidth="1" fill="none" opacity={0.2} />
            </>
          )}
        </G>
      )}

      {(hairStyle === "side_part" || hairStyle === "caesar") && (
        <G>
          <Path
            d={`M${50 - headRX - 1} ${hCY - 2} Q${50 - headRX - 1.5} ${topY + 3} ${50 - headRX + 3} ${topY - 1} Q${50 - 4} ${topY - 6} ${50 + headRX - 3} ${topY - 1} Q${50 + headRX + 1.5} ${topY + 3} ${50 + headRX + 1} ${hCY - 2} L${50 + headRX} ${hCY - 8} L${50 - headRX} ${hCY - 8} Z`}
            fill="url(#hairMainG)"
          />
          <Path
            d={`M${50 - headRX + 4} ${topY} Q${50 - 2} ${topY - 4} ${50 + headRX - 2} ${topY + 2}`}
            stroke={c.shadow} strokeWidth="1" fill="none" strokeLinecap="round" opacity={0.3}
          />
          <Ellipse cx={50 - 4} cy={topY + 1} rx={headRX - 4} ry="4" fill={c.highlight} opacity={0.12} />
          {strandDetails(48, topY + 2, 5)}
        </G>
      )}

      {(hairStyle === "textured_crop" || hairStyle === "taper") && (
        <G>
          <Path
            d={`M${50 - headRX - 0.5} ${hCY - 3} Q${50 - headRX - 1} ${topY + 2} ${50 - headRX + 4} ${topY - 2} Q50 ${topY - 7} ${50 + headRX - 4} ${topY - 2} Q${50 + headRX + 1} ${topY + 2} ${50 + headRX + 0.5} ${hCY - 3} L${50 + headRX - 1} ${hCY - 10} L${50 - headRX + 1} ${hCY - 10} Z`}
            fill="url(#hairMainG)"
          />
          <Path d={`M${50 - 6} ${topY - 3} Q${50 - 2} ${topY - 7} ${50 + 4} ${topY - 5} Q${50 + 8} ${topY - 3} ${50 + 10} ${topY}`} fill={c.base} />
          <Ellipse cx="50" cy={topY} rx={headRX - 3} ry="4" fill={c.highlight} opacity={0.12} />
          {strandDetails(50, topY - 1, 6)}
          <Path d={`M${50 - headRX + 2} ${hCY - 5} Q${50 - headRX + 3} ${hCY - 1} ${50 - headRX + 2} ${hCY + 3}`} stroke={c.shadow} strokeWidth="0.8" fill="none" opacity={0.18} />
          <Path d={`M${50 + headRX - 2} ${hCY - 5} Q${50 + headRX - 3} ${hCY - 1} ${50 + headRX - 2} ${hCY + 3}`} stroke={c.shadow} strokeWidth="0.8" fill="none" opacity={0.18} />
        </G>
      )}

      {(hairStyle === "medium_natural" || hairStyle === "natural" || hairStyle === "waves") && (
        <G>
          <Path
            d={`M${50 - headRX - 3} ${hCY} Q${50 - headRX - 4} ${topY + 2} ${50 - headRX + 2} ${topY - 3} Q50 ${topY - 9} ${50 + headRX - 2} ${topY - 3} Q${50 + headRX + 4} ${topY + 2} ${50 + headRX + 3} ${hCY} Q${50 + headRX + 2} ${hCY - 6} ${50 + headRX} ${hCY - 10} L${50 - headRX} ${hCY - 10} Q${50 - headRX - 2} ${hCY - 6} ${50 - headRX - 3} ${hCY} Z`}
            fill="url(#hairMainG)"
          />
          <Ellipse cx={50 - headRX - 1} cy={hCY - 4} rx="4" ry="10" fill={c.base} />
          <Ellipse cx={50 + headRX + 1} cy={hCY - 4} rx="4" ry="10" fill={c.base} />
          <Ellipse cx="50" cy={topY} rx={headRX - 2} ry="5" fill={c.highlight} opacity={0.1} />
          {strandDetails(50, topY, 5)}
          <Path d={`M${50 - 8} ${topY - 3} Q${50 - 4} ${topY - 6} 50 ${topY - 5} Q${50 + 4} ${topY - 6} ${50 + 8} ${topY - 3}`} stroke={c.shadow} strokeWidth="0.7" fill="none" opacity={0.2} />
        </G>
      )}

      {hairStyle === "slicked_back" && (
        <G>
          <Path
            d={`M${50 - headRX} ${hCY - 4} Q${50 - headRX - 0.5} ${topY + 6} ${50 - headRX + 4} ${topY + 1} Q50 ${topY - 3} ${50 + headRX - 4} ${topY + 1} Q${50 + headRX + 0.5} ${topY + 6} ${50 + headRX} ${hCY - 4} L${50 + headRX - 1} ${hCY - 10} L${50 - headRX + 1} ${hCY - 10} Z`}
            fill="url(#hairMainG)"
          />
          <Ellipse cx="50" cy={topY + 4} rx={headRX - 3} ry="5" fill={c.highlight} opacity={0.2} />
          <Path d={`M${50 - 8} ${topY + 2} Q50 ${topY - 2} ${50 + 8} ${topY + 2}`} stroke={c.highlight} strokeWidth="0.8" fill="none" opacity={0.15} />
          <Path d={`M${50 - 6} ${topY + 4} Q50 ${topY + 1} ${50 + 6} ${topY + 4}`} stroke={c.highlight} strokeWidth="0.6" fill="none" opacity={0.1} />
          {strandDetails(50, topY + 3, 4)}
        </G>
      )}

      {hairStyle === "short_bob" && (
        <G>
          <Path
            d={`M${50 - headRX - 3} ${hCY + 6} Q${50 - headRX - 4} ${topY + 2} ${50 - headRX + 3} ${topY - 2} Q50 ${topY - 7} ${50 + headRX - 3} ${topY - 2} Q${50 + headRX + 4} ${topY + 2} ${50 + headRX + 3} ${hCY + 6} Q${50 + headRX + 2} ${hCY + 10} ${50 + headRX} ${hCY + 12} L${50 - headRX} ${hCY + 12} Q${50 - headRX - 2} ${hCY + 10} ${50 - headRX - 3} ${hCY + 6} Z`}
            fill="url(#hairMainG)"
          />
          <Ellipse cx="50" cy={topY + 1} rx={headRX - 2} ry="5" fill={c.highlight} opacity={0.12} />
          <Path d={`M${50 - headRX - 2} ${hCY + 8} Q${50 - headRX} ${hCY + 13} ${50 - headRX + 5} ${hCY + 11}`} stroke={c.shadow} strokeWidth="0.7" fill="none" opacity={0.2} />
          <Path d={`M${50 + headRX + 2} ${hCY + 8} Q${50 + headRX} ${hCY + 13} ${50 + headRX - 5} ${hCY + 11}`} stroke={c.shadow} strokeWidth="0.7" fill="none" opacity={0.2} />
          {strandDetails(50, topY + 1, 5)}
        </G>
      )}

      {hairStyle === "side_part_long" && (
        <G>
          <Path
            d={`M${50 - headRX - 3} ${hCY + 12} Q${50 - headRX - 4} ${topY + 2} ${50 - headRX + 3} ${topY - 2} Q${50 - 4} ${topY - 7} ${50 + headRX - 3} ${topY - 1} Q${50 + headRX + 4} ${topY + 3} ${50 + headRX + 3} ${hCY + 12} Q${50 + headRX + 2} ${hCY + 20} ${50 + headRX - 2} ${hCY + 24} L${50 - headRX + 2} ${hCY + 24} Q${50 - headRX - 2} ${hCY + 20} ${50 - headRX - 3} ${hCY + 12} Z`}
            fill="url(#hairMainG)"
          />
          <Path d={`M${50 - 4} ${topY} Q${50 + 6} ${topY - 4} ${50 + headRX} ${topY + 4}`} stroke={c.shadow} strokeWidth="0.9" fill="none" opacity={0.25} />
          <Ellipse cx={50 + 2} cy={topY + 2} rx={headRX - 4} ry="4" fill={c.highlight} opacity={0.1} />
          {strandDetails(50, topY + 2, 6)}
        </G>
      )}

      {hairStyle === "textured_pixie" && (
        <G>
          <Path
            d={`M${50 - headRX - 2} ${hCY} Q${50 - headRX - 2} ${topY + 2} ${50 - headRX + 4} ${topY - 3} Q50 ${topY - 8} ${50 + headRX - 4} ${topY - 3} Q${50 + headRX + 2} ${topY + 2} ${50 + headRX + 2} ${hCY} L${50 + headRX} ${hCY - 8} L${50 - headRX} ${hCY - 8} Z`}
            fill="url(#hairMainG)"
          />
          <Path d={`M${50 - 5} ${topY - 4} Q${50} ${topY - 8} ${50 + 7} ${topY - 3}`} fill={c.base} />
          <Ellipse cx={50 - headRX} cy={hCY - 4} rx="3" ry="7" fill={c.base} />
          <Ellipse cx={50 + headRX} cy={hCY - 4} rx="3" ry="7" fill={c.base} />
          {strandDetails(50, topY - 1, 5)}
        </G>
      )}

      {hairStyle === "ponytail_sleek" && (
        <G>
          <Path
            d={`M${50 - headRX} ${hCY - 4} Q${50 - headRX - 0.5} ${topY + 4} ${50 - headRX + 4} ${topY} Q50 ${topY - 4} ${50 + headRX - 4} ${topY} Q${50 + headRX + 0.5} ${topY + 4} ${50 + headRX} ${hCY - 4} L${50 + headRX - 1} ${hCY - 10} L${50 - headRX + 1} ${hCY - 10} Z`}
            fill="url(#hairMainG)"
          />
          <Ellipse cx="50" cy={topY + 3} rx={headRX - 3} ry="4" fill={c.highlight} opacity={0.15} />
          <Path
            d={`M50 ${hCY - 2} Q56 ${hCY + 2} 57 ${hCY + 16} Q56 ${hCY + 30} 52 ${hCY + 38}`}
            stroke={c.base} strokeWidth="5.5" fill="none" strokeLinecap="round"
          />
          <Path
            d={`M50 ${hCY - 2} Q56 ${hCY + 2} 57 ${hCY + 16} Q56 ${hCY + 30} 52 ${hCY + 38}`}
            stroke={c.shadow} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity={0.3}
          />
          <Path
            d={`M50 ${hCY - 2} Q55 ${hCY + 1} 56.5 ${hCY + 14} Q55.5 ${hCY + 28} 52 ${hCY + 36}`}
            stroke={c.highlight} strokeWidth="0.8" fill="none" strokeLinecap="round" opacity={0.15}
          />
          <Ellipse cx="51" cy={hCY - 1} rx="3" ry="2" fill={c.base} />
        </G>
      )}

      {hairStyle === "natural_medium" && (
        <G>
          <Path
            d={`M${50 - headRX - 3} ${hCY + 8} Q${50 - headRX - 4} ${topY + 2} ${50 - headRX + 3} ${topY - 2} Q50 ${topY - 8} ${50 + headRX - 3} ${topY - 2} Q${50 + headRX + 4} ${topY + 2} ${50 + headRX + 3} ${hCY + 8} Q${50 + headRX + 2} ${hCY + 16} ${50 + headRX - 1} ${hCY + 20} L${50 - headRX + 1} ${hCY + 20} Q${50 - headRX - 2} ${hCY + 16} ${50 - headRX - 3} ${hCY + 8} Z`}
            fill="url(#hairMainG)"
          />
          <Ellipse cx={50 - headRX - 1} cy={hCY + 2} rx="4.5" ry="14" fill={c.base} />
          <Ellipse cx={50 + headRX + 1} cy={hCY + 2} rx="4.5" ry="14" fill={c.base} />
          <Ellipse cx="50" cy={topY + 1} rx={headRX - 2} ry="5" fill={c.highlight} opacity={0.1} />
          {strandDetails(50, topY + 1, 5)}
          <Path d={`M${50 - 8} ${topY - 1} Q${50 - 4} ${topY - 5} 50 ${topY - 4} Q${50 + 4} ${topY - 5} ${50 + 8} ${topY - 1}`} stroke={c.shadow} strokeWidth="0.6" fill="none" opacity={0.18} />
        </G>
      )}

      {hairStyle === "bun_top" && (
        <G>
          <Path
            d={`M${50 - headRX} ${hCY - 4} Q${50 - headRX - 0.5} ${topY + 4} ${50 - headRX + 4} ${topY} Q50 ${topY - 4} ${50 + headRX - 4} ${topY} Q${50 + headRX + 0.5} ${topY + 4} ${50 + headRX} ${hCY - 4} L${50 + headRX - 1} ${hCY - 10} L${50 - headRX + 1} ${hCY - 10} Z`}
            fill="url(#hairMainG)"
          />
          <Ellipse cx="50" cy={topY - 6} rx="7.5" ry="7.5" fill={c.base} />
          <Ellipse cx="50" cy={topY - 8} rx="5" ry="4" fill={c.highlight} opacity={0.15} />
          <Path d={`M47 ${topY - 6} Q50 ${topY - 3} 53 ${topY - 6}`} stroke={c.shadow} strokeWidth="0.5" fill="none" opacity={0.2} />
          <Ellipse cx="50" cy={topY + 2} rx={headRX - 3} ry="4" fill={c.highlight} opacity={0.1} />
        </G>
      )}
    </G>
  );
}

export const HairLayer = memo(HairLayerInner);

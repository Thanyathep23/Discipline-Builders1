import React, { memo } from "react";
import { G, Ellipse, Rect, Path, Defs, LinearGradient, Stop } from "react-native-svg";
import type { BodyType } from "@/lib/characterEngine";

const HAIR_COLOR_HEX: Record<string, { base: string; shadow: string; highlight: string }> = {
  "black":        { base: "#141414", shadow: "#080808", highlight: "#2A2A2A" },
  "dark-brown":   { base: "#2C1A0E", shadow: "#1A0E06", highlight: "#4A3020" },
  "medium-brown": { base: "#5C3A1E", shadow: "#3E2610", highlight: "#7A5030" },
  "light-brown":  { base: "#8B5E3C", shadow: "#6A4828", highlight: "#A87850" },
  "dirty-blonde": { base: "#BF9B5A", shadow: "#9A7E44", highlight: "#D8B870" },
  "blonde":       { base: "#E8D090", shadow: "#C8B070", highlight: "#F8E8B0" },
  "auburn":       { base: "#7B3F20", shadow: "#5A2E14", highlight: "#9A5430" },
  "platinum":     { base: "#DCDCDC", shadow: "#B0B0B0", highlight: "#F0F0F0" },
};

interface Props {
  hairStyle: string;
  hairColor: string;
  bodyType: BodyType;
  headCY: number;
  groomingLevel: number;
}

function HairLayerInner({ hairStyle, hairColor, bodyType, headCY, groomingLevel }: Props) {
  const colors = HAIR_COLOR_HEX[hairColor] ?? HAIR_COLOR_HEX["black"];
  const hCY = headCY;
  const isMale = bodyType === "male";
  const headRX = isMale ? 17 : 16;

  const texturePaths = (
    <G opacity={0.35}>
      <Path d={`M${50 - headRX + 4} ${hCY - 14} Q${50 - headRX + 6} ${hCY - 8} ${50 - headRX + 5} ${hCY - 2}`} stroke={colors.shadow} strokeWidth="0.8" fill="none" strokeLinecap="round" />
      <Path d={`M${50 + headRX - 4} ${hCY - 14} Q${50 + headRX - 6} ${hCY - 8} ${50 + headRX - 5} ${hCY - 2}`} stroke={colors.shadow} strokeWidth="0.8" fill="none" strokeLinecap="round" />
      {groomingLevel >= 1 && (
        <>
          <Path d={`M${50 - 6} ${hCY - 18} Q${50 - 4} ${hCY - 12} ${50 - 5} ${hCY - 6}`} stroke={colors.highlight} strokeWidth="0.6" fill="none" strokeLinecap="round" />
          <Path d={`M${50 + 6} ${hCY - 18} Q${50 + 4} ${hCY - 12} ${50 + 5} ${hCY - 6}`} stroke={colors.highlight} strokeWidth="0.6" fill="none" strokeLinecap="round" />
        </>
      )}
      {groomingLevel >= 2 && (
        <>
          <Path d={`M${50 - 10} ${hCY - 12} Q${50 - 8} ${hCY - 6} ${50 - 9} ${hCY}`} stroke={colors.highlight} strokeWidth="1" fill="none" strokeLinecap="round" />
          <Path d={`M${50 + 10} ${hCY - 12} Q${50 + 8} ${hCY - 6} ${50 + 9} ${hCY}`} stroke={colors.highlight} strokeWidth="1" fill="none" strokeLinecap="round" />
        </>
      )}
    </G>
  );

  if (hairStyle === "bald" || hairStyle === "buzz_cut") {
    if (hairStyle === "bald") return null;
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 8} rx={headRX - 1} ry="12" fill={colors.base} opacity={0.5} />
        <Ellipse cx="50" cy={hCY - 12} rx={headRX - 3} ry="6" fill={colors.highlight} opacity={0.15} />
      </G>
    );
  }

  if (hairStyle === "clean_cut" || hairStyle === "low-fade") {
    return (
      <G>
        <Defs>
          <LinearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.highlight} />
            <Stop offset="0.5" stopColor={colors.base} />
            <Stop offset="1" stopColor={colors.shadow} />
          </LinearGradient>
        </Defs>
        <Ellipse cx="50" cy={hCY - 12} rx={headRX} ry="12" fill="url(#hairGrad)" />
        <Rect x={50 - headRX} y={hCY - 12} width={headRX * 2} height="10" fill={colors.base} />
        <Ellipse cx={50 - headRX + 1} cy={hCY - 5} rx="2.5" ry="5" fill={colors.base} />
        <Ellipse cx={50 + headRX - 1} cy={hCY - 5} rx="2.5" ry="5" fill={colors.base} />
        {texturePaths}
      </G>
    );
  }

  if (hairStyle === "side_part" || hairStyle === "caesar") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 12} rx={headRX + 1} ry="13" fill={colors.base} />
        <Rect x={50 - headRX - 1} y={hCY - 12} width={headRX * 2 + 2} height="11" fill={colors.base} />
        <Ellipse cx={50 - headRX} cy={hCY - 5} rx="3" ry="6" fill={colors.base} />
        <Ellipse cx={50 + headRX} cy={hCY - 5} rx="3" ry="6" fill={colors.base} />
        <Path d={`M${50 - headRX + 4} ${hCY - 20} Q50 ${hCY - 24} ${50 + headRX - 2} ${hCY - 18}`} stroke={colors.shadow} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {texturePaths}
      </G>
    );
  }

  if (hairStyle === "textured_crop" || hairStyle === "taper") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 14} rx={headRX} ry="13" fill={colors.base} />
        <Rect x={50 - headRX} y={hCY - 14} width={headRX * 2} height="12" fill={colors.base} />
        <Ellipse cx={50 - headRX + 1} cy={hCY - 6} rx="2.5" ry="5.5" fill={colors.base} />
        <Ellipse cx={50 + headRX - 1} cy={hCY - 6} rx="2.5" ry="5.5" fill={colors.base} />
        <Path d={`M${50 - 8} ${hCY - 22} Q${50 - 4} ${hCY - 26} ${50 + 2} ${hCY - 24} Q${50 + 8} ${hCY - 22} ${50 + 10} ${hCY - 18}`} fill={colors.base} />
        {texturePaths}
      </G>
    );
  }

  if (hairStyle === "medium_natural" || hairStyle === "natural" || hairStyle === "waves") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 16} rx={headRX + 3} ry="16" fill={colors.base} />
        <Rect x={50 - headRX - 3} y={hCY - 16} width={(headRX + 3) * 2} height="14" fill={colors.base} />
        <Ellipse cx={50 - headRX - 1} cy={hCY - 6} rx="5" ry="12" fill={colors.base} />
        <Ellipse cx={50 + headRX + 1} cy={hCY - 6} rx="5" ry="12" fill={colors.base} />
        <Path d={`M${50 - 10} ${hCY - 22} Q${50 - 6} ${hCY - 26} ${50} ${hCY - 24} Q${50 + 6} ${hCY - 26} ${50 + 10} ${hCY - 22}`} stroke={colors.shadow} strokeWidth="1" fill="none" opacity={0.5} />
        {texturePaths}
      </G>
    );
  }

  if (hairStyle === "slicked_back") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 10} rx={headRX} ry="14" fill={colors.base} />
        <Rect x={50 - headRX} y={hCY - 10} width={headRX * 2} height="8" fill={colors.base} />
        <Ellipse cx={50 - headRX + 1} cy={hCY - 4} rx="2" ry="4" fill={colors.base} />
        <Ellipse cx={50 + headRX - 1} cy={hCY - 4} rx="2" ry="4" fill={colors.base} />
        <Ellipse cx="50" cy={hCY - 18} rx={headRX - 2} ry="6" fill={colors.highlight} opacity={0.3} />
        {texturePaths}
      </G>
    );
  }

  if (hairStyle === "short_bob") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 10} rx={headRX + 2} ry="16" fill={colors.base} />
        <Rect x={50 - headRX - 2} y={hCY - 10} width={(headRX + 2) * 2} height="18" fill={colors.base} />
        <Ellipse cx={50 - headRX - 1} cy={hCY} rx="4" ry="14" fill={colors.base} />
        <Ellipse cx={50 + headRX + 1} cy={hCY} rx="4" ry="14" fill={colors.base} />
        <Path d={`M${50 - headRX - 3} ${hCY + 10} Q${50 - headRX} ${hCY + 14} ${50 - headRX + 4} ${hCY + 12}`} stroke={colors.shadow} strokeWidth="0.8" fill="none" opacity={0.3} />
        <Path d={`M${50 + headRX + 3} ${hCY + 10} Q${50 + headRX} ${hCY + 14} ${50 + headRX - 4} ${hCY + 12}`} stroke={colors.shadow} strokeWidth="0.8" fill="none" opacity={0.3} />
        {texturePaths}
      </G>
    );
  }

  if (hairStyle === "side_part_long") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 12} rx={headRX + 2} ry="16" fill={colors.base} />
        <Rect x={50 - headRX - 2} y={hCY - 12} width={(headRX + 2) * 2} height="24" fill={colors.base} />
        <Ellipse cx={50 - headRX - 1} cy={hCY + 4} rx="4.5" ry="18" fill={colors.base} />
        <Ellipse cx={50 + headRX + 1} cy={hCY + 4} rx="4.5" ry="18" fill={colors.base} />
        <Path d={`M${50 - 6} ${hCY - 22} Q50 ${hCY - 26} ${50 + headRX} ${hCY - 16}`} stroke={colors.shadow} strokeWidth="1" fill="none" opacity={0.4} />
        {texturePaths}
      </G>
    );
  }

  if (hairStyle === "textured_pixie") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 14} rx={headRX + 1} ry="14" fill={colors.base} />
        <Rect x={50 - headRX - 1} y={hCY - 14} width={(headRX + 1) * 2} height="12" fill={colors.base} />
        <Ellipse cx={50 - headRX} cy={hCY - 6} rx="3" ry="8" fill={colors.base} />
        <Ellipse cx={50 + headRX} cy={hCY - 6} rx="3" ry="8" fill={colors.base} />
        <Path d={`M${50 - 6} ${hCY - 24} Q${50} ${hCY - 28} ${50 + 8} ${hCY - 22}`} fill={colors.base} />
        {texturePaths}
      </G>
    );
  }

  if (hairStyle === "ponytail_sleek") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 10} rx={headRX} ry="14" fill={colors.base} />
        <Rect x={50 - headRX} y={hCY - 10} width={headRX * 2} height="8" fill={colors.base} />
        <Ellipse cx={50 - headRX + 1} cy={hCY - 4} rx="2" ry="4" fill={colors.base} />
        <Ellipse cx={50 + headRX - 1} cy={hCY - 4} rx="2" ry="4" fill={colors.base} />
        <Path d={`M50 ${hCY - 2} Q56 ${hCY} 58 ${hCY + 14} Q56 ${hCY + 30} 52 ${hCY + 36}`} stroke={colors.base} strokeWidth="6" fill="none" strokeLinecap="round" />
        <Path d={`M50 ${hCY - 2} Q56 ${hCY} 58 ${hCY + 14} Q56 ${hCY + 30} 52 ${hCY + 36}`} stroke={colors.shadow} strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.3} />
        <Ellipse cx="50" cy={hCY - 18} rx={headRX - 2} ry="6" fill={colors.highlight} opacity={0.2} />
        {texturePaths}
      </G>
    );
  }

  if (hairStyle === "natural_medium") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 12} rx={headRX + 3} ry="18" fill={colors.base} />
        <Rect x={50 - headRX - 3} y={hCY - 12} width={(headRX + 3) * 2} height="22" fill={colors.base} />
        <Ellipse cx={50 - headRX - 1} cy={hCY + 2} rx="5" ry="16" fill={colors.base} />
        <Ellipse cx={50 + headRX + 1} cy={hCY + 2} rx="5" ry="16" fill={colors.base} />
        <Path d={`M${50 - 8} ${hCY - 24} Q${50 - 4} ${hCY - 28} ${50} ${hCY - 26} Q${50 + 4} ${hCY - 28} ${50 + 8} ${hCY - 24}`} stroke={colors.shadow} strokeWidth="0.8" fill="none" opacity={0.4} />
        {texturePaths}
      </G>
    );
  }

  if (hairStyle === "bun_top") {
    return (
      <G>
        <Ellipse cx="50" cy={hCY - 10} rx={headRX} ry="14" fill={colors.base} />
        <Rect x={50 - headRX} y={hCY - 10} width={headRX * 2} height="8" fill={colors.base} />
        <Ellipse cx={50 - headRX + 1} cy={hCY - 4} rx="2" ry="4" fill={colors.base} />
        <Ellipse cx={50 + headRX - 1} cy={hCY - 4} rx="2" ry="4" fill={colors.base} />
        <Ellipse cx="50" cy={hCY - 24} rx="8" ry="8" fill={colors.base} />
        <Ellipse cx="50" cy={hCY - 26} rx="5" ry="4" fill={colors.highlight} opacity={0.2} />
        <Ellipse cx="50" cy={hCY - 18} rx={headRX - 2} ry="6" fill={colors.highlight} opacity={0.15} />
        {texturePaths}
      </G>
    );
  }

  return (
    <G>
      <Ellipse cx="50" cy={hCY - 12} rx={headRX} ry="12" fill={colors.base} />
      <Rect x={50 - headRX} y={hCY - 12} width={headRX * 2} height="10" fill={colors.base} />
      {texturePaths}
    </G>
  );
}

export const HairLayer = memo(HairLayerInner);

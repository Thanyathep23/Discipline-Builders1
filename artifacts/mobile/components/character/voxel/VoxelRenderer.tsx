import React, { useMemo } from "react";
import Svg, { Rect, Defs, LinearGradient, Stop } from "react-native-svg";

export type VoxelMap = (string | null)[][];

function lighten(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * amount));
  const ng = Math.min(255, Math.round(g + (255 - g) * amount));
  const nb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

function darken(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.max(0, Math.round(r * (1 - amount)));
  const ng = Math.max(0, Math.round(g * (1 - amount)));
  const nb = Math.max(0, Math.round(b * (1 - amount)));
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

interface Props {
  map: VoxelMap;
  voxelSize?: number;
  width?: number;
  height?: number;
}

export function VoxelRenderer({ map, voxelSize = 6, width, height }: Props) {
  const rects = useMemo(() => {
    const result: { x: number; y: number; color: string; highlight: string; shadow: string }[] = [];
    for (let y = 0; y < map.length; y++) {
      const row = map[y];
      for (let x = 0; x < row.length; x++) {
        const color = row[x];
        if (color) {
          result.push({
            x: x * voxelSize,
            y: y * voxelSize,
            color,
            highlight: lighten(color, 0.18),
            shadow: darken(color, 0.22),
          });
        }
      }
    }
    return result;
  }, [map, voxelSize]);

  const svgW = width ?? (map[0]?.length ?? 0) * voxelSize;
  const svgH = height ?? map.length * voxelSize;
  const vs = voxelSize;
  const vs1 = vs - 0.5;

  return (
    <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
      {rects.map(({ x, y, color, highlight, shadow }, i) => (
        <React.Fragment key={i}>
          <Rect x={x} y={y} width={vs1} height={vs1} fill={color} />
          <Rect x={x} y={y} width={vs1} height={1} fill={highlight} opacity={0.5} />
          <Rect x={x} y={y} width={1} height={vs1} fill={highlight} opacity={0.3} />
          <Rect x={x + vs1 - 1} y={y} width={1} height={vs1} fill={shadow} opacity={0.4} />
          <Rect x={x} y={y + vs1 - 1} width={vs1} height={1} fill={shadow} opacity={0.5} />
        </React.Fragment>
      ))}
    </Svg>
  );
}

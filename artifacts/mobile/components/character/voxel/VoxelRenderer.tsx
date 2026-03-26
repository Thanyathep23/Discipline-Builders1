import React, { useMemo } from "react";
import Svg, { Rect } from "react-native-svg";

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

interface VoxelRect {
  x: number;
  y: number;
  color: string;
  hl: string;
  sh: string;
}

interface Props {
  map: VoxelMap;
  voxelSize?: number;
}

export function VoxelRenderer({ map, voxelSize = 10 }: Props) {
  const rects = useMemo(() => {
    const result: VoxelRect[] = [];
    for (let y = 0; y < map.length; y++) {
      const row = map[y];
      for (let x = 0; x < row.length; x++) {
        const color = row[x];
        if (color) {
          result.push({
            x: x * voxelSize,
            y: y * voxelSize,
            color,
            hl: lighten(color, 0.22),
            sh: darken(color, 0.28),
          });
        }
      }
    }
    return result;
  }, [map, voxelSize]);

  const cols = map[0]?.length ?? 0;
  const rows = map.length;
  const svgW = cols * voxelSize;
  const svgH = rows * voxelSize;
  const vs = voxelSize;
  const gap = 0.5;
  const bw = Math.max(1, vs * 0.12);

  return (
    <Svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
      {rects.map(({ x, y, color, hl, sh }, i) => (
        <React.Fragment key={i}>
          <Rect x={x} y={y} width={vs - gap} height={vs - gap} fill={color} />
          <Rect x={x} y={y} width={vs - gap} height={bw} fill={hl} opacity={0.55} />
          <Rect x={x} y={y} width={bw} height={vs - gap} fill={hl} opacity={0.35} />
          <Rect x={x + vs - gap - bw} y={y} width={bw} height={vs - gap} fill={sh} opacity={0.45} />
          <Rect x={x} y={y + vs - gap - bw} width={vs - gap} height={bw} fill={sh} opacity={0.55} />
        </React.Fragment>
      ))}
    </Svg>
  );
}

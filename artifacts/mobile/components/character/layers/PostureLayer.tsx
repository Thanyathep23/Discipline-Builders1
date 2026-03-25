import React, { memo } from "react";
import { G, Rect, Ellipse, Path } from "react-native-svg";
import type { PostureStage, RefinementStage, BodyType } from "@/lib/characterEngine";

export interface PostureMetrics {
  headCY: number;
  earCY: number;
  neckY: number;
  neckH: number;
  neckW: number;
  torsoX: number;
  torsoW: number;
  torsoH: number;
  shoulderW: number;
  armLX: number;
  armRX: number;
  armW: number;
  hipW: number;
  waistY: number;
}

const MALE_METRICS: Record<PostureStage, PostureMetrics> = {
  neutral: {
    headCY: 32, earCY: 34, neckY: 48, neckH: 10, neckW: 14,
    torsoX: 26, torsoW: 48, torsoH: 68, shoulderW: 52,
    armLX: 10, armRX: 76, armW: 14, hipW: 40, waistY: 115,
  },
  upright: {
    headCY: 30, earCY: 32, neckY: 45, neckH: 12, neckW: 14,
    torsoX: 24, torsoW: 52, torsoH: 70, shoulderW: 56,
    armLX: 8, armRX: 78, armW: 14, hipW: 42, waistY: 115,
  },
  athletic: {
    headCY: 28, earCY: 30, neckY: 42, neckH: 14, neckW: 15,
    torsoX: 22, torsoW: 56, torsoH: 72, shoulderW: 60,
    armLX: 5, armRX: 81, armW: 16, hipW: 42, waistY: 114,
  },
  peak: {
    headCY: 26, earCY: 28, neckY: 39, neckH: 16, neckW: 16,
    torsoX: 20, torsoW: 60, torsoH: 74, shoulderW: 64,
    armLX: 3, armRX: 83, armW: 16, hipW: 44, waistY: 113,
  },
};

const FEMALE_METRICS: Record<PostureStage, PostureMetrics> = {
  neutral: {
    headCY: 32, earCY: 34, neckY: 48, neckH: 10, neckW: 11,
    torsoX: 28, torsoW: 44, torsoH: 66, shoulderW: 46,
    armLX: 14, armRX: 74, armW: 12, hipW: 44, waistY: 112,
  },
  upright: {
    headCY: 30, earCY: 32, neckY: 45, neckH: 12, neckW: 11,
    torsoX: 26, torsoW: 48, torsoH: 68, shoulderW: 48,
    armLX: 12, armRX: 76, armW: 12, hipW: 46, waistY: 112,
  },
  athletic: {
    headCY: 28, earCY: 30, neckY: 42, neckH: 14, neckW: 12,
    torsoX: 25, torsoW: 50, torsoH: 70, shoulderW: 50,
    armLX: 10, armRX: 78, armW: 13, hipW: 46, waistY: 111,
  },
  peak: {
    headCY: 26, earCY: 28, neckY: 39, neckH: 16, neckW: 12,
    torsoX: 24, torsoW: 52, torsoH: 72, shoulderW: 52,
    armLX: 8, armRX: 80, armW: 14, hipW: 46, waistY: 110,
  },
};

const REFINEMENT_GROOMING: Record<RefinementStage, number> = {
  casual: 0, composed: 1, sharp: 2, commanding: 3,
};

const CONFIDENCE_FACE: Record<RefinementStage, number> = {
  casual: 0, composed: 1, sharp: 1, commanding: 2,
};

export function getPostureMetrics(stage: PostureStage, bodyType: BodyType = "male"): PostureMetrics {
  return bodyType === "female" ? FEMALE_METRICS[stage] : MALE_METRICS[stage];
}

export function getGroomingLevel(stage: RefinementStage): number {
  return REFINEMENT_GROOMING[stage];
}

export function getConfidenceLevel(stage: RefinementStage): number {
  return CONFIDENCE_FACE[stage];
}

export function mouthPath(cf: number, hY: number): string {
  const y = hY + 10;
  if (cf === 0) return `M45 ${y} Q50 ${y + 2} 55 ${y}`;
  if (cf === 1) return `M44 ${y} Q50 ${y + 3} 56 ${y}`;
  return `M43 ${y} Q50 ${y + 4} 57 ${y}`;
}

export function browPaths(cf: number, hY: number): [string, string] {
  const y0 = hY - 8;
  if (cf === 0) return [
    `M38.5 ${y0} Q42 ${y0 - 1.5} 45.5 ${y0}`,
    `M54.5 ${y0} Q58 ${y0 - 1.5} 61.5 ${y0}`,
  ];
  if (cf === 1) return [
    `M38 ${y0 - 0.5} Q42 ${y0 - 2.5} 46 ${y0 - 0.5}`,
    `M54 ${y0 - 0.5} Q58 ${y0 - 2.5} 62 ${y0 - 0.5}`,
  ];
  return [
    `M37.5 ${y0 - 1} Q42 ${y0 - 3} 46 ${y0 - 1}`,
    `M54 ${y0 - 1} Q58 ${y0 - 3} 62.5 ${y0 - 1}`,
  ];
}

const SKIN_SHADING: Record<string, string> = {
  "tone-1": "#DABB90",
  "tone-2": "#C49565",
  "tone-3": "#A07650",
  "tone-4": "#6A4828",
  "tone-5": "#3E2010",
};

interface PostureProps {
  stage: PostureStage;
  bodyType: BodyType;
  skinTone: string;
}

function PostureLayerInner({ stage, bodyType, skinTone }: PostureProps) {
  const m = getPostureMetrics(stage, bodyType);
  const shadeFill = SKIN_SHADING[skinTone] ?? SKIN_SHADING["tone-3"];
  const isMale = bodyType === "male";

  if (stage === "neutral") return null;

  return (
    <G opacity={0.45}>
      {(stage === "upright" || stage === "athletic" || stage === "peak") && (
        <>
          <Path
            d={`M${m.torsoX + 4} 60 Q50 56 ${m.torsoX + m.torsoW - 4} 60`}
            stroke={shadeFill} strokeWidth="1.5" fill="none" strokeLinecap="round"
          />
          {isMale && (
            <Path
              d={`M${50 - m.shoulderW / 2 + 4} 56 L50 62 L${50 + m.shoulderW / 2 - 4} 56`}
              stroke={shadeFill} strokeWidth="0.8" fill="none" strokeLinecap="round" opacity={0.4}
            />
          )}
        </>
      )}

      {(stage === "athletic" || stage === "peak") && (
        <>
          <Rect x={m.armLX + 2} y="80" width={m.armW - 4} height="4" rx="2" fill={shadeFill} opacity={0.5} />
          <Rect x={m.armRX + 2} y="80" width={m.armW - 4} height="4" rx="2" fill={shadeFill} opacity={0.5} />
          {isMale && (
            <>
              <Ellipse cx="50" cy="95" rx={m.torsoW / 2 - 8} ry="4" fill={shadeFill} opacity={0.2} />
              <Path
                d={`M${m.torsoX + 6} 66 Q50 72 ${m.torsoX + m.torsoW - 6} 66`}
                stroke={shadeFill} strokeWidth="1" fill="none" strokeLinecap="round" opacity={0.3}
              />
            </>
          )}
          {!isMale && (
            <Path
              d={`M${m.torsoX + 8} 80 Q50 76 ${m.torsoX + m.torsoW - 8} 80`}
              stroke={shadeFill} strokeWidth="0.8" fill="none" strokeLinecap="round" opacity={0.3}
            />
          )}
        </>
      )}

      {stage === "peak" && (
        <>
          <Rect x={m.armLX + 1} y="84" width={m.armW - 2} height="3" rx="1.5" fill={shadeFill} opacity={0.4} />
          <Rect x={m.armRX + 1} y="84" width={m.armW - 2} height="3" rx="1.5" fill={shadeFill} opacity={0.4} />
          {isMale && (
            <Path
              d={`M${m.torsoX + 10} 76 L50 84 L${m.torsoX + m.torsoW - 10} 76`}
              stroke={shadeFill} strokeWidth="1" fill="none" strokeLinecap="round" opacity={0.3}
            />
          )}
        </>
      )}
    </G>
  );
}

export const PostureLayer = memo(PostureLayerInner);

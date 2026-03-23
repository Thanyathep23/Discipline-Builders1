import React, { memo } from "react";
import type { PostureStage, RefinementStage } from "@/lib/characterEngine";

export interface PostureMetrics {
  headCY: number;
  earCY: number;
  neckY: number;
  neckH: number;
  torsoX: number;
  torsoW: number;
  armLX: number;
  armRX: number;
  armW: number;
}

const POSTURE_METRICS: Record<PostureStage, PostureMetrics> = {
  neutral: {
    headCY: 29, earCY: 31, neckY: 46, neckH: 10,
    torsoX: 24, torsoW: 52, armLX: 8, armRX: 76, armW: 16,
  },
  upright: {
    headCY: 28, earCY: 30, neckY: 43, neckH: 12,
    torsoX: 24, torsoW: 52, armLX: 8, armRX: 76, armW: 16,
  },
  athletic: {
    headCY: 26, earCY: 28, neckY: 40, neckH: 14,
    torsoX: 22, torsoW: 56, armLX: 6, armRX: 78, armW: 18,
  },
  peak: {
    headCY: 24, earCY: 26, neckY: 38, neckH: 16,
    torsoX: 20, torsoW: 60, armLX: 4, armRX: 80, armW: 18,
  },
};

const REFINEMENT_GROOMING: Record<RefinementStage, number> = {
  casual: 0,
  composed: 1,
  sharp: 2,
  commanding: 3,
};

const CONFIDENCE_FACE: Record<RefinementStage, number> = {
  casual: 0,
  composed: 1,
  sharp: 1,
  commanding: 2,
};

export function getPostureMetrics(stage: PostureStage): PostureMetrics {
  return POSTURE_METRICS[stage];
}

export function getGroomingLevel(stage: RefinementStage): number {
  return REFINEMENT_GROOMING[stage];
}

export function getConfidenceLevel(stage: RefinementStage): number {
  return CONFIDENCE_FACE[stage];
}

function mouthPath(cf: number, hY: number): string {
  const y = hY + 12;
  if (cf === 0) return `M45 ${y} Q50 ${y + 2} 55 ${y}`;
  if (cf === 1) return `M45 ${y} Q50 ${y + 3.5} 55 ${y}`;
  return `M44 ${y} Q50 ${y + 4.5} 56 ${y}`;
}

function browPaths(cf: number, hY: number): [string, string] {
  const [y0, y1] = [hY - 7, hY - 9];
  if (cf === 0) return [`M40 ${y0} Q43 ${y0 - 1} 46 ${y0}`, `M54 ${y0} Q57 ${y0 - 1} 60 ${y0}`];
  if (cf === 1) return [`M40 ${y0 - 0.5} Q43 ${y1} 46 ${y0 - 0.5}`, `M54 ${y0 - 0.5} Q57 ${y1} 60 ${y0 - 0.5}`];
  return [`M40 ${y0 - 1} Q43 ${y1 - 0.5} 46 ${y0 - 1}`, `M54 ${y0 - 1} Q57 ${y1 - 0.5} 60 ${y0 - 1}`];
}

export { mouthPath, browPaths };

export const PostureLayer = memo(function PostureLayer() {
  return null;
});

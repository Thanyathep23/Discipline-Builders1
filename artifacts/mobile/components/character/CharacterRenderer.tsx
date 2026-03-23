import React, { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Ellipse, Path, G } from "react-native-svg";
import type { CharacterVisualState } from "@/lib/characterEngine";
import { BodyBaseLayer } from "./layers/BodyBaseLayer";
import { PostureLayer, getPostureMetrics, getGroomingLevel, getConfidenceLevel, mouthPath, browPaths } from "./layers/PostureLayer";
import { OutfitLayer, OuterwearLayer } from "./layers/OutfitLayer";
import { WatchLayer } from "./layers/WatchLayer";
import { AccessoryLayer } from "./layers/AccessoryLayer";
import { PrestigeLayer } from "./layers/PrestigeLayer";
import { HairLayer } from "./layers/HairLayer";

const SIZE_MAP = {
  small: { w: 80, h: 120 },
  medium: { w: 120, h: 180 },
  large: { w: 180, h: 270 },
  full: { w: 0, h: 0 },
};

interface Props {
  visualState: CharacterVisualState;
  size?: "small" | "medium" | "large" | "full";
  showShadow?: boolean;
}

function CharacterRendererInner({ visualState, size = "large", showShadow = true }: Props) {
  const vs = visualState;

  const metrics = useMemo(() => getPostureMetrics(vs.postureStage), [vs.postureStage]);
  const groomingLevel = useMemo(() => getGroomingLevel(vs.refinementStage), [vs.refinementStage]);
  const confidenceLevel = useMemo(() => getConfidenceLevel(vs.refinementStage), [vs.refinementStage]);

  const { headCY, earCY, neckY, neckH, torsoX, torsoW, armLX, armRX, armW } = metrics;
  const neckBottom = neckY + neckH;

  const [bl, br] = useMemo(() => browPaths(confidenceLevel, headCY), [confidenceLevel, headCY]);
  const mouth = useMemo(() => mouthPath(confidenceLevel, headCY), [confidenceLevel, headCY]);

  const aspect = 220 / 100;
  let w: number, h: number;
  if (size === "full") {
    w = 200;
    h = w * aspect;
  } else {
    w = SIZE_MAP[size].w;
    h = SIZE_MAP[size].h;
  }

  const hasFitnessGlow = vs.postureStage === "athletic" || vs.postureStage === "peak";

  return (
    <View style={[styles.container, size === "full" && styles.fullContainer]}>
      <Svg width={w} height={h} viewBox="0 0 100 220">
        {hasFitnessGlow && (
          <Ellipse cx="50" cy="130" rx="36" ry="90" fill="rgba(0,230,118,0.035)" />
        )}

        {showShadow && (
          <Ellipse cx="50" cy="212" rx="30" ry="5" fill="#00000055" />
        )}

        <OutfitLayer
          tier={vs.outfitTier}
          equippedTopStyle={vs.equippedTopStyle}
          bottomColor={vs.bottomColor}
          torsoX={torsoX}
          torsoW={torsoW}
          armLX={armLX}
          armRX={armRX}
          armW={armW}
        />

        <OuterwearLayer
          style={vs.equippedOuterwearStyle}
          color={vs.outerwearColor}
          torsoX={torsoX}
          torsoW={torsoW}
          armLX={armLX}
          armRX={armRX}
          armW={armW}
        />

        <BodyBaseLayer
          skinTone={vs.skinTone}
          headCY={headCY}
          earCY={earCY}
          neckY={neckY}
          neckH={neckH}
          armLX={armLX}
          armRX={armRX}
          armW={armW}
        />

        <PostureLayer stage={vs.postureStage} skinTone={vs.skinTone} />

        <G>
          <Path d={bl} stroke="#252535" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <Path d={br} stroke="#252535" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <Path d={mouth} stroke="#B07A5A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <Ellipse cx="50" cy={headCY + 14} rx="4" ry="1.2" fill="#C98C6C" />
        </G>

        <WatchLayer
          style={vs.equippedWatchStyle}
          armRX={armRX}
        />

        <AccessoryLayer
          style={vs.equippedAccessoryStyle}
          armLX={armLX}
          armW={armW}
          torsoX={torsoX}
          neckBottom={neckBottom}
        />

        <PrestigeLayer
          stage={vs.prestigeStage}
          torsoX={torsoX}
          torsoW={torsoW}
          armRX={armRX}
          armW={armW}
          headCY={headCY}
        />

        <HairLayer
          hairStyle={vs.hairStyle}
          hairColor={vs.hairColor}
          headCY={headCY}
          groomingLevel={groomingLevel}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullContainer: {
    flex: 1,
  },
});

export const CharacterRenderer = memo(CharacterRendererInner);

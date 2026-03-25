import React, { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Ellipse, Path, G, Defs, RadialGradient, Stop } from "react-native-svg";
import type { CharacterVisualState, BodyType, CharacterView } from "@/lib/characterEngine";
import { BodyBaseLayer } from "./layers/BodyBaseLayer";
import { PostureLayer, getPostureMetrics, getGroomingLevel, getConfidenceLevel, mouthPath, browPaths } from "./layers/PostureLayer";
import { OutfitLayer, OuterwearLayer } from "./layers/OutfitLayer";
import { WatchLayer } from "./layers/WatchLayer";
import { AccessoryLayer } from "./layers/AccessoryLayer";
import { PrestigeLayer } from "./layers/PrestigeLayer";
import { HairLayer } from "./layers/HairLayer";

const SIZE_MAP = {
  small: { w: 80, h: 160 },
  medium: { w: 140, h: 280 },
  large: { w: 180, h: 360 },
  full: { w: 0, h: 0 },
};

interface Props {
  visualState: CharacterVisualState;
  size?: "small" | "medium" | "large" | "full";
  showShadow?: boolean;
  view?: CharacterView;
}

function CharacterRendererInner({ visualState, size = "large", showShadow = true, view = "front" }: Props) {
  const vs = visualState;
  const bodyType: BodyType = vs.bodyType ?? "male";

  const metrics = useMemo(() => getPostureMetrics(vs.postureStage, bodyType), [vs.postureStage, bodyType]);
  const groomingLevel = useMemo(() => getGroomingLevel(vs.refinementStage), [vs.refinementStage]);
  const confidenceLevel = useMemo(() => getConfidenceLevel(vs.refinementStage), [vs.refinementStage]);

  const { headCY, earCY, neckY, neckH, neckW, torsoX, torsoW, torsoH, shoulderW, armLX, armRX, armW, hipW, waistY } = metrics;
  const neckBottom = neckY + neckH;

  const [bl, br] = useMemo(() => browPaths(confidenceLevel, headCY), [confidenceLevel, headCY]);
  const mouth = useMemo(() => mouthPath(confidenceLevel, headCY), [confidenceLevel, headCY]);

  const VB_W = 100;
  const VB_H = 280;
  const aspect = VB_H / VB_W;
  let w: number, h: number;
  if (size === "full") {
    w = 220;
    h = w * aspect;
  } else {
    w = SIZE_MAP[size].w;
    h = SIZE_MAP[size].h;
  }

  const hasFitnessGlow = vs.postureStage === "athletic" || vs.postureStage === "peak";
  const hasAccessoryEquipped = !!vs.equippedAccessoryStyle;

  return (
    <View style={[styles.container, size === "full" && styles.fullContainer]}>
      <Svg width={w} height={h} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Defs>
          <RadialGradient id="fitnessGlow" cx="0.5" cy="0.45" rx="0.4" ry="0.35">
            <Stop offset="0" stopColor="#00E676" stopOpacity="0.06" />
            <Stop offset="1" stopColor="#00E676" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {hasFitnessGlow && (
          <Ellipse cx="50" cy="150" rx="40" ry="110" fill="url(#fitnessGlow)" />
        )}

        {showShadow && (
          <Ellipse cx="50" cy="274" rx="28" ry="4" fill="#00000040" />
        )}

        <BodyBaseLayer
          skinTone={vs.skinTone}
          bodyType={bodyType}
          headCY={headCY}
          earCY={earCY}
          neckY={neckY}
          neckH={neckH}
          neckW={neckW}
          armLX={armLX}
          armRX={armRX}
          armW={armW}
          shoulderW={shoulderW}
        />

        <PostureLayer stage={vs.postureStage} bodyType={bodyType} skinTone={vs.skinTone} />

        <OutfitLayer
          tier={vs.outfitTier}
          bodyType={bodyType}
          equippedTopStyle={vs.equippedTopStyle}
          bottomColor={vs.bottomColor}
          torsoX={torsoX}
          torsoW={torsoW}
          torsoH={torsoH}
          armLX={armLX}
          armRX={armRX}
          armW={armW}
          hipW={hipW}
          waistY={waistY}
          shoulderW={shoulderW}
        />

        <OuterwearLayer
          style={vs.equippedOuterwearStyle}
          color={vs.outerwearColor}
          torsoX={torsoX}
          torsoW={torsoW}
          armLX={armLX}
          armRX={armRX}
          armW={armW}
          shoulderW={shoulderW}
        />

        <WatchLayer
          style={vs.equippedWatchStyle}
          armRX={armRX}
          armW={armW}
        />

        <PrestigeLayer
          stage={vs.prestigeStage}
          torsoX={torsoX}
          torsoW={torsoW}
          armRX={armRX}
          armW={armW}
          headCY={headCY}
        />

        <AccessoryLayer
          style={vs.equippedAccessoryStyle}
          armLX={armLX}
          armW={armW}
          torsoX={torsoX}
          neckBottom={neckBottom}
          showDogTag={!hasAccessoryEquipped}
          showBracelet={!hasAccessoryEquipped}
        />

        <HairLayer
          hairStyle={vs.hairStyle}
          hairColor={vs.hairColor}
          bodyType={bodyType}
          headCY={headCY}
          groomingLevel={groomingLevel}
        />

        <G>
          <Path d={bl} stroke="#252535" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <Path d={br} stroke="#252535" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <Path d={mouth} stroke="#B07A5A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </G>
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

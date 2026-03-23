import React, { memo } from "react";
import { G, Rect, Circle } from "react-native-svg";

interface Props {
  style: string | null;
  armRX: number;
}

function WatchLayerInner({ style, armRX }: Props) {
  if (!style) return null;

  if (style === "basic" || style === "basic_watch") {
    return (
      <G>
        <Rect x={armRX + 2} y="99" width="10" height="6" rx="1.5" fill="#7A6030" />
        <Rect x={armRX + 3} y="100" width="8" height="4" rx="1" fill="#C0A030" />
        <Circle cx={armRX + 7} cy="102" r="1.5" fill="#1A1A28" />
        <Circle cx={armRX + 7} cy="102" r="0.7" fill="#C0A030" />
      </G>
    );
  }

  if (style === "refined" || style === "sport_watch" || style === "premium_watch") {
    return (
      <G>
        <Rect x={armRX + 1} y="97" width="2" height="10" rx="1" fill="#7A6030" />
        <Rect x={armRX + 11} y="97" width="2" height="10" rx="1" fill="#7A6030" />
        <Rect x={armRX + 2} y="98" width="10" height="8" rx="2" fill="#8A7040" />
        <Rect x={armRX + 3} y="99" width="8" height="6" rx="1.5" fill="#C0A030" />
        <Circle cx={armRX + 7} cy="102" r="2.2" fill="#1A1A28" />
        <Circle cx={armRX + 7} cy="102" r="1.1" fill="#2A2A40" />
        <Circle cx={armRX + 8} cy={101.2} r="0.5" fill="#C0A030" />
      </G>
    );
  }

  return (
    <G>
      <Rect x={armRX + 1} y="96" width="2" height="12" rx="1" fill="#5A4020" />
      <Rect x={armRX + 11} y="96" width="2" height="12" rx="1" fill="#5A4020" />
      <Circle cx={armRX + 7} cy="102" r="7" fill="#8A7030" />
      <Circle cx={armRX + 7} cy="102" r="5.5" fill="#C0A030" />
      <Circle cx={armRX + 7} cy="102" r="3.8" fill="#0A0A18" />
      <Circle cx={armRX + 7} cy="102" r="1.8" fill="#C0A030" />
      <Circle cx={armRX + 7} cy="102" r="0.9" fill="#E8E8FF" />
    </G>
  );
}

export const WatchLayer = memo(WatchLayerInner);

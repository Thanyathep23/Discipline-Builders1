import React, { memo } from "react";
import { G, Rect, Circle, Ellipse } from "react-native-svg";

interface Props {
  style: string | null;
  armRX: number;
  armW: number;
}

function WatchLayerInner({ style, armRX, armW }: Props) {
  if (!style) return null;
  const cx = armRX + armW / 2;

  if (style === "basic" || style === "basic_watch") {
    return (
      <G>
        <Rect x={cx - 5} y="136" width="10" height="7" rx="2" fill="#7A6030" />
        <Rect x={cx - 4} y="137" width="8" height="5" rx="1.5" fill="#C0A030" />
        <Circle cx={cx} cy="139.5" r="1.8" fill="#1A1A28" />
        <Circle cx={cx} cy="139.5" r="0.8" fill="#C0A030" />
      </G>
    );
  }

  if (style === "refined" || style === "sport_watch" || style === "premium_watch") {
    return (
      <G>
        <Rect x={cx - 6} y="134" width="2" height="11" rx="1" fill="#7A6030" />
        <Rect x={cx + 4} y="134" width="2" height="11" rx="1" fill="#7A6030" />
        <Rect x={cx - 5} y="135" width="10" height="9" rx="2.5" fill="#8A7040" />
        <Rect x={cx - 4} y="136" width="8" height="7" rx="2" fill="#C0A030" />
        <Circle cx={cx} cy="139.5" r="2.5" fill="#1A1A28" />
        <Circle cx={cx} cy="139.5" r="1.2" fill="#2A2A40" />
        <Circle cx={cx + 1} cy={138.5} r="0.5" fill="#C0A030" />
      </G>
    );
  }

  return (
    <G>
      <Rect x={cx - 6} y="133" width="2" height="13" rx="1" fill="#5A4020" />
      <Rect x={cx + 4} y="133" width="2" height="13" rx="1" fill="#5A4020" />
      <Circle cx={cx} cy="139.5" r="7" fill="#8A7030" />
      <Circle cx={cx} cy="139.5" r="5.5" fill="#C0A030" />
      <Circle cx={cx} cy="139.5" r="4" fill="#0A0A18" />
      <Circle cx={cx} cy="139.5" r="2" fill="#C0A030" />
      <Circle cx={cx} cy="139.5" r="1" fill="#E8E8FF" />
    </G>
  );
}

export const WatchLayer = memo(WatchLayerInner);

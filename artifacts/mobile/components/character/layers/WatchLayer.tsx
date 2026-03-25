import React, { memo } from "react";
import { G, Rect, Circle, Ellipse, Path, Defs, LinearGradient, Stop } from "react-native-svg";

interface Props {
  style: string | null;
  armRX: number;
  armW: number;
}

function WatchLayerInner({ style, armRX, armW }: Props) {
  if (!style) return null;
  const cx = armRX + armW / 2;
  const wy = 137;

  if (style === "basic" || style === "basic_watch") {
    return (
      <G>
        <Defs>
          <LinearGradient id="watchBandB" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8A7040" />
            <Stop offset="0.5" stopColor="#7A6030" />
            <Stop offset="1" stopColor="#6A5020" />
          </LinearGradient>
        </Defs>
        <Rect x={cx - 5.5} y={wy - 1} width="11" height="8" rx="2" fill="url(#watchBandB)" />
        <Rect x={cx - 4.5} y={wy} width="9" height="6" rx="1.8" fill="#C8A840" />
        <Rect x={cx - 3.5} y={wy + 1} width="7" height="4" rx="1.2" fill="#1A1A28" />
        <Circle cx={cx} cy={wy + 3} r="0.6" fill="#C8A840" />
        <Path d={`M${cx} ${wy + 1.5} L${cx} ${wy + 3}`} stroke="#C8A840" strokeWidth="0.3" opacity={0.6} />
        <Path d={`M${cx - 1} ${wy + 3} L${cx} ${wy + 3}`} stroke="#C8A840" strokeWidth="0.3" opacity={0.5} />
      </G>
    );
  }

  if (style === "refined" || style === "sport_watch" || style === "premium_watch") {
    return (
      <G>
        <Defs>
          <LinearGradient id="watchBandR" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8A7040" />
            <Stop offset="0.5" stopColor="#6A5030" />
            <Stop offset="1" stopColor="#5A4020" />
          </LinearGradient>
        </Defs>
        <Rect x={cx - 6.5} y={wy - 2} width="2.2" height="12" rx="1" fill="url(#watchBandR)" />
        <Rect x={cx + 4.3} y={wy - 2} width="2.2" height="12" rx="1" fill="url(#watchBandR)" />
        <Rect x={cx - 5.5} y={wy - 1} width="11" height="10" rx="2.8" fill="#9A8050" />
        <Rect x={cx - 4.5} y={wy} width="9" height="8" rx="2.2" fill="#C8A840" />
        <Circle cx={cx} cy={wy + 4} r="3" fill="#0E0E1C" />
        <Circle cx={cx} cy={wy + 4} r="1.5" fill="#1A1A2C" />
        <Circle cx={cx} cy={wy + 4} r="0.5" fill="#C8A840" />
        <Path d={`M${cx} ${wy + 2} L${cx} ${wy + 4}`} stroke="#E8D060" strokeWidth="0.3" opacity={0.7} />
        <Path d={`M${cx - 1.5} ${wy + 4} L${cx} ${wy + 4}`} stroke="#E8D060" strokeWidth="0.3" opacity={0.6} />
        <Circle cx={cx + 5} cy={wy + 3} r="0.8" fill="#B09040" />
      </G>
    );
  }

  return (
    <G>
      <Defs>
        <LinearGradient id="watchBandE" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#6A5030" />
          <Stop offset="0.5" stopColor="#5A4020" />
          <Stop offset="1" stopColor="#4A3018" />
        </LinearGradient>
      </Defs>
      <Rect x={cx - 7} y={wy - 3} width="2.5" height="14" rx="1" fill="url(#watchBandE)" />
      <Rect x={cx + 4.5} y={wy - 3} width="2.5" height="14" rx="1" fill="url(#watchBandE)" />
      <Circle cx={cx} cy={wy + 4} r="6.5" fill="#9A8040" />
      <Circle cx={cx} cy={wy + 4} r="5.5" fill="#C8A840" />
      <Circle cx={cx} cy={wy + 4} r="4.5" fill="#0A0A18" />
      <Circle cx={cx} cy={wy + 4} r="2.2" fill="#C8A840" opacity={0.15} />
      <Circle cx={cx} cy={wy + 4} r="0.8" fill="#E8E8F0" />
      <Path d={`M${cx} ${wy + 1} L${cx} ${wy + 4}`} stroke="#E8D870" strokeWidth="0.4" opacity={0.8} />
      <Path d={`M${cx - 2.5} ${wy + 4} L${cx} ${wy + 4}`} stroke="#E8D870" strokeWidth="0.35" opacity={0.7} />
      <Path d={`M${cx} ${wy + 4} L${cx + 1} ${wy + 5.5}`} stroke="#C0A030" strokeWidth="0.25" opacity={0.5} />
      <Circle cx={cx + 6} cy={wy + 2.5} r="0.7" fill="#B09040" />
      <Circle cx={cx + 6} cy={wy + 5.5} r="0.5" fill="#B09040" />
    </G>
  );
}

export const WatchLayer = memo(WatchLayerInner);

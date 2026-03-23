import React from "react";
import Svg, { Circle, Ellipse, Rect, Path, G, Line, Defs, LinearGradient, Stop } from "react-native-svg";

type VisualProps = { colorVariant?: string; size?: number };
const S = 160;

function StarterTimepieceSVG({ colorVariant = "#F0F0F0", size = S }: VisualProps) {
  const dial = colorVariant;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Rect x="68" y="20" width="24" height="16" rx="3" fill="#3A3A4A" />
      <Rect x="68" y="124" width="24" height="16" rx="3" fill="#3A3A4A" />
      <Circle cx="80" cy="80" r="48" fill="#4A4A5A" />
      <Circle cx="80" cy="80" r="44" fill="#2A2A3A" />
      <Circle cx="80" cy="80" r="40" fill={dial} opacity={0.15} />
      <Circle cx="80" cy="80" r="40" fill="#1A1A28" />
      <Line x1="80" y1="44" x2="80" y2="50" stroke={dial} strokeWidth="2" strokeLinecap="round" />
      <Line x1="80" y1="110" x2="80" y2="116" stroke={dial} strokeWidth="2" strokeLinecap="round" />
      <Line x1="44" y1="80" x2="50" y2="80" stroke={dial} strokeWidth="2" strokeLinecap="round" />
      <Line x1="110" y1="80" x2="116" y2="80" stroke={dial} strokeWidth="2" strokeLinecap="round" />
      <Line x1="80" y1="80" x2="80" y2="56" stroke={dial} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="80" y1="80" x2="96" y2="80" stroke={dial} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="80" cy="80" r="3" fill={dial} />
      <Rect x="126" y="74" width="8" height="12" rx="2" fill="#4A4A5A" />
    </Svg>
  );
}

function ChronoSportSVG({ colorVariant = "#F0F0F0", size = S }: VisualProps) {
  const dial = colorVariant;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Rect x="66" y="16" width="28" height="18" rx="4" fill="#3A3A4A" />
      <Rect x="66" y="126" width="28" height="18" rx="4" fill="#3A3A4A" />
      <Circle cx="80" cy="80" r="52" fill="#4A4A5A" />
      <Circle cx="80" cy="80" r="48" fill="#2A2A3A" />
      <Circle cx="80" cy="80" r="44" fill="#1A1A28" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const r = 40;
        const x1 = 80 + r * Math.cos((deg * Math.PI) / 180);
        const y1 = 80 + r * Math.sin((deg * Math.PI) / 180);
        const x2 = 80 + (r - 5) * Math.cos((deg * Math.PI) / 180);
        const y2 = 80 + (r - 5) * Math.sin((deg * Math.PI) / 180);
        return <Line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={dial} strokeWidth="1.5" strokeLinecap="round" />;
      })}
      <Circle cx="80" cy="65" r="8" fill="none" stroke={dial} strokeWidth="1" opacity={0.6} />
      <Circle cx="68" cy="80" r="7" fill="none" stroke={dial} strokeWidth="1" opacity={0.6} />
      <Circle cx="92" cy="80" r="7" fill="none" stroke={dial} strokeWidth="1" opacity={0.6} />
      <Line x1="80" y1="80" x2="80" y2="52" stroke={dial} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="80" y1="80" x2="100" y2="80" stroke={dial} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="80" cy="80" r="3" fill={dial} />
      <Rect x="130" y="72" width="8" height="8" rx="2" fill="#4A4A5A" />
      <Rect x="130" y="82" width="8" height="8" rx="2" fill="#4A4A5A" />
    </Svg>
  );
}

function MinerBlackSVG({ colorVariant = "#1A1A1A", size = S }: VisualProps) {
  const dial = colorVariant;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Rect x="64" y="14" width="32" height="20" rx="4" fill="#2A2A3A" />
      <Rect x="64" y="126" width="32" height="20" rx="4" fill="#2A2A3A" />
      <Circle cx="80" cy="80" r="54" fill="#3A3A4A" />
      <Circle cx="80" cy="80" r="50" fill="#2A2A36" />
      <Circle cx="80" cy="80" r="46" fill={dial} opacity={0.3} />
      <Circle cx="80" cy="80" r="46" fill="#0E0E1A" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const r = 42;
        const len = deg % 90 === 0 ? 8 : 4;
        const x1 = 80 + r * Math.cos((deg * Math.PI) / 180);
        const y1 = 80 + r * Math.sin((deg * Math.PI) / 180);
        const x2 = 80 + (r - len) * Math.cos((deg * Math.PI) / 180);
        const y2 = 80 + (r - len) * Math.sin((deg * Math.PI) / 180);
        return <Line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={dial === "#1A1A1A" ? "#4A4A5A" : dial} strokeWidth={deg % 90 === 0 ? "2.5" : "1.5"} strokeLinecap="round" />;
      })}
      <Circle cx="80" cy="80" r="4" fill="#00E676" opacity={0.8} />
      <Line x1="80" y1="80" x2="80" y2="48" stroke="#E0E0E0" strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="80" y1="80" x2="102" y2="74" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round" />
      <Rect x="132" y="74" width="10" height="12" rx="3" fill="#3A3A4A" />
      <Ellipse cx="80" cy="106" rx="16" ry="6" fill="none" stroke="#00E676" strokeWidth="1" opacity={0.3} />
    </Svg>
  );
}

function RoyalSeriesSVG({ colorVariant = "#C0C0C0", size = S }: VisualProps) {
  const dial = colorVariant;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Path d="M60 22 L100 22 L108 30 L108 130 L100 138 L60 138 L52 130 L52 30 Z" fill="#5A5A6A" />
      <Path d="M62 26 L98 26 L104 32 L104 128 L98 134 L62 134 L56 128 L56 32 Z" fill="#3A3A4A" />
      <Path d="M64 30 L96 30 L100 34 L100 126 L96 130 L64 130 L60 126 L60 34 Z" fill="#1A1A28" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const r = 34;
        const len = deg % 90 === 0 ? 7 : 3;
        const x1 = 80 + r * Math.cos((deg * Math.PI) / 180);
        const y1 = 80 + r * Math.sin((deg * Math.PI) / 180);
        const x2 = 80 + (r - len) * Math.cos((deg * Math.PI) / 180);
        const y2 = 80 + (r - len) * Math.sin((deg * Math.PI) / 180);
        return <Line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke={dial} strokeWidth="1.5" strokeLinecap="round" />;
      })}
      <Line x1="80" y1="80" x2="80" y2="54" stroke={dial} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="80" y1="80" x2="98" y2="80" stroke={dial} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="80" cy="80" r="3" fill={dial} />
      <Rect x="108" y="74" width="8" height="12" rx="2" fill="#5A5A6A" />
    </Svg>
  );
}

function GenevePerpetualSVG({ colorVariant = "#F5F5F0", size = S }: VisualProps) {
  const dial = colorVariant;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Rect x="70" y="18" width="20" height="14" rx="3" fill="#8A7040" />
      <Rect x="70" y="128" width="20" height="14" rx="3" fill="#8A7040" />
      <Circle cx="80" cy="80" r="50" fill="#B09060" />
      <Circle cx="80" cy="80" r="47" fill="#C0A070" />
      <Circle cx="80" cy="80" r="43" fill={dial} opacity={0.2} />
      <Circle cx="80" cy="80" r="43" fill="#F8F6F0" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const r = 38;
        const isMain = deg % 90 === 0;
        const len = isMain ? 8 : 3;
        const x1 = 80 + r * Math.cos((deg * Math.PI) / 180);
        const y1 = 80 + r * Math.sin((deg * Math.PI) / 180);
        const x2 = 80 + (r - len) * Math.cos((deg * Math.PI) / 180);
        const y2 = 80 + (r - len) * Math.sin((deg * Math.PI) / 180);
        return <Line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2A2A3A" strokeWidth={isMain ? "2" : "1"} strokeLinecap="round" />;
      })}
      <Line x1="80" y1="80" x2="80" y2="50" stroke="#1A1A28" strokeWidth="2" strokeLinecap="round" />
      <Line x1="80" y1="80" x2="100" y2="76" stroke="#1A1A28" strokeWidth="1.5" strokeLinecap="round" />
      <Circle cx="80" cy="80" r="2.5" fill="#B09060" />
      <Rect x="128" y="76" width="6" height="8" rx="2" fill="#B09060" />
    </Svg>
  );
}

function CarbonRMSVG({ colorVariant = "#2C2C2C", size = S }: VisualProps) {
  const accent = colorVariant === "#2C2C2C" ? "#FF6D00" : colorVariant;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Rect x="60" y="18" width="40" height="16" rx="4" fill="#1A1A1A" />
      <Rect x="60" y="126" width="40" height="16" rx="4" fill="#1A1A1A" />
      <Path d="M56 30 L104 30 Q114 30 114 40 L114 120 Q114 130 104 130 L56 130 Q46 130 46 120 L46 40 Q46 30 56 30 Z" fill="#2C2C2C" />
      <Path d="M58 34 L102 34 Q110 34 110 42 L110 118 Q110 126 102 126 L58 126 Q50 126 50 118 L50 42 Q50 34 58 34 Z" fill="#1A1A1A" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <G key={`tex${i}`}>
          <Line x1={54 + i * 10} y1="38" x2={54 + i * 10} y2="122" stroke="#2A2A2A" strokeWidth="0.5" />
          <Line x1="54" y1={38 + i * 17} x2="106" y2={38 + i * 17} stroke="#2A2A2A" strokeWidth="0.5" />
        </G>
      ))}
      <Circle cx="80" cy="80" r="32" fill="none" stroke={accent} strokeWidth="1" opacity={0.4} />
      <Line x1="80" y1="80" x2="80" y2="54" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
      <Line x1="80" y1="80" x2="100" y2="80" stroke={accent} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="80" cy="80" r="4" fill="none" stroke={accent} strokeWidth="1.5" />
      <Circle cx="80" cy="80" r="2" fill={accent} />
      <Rect x="112" y="72" width="8" height="8" rx="2" fill="#3A3A3A" />
      <Rect x="112" y="82" width="8" height="8" rx="2" fill="#3A3A3A" />
    </Svg>
  );
}

function StarterWhiteShirtSVG({ colorVariant = "#F0F0F0", size = S }: VisualProps) {
  const main = colorVariant;
  const shadow = `${main}CC`;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Path d="M40 50 L56 40 L80 48 L104 40 L120 50 L130 70 L116 74 L112 58 L112 140 L48 140 L48 58 L44 74 L30 70 Z" fill={main} />
      <Path d="M48 58 L48 140 L80 140 L80 48 L56 40 L40 50 L44 74 L48 58 Z" fill={shadow} opacity={0.15} />
      <Line x1="80" y1="48" x2="80" y2="140" stroke={shadow} strokeWidth="1" opacity={0.3} />
      <Circle cx="80" cy="62" r="2" fill={shadow} opacity={0.3} />
      <Circle cx="80" cy="78" r="2" fill={shadow} opacity={0.3} />
      <Circle cx="80" cy="94" r="2" fill={shadow} opacity={0.3} />
      <Path d="M68 40 L80 52 L92 40" stroke={shadow} strokeWidth="1.5" fill="none" opacity={0.3} />
    </Svg>
  );
}

function PremiumHoodieSVG({ colorVariant = "#1A1A1A", size = S }: VisualProps) {
  const main = colorVariant;
  const lighter = `${main}CC`;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Path d="M36 60 L50 42 L80 50 L110 42 L124 60 L130 80 L120 82 L118 68 L118 142 L42 142 L42 68 L40 82 L30 80 Z" fill={main} />
      <Ellipse cx="80" cy="38" rx="20" ry="14" fill={main} />
      <Ellipse cx="80" cy="38" rx="14" ry="10" fill="none" stroke={lighter} strokeWidth="1" opacity={0.3} />
      <Path d="M68 80 Q80 100 92 80" fill="none" stroke={lighter} strokeWidth="1.5" opacity={0.3} />
      <Rect x="62" y="80" width="36" height="28" rx="6" fill={lighter} opacity={0.1} />
      <Line x1="80" y1="80" x2="80" y2="108" stroke={lighter} strokeWidth="1" opacity={0.15} />
      <Path d="M42 68 L42 82 Q42 94 48 98" stroke={lighter} strokeWidth="8" strokeLinecap="round" fill="none" opacity={0.1} />
      <Path d="M118 68 L118 82 Q118 94 112 98" stroke={lighter} strokeWidth="8" strokeLinecap="round" fill="none" opacity={0.1} />
    </Svg>
  );
}

function SilkBusinessShirtSVG({ colorVariant = "#F8F8FF", size = S }: VisualProps) {
  const main = colorVariant;
  const shadow = "#00000015";
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Path d="M38 52 L54 38 L80 46 L106 38 L122 52 L132 72 L118 76 L114 56 L114 142 L46 142 L46 56 L42 76 L28 72 Z" fill={main} />
      <Path d="M46 56 L46 142 L80 142 L80 46 L54 38 L38 52 L42 76 L46 56 Z" fill={shadow} />
      <Line x1="80" y1="46" x2="80" y2="142" stroke={shadow} strokeWidth="1.5" />
      <Circle cx="80" cy="60" r="2" fill={shadow} />
      <Circle cx="80" cy="76" r="2" fill={shadow} />
      <Circle cx="80" cy="92" r="2" fill={shadow} />
      <Circle cx="80" cy="108" r="2" fill={shadow} />
      <Path d="M66 38 L80 54 L94 38" stroke={shadow} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M58 46 L54 56" stroke={shadow} strokeWidth="1" />
      <Path d="M102 46 L106 56" stroke={shadow} strokeWidth="1" />
    </Svg>
  );
}

function MilanoCashmereCoatSVG({ colorVariant = "#C19A6B", size = S }: VisualProps) {
  const main = colorVariant;
  const shadow = "#00000020";
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Path d="M32 54 L50 36 L80 44 L110 36 L128 54 L136 78 L126 80 L122 62 L122 148 L38 148 L38 62 L34 80 L24 78 Z" fill={main} />
      <Path d="M38 62 L38 148 L80 148 L80 44 L50 36 L32 54 L34 80 L38 62 Z" fill={shadow} />
      <Line x1="80" y1="44" x2="80" y2="148" stroke={shadow} strokeWidth="2" />
      <Path d="M64 36 L80 56 L96 36" stroke={shadow} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Rect x="56" y="90" width="20" height="26" rx="4" fill={shadow} />
      <Rect x="84" y="90" width="20" height="26" rx="4" fill={shadow} />
      <Line x1="38" y1="148" x2="42" y2="148" stroke={shadow} strokeWidth="3" />
      <Line x1="118" y1="148" x2="122" y2="148" stroke={shadow} strokeWidth="3" />
    </Svg>
  );
}

function ExecutiveSuitSVG({ colorVariant = "#0D1B2A", size = S }: VisualProps) {
  const main = colorVariant;
  const lapel = "#1A2A3A";
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Path d="M32 54 L52 36 L80 44 L108 36 L128 54 L136 78 L124 80 L120 60 L120 148 L40 148 L40 60 L36 80 L24 78 Z" fill={main} />
      <Path d="M40 60 L40 148 L80 148 L80 44 L52 36 L32 54 L36 80 L40 60 Z" fill="#00000010" />
      <Path d="M64 36 L80 70 L80 148" stroke="#FFFFFF08" strokeWidth="1.5" fill="none" />
      <Path d="M96 36 L80 70" stroke="#FFFFFF08" strokeWidth="1.5" fill="none" />
      <Path d="M60 40 L74 80" stroke={lapel} strokeWidth="3" strokeLinecap="round" fill="none" />
      <Path d="M100 40 L86 80" stroke={lapel} strokeWidth="3" strokeLinecap="round" fill="none" />
      <Rect x="76" y="82" width="8" height="4" rx="1" fill="#FFFFFF15" />
      <Rect x="76" y="90" width="8" height="4" rx="1" fill="#FFFFFF15" />
      <Rect x="56" y="92" width="18" height="24" rx="3" fill="#00000015" />
    </Svg>
  );
}

function DarkDenimSVG({ colorVariant = "#1A1A1A", size = S }: VisualProps) {
  const main = colorVariant;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Rect x="36" y="24" width="88" height="16" rx="3" fill="#3A3A4A" />
      <Rect x="72" y="24" width="16" height="16" rx="2" fill="#5A5A6A" />
      <Rect x="76" y="28" width="8" height="8" rx="1" fill="#4A4A5A" />
      <Rect x="36" y="38" width="40" height="100" rx="4" fill={main} />
      <Rect x="84" y="38" width="40" height="100" rx="4" fill={main} />
      <Rect x="74" y="38" width="12" height="20" rx="0" fill={main} opacity={0.8} />
      <Line x1="56" y1="50" x2="56" y2="138" stroke="#FFFFFF08" strokeWidth="1" />
      <Line x1="104" y1="50" x2="104" y2="138" stroke="#FFFFFF08" strokeWidth="1" />
      <Rect x="46" y="52" width="14" height="18" rx="2" fill="#FFFFFF06" />
      <Rect x="100" y="52" width="14" height="18" rx="2" fill="#FFFFFF06" />
      <Line x1="80" y1="42" x2="80" y2="56" stroke="#FFFFFF08" strokeWidth="1" />
    </Svg>
  );
}

function TechnicalSlimTrouserSVG({ colorVariant = "#0D1B2A", size = S }: VisualProps) {
  const main = colorVariant;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Rect x="38" y="22" width="84" height="14" rx="3" fill="#4A4A5A" />
      <Rect x="72" y="22" width="16" height="14" rx="2" fill="#6A6A7A" />
      <Rect x="76" y="25" width="8" height="8" rx="1" fill="#5A5A6A" />
      <Rect x="38" y="34" width="38" height="104" rx="3" fill={main} />
      <Rect x="84" y="34" width="38" height="104" rx="3" fill={main} />
      <Rect x="74" y="34" width="12" height="18" rx="0" fill={main} opacity={0.8} />
      <Line x1="56" y1="50" x2="56" y2="138" stroke="#FFFFFF06" strokeWidth="1.5" />
      <Line x1="104" y1="50" x2="104" y2="138" stroke="#FFFFFF06" strokeWidth="1.5" />
      <Rect x="38" y="134" width="38" height="4" rx="1" fill="#FFFFFF08" />
      <Rect x="84" y="134" width="38" height="4" rx="1" fill="#FFFFFF08" />
    </Svg>
  );
}

function LeatherBifoldSVG({ colorVariant = "#1A1A1A", size = S }: VisualProps) {
  const main = colorVariant;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Rect x="28" y="40" width="104" height="80" rx="6" fill={main} />
      <Rect x="28" y="40" width="104" height="80" rx="6" fill="#FFFFFF08" />
      <Line x1="80" y1="40" x2="80" y2="120" stroke="#FFFFFF10" strokeWidth="1" />
      <Rect x="34" y="50" width="40" height="6" rx="2" fill="#FFFFFF10" />
      <Rect x="34" y="62" width="40" height="6" rx="2" fill="#FFFFFF08" />
      <Rect x="34" y="74" width="40" height="6" rx="2" fill="#FFFFFF06" />
      <Rect x="86" y="50" width="40" height="26" rx="3" fill="#FFFFFF08" />
      <Rect x="86" y="82" width="40" height="10" rx="2" fill="#FFFFFF06" />
      <Line x1="28" y1="80" x2="80" y2="80" stroke="#00000020" strokeWidth="1.5" />
    </Svg>
  );
}

function CarbonFiberCardCaseSVG({ colorVariant = "#2C2C2C", size = S }: VisualProps) {
  const main = colorVariant;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Rect x="30" y="44" width="100" height="72" rx="8" fill={main} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
        <G key={`cf${i}`}>
          <Line x1={30 + i * 10} y1="44" x2={30 + i * 10} y2="116" stroke="#FFFFFF06" strokeWidth="0.5" />
          <Line x1="30" y1={44 + i * 7.2} x2="130" y2={44 + i * 7.2} stroke="#FFFFFF06" strokeWidth="0.5" />
        </G>
      ))}
      <Rect x="38" y="52" width="40" height="4" rx="1.5" fill="#FFFFFF12" />
      <Rect x="38" y="62" width="28" height="3" rx="1" fill="#FFFFFF08" />
      <Rect x="100" y="98" width="22" height="10" rx="3" fill="#FFFFFF10" />
    </Svg>
  );
}

function SilkPocketSquareSVG({ colorVariant = "#0D1B2A", size = S }: VisualProps) {
  const main = colorVariant;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Path d="M40 120 L80 40 L120 120 Z" fill={main} />
      <Path d="M40 120 L80 40 L80 120 Z" fill="#FFFFFF08" />
      <Path d="M52 110 L80 54 L108 110" fill="none" stroke="#FFFFFF12" strokeWidth="1" />
      <Path d="M60 104 L80 66 L100 104" fill="none" stroke="#FFFFFF08" strokeWidth="0.8" />
      <Line x1="40" y1="120" x2="120" y2="120" stroke="#FFFFFF15" strokeWidth="1.5" />
    </Svg>
  );
}

function TitaniumRingSVG({ colorVariant = "#8A8A8A", size = S }: VisualProps) {
  const main = colorVariant;
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Ellipse cx="80" cy="80" rx="44" ry="50" fill={main} />
      <Ellipse cx="80" cy="80" rx="32" ry="38" fill="#0A0A0F" />
      <Ellipse cx="80" cy="80" rx="44" ry="50" fill="none" stroke="#FFFFFF20" strokeWidth="1" />
      <Ellipse cx="80" cy="80" rx="32" ry="38" fill="none" stroke="#FFFFFF10" strokeWidth="1" />
      <Path d="M36 80 Q80 60 124 80" fill="none" stroke="#FFFFFF15" strokeWidth="2" />
      <Ellipse cx="80" cy="70" rx="6" ry="2" fill="#FFFFFF20" />
    </Svg>
  );
}

export const ITEM_SVG_MAP: Record<string, React.FC<VisualProps>> = {
  "starter-timepiece": StarterTimepieceSVG,
  "chrono-sport-38": ChronoSportSVG,
  "mariner-black-40": MinerBlackSVG,
  "royal-series-41": RoyalSeriesSVG,
  "geneve-perpetual": GenevePerpetualSVG,
  "carbon-rm-series": CarbonRMSVG,
  "starter-white-shirt": StarterWhiteShirtSVG,
  "premium-hoodie-s1": PremiumHoodieSVG,
  "silk-business-shirt": SilkBusinessShirtSVG,
  "milano-cashmere-coat": MilanoCashmereCoatSVG,
  "executive-suit-midnight": ExecutiveSuitSVG,
  "dark-denim-premium": DarkDenimSVG,
  "technical-slim-trouser": TechnicalSlimTrouserSVG,
  "leather-bifold-milano": LeatherBifoldSVG,
  "carbon-fiber-card-case": CarbonFiberCardCaseSVG,
  "silk-pocket-square": SilkPocketSquareSVG,
  "titanium-ring-zero": TitaniumRingSVG,
};

export function ItemVisual({ slug, colorVariant, size = 120 }: { slug: string; colorVariant?: string; size?: number }) {
  const Component = ITEM_SVG_MAP[slug];
  if (!Component) {
    return (
      <Svg width={size} height={size} viewBox="0 0 160 160">
        <Rect x="30" y="30" width="100" height="100" rx="16" fill="#2A2A3A" />
        <Line x1="60" y1="60" x2="100" y2="100" stroke="#4A4A5A" strokeWidth="2" />
        <Line x1="100" y1="60" x2="60" y2="100" stroke="#4A4A5A" strokeWidth="2" />
      </Svg>
    );
  }
  return <Component colorVariant={colorVariant} size={size} />;
}

export {
  StarterTimepieceSVG, ChronoSportSVG, MinerBlackSVG, RoyalSeriesSVG,
  GenevePerpetualSVG, CarbonRMSVG, StarterWhiteShirtSVG, PremiumHoodieSVG,
  SilkBusinessShirtSVG, MilanoCashmereCoatSVG, ExecutiveSuitSVG, DarkDenimSVG,
  TechnicalSlimTrouserSVG, LeatherBifoldSVG, CarbonFiberCardCaseSVG,
  SilkPocketSquareSVG, TitaniumRingSVG,
};

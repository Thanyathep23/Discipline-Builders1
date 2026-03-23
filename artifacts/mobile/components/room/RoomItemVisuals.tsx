import React from "react";
import Svg, { Rect, Path, Circle, Ellipse, G, Line, Defs, LinearGradient, Stop } from "react-native-svg";

const ZONE_COLORS = {
  desk: { primary: "#5A7A9A", secondary: "#3D5A7A", accent: "#8AACC0" },
  coffee: { primary: "#8B6914", secondary: "#6B4E10", accent: "#C9A43C" },
  monitor: { primary: "#2A3A4A", secondary: "#1A2A3A", accent: "#4A8AC0" },
  bookshelf: { primary: "#6B4226", secondary: "#4A2E1A", accent: "#9C7050" },
  speaker: { primary: "#3A3A3A", secondary: "#1A1A1A", accent: "#6A6A6A" },
  plant: { primary: "#2E7D32", secondary: "#1B5E20", accent: "#66BB6A" },
  trophy: { primary: "#F5C842", secondary: "#D4A017", accent: "#FFD700" },
  lighting: { primary: "#FFD54F", secondary: "#FFCA28", accent: "#FFF176" },
};

export function MinimalDeskSVG({ width = 120, height = 70 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 70">
      <Rect x="10" y="8" width="100" height="4" rx="1" fill={ZONE_COLORS.desk.primary} />
      <Rect x="15" y="12" width="3" height="50" rx="1" fill={ZONE_COLORS.desk.secondary} />
      <Rect x="102" y="12" width="3" height="50" rx="1" fill={ZONE_COLORS.desk.secondary} />
      <Rect x="8" y="58" width="20" height="3" rx="1" fill={ZONE_COLORS.desk.secondary} />
      <Rect x="92" y="58" width="20" height="3" rx="1" fill={ZONE_COLORS.desk.secondary} />
      <Rect x="40" y="2" width="16" height="4" rx="1" fill={ZONE_COLORS.desk.accent} opacity="0.5" />
      <Circle cx="78" cy="4" r="2" fill={ZONE_COLORS.desk.accent} opacity="0.4" />
    </Svg>
  );
}

export function PremiumOakDeskSVG({ width = 120, height = 70 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 70">
      <Defs>
        <LinearGradient id="oakGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8B6914" />
          <Stop offset="1" stopColor="#6B4E10" />
        </LinearGradient>
      </Defs>
      <Rect x="8" y="6" width="104" height="6" rx="2" fill="url(#oakGrad)" />
      <Rect x="12" y="12" width="4" height="48" rx="1" fill="#6B4E10" />
      <Rect x="104" y="12" width="4" height="48" rx="1" fill="#6B4E10" />
      <Rect x="12" y="30" width="96" height="3" rx="1" fill="#5A3E0E" opacity="0.5" />
      <Rect x="6" y="56" width="24" height="4" rx="1" fill="#5A3E0E" />
      <Rect x="90" y="56" width="24" height="4" rx="1" fill="#5A3E0E" />
      <Rect x="35" y="1" width="20" height="3" rx="1" fill={ZONE_COLORS.desk.accent} opacity="0.3" />
      <Rect x="62" y="1" width="12" height="3" rx="1" fill="#C0C0C0" opacity="0.3" />
    </Svg>
  );
}

export function ExecutiveCarbonDeskSVG({ width = 120, height = 70 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 70">
      <Defs>
        <LinearGradient id="carbonGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2C2C2C" />
          <Stop offset="1" stopColor="#1A1A1A" />
        </LinearGradient>
      </Defs>
      <Rect x="5" y="5" width="110" height="7" rx="2" fill="url(#carbonGrad)" />
      <Rect x="55" y="12" width="10" height="46" rx="2" fill="#252525" />
      <Rect x="30" y="54" width="60" height="4" rx="2" fill="#1E1E1E" />
      <Rect x="25" y="58" width="70" height="3" rx="1" fill="#2A2A2A" />
      <Line x1="10" y1="8" x2="110" y2="8" stroke="#4A4A4A" strokeWidth="0.5" opacity="0.3" />
      <Rect x="30" y="1" width="24" height="3" rx="1" fill="#4A8AC0" opacity="0.4" />
      <Circle cx="70" cy="2.5" r="1.5" fill="#4A8AC0" opacity="0.4" />
      <Circle cx="80" cy="2.5" r="1" fill="#FF7043" opacity="0.3" />
    </Svg>
  );
}

export function EspressoMachineSVG({ width = 60, height = 80 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 60 80">
      <Rect x="10" y="10" width="40" height="50" rx="4" fill="#3A3A3A" />
      <Rect x="14" y="14" width="32" height="12" rx="2" fill="#2A2A2A" />
      <Circle cx="30" cy="20" r="4" fill="#4A4A4A" stroke="#5A5A5A" strokeWidth="0.5" />
      <Rect x="18" y="32" width="24" height="3" rx="1" fill="#5A5A5A" />
      <Rect x="22" y="40" width="6" height="14" rx="1" fill="#6A6A6A" />
      <Rect x="32" y="40" width="6" height="14" rx="1" fill="#6A6A6A" />
      <Rect x="20" y="56" width="20" height="2" rx="1" fill="#4A4A4A" />
      <Rect x="8" y="60" width="44" height="6" rx="2" fill="#2A2A2A" />
      <Circle cx="44" cy="17" r="2" fill={ZONE_COLORS.coffee.accent} opacity="0.6" />
      <Rect x="5" y="66" width="50" height="4" rx="1" fill="#1E1E1E" />
    </Svg>
  );
}

export function PourOverSetSVG({ width = 60, height = 80 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 60 80">
      <Rect x="20" y="50" width="20" height="22" rx="3" fill="#8B6914" opacity="0.7" />
      <Path d="M24 50 L30 20 L36 50" fill="none" stroke="#C9A43C" strokeWidth="1.5" />
      <Ellipse cx="30" cy="18" rx="8" ry="4" fill="none" stroke="#C9A43C" strokeWidth="1" />
      <Circle cx="30" cy="18" r="3" fill="#6B4E10" opacity="0.4" />
      <Rect x="18" y="72" width="24" height="3" rx="1" fill="#4A3A2A" />
      <Line x1="30" y1="50" x2="30" y2="55" stroke="#6B4E10" strokeWidth="1" opacity="0.5" />
      <Path d="M40 60 Q46 62 44 66" fill="none" stroke="#8B6914" strokeWidth="1.5" />
      <Rect x="8" y="10" width="14" height="18" rx="2" fill="#3A3A3A" opacity="0.5" />
      <Circle cx="15" cy="19" r="3" fill="#4A4A4A" opacity="0.4" />
    </Svg>
  );
}

export function DualMonitorSVG({ width = 120, height = 70 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 70">
      <Rect x="5" y="5" width="50" height="34" rx="3" fill="#1A2A3A" stroke="#3A4A5A" strokeWidth="1" />
      <Rect x="8" y="8" width="44" height="28" rx="1" fill="#0A1520" />
      <Rect x="65" y="5" width="50" height="34" rx="3" fill="#1A2A3A" stroke="#3A4A5A" strokeWidth="1" />
      <Rect x="68" y="8" width="44" height="28" rx="1" fill="#0A1520" />
      <Rect x="25" y="39" width="10" height="8" rx="1" fill="#2A3A4A" />
      <Rect x="85" y="39" width="10" height="8" rx="1" fill="#2A3A4A" />
      <Rect x="20" y="47" width="20" height="3" rx="1" fill="#3A4A5A" />
      <Rect x="80" y="47" width="20" height="3" rx="1" fill="#3A4A5A" />
      <Circle cx="30" cy="10" r="1" fill="#4A8AC0" opacity="0.6" />
      <Circle cx="90" cy="10" r="1" fill="#4A8AC0" opacity="0.6" />
      <Rect x="10" y="55" width="100" height="4" rx="1" fill="#2A3540" opacity="0.3" />
    </Svg>
  );
}

export function UltrawideMonitorSVG({ width = 120, height = 60 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 60">
      <Rect x="5" y="3" width="110" height="38" rx="3" fill="#1A2A3A" stroke="#3A5070" strokeWidth="1" />
      <Rect x="8" y="6" width="104" height="32" rx="1" fill="#0A1520" />
      <Rect x="52" y="41" width="16" height="6" rx="1" fill="#2A3A4A" />
      <Rect x="40" y="47" width="40" height="3" rx="1" fill="#3A4A5A" />
      <Line x1="60" y1="6" x2="60" y2="38" stroke="#1A2A3A" strokeWidth="0.5" opacity="0.3" />
      <Circle cx="60" cy="5" r="1" fill="#4A8AC0" opacity="0.6" />
      <Rect x="10" y="8" width="48" height="3" rx="1" fill="#162030" opacity="0.8" />
      <Rect x="62" y="8" width="48" height="3" rx="1" fill="#162030" opacity="0.8" />
    </Svg>
  );
}

export function TradingTerminalSVG({ width = 120, height = 70 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 70">
      <Rect x="2" y="3" width="36" height="28" rx="2" fill="#1A2A3A" stroke="#2A4060" strokeWidth="0.8" />
      <Rect x="42" y="3" width="36" height="28" rx="2" fill="#1A2A3A" stroke="#2A4060" strokeWidth="0.8" />
      <Rect x="82" y="3" width="36" height="28" rx="2" fill="#1A2A3A" stroke="#2A4060" strokeWidth="0.8" />
      <Rect x="2" y="33" width="36" height="28" rx="2" fill="#1A2A3A" stroke="#2A4060" strokeWidth="0.8" />
      <Rect x="42" y="33" width="36" height="28" rx="2" fill="#1A2A3A" stroke="#2A4060" strokeWidth="0.8" />
      <Rect x="82" y="33" width="36" height="28" rx="2" fill="#1A2A3A" stroke="#2A4060" strokeWidth="0.8" />
      <Path d="M8 20 L14 15 L20 18 L26 12 L32 14" fill="none" stroke="#00E676" strokeWidth="1" opacity="0.7" />
      <Path d="M48 20 L54 22 L60 16 L66 19 L72 13" fill="none" stroke="#FF3D71" strokeWidth="1" opacity="0.7" />
      <Path d="M88 18 L94 14 L100 17 L106 11 L112 15" fill="none" stroke="#4A8AC0" strokeWidth="1" opacity="0.7" />
      <Rect x="5" y="36" width="30" height="2" rx="0.5" fill="#162030" />
      <Rect x="5" y="40" width="20" height="2" rx="0.5" fill="#162030" />
      <Rect x="45" y="36" width="30" height="2" rx="0.5" fill="#162030" />
      <Rect x="85" y="36" width="30" height="2" rx="0.5" fill="#162030" />
    </Svg>
  );
}

export function MinimalBookshelfSVG({ width = 50, height = 90 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 50 90">
      <Rect x="5" y="5" width="40" height="80" rx="2" fill="#4A2E1A" />
      <Rect x="5" y="25" width="40" height="2" fill="#3A2010" />
      <Rect x="5" y="50" width="40" height="2" fill="#3A2010" />
      <Rect x="5" y="70" width="40" height="2" fill="#3A2010" />
      <Rect x="10" y="8" width="5" height="16" rx="1" fill="#2196F3" opacity="0.6" />
      <Rect x="16" y="10" width="4" height="14" rx="1" fill="#4CAF50" opacity="0.6" />
      <Rect x="22" y="9" width="5" height="15" rx="1" fill="#FF7043" opacity="0.5" />
      <Rect x="29" y="11" width="4" height="13" rx="1" fill="#9C27B0" opacity="0.5" />
      <Rect x="10" y="28" width="6" height="20" rx="1" fill="#F5C842" opacity="0.5" />
      <Rect x="18" y="30" width="4" height="18" rx="1" fill="#2196F3" opacity="0.5" />
      <Rect x="24" y="29" width="5" height="19" rx="1" fill="#3A3A3A" opacity="0.5" />
      <Rect x="12" y="54" width="5" height="14" rx="1" fill="#4CAF50" opacity="0.5" />
      <Rect x="19" y="55" width="4" height="13" rx="1" fill="#FF7043" opacity="0.5" />
      <Rect x="25" y="53" width="6" height="15" rx="1" fill="#2196F3" opacity="0.5" />
      <Circle cx="14" cy="76" r="3" fill="#9C7050" opacity="0.5" />
      <Rect x="28" y="73" width="8" height="8" rx="1" fill="#5A3E0E" opacity="0.3" />
    </Svg>
  );
}

export function PremiumSpeakerSVG({ width = 80, height = 60 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 80 60">
      <Rect x="5" y="5" width="20" height="50" rx="3" fill="#2A2A2A" stroke="#3A3A3A" strokeWidth="0.5" />
      <Circle cx="15" cy="20" r="6" fill="#1A1A1A" stroke="#4A4A4A" strokeWidth="0.5" />
      <Circle cx="15" cy="20" r="2.5" fill="#3A3A3A" />
      <Circle cx="15" cy="38" r="4" fill="#1A1A1A" stroke="#4A4A4A" strokeWidth="0.5" />
      <Circle cx="15" cy="38" r="1.5" fill="#3A3A3A" />
      <Rect x="55" y="5" width="20" height="50" rx="3" fill="#2A2A2A" stroke="#3A3A3A" strokeWidth="0.5" />
      <Circle cx="65" cy="20" r="6" fill="#1A1A1A" stroke="#4A4A4A" strokeWidth="0.5" />
      <Circle cx="65" cy="20" r="2.5" fill="#3A3A3A" />
      <Circle cx="65" cy="38" r="4" fill="#1A1A1A" stroke="#4A4A4A" strokeWidth="0.5" />
      <Circle cx="65" cy="38" r="1.5" fill="#3A3A3A" />
      <Line x1="28" y1="30" x2="52" y2="30" stroke="#3A3A3A" strokeWidth="0.5" strokeDasharray="2,2" />
    </Svg>
  );
}

export function IndoorPlantSVG({ width = 50, height = 70 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 50 70">
      <Rect x="12" y="45" width="26" height="20" rx="3" fill="#6B4226" />
      <Rect x="14" y="47" width="22" height="16" rx="2" fill="#5A3518" />
      <Ellipse cx="25" cy="45" rx="14" ry="3" fill="#2E7D32" />
      <Path d="M25 45 Q20 30 12 25" fill="none" stroke="#388E3C" strokeWidth="2" />
      <Path d="M25 45 Q30 28 38 22" fill="none" stroke="#388E3C" strokeWidth="2" />
      <Path d="M25 45 Q25 30 25 18" fill="none" stroke="#43A047" strokeWidth="2" />
      <Ellipse cx="12" cy="24" rx="6" ry="4" fill="#66BB6A" opacity="0.8" />
      <Ellipse cx="38" cy="21" rx="5" ry="4" fill="#66BB6A" opacity="0.8" />
      <Ellipse cx="25" cy="17" rx="5" ry="3" fill="#81C784" opacity="0.8" />
      <Ellipse cx="18" cy="34" rx="4" ry="3" fill="#4CAF50" opacity="0.6" />
      <Ellipse cx="32" cy="32" rx="4" ry="3" fill="#4CAF50" opacity="0.6" />
    </Svg>
  );
}

export function TrophyDisplayCaseSVG({ width = 70, height = 80 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 70 80">
      <Rect x="5" y="5" width="60" height="70" rx="3" fill="#1E1E2E" stroke="#3A3A50" strokeWidth="1" />
      <Rect x="5" y="30" width="60" height="1.5" fill="#3A3A50" />
      <Rect x="5" y="55" width="60" height="1.5" fill="#3A3A50" />
      <Path d="M25 12 L25 8 L20 8 Q17 14 20 18 L25 18 Q22 15 22 12 Z" fill={ZONE_COLORS.trophy.primary} opacity="0.7" />
      <Path d="M25 12 L25 8 L30 8 Q33 14 30 18 L25 18 Q28 15 28 12 Z" fill={ZONE_COLORS.trophy.primary} opacity="0.7" />
      <Rect x="23" y="18" width="4" height="4" rx="0.5" fill={ZONE_COLORS.trophy.secondary} opacity="0.6" />
      <Circle cx="50" cy="15" r="5" fill="none" stroke={ZONE_COLORS.trophy.accent} strokeWidth="1" opacity="0.5" />
      <Circle cx="50" cy="15" r="2" fill={ZONE_COLORS.trophy.accent} opacity="0.3" />
      <Rect x="15" y="35" width="8" height="12" rx="1" fill="#9C27B0" opacity="0.4" />
      <Rect x="28" y="37" width="6" height="10" rx="1" fill="#2196F3" opacity="0.4" />
      <Circle cx="48" cy="42" r="5" fill="#FF7043" opacity="0.3" />
      <Rect x="20" y="60" width="10" height="8" rx="1" fill="#4CAF50" opacity="0.3" />
      <Rect x="38" y="58" width="12" height="10" rx="1" fill="#F5C842" opacity="0.3" />
    </Svg>
  );
}

export function LEDAmbientSVG({ width = 120, height = 30 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 30">
      <Rect x="5" y="10" width="110" height="4" rx="2" fill="#2A2A3A" />
      <Rect x="8" y="11" width="104" height="2" rx="1" fill={ZONE_COLORS.lighting.primary} opacity="0.8" />
      <Ellipse cx="60" cy="20" rx="50" ry="6" fill={ZONE_COLORS.lighting.primary} opacity="0.08" />
      <Ellipse cx="60" cy="18" rx="40" ry="4" fill={ZONE_COLORS.lighting.accent} opacity="0.06" />
      <Circle cx="20" cy="12" r="1.5" fill={ZONE_COLORS.lighting.accent} opacity="0.9" />
      <Circle cx="40" cy="12" r="1.5" fill={ZONE_COLORS.lighting.accent} opacity="0.9" />
      <Circle cx="60" cy="12" r="1.5" fill={ZONE_COLORS.lighting.accent} opacity="0.9" />
      <Circle cx="80" cy="12" r="1.5" fill={ZONE_COLORS.lighting.accent} opacity="0.9" />
      <Circle cx="100" cy="12" r="1.5" fill={ZONE_COLORS.lighting.accent} opacity="0.9" />
    </Svg>
  );
}

export function ArcFloorLampSVG({ width = 50, height = 90 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 50 90">
      <Ellipse cx="15" cy="85" rx="12" ry="3" fill="#2A2A2A" />
      <Line x1="15" y1="82" x2="15" y2="20" stroke="#4A4A4A" strokeWidth="2" />
      <Path d="M15 20 Q15 10 30 8" fill="none" stroke="#4A4A4A" strokeWidth="2" />
      <Ellipse cx="34" cy="8" rx="10" ry="5" fill="#3A3A3A" />
      <Ellipse cx="34" cy="14" rx="8" ry="2" fill={ZONE_COLORS.lighting.primary} opacity="0.15" />
      <Ellipse cx="34" cy="18" rx="12" ry="3" fill={ZONE_COLORS.lighting.primary} opacity="0.08" />
      <Circle cx="34" cy="10" r="2" fill={ZONE_COLORS.lighting.accent} opacity="0.5" />
    </Svg>
  );
}

export function DarkCommandThemeSVG({ width = 120, height = 30 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 30">
      <Rect x="0" y="0" width="120" height="30" rx="4" fill="#0A0A12" />
      <Rect x="2" y="2" width="116" height="26" rx="3" fill="#14141E" opacity="0.8" />
      <Line x1="10" y1="15" x2="110" y2="15" stroke="#2A2A3E" strokeWidth="0.5" />
      <Circle cx="20" cy="8" r="2" fill="#4A8AC0" opacity="0.3" />
      <Circle cx="60" cy="8" r="2" fill="#7C5CFC" opacity="0.3" />
      <Circle cx="100" cy="8" r="2" fill="#4A8AC0" opacity="0.3" />
    </Svg>
  );
}

export function ExecutiveSuiteThemeSVG({ width = 120, height = 30 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 30">
      <Rect x="0" y="0" width="120" height="30" rx="4" fill="#0F0E0A" />
      <Rect x="2" y="2" width="116" height="26" rx="3" fill="#2A2518" opacity="0.6" />
      <Line x1="10" y1="15" x2="110" y2="15" stroke="#3A3020" strokeWidth="0.5" />
      <Circle cx="20" cy="8" r="2" fill="#F5C842" opacity="0.4" />
      <Circle cx="60" cy="8" r="2" fill="#F5C842" opacity="0.3" />
      <Circle cx="100" cy="8" r="2" fill="#F5C842" opacity="0.4" />
    </Svg>
  );
}

export function TradingFloorThemeSVG({ width = 120, height = 30 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 30">
      <Rect x="0" y="0" width="120" height="30" rx="4" fill="#080C10" />
      <Rect x="2" y="2" width="116" height="26" rx="3" fill="#0A1520" opacity="0.7" />
      <Path d="M10 20 L30 12 L50 16 L70 8 L90 14 L110 10" fill="none" stroke="#00E676" strokeWidth="1" opacity="0.3" />
      <Circle cx="30" cy="8" r="2" fill="#00E676" opacity="0.3" />
      <Circle cx="90" cy="8" r="2" fill="#FF3D71" opacity="0.3" />
    </Svg>
  );
}

export const ROOM_ITEM_VISUALS: Record<string, React.FC<{ width?: number; height?: number }>> = {
  "room-decor-desk-minimal": MinimalDeskSVG,
  "room-decor-desk-oak": PremiumOakDeskSVG,
  "room-decor-desk-carbon": ExecutiveCarbonDeskSVG,
  "room-decor-coffee-espresso": EspressoMachineSVG,
  "room-decor-coffee-pourover": PourOverSetSVG,
  "room-decor-monitor-dual": DualMonitorSVG,
  "room-decor-monitor-ultrawide": UltrawideMonitorSVG,
  "room-decor-monitor-trading": TradingTerminalSVG,
  "room-decor-bookshelf": MinimalBookshelfSVG,
  "room-decor-speaker": PremiumSpeakerSVG,
  "room-decor-plants": IndoorPlantSVG,
  "room-decor-trophy-case": TrophyDisplayCaseSVG,
  "room-decor-lighting-led": LEDAmbientSVG,
  "room-decor-lighting-arc": ArcFloorLampSVG,
  "room-decor-theme-dark": DarkCommandThemeSVG,
  "room-decor-theme-executive": ExecutiveSuiteThemeSVG,
  "room-decor-theme-trading": TradingFloorThemeSVG,
};

export function RoomItemVisual({ itemId, width, height }: { itemId: string; width?: number; height?: number }) {
  const Component = ROOM_ITEM_VISUALS[itemId];
  if (!Component) return null;
  return <Component width={width} height={height} />;
}

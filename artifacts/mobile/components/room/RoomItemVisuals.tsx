import React from "react";
import Svg, {
  Rect, Path, Circle, Ellipse, G, Line, Defs,
  LinearGradient, RadialGradient, Stop, Polygon,
} from "react-native-svg";

export function MinimalDeskSVG({ width = 120, height = 70 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 70">
      <Defs>
        <LinearGradient id="mdTop" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#B0BEC5" />
          <Stop offset="1" stopColor="#78909C" />
        </LinearGradient>
        <LinearGradient id="mdFront" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#607D8B" />
          <Stop offset="1" stopColor="#455A64" />
        </LinearGradient>
      </Defs>
      <Rect x="8" y="28" width="104" height="5" rx="1" fill="url(#mdTop)" />
      <Line x1="8" y1="28" x2="112" y2="28" stroke="#CFD8DC" strokeWidth="0.8" opacity="0.6" />
      <Rect x="8" y="33" width="104" height="3" rx="0" fill="url(#mdFront)" />
      <Rect x="14" y="36" width="4" height="28" rx="1" fill="#546E7A" />
      <Rect x="102" y="36" width="4" height="28" rx="1" fill="#546E7A" />
      <Rect x="8" y="62" width="22" height="3" rx="1" fill="#455A64" />
      <Rect x="90" y="62" width="22" height="3" rx="1" fill="#455A64" />
      <Rect x="30" y="18" width="22" height="9" rx="2" fill="#37474F" />
      <Rect x="31" y="19" width="20" height="7" rx="1" fill="#263238" />
      <Line x1="31" y1="19" x2="51" y2="19" stroke="#4FC3F7" strokeWidth="0.5" opacity="0.3" />
      <Circle cx="80" cy="24" r="3" fill="#455A64" opacity="0.5" />
      <Circle cx="80" cy="24" r="1.5" fill="#90A4AE" opacity="0.4" />
    </Svg>
  );
}

export function PremiumOakDeskSVG({ width = 120, height = 70 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 70">
      <Defs>
        <LinearGradient id="oakSurf" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#A1887F" />
          <Stop offset="0.3" stopColor="#8D6E63" />
          <Stop offset="1" stopColor="#6D4C41" />
        </LinearGradient>
        <LinearGradient id="oakLeg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#795548" />
          <Stop offset="1" stopColor="#5D4037" />
        </LinearGradient>
      </Defs>
      <Rect x="6" y="24" width="108" height="7" rx="2" fill="url(#oakSurf)" />
      <Line x1="6" y1="24" x2="114" y2="24" stroke="#BCAAA4" strokeWidth="0.8" opacity="0.5" />
      <Rect x="6" y="31" width="108" height="3" rx="0" fill="#5D4037" />
      <Line x1="20" y1="26" x2="20" y2="30" stroke="#6D4C41" strokeWidth="0.3" opacity="0.3" />
      <Line x1="40" y1="26" x2="40" y2="30" stroke="#6D4C41" strokeWidth="0.3" opacity="0.3" />
      <Line x1="60" y1="26" x2="60" y2="30" stroke="#6D4C41" strokeWidth="0.3" opacity="0.3" />
      <Line x1="80" y1="26" x2="80" y2="30" stroke="#6D4C41" strokeWidth="0.3" opacity="0.3" />
      <Line x1="100" y1="26" x2="100" y2="30" stroke="#6D4C41" strokeWidth="0.3" opacity="0.3" />
      <Rect x="12" y="34" width="5" height="28" rx="1" fill="url(#oakLeg)" />
      <Rect x="103" y="34" width="5" height="28" rx="1" fill="url(#oakLeg)" />
      <Rect x="6" y="60" width="24" height="4" rx="1" fill="#4E342E" />
      <Rect x="90" y="60" width="24" height="4" rx="1" fill="#4E342E" />
      <Rect x="40" y="16" width="14" height="7" rx="1" fill="#A1887F" opacity="0.5" />
      <Rect x="42" y="17" width="10" height="5" rx="1" fill="#795548" opacity="0.4" />
      <Circle cx="75" cy="20" r="4" fill="#8D6E63" opacity="0.4" />
      <Ellipse cx="75" cy="20" rx="2" ry="1.5" fill="#BCAAA4" opacity="0.3" />
    </Svg>
  );
}

export function ExecutiveCarbonDeskSVG({ width = 120, height = 70 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 70">
      <Defs>
        <LinearGradient id="carbSurf" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2C2C2C" />
          <Stop offset="0.5" stopColor="#1F1F1F" />
          <Stop offset="1" stopColor="#1A1A1A" />
        </LinearGradient>
      </Defs>
      <Rect x="4" y="22" width="112" height="8" rx="2" fill="url(#carbSurf)" />
      <Line x1="4" y1="22" x2="116" y2="22" stroke="#4A4A4A" strokeWidth="0.6" opacity="0.5" />
      <Line x1="4" y1="30" x2="116" y2="30" stroke="#333333" strokeWidth="0.4" />
      <Rect x="4" y="30" width="112" height="3" rx="0" fill="#151515" />
      <Rect x="52" y="33" width="16" height="24" rx="2" fill="#1E1E1E" />
      <Rect x="35" y="55" width="50" height="4" rx="2" fill="#181818" />
      <Rect x="30" y="59" width="60" height="3" rx="1" fill="#222222" />
      <Rect x="20" y="14" width="30" height="7" rx="1.5" fill="#252525" />
      <Rect x="21" y="15" width="28" height="5" rx="1" fill="#1A1A1A" />
      <Circle cx="35" cy="17" r="0.8" fill="#4FC3F7" opacity="0.5" />
      <Rect x="60" y="16" width="8" height="5" rx="1" fill="#252525" />
      <Circle cx="64" cy="18" r="1" fill="#FF7043" opacity="0.3" />
      <Line x1="8" y1="25" x2="112" y2="25" stroke="#3A3A3A" strokeWidth="0.3" opacity="0.2" />
    </Svg>
  );
}

export function EspressoMachineSVG({ width = 60, height = 80 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 60 80">
      <Defs>
        <LinearGradient id="espBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#B0BEC5" />
          <Stop offset="0.4" stopColor="#78909C" />
          <Stop offset="1" stopColor="#546E7A" />
        </LinearGradient>
      </Defs>
      <Rect x="12" y="12" width="36" height="44" rx="5" fill="url(#espBody)" />
      <Line x1="12" y1="12" x2="48" y2="12" stroke="#CFD8DC" strokeWidth="0.8" opacity="0.5" />
      <Rect x="16" y="16" width="28" height="14" rx="3" fill="#37474F" />
      <Circle cx="30" cy="23" r="5" fill="#263238" stroke="#546E7A" strokeWidth="0.8" />
      <Circle cx="30" cy="23" r="2" fill="#455A64" />
      <Rect x="18" y="34" width="24" height="3" rx="1" fill="#90A4AE" opacity="0.5" />
      <Rect x="22" y="40" width="6" height="12" rx="1" fill="#90A4AE" opacity="0.6" />
      <Rect x="32" y="40" width="6" height="12" rx="1" fill="#90A4AE" opacity="0.6" />
      <Rect x="20" y="53" width="20" height="2" rx="1" fill="#607D8B" />
      <Rect x="10" y="56" width="40" height="7" rx="3" fill="#455A64" />
      <Line x1="10" y1="56" x2="50" y2="56" stroke="#78909C" strokeWidth="0.5" opacity="0.4" />
      <Rect x="8" y="63" width="44" height="5" rx="2" fill="#37474F" />
      <Rect x="6" y="68" width="48" height="4" rx="1" fill="#263238" />
      <Circle cx="43" cy="19" r="2.5" fill="#C9A43C" opacity="0.7" />
      <Path d="M46 16 Q48 14 47 11" fill="none" stroke="#B0BEC5" strokeWidth="0.8" opacity="0.25" />
      <Path d="M44 15 Q46 12 45 9" fill="none" stroke="#B0BEC5" strokeWidth="0.6" opacity="0.2" />
      <Rect x="22" y="72" width="8" height="4" rx="1" fill="#455A64" />
      <Rect x="21" y="76" width="10" height="2" rx="0.5" fill="#37474F" />
    </Svg>
  );
}

export function PourOverSetSVG({ width = 60, height = 80 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 60 80">
      <Defs>
        <LinearGradient id="carafeGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#B3E5FC" stopOpacity="0.4" />
          <Stop offset="1" stopColor="#81D4FA" stopOpacity="0.2" />
        </LinearGradient>
      </Defs>
      <Path d="M22 48 Q18 50 18 56 L18 70 Q18 74 22 74 L38 74 Q42 74 42 70 L42 56 Q42 50 38 48 Z" fill="url(#carafeGrad)" stroke="#B3E5FC" strokeWidth="0.6" opacity="0.7" />
      <Rect x="18" y="60" width="24" height="10" rx="0" fill="#6D4C41" opacity="0.15" />
      <Path d="M26 48 L30 28 L34 48" fill="none" stroke="#8D6E63" strokeWidth="1.5" />
      <Ellipse cx="30" cy="26" rx="8" ry="5" fill="none" stroke="#8D6E63" strokeWidth="1.2" />
      <Rect x="26" y="24" width="8" height="2" rx="1" fill="#A1887F" />
      <Circle cx="30" cy="34" r="2" fill="#5D4037" opacity="0.3" />
      <Path d="M42 62 Q48 64 46 68" fill="none" stroke="#B3E5FC" strokeWidth="1" opacity="0.3" />
      <Rect x="20" y="74" width="20" height="3" rx="1" fill="#5D4037" opacity="0.5" />
      <Rect x="6" y="60" width="8" height="12" rx="2" fill="#455A64" opacity="0.5" />
      <Ellipse cx="10" cy="60" rx="4" ry="1.5" fill="#546E7A" opacity="0.4" />
      <Path d="M14 64 Q16 63 16 66" fill="none" stroke="#607D8B" strokeWidth="0.8" opacity="0.3" />
    </Svg>
  );
}

export function DualMonitorSVG({ width = 120, height = 70 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 70">
      <Defs>
        <LinearGradient id="dmBezel" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#263238" />
          <Stop offset="1" stopColor="#1A2530" />
        </LinearGradient>
        <LinearGradient id="dmScreen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0D1B2A" />
          <Stop offset="1" stopColor="#0A1628" />
        </LinearGradient>
      </Defs>
      <Rect x="3" y="4" width="52" height="34" rx="2" fill="url(#dmBezel)" />
      <Rect x="5" y="6" width="48" height="30" rx="1" fill="url(#dmScreen)" />
      <Rect x="65" y="4" width="52" height="34" rx="2" fill="url(#dmBezel)" />
      <Rect x="67" y="6" width="48" height="30" rx="1" fill="url(#dmScreen)" />
      <Rect x="8" y="10" width="20" height="8" rx="1" fill="#1565C0" opacity="0.15" />
      <Rect x="8" y="20" width="42" height="1" rx="0.5" fill="#1E88E5" opacity="0.1" />
      <Rect x="8" y="23" width="30" height="1" rx="0.5" fill="#1E88E5" opacity="0.08" />
      <Path d="M70 12 L78 18 L86 14 L94 20 L102 16 L110 22" fill="none" stroke="#4FC3F7" strokeWidth="0.8" opacity="0.25" />
      <Path d="M70 18 L78 22 L86 20 L94 25 L102 22 L110 28" fill="none" stroke="#81C784" strokeWidth="0.6" opacity="0.15" />
      <Rect x="25" y="38" width="10" height="6" rx="1" fill="#1A2530" />
      <Rect x="85" y="38" width="10" height="6" rx="1" fill="#1A2530" />
      <Rect x="20" y="44" width="20" height="3" rx="1" fill="#263238" />
      <Rect x="80" y="44" width="20" height="3" rx="1" fill="#263238" />
      <Ellipse cx="60" cy="50" rx="50" ry="2" fill="#1A2530" opacity="0.3" />
    </Svg>
  );
}

export function UltrawideMonitorSVG({ width = 120, height = 60 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 60">
      <Defs>
        <LinearGradient id="uwBezel" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#212121" />
          <Stop offset="1" stopColor="#1A1A1A" />
        </LinearGradient>
        <RadialGradient id="uwGlow" cx="0.5" cy="0.5" r="0.6">
          <Stop offset="0" stopColor="#1565C0" stopOpacity="0.08" />
          <Stop offset="1" stopColor="#0D1B2A" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Path d="M8 4 Q4 4 4 8 L4 36 Q4 38 8 38 L112 38 Q116 38 116 36 L116 8 Q116 4 112 4 Z" fill="url(#uwBezel)" />
      <Rect x="7" y="6" width="106" height="30" rx="1" fill="#0A1520" />
      <Rect x="7" y="6" width="106" height="30" rx="1" fill="url(#uwGlow)" />
      <Line x1="60" y1="6" x2="60" y2="36" stroke="#1A2530" strokeWidth="0.3" opacity="0.2" />
      <Rect x="10" y="10" width="44" height="2" rx="1" fill="#1565C0" opacity="0.1" />
      <Rect x="10" y="14" width="30" height="1.5" rx="0.5" fill="#1E88E5" opacity="0.08" />
      <Path d="M66 10 L76 18 L86 12 L96 20 L106 14" fill="none" stroke="#4FC3F7" strokeWidth="0.8" opacity="0.2" />
      <Rect x="52" y="38" width="16" height="6" rx="1" fill="#1A1A1A" />
      <Rect x="40" y="44" width="40" height="3" rx="1" fill="#212121" />
      <Ellipse cx="60" cy="50" rx="35" ry="2" fill="#1A1A1A" opacity="0.3" />
    </Svg>
  );
}

export function TradingTerminalSVG({ width = 120, height = 70 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 70">
      <Defs>
        <LinearGradient id="ttBezel" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1B2838" />
          <Stop offset="1" stopColor="#131E2B" />
        </LinearGradient>
      </Defs>
      <Rect x="2" y="2" width="56" height="30" rx="2" fill="url(#ttBezel)" />
      <Rect x="4" y="4" width="52" height="26" rx="1" fill="#0A1520" />
      <Rect x="62" y="2" width="56" height="30" rx="2" fill="url(#ttBezel)" />
      <Rect x="64" y="4" width="52" height="26" rx="1" fill="#0A1520" />
      <Rect x="22" y="35" width="76" height="26" rx="2" fill="url(#ttBezel)" />
      <Rect x="24" y="37" width="72" height="22" rx="1" fill="#0A1520" />
      <Path d="M8 10 L16 16 L22 12 L30 18 L38 14 L46 20 L52 16" fill="none" stroke="#00E676" strokeWidth="1" opacity="0.35" />
      <Path d="M68 8 L76 14 L82 10 L90 16 L98 12 L106 18 L112 14" fill="none" stroke="#FF3D71" strokeWidth="0.8" opacity="0.3" />
      <Path d="M28 42 L38 48 L48 44 L58 50 L68 46 L78 52 L88 48" fill="none" stroke="#FFB300" strokeWidth="0.8" opacity="0.3" />
      <Rect x="8" y="22" width="16" height="1.5" rx="0.5" fill="#00E676" opacity="0.15" />
      <Rect x="8" y="25" width="10" height="1" rx="0.5" fill="#4FC3F7" opacity="0.1" />
      <Rect x="68" y="22" width="16" height="1.5" rx="0.5" fill="#FF3D71" opacity="0.12" />
      <Rect x="28" y="52" width="24" height="1.5" rx="0.5" fill="#FFB300" opacity="0.12" />
      <Rect x="56" y="52" width="14" height="1" rx="0.5" fill="#4FC3F7" opacity="0.1" />
      <Ellipse cx="60" cy="66" rx="40" ry="2" fill="#131E2B" opacity="0.4" />
    </Svg>
  );
}

export function MinimalBookshelfSVG({ width = 50, height = 90 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 50 90">
      <Defs>
        <LinearGradient id="shelfWood" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#5D4037" />
          <Stop offset="1" stopColor="#4E342E" />
        </LinearGradient>
      </Defs>
      <Rect x="4" y="4" width="2" height="82" rx="0.5" fill="#4E342E" />
      <Rect x="44" y="4" width="2" height="82" rx="0.5" fill="#4E342E" />
      <Rect x="4" y="4" width="42" height="2" rx="0.5" fill="url(#shelfWood)" />
      <Rect x="4" y="28" width="42" height="2" rx="0.5" fill="url(#shelfWood)" />
      <Rect x="4" y="52" width="42" height="2" rx="0.5" fill="url(#shelfWood)" />
      <Rect x="4" y="76" width="42" height="2" rx="0.5" fill="url(#shelfWood)" />
      <Rect x="4" y="84" width="42" height="2" rx="0.5" fill="url(#shelfWood)" />
      <Rect x="9" y="8" width="5" height="19" rx="1" fill="#1565C0" opacity="0.7" />
      <Rect x="15" y="10" width="4" height="17" rx="1" fill="#2E7D32" opacity="0.65" />
      <Rect x="20" y="9" width="5" height="18" rx="1" fill="#E65100" opacity="0.55" />
      <Rect x="26" y="11" width="4" height="16" rx="1" fill="#6A1B9A" opacity="0.6" />
      <Rect x="31" y="8" width="5" height="19" rx="1" fill="#C62828" opacity="0.5" />
      <Rect x="9" y="32" width="6" height="18" rx="1" fill="#F9A825" opacity="0.6" />
      <Rect x="16" y="34" width="4" height="16" rx="1" fill="#1565C0" opacity="0.55" />
      <Rect x="22" y="33" width="5" height="17" rx="1" fill="#37474F" opacity="0.6" />
      <Rect x="28" y="35" width="4" height="15" rx="1" fill="#2E7D32" opacity="0.5" />
      <Rect x="10" y="56" width="5" height="18" rx="1" fill="#AD1457" opacity="0.5" />
      <Rect x="17" y="57" width="4" height="17" rx="1" fill="#E65100" opacity="0.5" />
      <Circle cx="30" cy="66" r="4" fill="#8D6E63" opacity="0.4" />
      <Rect x="35" y="60" width="6" height="14" rx="1" fill="#455A64" opacity="0.3" />
      <Rect x="10" y="80" width="8" height="3" rx="0.5" fill="#8D6E63" opacity="0.3" />
    </Svg>
  );
}

export function PremiumSpeakerSVG({ width = 80, height = 60 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 80 60">
      <Defs>
        <LinearGradient id="spkBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#333333" />
          <Stop offset="0.5" stopColor="#262626" />
          <Stop offset="1" stopColor="#1A1A1A" />
        </LinearGradient>
      </Defs>
      <Rect x="4" y="4" width="22" height="52" rx="3" fill="url(#spkBody)" />
      <Line x1="4" y1="4" x2="26" y2="4" stroke="#444" strokeWidth="0.5" opacity="0.4" />
      <Rect x="6" y="6" width="18" height="26" rx="2" fill="#1E1E1E" opacity="0.6" />
      <Circle cx="15" cy="20" r="7" fill="#1A1A1A" stroke="#3A3A3A" strokeWidth="0.6" />
      <Circle cx="15" cy="20" r="4" fill="#222222" />
      <Circle cx="15" cy="20" r="1.5" fill="#444444" />
      <Circle cx="15" cy="42" r="5" fill="#1A1A1A" stroke="#3A3A3A" strokeWidth="0.5" />
      <Circle cx="15" cy="42" r="2.5" fill="#222222" />
      <Circle cx="15" cy="42" r="1" fill="#3A3A3A" />
      <Rect x="54" y="4" width="22" height="52" rx="3" fill="url(#spkBody)" />
      <Line x1="54" y1="4" x2="76" y2="4" stroke="#444" strokeWidth="0.5" opacity="0.4" />
      <Rect x="56" y="6" width="18" height="26" rx="2" fill="#1E1E1E" opacity="0.6" />
      <Circle cx="65" cy="20" r="7" fill="#1A1A1A" stroke="#3A3A3A" strokeWidth="0.6" />
      <Circle cx="65" cy="20" r="4" fill="#222222" />
      <Circle cx="65" cy="20" r="1.5" fill="#444444" />
      <Circle cx="65" cy="42" r="5" fill="#1A1A1A" stroke="#3A3A3A" strokeWidth="0.5" />
      <Circle cx="65" cy="42" r="2.5" fill="#222222" />
      <Circle cx="65" cy="42" r="1" fill="#3A3A3A" />
    </Svg>
  );
}

export function IndoorPlantSVG({ width = 50, height = 70 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 50 70">
      <Defs>
        <LinearGradient id="potGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#EFEBE9" />
          <Stop offset="1" stopColor="#D7CCC8" />
        </LinearGradient>
      </Defs>
      <Path d="M14 46 L12 62 Q12 66 16 66 L34 66 Q38 66 38 62 L36 46 Z" fill="url(#potGrad)" />
      <Line x1="14" y1="46" x2="36" y2="46" stroke="#BCAAA4" strokeWidth="0.6" opacity="0.5" />
      <Rect x="13" y="44" width="24" height="3" rx="1" fill="#D7CCC8" />
      <Ellipse cx="25" cy="68" rx="10" ry="2" fill="#BCAAA4" opacity="0.3" />
      <Path d="M25 44 Q22 32 14 26" fill="none" stroke="#388E3C" strokeWidth="2.5" />
      <Path d="M25 44 Q28 30 36 24" fill="none" stroke="#388E3C" strokeWidth="2.5" />
      <Path d="M25 44 Q25 32 25 20" fill="none" stroke="#43A047" strokeWidth="2" />
      <Path d="M25 44 Q18 38 10 36" fill="none" stroke="#2E7D32" strokeWidth="1.8" />
      <Path d="M25 44 Q32 36 40 32" fill="none" stroke="#2E7D32" strokeWidth="1.8" />
      <Path d="M10 26 Q8 22 12 20 Q16 18 18 22 Q16 26 12 26 Z" fill="#66BB6A" opacity="0.85" />
      <Path d="M34 24 Q32 20 36 18 Q40 16 42 20 Q40 24 36 24 Z" fill="#66BB6A" opacity="0.85" />
      <Path d="M23 20 Q21 16 25 14 Q29 12 31 16 Q29 20 25 20 Z" fill="#81C784" opacity="0.85" />
      <Path d="M8 36 Q6 33 10 32 Q14 31 14 34 Q12 37 8 36 Z" fill="#4CAF50" opacity="0.7" />
      <Path d="M38 32 Q36 29 40 28 Q44 27 44 30 Q42 33 38 32 Z" fill="#4CAF50" opacity="0.7" />
      <Path d="M20 28 Q18 25 22 24 Q25 23 25 26 Q23 29 20 28 Z" fill="#A5D6A7" opacity="0.6" />
    </Svg>
  );
}

export function TrophyDisplayCaseSVG({ width = 70, height = 80 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 70 80">
      <Defs>
        <LinearGradient id="caseFrame" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#37474F" />
          <Stop offset="1" stopColor="#263238" />
        </LinearGradient>
        <LinearGradient id="caseGlass" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1A237E" stopOpacity="0.06" />
          <Stop offset="1" stopColor="#0D47A1" stopOpacity="0.03" />
        </LinearGradient>
      </Defs>
      <Rect x="5" y="4" width="60" height="72" rx="3" fill="url(#caseFrame)" />
      <Rect x="8" y="7" width="54" height="66" rx="2" fill="#0A0E14" />
      <Rect x="8" y="7" width="54" height="66" rx="2" fill="url(#caseGlass)" />
      <Rect x="8" y="30" width="54" height="1.5" fill="#37474F" opacity="0.5" />
      <Rect x="8" y="54" width="54" height="1.5" fill="#37474F" opacity="0.5" />
      <Path d="M28 12 L28 10 Q28 8 25 8 Q22 10 22 14 Q22 18 25 18 L28 18 L28 16" fill="none" stroke="#FFD54F" strokeWidth="1.2" opacity="0.7" />
      <Path d="M28 12 L28 10 Q28 8 31 8 Q34 10 34 14 Q34 18 31 18 L28 18 L28 16" fill="none" stroke="#FFD54F" strokeWidth="1.2" opacity="0.7" />
      <Rect x="26" y="18" width="4" height="4" rx="0.5" fill="#FFC107" opacity="0.5" />
      <Rect x="25" y="22" width="6" height="2" rx="0.5" fill="#FFB300" opacity="0.4" />
      <Circle cx="50" cy="16" r="5" fill="none" stroke="#B0BEC5" strokeWidth="0.8" opacity="0.35" />
      <Circle cx="50" cy="16" r="2" fill="#B0BEC5" opacity="0.2" />
      <Rect x="14" y="35" width="8" height="14" rx="1" fill="#7C4DFF" opacity="0.25" />
      <Rect x="26" y="37" width="6" height="12" rx="1" fill="#1E88E5" opacity="0.25" />
      <Circle cx="48" cy="42" r="5" fill="#FF7043" opacity="0.2" />
      <Rect x="18" y="58" width="10" height="10" rx="1" fill="#4CAF50" opacity="0.2" />
      <Rect x="36" y="57" width="12" height="12" rx="1" fill="#F9A825" opacity="0.2" />
    </Svg>
  );
}

export function LEDAmbientSVG({ width = 120, height = 30 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 30">
      <Defs>
        <LinearGradient id="ledStrip" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#7C4DFF" stopOpacity="0.7" />
          <Stop offset="0.3" stopColor="#448AFF" stopOpacity="0.7" />
          <Stop offset="0.6" stopColor="#00BCD4" stopOpacity="0.7" />
          <Stop offset="1" stopColor="#7C4DFF" stopOpacity="0.7" />
        </LinearGradient>
        <RadialGradient id="ledGlow1" cx="0.5" cy="0" r="1">
          <Stop offset="0" stopColor="#7C4DFF" stopOpacity="0.12" />
          <Stop offset="1" stopColor="#7C4DFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="4" y="4" width="112" height="3" rx="1.5" fill="#1A1A2E" />
      <Rect x="6" y="5" width="108" height="1.5" rx="0.75" fill="url(#ledStrip)" />
      <Ellipse cx="60" cy="14" rx="55" ry="10" fill="url(#ledGlow1)" />
      <Circle cx="15" cy="5.5" r="1.2" fill="#B388FF" opacity="0.9" />
      <Circle cx="30" cy="5.5" r="1.2" fill="#82B1FF" opacity="0.9" />
      <Circle cx="45" cy="5.5" r="1.2" fill="#80DEEA" opacity="0.9" />
      <Circle cx="60" cy="5.5" r="1.2" fill="#B388FF" opacity="0.9" />
      <Circle cx="75" cy="5.5" r="1.2" fill="#82B1FF" opacity="0.9" />
      <Circle cx="90" cy="5.5" r="1.2" fill="#80DEEA" opacity="0.9" />
      <Circle cx="105" cy="5.5" r="1.2" fill="#B388FF" opacity="0.9" />
    </Svg>
  );
}

export function ArcFloorLampSVG({ width = 50, height = 90 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 50 90">
      <Defs>
        <RadialGradient id="lampGlow" cx="0.5" cy="0.3" r="0.7">
          <Stop offset="0" stopColor="#FFF8E1" stopOpacity="0.15" />
          <Stop offset="1" stopColor="#FFF8E1" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx="12" cy="84" rx="10" ry="3.5" fill="#2C2C2C" />
      <Ellipse cx="12" cy="83" rx="8" ry="2.5" fill="#333333" />
      <Line x1="12" y1="80" x2="12" y2="22" stroke="#4A4A4A" strokeWidth="2" />
      <Line x1="12" y1="80" x2="12" y2="22" stroke="#555555" strokeWidth="0.5" />
      <Path d="M12 22 Q12 10 28 8" fill="none" stroke="#4A4A4A" strokeWidth="2" />
      <Path d="M12 22 Q12 10 28 8" fill="none" stroke="#555555" strokeWidth="0.5" />
      <Ellipse cx="33" cy="8" rx="11" ry="5" fill="#3A3A3A" />
      <Ellipse cx="33" cy="7" rx="10" ry="4" fill="#444444" />
      <Ellipse cx="33" cy="14" rx="10" ry="4" fill="#FFF8E1" opacity="0.08" />
      <Ellipse cx="33" cy="20" rx="14" ry="5" fill="#FFF8E1" opacity="0.04" />
      <Ellipse cx="33" cy="28" rx="18" ry="6" fill="#FFF8E1" opacity="0.02" />
      <Circle cx="33" cy="9" r="2.5" fill="#FFE082" opacity="0.4" />
      <Circle cx="33" cy="9" r="1" fill="#FFF8E1" opacity="0.5" />
    </Svg>
  );
}

export function DarkCommandThemeSVG({ width = 120, height = 30 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 30">
      <Defs>
        <LinearGradient id="dctBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0A0A18" />
          <Stop offset="1" stopColor="#0D0D1A" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="120" height="30" rx="4" fill="url(#dctBg)" />
      <Line x1="0" y1="22" x2="120" y2="22" stroke="#1A1A2E" strokeWidth="0.5" opacity="0.5" />
      <Rect x="4" y="24" width="112" height="2" rx="0.5" fill="#12121E" opacity="0.6" />
      <Line x1="20" y1="24" x2="20" y2="26" stroke="#1A1A30" strokeWidth="0.3" opacity="0.3" />
      <Line x1="40" y1="24" x2="40" y2="26" stroke="#1A1A30" strokeWidth="0.3" opacity="0.3" />
      <Line x1="60" y1="24" x2="60" y2="26" stroke="#1A1A30" strokeWidth="0.3" opacity="0.3" />
      <Line x1="80" y1="24" x2="80" y2="26" stroke="#1A1A30" strokeWidth="0.3" opacity="0.3" />
      <Line x1="100" y1="24" x2="100" y2="26" stroke="#1A1A30" strokeWidth="0.3" opacity="0.3" />
      <Circle cx="20" cy="10" r="2" fill="#7C5CFC" opacity="0.2" />
      <Circle cx="60" cy="10" r="2" fill="#4A8AC0" opacity="0.2" />
      <Circle cx="100" cy="10" r="2" fill="#7C5CFC" opacity="0.2" />
    </Svg>
  );
}

export function ExecutiveSuiteThemeSVG({ width = 120, height = 30 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 30">
      <Defs>
        <LinearGradient id="estBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#12100A" />
          <Stop offset="1" stopColor="#1A1508" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="120" height="30" rx="4" fill="url(#estBg)" />
      <Line x1="0" y1="22" x2="120" y2="22" stroke="#2A2518" strokeWidth="0.5" opacity="0.5" />
      <Rect x="4" y="24" width="112" height="2" rx="0.5" fill="#1A1508" opacity="0.6" />
      <Circle cx="20" cy="10" r="2.5" fill="#F5C842" opacity="0.25" />
      <Circle cx="60" cy="10" r="2.5" fill="#FFD54F" opacity="0.2" />
      <Circle cx="100" cy="10" r="2.5" fill="#F5C842" opacity="0.25" />
      <Line x1="30" y1="10" x2="50" y2="10" stroke="#F5C842" strokeWidth="0.3" opacity="0.15" />
      <Line x1="70" y1="10" x2="90" y2="10" stroke="#F5C842" strokeWidth="0.3" opacity="0.15" />
    </Svg>
  );
}

export function TradingFloorThemeSVG({ width = 120, height = 30 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 120 30">
      <Defs>
        <LinearGradient id="tftBg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#060C12" />
          <Stop offset="1" stopColor="#0A1520" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="120" height="30" rx="4" fill="url(#tftBg)" />
      <Path d="M5 20 L20 14 L35 17 L50 10 L65 15 L80 8 L95 13 L110 11" fill="none" stroke="#00E676" strokeWidth="0.8" opacity="0.3" />
      <Path d="M5 22 L20 18 L35 21 L50 16 L65 19 L80 14 L95 17 L110 15" fill="none" stroke="#FF3D71" strokeWidth="0.6" opacity="0.2" />
      <Circle cx="30" cy="8" r="1.5" fill="#00E676" opacity="0.3" />
      <Circle cx="60" cy="8" r="1.5" fill="#FFB300" opacity="0.3" />
      <Circle cx="90" cy="8" r="1.5" fill="#FF3D71" opacity="0.25" />
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

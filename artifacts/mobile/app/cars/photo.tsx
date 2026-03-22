import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn, ZoomIn, FadeOut } from "react-native-reanimated";
import Svg, {
  Path, Circle, Rect, Ellipse, LinearGradient, Defs, Stop,
  Line, Text as SvgText,
} from "react-native-svg";
import { Colors, RARITY_COLORS } from "@/constants/colors";
import { useCarPhotoMode, useIdentity, useEndgame } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type Car = {
  id: string;
  name: string;
  rarity: string;
  carClass: string | null;
  icon: string;
  prestigeValue: number;
  styleEffect?: string | null;
  description?: string;
};

type Scene = "studio" | "street" | "command";

// ─── Scene definitions ────────────────────────────────────────────────────────

const SCENE_META: Record<Scene, {
  label: string; mood: string; icon: string;
  bg1: string; bg2: string; ground: string; accentAlpha: string;
}> = {
  studio: {
    label: "Studio",
    mood: "Clean. Editorial. Timeless.",
    icon: "aperture-outline",
    bg1: "#090C14", bg2: "#141C2E", ground: "#0F1520",
    accentAlpha: "12",
  },
  street: {
    label: "Street",
    mood: "Motion. Power. Recognition.",
    icon: "navigate-outline",
    bg1: "#050810", bg2: "#091524", ground: "#071018",
    accentAlpha: "10",
  },
  command: {
    label: "Command",
    mood: "Operator. Precision. Control.",
    icon: "desktop-outline",
    bg1: "#090810", bg2: "#100E1E", ground: "#0D0B18",
    accentAlpha: "15",
  },
};

const CLASS_LABELS: Record<string, string> = {
  starter:   "Starter",
  rising:    "Rising Luxury",
  executive: "Executive",
  elite:     "Elite Supercar",
  prestige:  "Prestige Signature",
};

// ─── Car Silhouette — hero scale ──────────────────────────────────────────────

function CarSilhouetteLarge({ rarity, width = 260 }: { rarity: string; width?: number }) {
  const color = RARITY_COLORS[rarity] ?? "#9CA3AF";
  const h = width * 0.42;
  const w = width;

  return (
    <Svg width={w} height={h + 24} viewBox={`0 0 ${w} ${h + 24}`}>
      {/* Ground shadow */}
      <Ellipse cx={w / 2} cy={h + 18} rx={w * 0.4} ry={5} fill={color + "18"} />
      {/* Ground glow */}
      <Ellipse cx={w / 2} cy={h + 14} rx={w * 0.32} ry={3} fill={color + "30"} />
      {/* Body */}
      <Rect x={6} y={h * 0.45} width={w - 12} height={h * 0.44} rx={9} fill={color + "22"} stroke={color + "90"} strokeWidth={1.6} />
      {/* Cabin */}
      <Path
        d={`M${w*0.22},${h*0.45} L${w*0.29},${h*0.07} L${w*0.71},${h*0.07} L${w*0.78},${h*0.45} Z`}
        fill={color + "16"} stroke={color + "90"} strokeWidth={1.6}
      />
      {/* Windows */}
      <Path
        d={`M${w*0.242},${h*0.43} L${w*0.32},${h*0.11} L${w*0.474},${h*0.11} L${w*0.474},${h*0.43} Z`}
        fill={color + "28"} stroke={color + "55"} strokeWidth={1}
      />
      <Path
        d={`M${w*0.526},${h*0.43} L${w*0.526},${h*0.11} L${w*0.68},${h*0.11} L${w*0.758},${h*0.43} Z`}
        fill={color + "28"} stroke={color + "55"} strokeWidth={1}
      />
      {/* Front lights (bright) */}
      <Rect x={w - 12} y={h * 0.49} width={8} height={h * 0.18} rx={4} fill={color} />
      <Rect x={w - 12} y={h * 0.68} width={5} height={h * 0.07} rx={2} fill={color + "70"} />
      {/* Rear lights */}
      <Rect x={4} y={h * 0.49} width={8} height={h * 0.18} rx={4} fill={color + "60"} />
      {/* Accent strip */}
      <Rect x={w * 0.12} y={h * 0.87} width={w * 0.76} height={h * 0.04} rx={2} fill={color + "30"} />
      {/* Wheels */}
      <Circle cx={w * 0.213} cy={h * 0.9} r={h * 0.23} fill={color + "12"} stroke={color} strokeWidth={2.2} />
      <Circle cx={w * 0.787} cy={h * 0.9} r={h * 0.23} fill={color + "12"} stroke={color} strokeWidth={2.2} />
      <Circle cx={w * 0.213} cy={h * 0.9} r={h * 0.1} fill={color + "45"} />
      <Circle cx={w * 0.787} cy={h * 0.9} r={h * 0.1} fill={color + "45"} />
      {/* Spokes — front wheel */}
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const r = h * 0.19;
        const cx1 = w * 0.213; const cy1 = h * 0.9;
        return (
          <Line key={`f${deg}`}
            x1={cx1} y1={cy1}
            x2={cx1 + Math.cos(rad) * r} y2={cy1 + Math.sin(rad) * r}
            stroke={color + "70"} strokeWidth={1.2}
          />
        );
      })}
      {/* Spokes — rear wheel */}
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const r = h * 0.19;
        const cx1 = w * 0.787; const cy1 = h * 0.9;
        return (
          <Line key={`r${deg}`}
            x1={cx1} y1={cy1}
            x2={cx1 + Math.cos(rad) * r} y2={cy1 + Math.sin(rad) * r}
            stroke={color + "70"} strokeWidth={1.2}
          />
        );
      })}
    </Svg>
  );
}

// ─── Character silhouette — companion scale ───────────────────────────────────

function CharacterSilhouette({ color, size = 80 }: { color: string; size?: number }) {
  const s = size;
  return (
    <Svg width={s * 0.45} height={s} viewBox="0 0 45 100">
      <Circle cx={22} cy={11} r={8} fill={color + "35"} stroke={color + "75"} strokeWidth={1.2} />
      <Rect x={12} y={20} width={20} height={32} rx={5} fill={color + "28"} stroke={color + "65"} strokeWidth={1} />
      <Rect x={3} y={22} width={8} height={22} rx={4} fill={color + "22"} stroke={color + "55"} strokeWidth={1} />
      <Rect x={34} y={22} width={8} height={22} rx={4} fill={color + "22"} stroke={color + "55"} strokeWidth={1} />
      <Rect x={12} y={53} width={9} height={30} rx={4} fill={color + "28"} stroke={color + "65"} strokeWidth={1} />
      <Rect x={23} y={53} width={9} height={30} rx={4} fill={color + "28"} stroke={color + "65"} strokeWidth={1} />
    </Svg>
  );
}

// ─── Scene canvas ─────────────────────────────────────────────────────────────

function PhotoScene({
  car, scene, showOverlay, username, prestige, activeTitle, classLabel,
}: {
  car: Car; scene: Scene; showOverlay: boolean;
  username: string; prestige: string | null; activeTitle: string | null; classLabel: string;
}) {
  const sm = SCENE_META[scene];
  const rarityColor = RARITY_COLORS[car.rarity] ?? "#9CA3AF";

  return (
    <View style={ps.sceneOuter}>
      {/* SVG background */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 380 280">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={sm.bg1} stopOpacity={1} />
            <Stop offset="100%" stopColor={sm.bg2} stopOpacity={1} />
          </LinearGradient>
          <LinearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={sm.ground} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={sm.bg1} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="carGlow" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={rarityColor} stopOpacity={0} />
            <Stop offset="50%" stopColor={rarityColor} stopOpacity={0.14} />
            <Stop offset="100%" stopColor={rarityColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* Base background */}
        <Rect x={0} y={0} width={380} height={280} fill="url(#bg)" />

        {/* Horizontal glow band at car mid-height */}
        <Rect x={0} y={110} width={380} height={90} fill="url(#carGlow)" />

        {/* Ground plane */}
        <Rect x={0} y={230} width={380} height={50} fill="url(#ground)" />

        {/* Scene-specific atmosphere */}
        {scene === "studio" && (
          <>
            {/* Spotlight cone from upper-left */}
            <Path
              d={`M80,0 L0,280 L200,280 Z`}
              fill={rarityColor + "04"}
            />
            <Path d={`M80,0 L80,280`} stroke={rarityColor + "08"} strokeWidth={1} />
            {/* Subtle floor reflection line */}
            <Rect x={60} y={232} width={260} height={1} fill={rarityColor + "25"} />
          </>
        )}
        {scene === "street" && (
          <>
            {/* Speed lines — perspective */}
            {[-20, 0, 30, 70, 110].map((y, i) => (
              <Line key={i} x1={0} y1={150 + y} x2={100} y2={150 + y * 0.6} stroke={rarityColor + "08"} strokeWidth={0.8} />
            ))}
            {/* Road markings */}
            <Rect x={0} y={232} width={380} height={2} fill={rarityColor + "18"} />
            <Rect x={150} y={234} width={35} height={5} rx={2} fill={rarityColor + "12"} />
            <Rect x={210} y={234} width={35} height={5} rx={2} fill={rarityColor + "10"} />
            {/* Horizon glow */}
            <Rect x={0} y={148} width={380} height={12} fill={rarityColor + "06"} />
          </>
        )}
        {scene === "command" && (
          <>
            {/* Corner brackets */}
            <Rect x={0} y={0} width={380} height={1.5} fill={rarityColor + "35"} />
            <Rect x={0} y={278} width={380} height={1.5} fill={rarityColor + "25"} />
            <Rect x={0} y={0} width={1.5} height={280} fill={rarityColor + "25"} />
            <Rect x={378} y={0} width={1.5} height={280} fill={rarityColor + "25"} />
            {/* Corner L-shapes */}
            <Rect x={0} y={0} width={24} height={2} fill={rarityColor + "70"} />
            <Rect x={0} y={0} width={2} height={20} fill={rarityColor + "70"} />
            <Rect x={356} y={0} width={24} height={2} fill={rarityColor + "70"} />
            <Rect x={378} y={0} width={2} height={20} fill={rarityColor + "70"} />
            <Rect x={0} y={278} width={24} height={2} fill={rarityColor + "50"} />
            <Rect x={0} y={260} width={2} height={20} fill={rarityColor + "50"} />
            <Rect x={356} y={278} width={24} height={2} fill={rarityColor + "50"} />
            <Rect x={378} y={260} width={2} height={20} fill={rarityColor + "50"} />
            {/* Subtle grid lines */}
            <Line x1={0} y1={93} x2={380} y2={93} stroke={rarityColor + "08"} strokeWidth={0.6} />
            <Line x1={0} y1={186} x2={380} y2={186} stroke={rarityColor + "08"} strokeWidth={0.6} />
            <Line x1={126} y1={0} x2={126} y2={280} stroke={rarityColor + "06"} strokeWidth={0.6} />
            <Line x1={253} y1={0} x2={253} y2={280} stroke={rarityColor + "06"} strokeWidth={0.6} />
          </>
        )}
      </Svg>

      {/* Character — left side, smaller */}
      <View style={ps.characterWrap}>
        <CharacterSilhouette color={rarityColor} size={84} />
      </View>

      {/* Car — center dominant */}
      <View style={ps.carWrap}>
        <CarSilhouetteLarge rarity={car.rarity} width={230} />
      </View>

      {/* Prestige overlay card — rarity-tinted, top-right */}
      {showOverlay && (
        <Animated.View
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(200)}
          style={[ps.overlayCard, { borderColor: rarityColor + "50", backgroundColor: "#000000CC" }]}
        >
          {/* Rarity corner accent */}
          <View style={[ps.overlayCorner, { backgroundColor: rarityColor }]} />
          <Text style={[ps.overlayUsername, { color: rarityColor }]}>{username}</Text>
          {activeTitle && (
            <Text style={ps.overlayTitle}>{activeTitle}</Text>
          )}
          {prestige && (
            <Text style={ps.overlayPrestige}>{prestige}</Text>
          )}
          <View style={ps.overlaySep} />
          <View style={ps.overlayCarRow}>
            <Ionicons name="car-sport-outline" size={9} color={rarityColor} />
            <Text style={[ps.overlayCarName, { color: rarityColor }]} numberOfLines={1}>{car.name}</Text>
          </View>
          <Text style={[ps.overlayClass, { color: rarityColor + "90" }]}>{classLabel}</Text>
          <View style={ps.overlayBrand}>
            <Text style={ps.overlayBrandText}>DisciplineOS</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function PhotoModeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const { user } = useAuth();

  const { data: photoData, isLoading } = useCarPhotoMode();
  const { data: identityData } = useIdentity();
  const { data: endgameData } = useEndgame();

  const ownedCars: Car[] = photoData?.ownedCars ?? [];
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [scene, setScene] = useState<Scene>("studio");
  const [showOverlay, setShowOverlay] = useState(true);
  const [screenshotHint, setScreenshotHint] = useState(false);

  const activeCar: Car | null =
    ownedCars.find((c) => c.id === selectedCarId) ??
    photoData?.featuredCar ??
    ownedCars[0] ?? null;

  const username = user?.username ?? "Operator";
  const prestige = endgameData?.prestige?.currentLabel ?? null;
  const activeTitle = identityData?.activeTitle?.name ?? null;
  const classLabel = CLASS_LABELS[activeCar?.carClass ?? ""] ?? "";
  const rarityColor = activeCar ? (RARITY_COLORS[activeCar.rarity] ?? Colors.accent) : Colors.accent;

  function handleScreenshot() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setScreenshotHint(true);
    setTimeout(() => setScreenshotHint(false), 2500);
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center", gap: 14 }]}>
        <View style={styles.loadingIcon}>
          <Ionicons name="camera-outline" size={26} color={Colors.accent} />
        </View>
        <Text style={styles.loadingTitle}>Photo Mode</Text>
        <Text style={styles.loadingText}>Setting up your scene...</Text>
        <ActivityIndicator color={Colors.accent} style={{ marginTop: 4 }} />
      </View>
    );
  }

  // ── No cars owned ──────────────────────────────────────────────────────────
  if (ownedCars.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>CAPTURE YOUR STORY</Text>
            <Text style={styles.headerTitle}>Photo Mode</Text>
          </View>
        </Animated.View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            <Ionicons name="camera-outline" size={34} color={Colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Vehicles Owned</Text>
          <Text style={styles.emptyText}>
            Unlock your first car from the Collection to compose a photo with your character. Trophies and prestige markers — all in one frame.
          </Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.replace("/cars")}>
            <Ionicons name="car-outline" size={14} color={Colors.bg} />
            <Text style={styles.emptyBtnText}>Browse Collection</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Main photo mode ────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(280)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>CAPTURE YOUR STORY</Text>
            <Text style={styles.headerTitle}>Photo Mode</Text>
          </View>
          <Pressable
            style={[styles.collectionBtn]}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); router.back(); }}
          >
            <Ionicons name="grid-outline" size={15} color={Colors.textSecondary} />
          </Pressable>
        </Animated.View>

        {/* Scene canvas */}
        {activeCar && (
          <Animated.View entering={FadeInDown.delay(20).springify()} style={styles.sceneContainer}>
            <PhotoScene
              car={activeCar}
              scene={scene}
              showOverlay={showOverlay}
              username={username}
              prestige={prestige}
              activeTitle={activeTitle}
              classLabel={classLabel}
            />
            {/* Screenshot hint overlay */}
            {screenshotHint && (
              <Animated.View entering={ZoomIn.duration(180)} exiting={FadeOut.duration(400)} style={styles.screenshotHintOverlay}>
                <View style={styles.screenshotHintBox}>
                  <Ionicons name="phone-portrait-outline" size={22} color={Colors.green} />
                  <Text style={styles.screenshotHintTitle}>Take a Screenshot</Text>
                  <Text style={styles.screenshotHintText}>
                    {Platform.OS === "ios"
                      ? "Hold Side + Volume Up to capture."
                      : Platform.OS === "android"
                      ? "Hold Power + Volume Down to capture."
                      : "Use your system screenshot shortcut."}
                  </Text>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* Action row — screenshot + overlay toggle */}
        <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.actionRow}>
          <Pressable
            style={[styles.screenshotBtn, { backgroundColor: rarityColor }]}
            onPress={handleScreenshot}
          >
            <Ionicons name="phone-portrait-outline" size={18} color="#000" />
            <Text style={styles.screenshotBtnText}>Screenshot to Share</Text>
          </Pressable>
          <Pressable
            style={[styles.overlayToggle, showOverlay && { backgroundColor: Colors.accentDim, borderColor: Colors.accent + "50" }]}
            onPress={() => { Haptics.selectionAsync().catch(() => {}); setShowOverlay(!showOverlay); }}
          >
            <Ionicons
              name={showOverlay ? "id-card" : "id-card-outline"}
              size={17}
              color={showOverlay ? Colors.accent : Colors.textMuted}
            />
          </Pressable>
        </Animated.View>

        {/* Share tip */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.shareTip}>
          <Ionicons name="information-circle-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.shareTipText}>
            Tap "Screenshot to Share" to get platform instructions, then capture using your device.
          </Text>
        </Animated.View>

        {/* Scene selector */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.sectionBlock}>
          <View style={styles.sectionLabelRow}>
            <Ionicons name="image-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.sectionLabel}>SCENE</Text>
          </View>
          <View style={styles.sceneRow}>
            {(["studio", "street", "command"] as Scene[]).map((s) => {
              const sm = SCENE_META[s];
              const active = scene === s;
              return (
                <Pressable
                  key={s}
                  style={[styles.sceneTab, active && { backgroundColor: Colors.accentDim, borderColor: Colors.accent + "50" }]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setScene(s); }}
                >
                  <Ionicons name={sm.icon as any} size={15} color={active ? Colors.accent : Colors.textMuted} />
                  <Text style={[styles.sceneTabLabel, active && { color: Colors.accent }]}>{sm.label}</Text>
                  <Text style={styles.sceneTabMood} numberOfLines={1}>{sm.mood}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Vehicle selector (when multiple owned) */}
        {ownedCars.length > 1 && (
          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.sectionBlock}>
            <View style={styles.sectionLabelRow}>
              <Ionicons name="car-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.sectionLabel}>VEHICLE</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.carSelectRow}>
                {ownedCars.map((c) => {
                  const active = activeCar?.id === c.id;
                  const rc = RARITY_COLORS[c.rarity] ?? Colors.textMuted;
                  return (
                    <Pressable
                      key={c.id}
                      style={[
                        styles.carSelectItem,
                        active && { borderColor: rc + "80", backgroundColor: rc + "10", borderWidth: 1.5 },
                      ]}
                      onPress={() => { Haptics.selectionAsync().catch(() => {}); setSelectedCarId(c.id); }}
                    >
                      <View style={[styles.carSelectIconBox, { backgroundColor: rc + "18" }]}>
                        <Ionicons name="car-sport-outline" size={18} color={rc} />
                      </View>
                      <Text style={[styles.carSelectName, { color: active ? rc : Colors.textSecondary }]} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={styles.carSelectClass} numberOfLines={1}>
                        {CLASS_LABELS[c.carClass ?? ""] ?? ""}
                      </Text>
                      {active && <View style={[styles.carSelectDot, { backgroundColor: rc }]} />}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* Car prestige card */}
        {activeCar && (
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={[styles.carPrestigeCard, { borderLeftColor: rarityColor, backgroundColor: rarityColor + "06" }]}
          >
            <View style={styles.carPrestigeHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.carPrestigeEyebrow}>{classLabel.toUpperCase()}</Text>
                <Text style={[styles.carPrestigeName, { color: rarityColor }]}>{activeCar.name}</Text>
              </View>
              <View style={[styles.rarityBadge, { backgroundColor: rarityColor + "18" }]}>
                <Text style={[styles.rarityBadgeText, { color: rarityColor }]}>{activeCar.rarity.toUpperCase()}</Text>
              </View>
            </View>

            {activeCar.styleEffect ? (
              <Text style={styles.carStyleEffect} numberOfLines={2}>{activeCar.styleEffect}</Text>
            ) : activeCar.description ? (
              <Text style={styles.carStyleEffect} numberOfLines={2}>{activeCar.description}</Text>
            ) : null}

            {activeCar.prestigeValue > 0 && (
              <View style={styles.carPrestigeRow}>
                <Ionicons name="shield-checkmark" size={13} color={Colors.gold} />
                <Text style={styles.carPrestigeText}>+{activeCar.prestigeValue} Prestige Contribution</Text>
                <View style={styles.carPrestigeBar}>
                  <View style={[styles.carPrestigeBarFill, {
                    width: `${Math.min(100, activeCar.prestigeValue * 10)}%` as any,
                    backgroundColor: Colors.gold,
                  }]} />
                </View>
              </View>
            )}

            {/* Overlay legend */}
            <View style={styles.cardLegend}>
              <View style={styles.cardLegendDot} />
              <Text style={styles.cardLegendText}>
                {showOverlay ? "Identity card visible in scene" : "Identity card hidden — tap the card icon to show"}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 14 },

  loadingIcon: { width: 68, height: 68, borderRadius: 20, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  loadingTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },

  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  headerEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 2 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary, marginTop: 1 },
  collectionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },

  sceneContainer: {
    height: 280, borderRadius: 22, overflow: "hidden",
    backgroundColor: "#090C14",
    borderWidth: 1, borderColor: Colors.border,
  },

  actionRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  screenshotBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 9, borderRadius: 14, paddingVertical: 14,
  },
  screenshotBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#000" },
  overlayToggle: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border,
  },

  screenshotHintOverlay: {
    position: "absolute", inset: 0, alignItems: "center", justifyContent: "center",
    backgroundColor: "#000000BB",
  },
  screenshotHintBox: { alignItems: "center", gap: 10, padding: 24, backgroundColor: Colors.bgCard, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, marginHorizontal: 24 },
  screenshotHintTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary, textAlign: "center" },
  screenshotHintText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 19 },

  shareTip: { flexDirection: "row", alignItems: "flex-start", gap: 7, paddingHorizontal: 2 },
  shareTipText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, lineHeight: 16 },

  sectionBlock: { gap: 10 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },

  sceneRow: { flexDirection: "row", gap: 8 },
  sceneTab: {
    flex: 1, alignItems: "center", gap: 4,
    paddingVertical: 11, paddingHorizontal: 6, borderRadius: 13,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  sceneTabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted },
  sceneTabMood: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted, textAlign: "center", opacity: 0.7 },

  carSelectRow: { flexDirection: "row", gap: 10 },
  carSelectItem: {
    alignItems: "center", gap: 5, paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, minWidth: 90,
  },
  carSelectIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  carSelectName: { fontFamily: "Inter_600SemiBold", fontSize: 11, textAlign: "center" },
  carSelectClass: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted, textAlign: "center" },
  carSelectDot: { width: 6, height: 6, borderRadius: 3 },

  carPrestigeCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 15,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 4, gap: 10,
  },
  carPrestigeHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  carPrestigeEyebrow: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },
  carPrestigeName: { fontFamily: "Inter_700Bold", fontSize: 18, lineHeight: 22, marginTop: 2 },
  rarityBadge: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4, alignSelf: "flex-start", marginTop: 4 },
  rarityBadgeText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.8 },
  carStyleEffect: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18, fontStyle: "italic" },
  carPrestigeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  carPrestigeText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.gold },
  carPrestigeBar: { flex: 1, height: 4, backgroundColor: Colors.bgElevated, borderRadius: 2 },
  carPrestigeBarFill: { height: 4, borderRadius: 2 },
  cardLegend: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardLegendDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.textMuted },
  cardLegendText: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, flex: 1 },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 36, marginTop: 16 },
  emptyIconBox: { width: 74, height: 74, borderRadius: 20, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary, textAlign: "center" },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.accent, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 13, marginTop: 4 },
  emptyBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#000" },
});

const ps = StyleSheet.create({
  sceneOuter: {
    flex: 1, flexDirection: "row", alignItems: "flex-end",
    paddingLeft: 12, paddingBottom: 12, position: "relative",
  },
  characterWrap: { zIndex: 2, marginBottom: 14, marginRight: -14 },
  carWrap: { zIndex: 1 },

  overlayCard: {
    position: "absolute", top: 14, right: 14,
    borderRadius: 12, padding: 10, borderWidth: 1,
    gap: 3, minWidth: 110, maxWidth: 150, overflow: "hidden",
  },
  overlayCorner: { position: "absolute", top: 0, right: 0, width: 4, height: 40, borderBottomLeftRadius: 2 },
  overlayUsername: { fontFamily: "Inter_700Bold", fontSize: 13 },
  overlayTitle: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.gold, opacity: 0.9 },
  overlayPrestige: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted, letterSpacing: 0.3 },
  overlaySep: { height: 1, backgroundColor: "#FFFFFF15", marginVertical: 2 },
  overlayCarRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  overlayCarName: { fontFamily: "Inter_700Bold", fontSize: 10, flex: 1 },
  overlayClass: { fontFamily: "Inter_400Regular", fontSize: 8, letterSpacing: 0.3 },
  overlayBrand: { marginTop: 4, borderTopWidth: 1, borderTopColor: "#FFFFFF12", paddingTop: 4 },
  overlayBrandText: { fontFamily: "Inter_700Bold", fontSize: 7, color: "#FFFFFF40", letterSpacing: 1 },
});

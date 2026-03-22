import React, { useState, useRef } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn, ZoomIn } from "react-native-reanimated";
import Svg, {
  Path, Circle, Rect, Ellipse, LinearGradient, Defs, Stop, Text as SvgText,
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
};

type Scene = "studio" | "street" | "command";

const SCENE_META: Record<Scene, { label: string; icon: string; bg1: string; bg2: string; ground: string }> = {
  studio:  { label: "Studio",  icon: "aperture-outline",  bg1: "#0D1117", bg2: "#1A1F2E", ground: "#161B27" },
  street:  { label: "Street",  icon: "navigate-outline",  bg1: "#050A0F", bg2: "#0D1A2A", ground: "#0A1520" },
  command: { label: "Command", icon: "desktop-outline",   bg1: "#0A0910", bg2: "#151025", ground: "#100E1A" },
};

const CLASS_LABELS: Record<string, string> = {
  starter: "Starter",
  rising: "Rising Luxury",
  executive: "Executive",
  elite: "Elite Supercar",
  prestige: "Prestige Signature",
};

// ─── Character Silhouette ─────────────────────────────────────────────────────

function CharacterSilhouette({ color, size = 100 }: { color: string; size?: number }) {
  const s = size;
  return (
    <Svg width={s * 0.5} height={s} viewBox="0 0 50 100">
      {/* Head */}
      <Circle cx={25} cy={12} r={9} fill={color + "40"} stroke={color + "80"} strokeWidth={1.2} />
      {/* Body */}
      <Rect x={14} y={22} width={22} height={34} rx={5} fill={color + "30"} stroke={color + "70"} strokeWidth={1} />
      {/* Arms */}
      <Rect x={4} y={24} width={9} height={24} rx={4} fill={color + "25"} stroke={color + "60"} strokeWidth={1} />
      <Rect x={37} y={24} width={9} height={24} rx={4} fill={color + "25"} stroke={color + "60"} strokeWidth={1} />
      {/* Legs */}
      <Rect x={14} y={57} width={10} height={32} rx={4} fill={color + "30"} stroke={color + "70"} strokeWidth={1} />
      <Rect x={26} y={57} width={10} height={32} rx={4} fill={color + "30"} stroke={color + "70"} strokeWidth={1} />
    </Svg>
  );
}

// ─── Car Silhouette (large) ───────────────────────────────────────────────────

function CarSilhouetteLarge({ rarity, width = 280 }: { rarity: string; width?: number }) {
  const color = RARITY_COLORS[rarity] ?? "#9CA3AF";
  const h = width * 0.42;
  const w = width;

  return (
    <Svg width={w} height={h + 20} viewBox={`0 0 ${w} ${h + 20}`}>
      {/* Glow under car */}
      <Ellipse cx={w / 2} cy={h + 12} rx={w * 0.38} ry={6} fill={color + "25"} />
      {/* Body */}
      <Rect x={6} y={h * 0.45} width={w - 12} height={h * 0.44} rx={8} fill={color + "25"} stroke={color + "90"} strokeWidth={1.5} />
      {/* Cabin */}
      <Path
        d={`M${w*0.22},${h*0.45} L${w*0.30},${h*0.08} L${w*0.70},${h*0.08} L${w*0.78},${h*0.45} Z`}
        fill={color + "18"} stroke={color + "90"} strokeWidth={1.5}
      />
      {/* Windows */}
      <Path
        d={`M${w*0.245},${h*0.43} L${w*0.33},${h*0.12} L${w*0.475},${h*0.12} L${w*0.475},${h*0.43} Z`}
        fill={color + "30"} stroke={color + "60"} strokeWidth={1}
      />
      <Path
        d={`M${w*0.525},${h*0.43} L${w*0.525},${h*0.12} L${w*0.67},${h*0.12} L${w*0.755},${h*0.43} Z`}
        fill={color + "30"} stroke={color + "60"} strokeWidth={1}
      />
      {/* Front/rear lights */}
      <Rect x={w - 10} y={h * 0.50} width={6} height={h * 0.16} rx={3} fill={color} />
      <Rect x={4} y={h * 0.50} width={6} height={h * 0.16} rx={3} fill={color + "70"} />
      {/* Front accent line */}
      <Rect x={w - 8} y={h * 0.72} width={4} height={h * 0.06} rx={2} fill={color + "80"} />
      {/* Wheels */}
      <Circle cx={w * 0.215} cy={h * 0.9} r={h * 0.22} fill={color + "15"} stroke={color} strokeWidth={2} />
      <Circle cx={w * 0.785} cy={h * 0.9} r={h * 0.22} fill={color + "15"} stroke={color} strokeWidth={2} />
      <Circle cx={w * 0.215} cy={h * 0.9} r={h * 0.1} fill={color + "50"} />
      <Circle cx={w * 0.785} cy={h * 0.9} r={h * 0.1} fill={color + "50"} />
      {/* Rim spokes */}
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const r = h * 0.18;
        const cx1 = w * 0.215; const cy1 = h * 0.9;
        return (
          <Path
            key={angle}
            d={`M${cx1},${cy1} L${cx1 + Math.cos(rad) * r},${cy1 + Math.sin(rad) * r}`}
            stroke={color + "80"} strokeWidth={1}
          />
        );
      })}
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const r = h * 0.18;
        const cx1 = w * 0.785; const cy1 = h * 0.9;
        return (
          <Path
            key={angle}
            d={`M${cx1},${cy1} L${cx1 + Math.cos(rad) * r},${cy1 + Math.sin(rad) * r}`}
            stroke={color + "80"} strokeWidth={1}
          />
        );
      })}
    </Svg>
  );
}

// ─── Photo Scene Composition ──────────────────────────────────────────────────

function PhotoScene({
  car, scene, showOverlay, username, prestige,
}: {
  car: Car;
  scene: Scene;
  showOverlay: boolean;
  username: string;
  prestige: string | null;
}) {
  const sm = SCENE_META[scene];
  const rarityColor = RARITY_COLORS[car.rarity] ?? "#9CA3AF";

  return (
    <View style={photoStyles.sceneOuter}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 360 240">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={sm.bg1} stopOpacity={1} />
            <Stop offset="100%" stopColor={sm.bg2} stopOpacity={1} />
          </LinearGradient>
          <LinearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={sm.ground} stopOpacity={1} />
            <Stop offset="100%" stopColor={sm.bg1} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="glow" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={rarityColor} stopOpacity={0} />
            <Stop offset="50%" stopColor={rarityColor} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={rarityColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {/* Background */}
        <Rect x={0} y={0} width={360} height={240} fill="url(#bg)" />
        {/* Glow strip */}
        <Rect x={0} y={120} width={360} height={80} fill="url(#glow)" />
        {/* Ground */}
        <Rect x={0} y={200} width={360} height={40} fill="url(#ground)" />
        {/* Scene-specific decorators */}
        {scene === "studio" && (
          <>
            <Circle cx={40} cy={30} r={60} fill={rarityColor + "05"} />
            <Circle cx={320} cy={200} r={80} fill={rarityColor + "05"} />
          </>
        )}
        {scene === "street" && (
          <>
            <Rect x={0} y={205} width={360} height={2} fill={rarityColor + "20"} />
            <Rect x={160} y={207} width={40} height={6} rx={3} fill={rarityColor + "15"} />
          </>
        )}
        {scene === "command" && (
          <>
            <Rect x={0} y={0} width={360} height={1} fill={rarityColor + "30"} />
            <Rect x={0} y={239} width={360} height={1} fill={rarityColor + "30"} />
            <Rect x={0} y={0} width={1} height={240} fill={rarityColor + "20"} />
            <Rect x={359} y={0} width={1} height={240} fill={rarityColor + "20"} />
          </>
        )}
      </Svg>

      {/* Character */}
      <View style={[photoStyles.characterWrap]}>
        <CharacterSilhouette color={rarityColor} size={100} />
      </View>

      {/* Car */}
      <View style={photoStyles.carWrap}>
        <CarSilhouetteLarge rarity={car.rarity} width={210} />
      </View>

      {/* Overlay badge */}
      {showOverlay && (
        <View style={[photoStyles.overlayBadge, { borderColor: rarityColor + "60" }]}>
          <Text style={[photoStyles.overlayUsername, { color: rarityColor }]}>{username}</Text>
          {prestige && (
            <Text style={photoStyles.overlayPrestige}>{prestige}</Text>
          )}
          <View style={[photoStyles.overlayCarRow]}>
            <Ionicons name="car-sport-outline" size={10} color={rarityColor} />
            <Text style={[photoStyles.overlayCarName, { color: rarityColor }]}>{car.name}</Text>
          </View>
        </View>
      )}

      {/* Rarity corner glow */}
      <View style={[photoStyles.rarityCorner, { backgroundColor: rarityColor }]} />
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
  const [captured, setCaptured] = useState(false);

  const activeCar: Car | null =
    ownedCars.find((c) => c.id === selectedCarId) ??
    photoData?.featuredCar ??
    ownedCars[0] ??
    null;

  const username = user?.username ?? "Operator";
  const prestige = endgameData?.prestige?.currentLabel ?? null;

  function handleCapture() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCaptured(true);
    setTimeout(() => setCaptured(false), 1800);
  }

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <Text style={styles.loadingText}>Loading photo mode...</Text>
      </View>
    );
  }

  if (ownedCars.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>PHOTO MODE</Text>
          <View style={{ width: 36 }} />
        </Animated.View>
        <View style={styles.emptyState}>
          <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No vehicles owned</Text>
          <Text style={styles.emptyText}>
            Purchase your first vehicle from the Garage to unlock Photo Mode.
          </Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.replace("/cars")}>
            <Ionicons name="car-outline" size={14} color={Colors.bg} />
            <Text style={styles.emptyBtnText}>Browse Garage</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>PHOTO MODE</Text>
            <Text style={styles.headerSub}>Character + Vehicle</Text>
          </View>
        </Animated.View>

        {/* Scene composition */}
        {activeCar && (
          <Animated.View entering={FadeInDown.delay(20).springify()} style={styles.sceneContainer}>
            <PhotoScene
              car={activeCar}
              scene={scene}
              showOverlay={showOverlay}
              username={username}
              prestige={prestige}
            />
            {captured && (
              <Animated.View entering={ZoomIn.duration(200)} style={styles.captureFlash}>
                <Ionicons name="checkmark-circle" size={36} color={Colors.green} />
                <Text style={styles.captureFlashText}>Captured</Text>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* Capture button */}
        <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.captureRow}>
          <Pressable
            style={({ pressed }) => [styles.captureBtn, pressed && { opacity: 0.8 }]}
            onPress={handleCapture}
          >
            <Ionicons name="camera" size={20} color="#000" />
            <Text style={styles.captureBtnText}>Capture Moment</Text>
          </Pressable>
          <Pressable
            style={[styles.overlayToggle, showOverlay && { backgroundColor: Colors.accentDim, borderColor: Colors.accent + "50" }]}
            onPress={() => { Haptics.selectionAsync(); setShowOverlay(!showOverlay); }}
          >
            <Ionicons name={showOverlay ? "id-card" : "id-card-outline"} size={16} color={showOverlay ? Colors.accent : Colors.textMuted} />
          </Pressable>
        </Animated.View>

        {/* Scene selector */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.sectionBlock}>
          <View style={styles.sectionLabelRow}>
            <Ionicons name="image-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.sectionLabel}>SCENE</Text>
          </View>
          <View style={styles.sceneRow}>
            {(["studio", "street", "command"] as Scene[]).map((s) => {
              const sm = SCENE_META[s];
              return (
                <Pressable
                  key={s}
                  style={[styles.sceneTab, scene === s && styles.sceneTabActive]}
                  onPress={() => { Haptics.selectionAsync(); setScene(s); }}
                >
                  <Ionicons
                    name={sm.icon as any}
                    size={15}
                    color={scene === s ? Colors.accent : Colors.textMuted}
                  />
                  <Text style={[styles.sceneTabText, scene === s && styles.sceneTabTextActive]}>
                    {sm.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Vehicle selector */}
        {ownedCars.length > 1 && (
          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.sectionBlock}>
            <View style={styles.sectionLabelRow}>
              <Ionicons name="car-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.sectionLabel}>SELECT VEHICLE</Text>
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
                        active && { borderColor: rc + "80", backgroundColor: rc + "10" },
                      ]}
                      onPress={() => { Haptics.selectionAsync(); setSelectedCarId(c.id); }}
                    >
                      <Ionicons name="car-sport-outline" size={20} color={active ? rc : Colors.textMuted} />
                      <Text style={[styles.carSelectName, { color: active ? rc : Colors.textSecondary }]} numberOfLines={1}>
                        {c.name}
                      </Text>
                      {active && <View style={[styles.carSelectDot, { backgroundColor: rc }]} />}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* Active car details */}
        {activeCar && (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.carInfoCard}>
            <View style={styles.carInfoRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.carInfoName}>{activeCar.name}</Text>
                <Text style={styles.carInfoClass}>{CLASS_LABELS[activeCar.carClass ?? "starter"]}</Text>
              </View>
              <View style={[styles.rarityBadge, { backgroundColor: (RARITY_COLORS[activeCar.rarity] ?? Colors.textMuted) + "20" }]}>
                <Text style={[styles.rarityBadgeText, { color: RARITY_COLORS[activeCar.rarity] ?? Colors.textMuted }]}>
                  {activeCar.rarity.toUpperCase()}
                </Text>
              </View>
            </View>
            {activeCar.prestigeValue > 0 && (
              <View style={styles.prestigeRow}>
                <Ionicons name="shield-checkmark-outline" size={12} color={Colors.gold} />
                <Text style={styles.prestigeText}>+{activeCar.prestigeValue} Prestige Contribution</Text>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  scroll:      { paddingHorizontal: 16, paddingTop: 8, gap: 14 },
  loadingText: { marginTop: 14, fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textMuted },

  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textSecondary, letterSpacing: 2 },
  headerSub:   { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  sceneContainer: {
    height: 240, borderRadius: 20, overflow: "hidden",
    backgroundColor: "#0D1117",
    borderWidth: 1, borderColor: Colors.border,
  },

  captureRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  captureBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14,
  },
  captureBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#000" },
  overlayToggle: {
    width: 46, height: 46, borderRadius: 13,
    backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border,
  },

  captureFlash: {
    position: "absolute", inset: 0, alignItems: "center", justifyContent: "center",
    backgroundColor: "#00000060", gap: 8,
  },
  captureFlashText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.green },

  sectionBlock: { gap: 10 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },

  sceneRow: { flexDirection: "row", gap: 8 },
  sceneTab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.border,
  },
  sceneTabActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent + "50" },
  sceneTabText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted },
  sceneTabTextActive: { color: Colors.accent },

  carSelectRow: { flexDirection: "row", gap: 10 },
  carSelectItem: {
    alignItems: "center", gap: 6, paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    minWidth: 90,
  },
  carSelectName: { fontFamily: "Inter_600SemiBold", fontSize: 11, textAlign: "center" },
  carSelectDot: { width: 6, height: 6, borderRadius: 3 },

  carInfoCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  carInfoRow: { flexDirection: "row", alignItems: "center" },
  carInfoName: { fontFamily: "Inter_700Bold", fontSize: 17, color: Colors.textPrimary },
  carInfoClass: { fontFamily: "Inter_500Medium", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  rarityBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  rarityBadgeText: { fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.8 },
  prestigeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  prestigeText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.gold },

  emptyState: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 40,
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary, textAlign: "center" },
  emptyText:  { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 19 },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.accent, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4,
  },
  emptyBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#000" },
});

const photoStyles = StyleSheet.create({
  sceneOuter: {
    flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "flex-start",
    paddingLeft: 16, paddingBottom: 10, position: "relative",
  },
  characterWrap: {
    zIndex: 2, marginBottom: 8, marginRight: -10,
  },
  carWrap: { zIndex: 1, marginBottom: 0 },
  overlayBadge: {
    position: "absolute", top: 12, right: 12,
    backgroundColor: "#0008", borderRadius: 10, padding: 8,
    borderWidth: 1, gap: 3,
  },
  overlayUsername: { fontFamily: "Inter_700Bold", fontSize: 12 },
  overlayPrestige: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.textMuted, letterSpacing: 0.5 },
  overlayCarRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  overlayCarName: { fontFamily: "Inter_600SemiBold", fontSize: 10 },
  rarityCorner: { position: "absolute", top: 0, left: 0, width: 3, height: 40, borderRadius: 2 },
});

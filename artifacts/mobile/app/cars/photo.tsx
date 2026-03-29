import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Platform, Dimensions, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn, FadeOut } from "react-native-reanimated";
import Svg, {
  Path, Circle, Rect, Ellipse, LinearGradient, Defs, Stop,
  Line, G,
} from "react-native-svg";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { Colors, RARITY_COLORS } from "@/constants/colors";
import { useCarPhotoMode, useCharacterStatus, useIdentity, useEndgame } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { CarVisual } from "@/app/cars/index";
import { EvolvedCharacter, type VisualState, type EquippedWearableState } from "@/app/character/index";

const SCREEN_W = Dimensions.get("window").width;

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

type Scene = "nightcity" | "coastal" | "minimal" | "track";
type AspectRatio = "4:5" | "1:1";

const SCENE_META: Record<Scene, {
  label: string; mood: string; icon: string;
  bg1: string; bg2: string; ground: string;
}> = {
  nightcity: {
    label: "Night City",
    mood: "Dark urban. Neon undertow.",
    icon: "business-outline",
    bg1: "#05080E", bg2: "#0A1628", ground: "#080E1A",
  },
  coastal: {
    label: "Coastal",
    mood: "Horizon. Golden hour. Calm.",
    icon: "water-outline",
    bg1: "#0A0E18", bg2: "#10182A", ground: "#0D1220",
  },
  minimal: {
    label: "Minimal",
    mood: "Pure. Distilled. Elegant.",
    icon: "remove-outline",
    bg1: "#080808", bg2: "#111111", ground: "#0C0C0C",
  },
  track: {
    label: "Track",
    mood: "Speed. Precision. Racing.",
    icon: "speedometer-outline",
    bg1: "#08060E", bg2: "#120E1E", ground: "#0E0B18",
  },
};

const CLASS_LABELS: Record<string, string> = {
  entry: "Entry",
  sport: "Sport",
  performance: "Performance",
  grandtouring: "Grand Touring",
  flagship: "Flagship",
  hypercar: "Hypercar",
};

function getBodyColor(car: Car): string {
  return RARITY_COLORS[car.rarity] ?? Colors.textMuted;
}

const CANVAS_W = SCREEN_W - 32;
const ASPECT_RATIOS: Record<AspectRatio, number> = { "4:5": 5 / 4, "1:1": 1 };

function PhotoScene({
  car, scene, showIdentity, showCarName, showWatermark,
  username, statusTier, activeTitle, classLabel, aspectRatio,
  visualState, equippedWearables, skinTone, bodyType, hairStyle, hairColor,
}: {
  car: Car; scene: Scene; showIdentity: boolean; showCarName: boolean; showWatermark: boolean;
  username: string; statusTier: string | null; activeTitle: string | null; classLabel: string;
  aspectRatio: AspectRatio;
  visualState?: VisualState | null;
  equippedWearables?: EquippedWearableState;
  skinTone?: string;
  bodyType?: string;
  hairStyle?: string;
  hairColor?: string;
}) {
  const sm = SCENE_META[scene];
  const rarityColor = RARITY_COLORS[car.rarity] ?? "#9CA3AF";
  const bodyColor = getBodyColor(car);
  const canvasH = CANVAS_W * ASPECT_RATIOS[aspectRatio];
  const vb = `0 0 380 ${Math.round(380 * ASPECT_RATIOS[aspectRatio])}`;
  const vbH = Math.round(380 * ASPECT_RATIOS[aspectRatio]);
  const groundY = vbH - 60;

  return (
    <View style={[psc.outer, { height: canvasH }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox={vb}>
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
            <Stop offset="50%" stopColor={rarityColor} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={rarityColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={380} height={vbH} fill="url(#bg)" />
        <Rect x={0} y={groundY - 30} width={380} height={90} fill="url(#carGlow)" />
        <Rect x={0} y={groundY} width={380} height={60} fill="url(#ground)" />

        {scene === "nightcity" && (
          <G>
            <Rect x={30} y={40} width={18} height={groundY - 60} rx={2} fill={rarityColor + "06"} stroke={rarityColor + "12"} strokeWidth={0.5} />
            <Rect x={60} y={20} width={22} height={groundY - 40} rx={2} fill={rarityColor + "05"} stroke={rarityColor + "10"} strokeWidth={0.5} />
            <Rect x={290} y={55} width={20} height={groundY - 75} rx={2} fill={rarityColor + "06"} stroke={rarityColor + "10"} strokeWidth={0.5} />
            <Rect x={320} y={30} width={25} height={groundY - 50} rx={2} fill={rarityColor + "05"} stroke={rarityColor + "12"} strokeWidth={0.5} />
            <Rect x={340} y={60} width={15} height={groundY - 80} rx={2} fill={rarityColor + "04"} stroke={rarityColor + "08"} strokeWidth={0.5} />
            {[42, 52, 62, 72, 85].map((y, i) => (
              <Rect key={i} x={33} y={y} width={12} height={5} rx={1} fill={rarityColor + "12"} />
            ))}
            {[30, 45, 58, 75].map((y, i) => (
              <Rect key={i} x={63} y={y} width={16} height={6} rx={1} fill={rarityColor + "10"} />
            ))}
            <Rect x={0} y={groundY} width={380} height={1} fill={rarityColor + "15"} />
            <Ellipse cx={190} cy={groundY + 8} rx={80} ry={3} fill={rarityColor + "10"} />
          </G>
        )}

        {scene === "coastal" && (
          <G>
            <Line x1={0} y1={groundY - 40} x2={380} y2={groundY - 40} stroke="#F5C84220" strokeWidth={0.8} />
            <Ellipse cx={320} cy={groundY - 70} rx={14} ry={14} fill="#F5C84208" stroke="#F5C84215" strokeWidth={0.5} />
            <Rect x={0} y={groundY - 8} width={380} height={2} fill="#4488AA12" />
            <Rect x={0} y={groundY - 2} width={380} height={1} fill="#4488AA08" />
            {[60, 130, 210, 280, 340].map((x, i) => (
              <Ellipse key={i} cx={x} cy={groundY + 15 + (i % 2) * 8} rx={30 + i * 3} ry={2} fill="#4488AA06" />
            ))}
          </G>
        )}

        {scene === "minimal" && (
          <G>
            <Line x1={190} y1={0} x2={190} y2={vbH} stroke={rarityColor + "05"} strokeWidth={0.5} />
            <Line x1={0} y1={groundY} x2={380} y2={groundY} stroke={rarityColor + "08"} strokeWidth={0.5} />
            <Rect x={185} y={groundY - 4} width={10} height={8} rx={1} fill={rarityColor + "06"} />
          </G>
        )}

        {scene === "track" && (
          <G>
            <Rect x={0} y={groundY} width={380} height={2} fill={rarityColor + "25"} />
            <Rect x={0} y={groundY + 12} width={380} height={1} fill={rarityColor + "12"} />
            {[30, 80, 130, 180, 230, 280, 330].map((x, i) => (
              <Rect key={i} x={x} y={groundY + 3} width={20} height={4} rx={1} fill={rarityColor + "10"} />
            ))}
            {[-30, -10, 20, 60, 110].map((y, i) => (
              <Line key={`l${i}`} x1={0} y1={groundY + y} x2={60 - i * 6} y2={groundY + y * 0.5} stroke={rarityColor + "06"} strokeWidth={0.6} />
            ))}
            {[-30, -10, 20, 60, 110].map((y, i) => (
              <Line key={`r${i}`} x1={380} y1={groundY + y} x2={320 + i * 6} y2={groundY + y * 0.5} stroke={rarityColor + "06"} strokeWidth={0.6} />
            ))}
            <Rect x={2} y={groundY - 20} width={3} height={20} rx={1} fill={rarityColor + "15"} />
            <Rect x={375} y={groundY - 20} width={3} height={20} rx={1} fill={rarityColor + "15"} />
          </G>
        )}
      </Svg>

      <View style={[psc.compositionWrap, { height: canvasH }]}>
        <View style={psc.characterPos}>
          <EvolvedCharacter
            visualState={visualState ?? undefined}
            equippedWearables={equippedWearables ?? undefined}
            skinTone={skinTone ?? "tone-3"}
            bodyType={bodyType ?? "male"}
            hairStyle={hairStyle ?? "clean_cut"}
            hairColor={hairColor ?? "black"}
            size={canvasH * 0.42}
          />
        </View>
        <View style={psc.carPos}>
          <CarVisual carClass={car.carClass} bodyColor={bodyColor} size={CANVAS_W * 0.62} />
        </View>
      </View>

      {showIdentity && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={psc.identityOverlay}>
          <View style={[psc.identityCard, { borderColor: rarityColor + "50" }]}>
            <View style={[psc.identityAccent, { backgroundColor: rarityColor }]} />
            <Text style={[psc.identityName, { color: rarityColor }]}>{username}</Text>
            {activeTitle && <Text style={psc.identityTitle}>{activeTitle}</Text>}
            {statusTier && <Text style={psc.identityTier}>{statusTier}</Text>}
          </View>
        </Animated.View>
      )}

      {showCarName && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={psc.carNameOverlay}>
          <View style={[psc.carNameCard, { borderColor: rarityColor + "40" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={[psc.carNameDot, { backgroundColor: rarityColor }]} />
              <Text style={[psc.carNameText, { color: rarityColor }]} numberOfLines={1}>{car.name}</Text>
            </View>
            {classLabel ? <Text style={[psc.carClassText, { color: rarityColor + "90" }]}>{classLabel}</Text> : null}
            {car.prestigeValue > 0 && (
              <Text style={psc.carPrestigeText}>+{car.prestigeValue} Prestige</Text>
            )}
          </View>
        </Animated.View>
      )}

      {showWatermark && (
        <View style={psc.watermarkWrap}>
          <Text style={psc.watermarkText}>DisciplineOS</Text>
        </View>
      )}
    </View>
  );
}

export default function PhotoModeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const { user } = useAuth();

  const { data: photoData, isLoading } = useCarPhotoMode();
  const { data: charData } = useCharacterStatus();
  const { data: identityData } = useIdentity();
  const { data: endgameData } = useEndgame();

  const ownedCars: Car[] = photoData?.ownedCars ?? [];
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [scene, setScene] = useState<Scene>("nightcity");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [showIdentity, setShowIdentity] = useState(true);
  const [showCarName, setShowCarName] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const viewShotRef = useRef<ViewShot>(null);

  const activeCar: Car | null =
    ownedCars.find((c) => c.id === selectedCarId) ??
    photoData?.featuredCar ??
    ownedCars[0] ?? null;

  const username = user?.username ?? "Operator";
  const statusTier = charData?.statusTier ?? endgameData?.prestige?.currentLabel ?? null;
  const activeTitle = identityData?.activeTitle?.name ?? null;
  const classLabel = CLASS_LABELS[activeCar?.carClass ?? ""] ?? "";
  const rarityColor = activeCar ? (RARITY_COLORS[activeCar.rarity] ?? Colors.accent) : Colors.accent;

  const visualState = charData?.visualState ?? null;
  const equippedWearables = charData?.equippedWearables ?? null;
  const appearance = charData?.appearance;

  const handleExport = useCallback(async () => {
    if (!viewShotRef.current?.capture) return;
    setIsExporting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      const uri = await viewShotRef.current.capture();
      if (Platform.OS === "web") {
        const link = document.createElement("a");
        link.href = uri;
        link.download = `disciplineos-${Date.now()}.png`;
        link.click();
        Alert.alert("Exported", "Image downloaded successfully.");
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your photo" });
        } else {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === "granted") {
            await MediaLibrary.saveToLibraryAsync(uri);
            Alert.alert("Saved", "Photo saved to your camera roll.");
          } else {
            Alert.alert("Permission Required", "Camera roll access is needed to save photos.");
          }
        }
      }
    } catch {
      Alert.alert("Export Failed", "Could not export the image. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }, []);

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
            Unlock your first car from the Collection to compose a photo with your character.
          </Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.replace("/cars")}>
            <Ionicons name="car-outline" size={14} color={Colors.bg} />
            <Text style={styles.emptyBtnText}>Browse Collection</Text>
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
        <Animated.View entering={FadeIn.duration(280)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>CAPTURE YOUR STORY</Text>
            <Text style={styles.headerTitle}>Photo Mode</Text>
          </View>
          <Pressable style={styles.collectionBtn} onPress={() => { Haptics.selectionAsync().catch(() => {}); router.back(); }}>
            <Ionicons name="grid-outline" size={15} color={Colors.textSecondary} />
          </Pressable>
        </Animated.View>

        {activeCar && (
          <Animated.View entering={FadeInDown.delay(20).springify()} style={styles.sceneContainer}>
            <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }} style={{ backgroundColor: SCENE_META[scene].bg1 }}>
              <PhotoScene
                car={activeCar}
                scene={scene}
                showIdentity={showIdentity}
                showCarName={showCarName}
                showWatermark={showWatermark}
                username={username}
                statusTier={statusTier}
                activeTitle={activeTitle}
                classLabel={classLabel}
                aspectRatio={aspectRatio}
                visualState={visualState}
                equippedWearables={equippedWearables}
                skinTone={appearance?.skinTone}
                bodyType={appearance?.bodyType}
                hairStyle={appearance?.hairStyle}
                hairColor={appearance?.hairColor}
              />
            </ViewShot>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.actionRow}>
          <Pressable
            style={[styles.exportBtn, { backgroundColor: rarityColor, opacity: isExporting ? 0.7 : 1 }]}
            onPress={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Ionicons name="share-outline" size={18} color="#000" />
            )}
            <Text style={styles.exportBtnText}>{isExporting ? "Exporting..." : "Export & Share"}</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(55).springify()} style={styles.sectionBlock}>
          <View style={styles.sectionLabelRow}>
            <Ionicons name="options-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.sectionLabel}>OVERLAYS</Text>
          </View>
          <View style={styles.toggleRow}>
            <OverlayToggle
              label="Identity"
              icon="person-outline"
              active={showIdentity}
              onToggle={() => { Haptics.selectionAsync().catch(() => {}); setShowIdentity(!showIdentity); }}
            />
            <OverlayToggle
              label="Car Name"
              icon="car-sport-outline"
              active={showCarName}
              onToggle={() => { Haptics.selectionAsync().catch(() => {}); setShowCarName(!showCarName); }}
            />
            <OverlayToggle
              label="Watermark"
              icon="water-outline"
              active={showWatermark}
              onToggle={() => { Haptics.selectionAsync().catch(() => {}); setShowWatermark(!showWatermark); }}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(65).springify()} style={styles.sectionBlock}>
          <View style={styles.sectionLabelRow}>
            <Ionicons name="resize-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.sectionLabel}>ASPECT RATIO</Text>
          </View>
          <View style={styles.ratioRow}>
            {(["4:5", "1:1"] as AspectRatio[]).map((r) => {
              const active = aspectRatio === r;
              return (
                <Pressable
                  key={r}
                  style={[styles.ratioTab, active && { backgroundColor: Colors.accentDim, borderColor: Colors.accent + "50" }]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setAspectRatio(r); }}
                >
                  <Text style={[styles.ratioLabel, active && { color: Colors.accent }]}>{r}</Text>
                  <Text style={styles.ratioHint}>{r === "4:5" ? "Story / Reel" : "Square"}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(75).springify()} style={styles.sectionBlock}>
          <View style={styles.sectionLabelRow}>
            <Ionicons name="image-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.sectionLabel}>SCENE</Text>
          </View>
          <View style={styles.sceneRow}>
            {(["nightcity", "coastal", "minimal", "track"] as Scene[]).map((s) => {
              const meta = SCENE_META[s];
              const active = scene === s;
              return (
                <Pressable
                  key={s}
                  style={[styles.sceneTab, active && { backgroundColor: Colors.accentDim, borderColor: Colors.accent + "50" }]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setScene(s); }}
                >
                  <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={15} color={active ? Colors.accent : Colors.textMuted} />
                  <Text style={[styles.sceneTabLabel, active && { color: Colors.accent }]}>{meta.label}</Text>
                  <Text style={styles.sceneTabMood} numberOfLines={1}>{meta.mood}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {ownedCars.length > 1 && (
          <Animated.View entering={FadeInDown.delay(85).springify()} style={styles.sectionBlock}>
            <View style={styles.sectionLabelRow}>
              <Ionicons name="car-outline" size={12} color={Colors.textMuted} />
              <Text style={styles.sectionLabel}>VEHICLE</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.carSelectRow}>
                {ownedCars.map((c) => {
                  const active = activeCar?.id === c.id;
                  const rc = RARITY_COLORS[c.rarity] ?? Colors.textMuted;
                  const hex = getBodyColor(c);
                  return (
                    <Pressable
                      key={c.id}
                      style={[styles.carSelectItem, active && { borderColor: rc + "80", backgroundColor: rc + "10", borderWidth: 1.5 }]}
                      onPress={() => { Haptics.selectionAsync().catch(() => {}); setSelectedCarId(c.id); }}
                    >
                      <View style={styles.carSelectVisual}>
                        <CarVisual carClass={c.carClass} bodyColor={hex} size={60} />
                      </View>
                      <Text style={[styles.carSelectName, { color: active ? rc : Colors.textSecondary }]} numberOfLines={1}>{c.name}</Text>
                      <Text style={styles.carSelectClass} numberOfLines={1}>{CLASS_LABELS[c.carClass ?? ""] ?? ""}</Text>
                      {active && <View style={[styles.carSelectDot, { backgroundColor: rc }]} />}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function OverlayToggle({ label, icon, active, onToggle }: { label: string; icon: string; active: boolean; onToggle: () => void }) {
  return (
    <Pressable style={[styles.overlayToggleBtn, active && { backgroundColor: Colors.accentDim, borderColor: Colors.accent + "50" }]} onPress={onToggle}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={14} color={active ? Colors.accent : Colors.textMuted} />
      <Text style={[styles.overlayToggleLabel, active && { color: Colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

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

  sceneContainer: { borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: Colors.border },

  actionRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  exportBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderRadius: 14, paddingVertical: 14 },
  exportBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#000" },

  sectionBlock: { gap: 10 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionLabel: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },

  toggleRow: { flexDirection: "row", gap: 8 },
  overlayToggleBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 11, borderRadius: 12,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  overlayToggleLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.textMuted },

  ratioRow: { flexDirection: "row", gap: 8 },
  ratioTab: {
    flex: 1, alignItems: "center", gap: 3,
    paddingVertical: 11, paddingHorizontal: 8, borderRadius: 13,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  ratioLabel: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textMuted },
  ratioHint: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted, opacity: 0.7 },

  sceneRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  sceneTab: {
    width: (SCREEN_W - 32 - 8) / 2 - 4, alignItems: "center", gap: 4,
    paddingVertical: 11, paddingHorizontal: 6, borderRadius: 13,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  sceneTabLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.textMuted },
  sceneTabMood: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted, textAlign: "center", opacity: 0.7 },

  carSelectRow: { flexDirection: "row", gap: 10 },
  carSelectItem: {
    alignItems: "center", gap: 5, paddingVertical: 10, paddingHorizontal: 10,
    backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, minWidth: 90,
  },
  carSelectVisual: { height: 36, justifyContent: "center" },
  carSelectName: { fontFamily: "Inter_600SemiBold", fontSize: 11, textAlign: "center" },
  carSelectClass: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted, textAlign: "center" },
  carSelectDot: { width: 6, height: 6, borderRadius: 3 },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 36, marginTop: 16 },
  emptyIconBox: { width: 74, height: 74, borderRadius: 20, backgroundColor: Colors.bgCard, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary, textAlign: "center" },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted, textAlign: "center", lineHeight: 20 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.accent, borderRadius: 14, paddingHorizontal: 22, paddingVertical: 13, marginTop: 4 },
  emptyBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#000" },
});

const psc = StyleSheet.create({
  outer: { position: "relative", overflow: "hidden" },
  compositionWrap: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    flexDirection: "row", alignItems: "flex-end",
    paddingLeft: 16, paddingBottom: 20, paddingRight: 16,
  },
  characterPos: { zIndex: 2, marginBottom: 0, marginRight: -16 },
  carPos: { zIndex: 1, flex: 1, alignItems: "center" },

  identityOverlay: { position: "absolute", top: 14, right: 14 },
  identityCard: {
    borderRadius: 12, padding: 10, borderWidth: 1,
    backgroundColor: "#000000CC", gap: 2, minWidth: 100, maxWidth: 140, overflow: "hidden",
  },
  identityAccent: { position: "absolute", top: 0, right: 0, width: 4, height: 36, borderBottomLeftRadius: 2 },
  identityName: { fontFamily: "Inter_700Bold", fontSize: 13 },
  identityTitle: { fontFamily: "Inter_500Medium", fontSize: 9, color: Colors.gold, opacity: 0.9 },
  identityTier: { fontFamily: "Inter_400Regular", fontSize: 9, color: Colors.textMuted, letterSpacing: 0.3 },

  carNameOverlay: { position: "absolute", bottom: 14, right: 14 },
  carNameCard: {
    borderRadius: 10, padding: 8, borderWidth: 1,
    backgroundColor: "#000000BB", gap: 2, minWidth: 90, maxWidth: 140, overflow: "hidden",
  },
  carNameDot: { width: 5, height: 5, borderRadius: 3 },
  carNameText: { fontFamily: "Inter_700Bold", fontSize: 11, flex: 1 },
  carClassText: { fontFamily: "Inter_400Regular", fontSize: 8, letterSpacing: 0.3 },
  carPrestigeText: { fontFamily: "Inter_600SemiBold", fontSize: 8, color: Colors.gold },

  watermarkWrap: { position: "absolute", bottom: 14, left: 14, opacity: 0.35 },
  watermarkText: { fontFamily: "Inter_700Bold", fontSize: 8, color: Colors.textMuted, letterSpacing: 1.5 },
});

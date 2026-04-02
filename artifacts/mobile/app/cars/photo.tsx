import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, Platform, Dimensions, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import Svg, {
  Rect, Ellipse, LinearGradient as SvgLinearGradient, RadialGradient,
  Defs, Stop, Line, G,
} from "react-native-svg";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { BlurView } from "expo-blur";
import { Colors, RARITY_COLORS } from "@/constants/colors";
import { useCarPhotoMode, useCharacterStatus } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { CarVisual } from "@/app/cars/index";
import { EvolvedCharacter, type VisualState, type EquippedWearableState } from "@/app/character/index";
import GLBViewer from "@/components/GLBViewer";

const SCREEN_W = Dimensions.get("window").width;

const CAR_GLB_MAP: Record<string, string> = {
  "Series M Black": "2025_bmw_m4_competition.glb",
  "Alpine GT": "bmw_m4_widebody.glb",
  "Toyota RAV4 Hybrid": "2023_toyota_rav4_hybrid.glb",
  "BYD Seal": "2024_byd_seal.glb",
  "Audi TT Coupe": "2007_audi_tt_coupe.glb",
  "Toyota Avalon Hybrid": "2023_toyota_avalon_hybrid_limited.glb",
  "Toyota GR86": "2022_toyota_gr86.glb",
  "Honda Civic Type R": "2023_honda_civic_type_r.glb",
  "Dodge Viper ACR": "2016_dodge_viper_acr.glb",
  "Toyota GR Supra Varis Supreme": "2020_varis_toyota_gr_supra.glb",
  "Audi TT RS Iconic Edition": "2023_audi_tt_rs_iconic_edition.glb",
  "BYD Yangwang U7": "2024_byd_yangwang_u7.glb",
  "Dodge Challenger SRT Demon": "dodge_challenger_srt_demon.glb",
  "Toyota GR Supra LB Works": "2020_lbworks_toyota_supra_a90.glb",
  "BYD Yangwang U9": "2024_byd_yangwang_u9.glb",
  "Porsche 911 GT3 Touring": "2022_porsche_911_gt3_touring_992.glb",
  "Porsche 911 GT3 RS": "porsche_911_gt3_rs_2023.glb",
  "Lamborghini Reventón Roadster": "2010_lamborghini_reventon_roadster.glb",
  "Lamborghini Centenario Roadster": "lamborghini_centenario_roadster.glb",
};

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

type Scene = "nightcity" | "coastal" | "showroom" | "track";
type AspectRatio = "4:5" | "1:1";

const SCENE_META: Record<Scene, {
  label: string; mood: string; icon: string;
  bg1: string; bg2: string; bg3?: string; ground: string; accent: string;
}> = {
  nightcity: {
    label: "Night City",
    mood: "Dark urban. Neon undertow.",
    icon: "business-outline",
    bg1: "#020818", bg2: "#0A0A2A", ground: "#060818", accent: "#7c5af5",
  },
  coastal: {
    label: "Coastal",
    mood: "Golden hour. Warm glow.",
    icon: "sunny-outline",
    bg1: "#1A0F00", bg2: "#7A3400", bg3: "#C17F1E", ground: "#120A00", accent: "#F5C842",
  },
  showroom: {
    label: "Showroom",
    mood: "Luxury. Clean. Minimal.",
    icon: "diamond-outline",
    bg1: "#B8B8B8", bg2: "#D0D0D0", bg3: "#E8E8E8", ground: "#C0C0C0", accent: "#888888",
  },
  track: {
    label: "Track",
    mood: "Speed. Precision. Racing.",
    icon: "speedometer-outline",
    bg1: "#08060E", bg2: "#120E1E", ground: "#0E0B18", accent: "#E53E3E",
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

function getPrestigeTagline(pv: number): string {
  if (pv >= 10) return "Elite. Undisputed.";
  if (pv >= 6) return "Few make it this far.";
  if (pv >= 3) return "Earned through discipline.";
  return "The journey begins.";
}

const CANVAS_W = SCREEN_W - 32;
const ASPECT_RATIOS: Record<AspectRatio, number> = { "4:5": 5 / 4, "1:1": 1 };

function PhotoScene({
  car, username, classLabel, aspectRatio, scene, userLevel,
  visualState, equippedWearables, skinTone, bodyType, hairStyle, hairColor,
}: {
  car: Car; username: string; classLabel: string;
  aspectRatio: AspectRatio; scene: Scene; userLevel: number | null;
  visualState?: VisualState | null;
  equippedWearables?: EquippedWearableState;
  skinTone?: string;
  bodyType?: string;
  hairStyle?: string;
  hairColor?: string;
}) {
  const [glbFailed, setGlbFailed] = useState(false);
  const glbFile = CAR_GLB_MAP[car.name];
  useEffect(() => { setGlbFailed(false); }, [car.id, glbFile]);
  const sm = SCENE_META[scene];
  const rarityColor = RARITY_COLORS[car.rarity] ?? "#9CA3AF";
  const bodyColor = getBodyColor(car);
  const canvasH = CANVAS_W * ASPECT_RATIOS[aspectRatio];
  const vb = `0 0 380 ${Math.round(380 * ASPECT_RATIOS[aspectRatio])}`;
  const vbH = Math.round(380 * ASPECT_RATIOS[aspectRatio]);
  const groundY = vbH - 90;
  const use3D = !!glbFile && !glbFailed;
  const tagline = getPrestigeTagline(car.prestigeValue);

  return (
    <View style={[psc.outer, { height: canvasH }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox={vb}>
        <Defs>
          <SvgLinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={sm.bg3 ?? sm.bg1} stopOpacity={1} />
            <Stop offset="50%" stopColor={sm.bg2} stopOpacity={1} />
            <Stop offset="100%" stopColor={sm.bg1} stopOpacity={1} />
          </SvgLinearGradient>
          <SvgLinearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={sm.ground} stopOpacity={0.9} />
            <Stop offset="100%" stopColor={sm.bg1} stopOpacity={0} />
          </SvgLinearGradient>
          <RadialGradient id="carShadow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="#000000" stopOpacity={0.5} />
            <Stop offset="70%" stopColor="#000000" stopOpacity={0.2} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="carHalo" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={sm.accent} stopOpacity={0.22} />
            <Stop offset="60%" stopColor={sm.accent} stopOpacity={0.08} />
            <Stop offset="100%" stopColor={sm.accent} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="charAura" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={sm.accent} stopOpacity={0.12} />
            <Stop offset="70%" stopColor={sm.accent} stopOpacity={0.04} />
            <Stop offset="100%" stopColor={sm.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Rect x={0} y={0} width={380} height={vbH} fill="url(#bg)" />
        <Rect x={0} y={groundY} width={380} height={vbH - groundY} fill="url(#ground)" />

        <Ellipse cx={230} cy={groundY - 20} rx={100} ry={80} fill="url(#carHalo)" />

        <Ellipse cx={230} cy={groundY + 8} rx={70} ry={6} fill="url(#carShadow)" />

        <Ellipse cx={80} cy={groundY - 10} rx={55} ry={55} fill="url(#charAura)" />

        {scene === "nightcity" && (
          <G>
            <Rect x={25} y={30} width={16} height={groundY - 50} rx={2} fill="#7c5af506" stroke="#7c5af512" strokeWidth={0.5} />
            <Rect x={55} y={15} width={20} height={groundY - 35} rx={2} fill="#7c5af505" stroke="#7c5af510" strokeWidth={0.5} />
            <Rect x={295} y={45} width={18} height={groundY - 65} rx={2} fill="#7c5af506" stroke="#7c5af510" strokeWidth={0.5} />
            <Rect x={325} y={25} width={22} height={groundY - 45} rx={2} fill="#7c5af505" stroke="#7c5af512" strokeWidth={0.5} />
            <Rect x={350} y={50} width={14} height={groundY - 70} rx={2} fill="#7c5af504" stroke="#7c5af508" strokeWidth={0.5} />
            {[38, 48, 58, 68, 80].map((y, i) => (
              <Rect key={`wl${i}`} x={28} y={y} width={10} height={4} rx={1} fill="#7c5af515" />
            ))}
            {[25, 40, 55, 70].map((y, i) => (
              <Rect key={`wr${i}`} x={58} y={y} width={14} height={5} rx={1} fill="#7c5af512" />
            ))}
            {[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((pct, i) => (
              <Line key={`gl${i}`} x1={380 * pct} y1={groundY} x2={190} y2={groundY - 60} stroke="#7c5af508" strokeWidth={0.4} />
            ))}
            <Rect x={0} y={groundY} width={380} height={1} fill="#7c5af518" />
            <Ellipse cx={40} cy={25} rx={5} ry={5} fill="#7c5af508" />
            <Ellipse cx={340} cy={18} rx={7} ry={7} fill="#7c5af506" />
            <Ellipse cx={15} cy={60} rx={4} ry={4} fill="#7c5af507" />
            <Ellipse cx={365} cy={50} rx={3} ry={3} fill="#7c5af509" />
          </G>
        )}

        {scene === "coastal" && (
          <G>
            <Line x1={0} y1={groundY - 50} x2={380} y2={groundY - 50} stroke="#F5C84218" strokeWidth={0.8} />
            <Ellipse cx={330} cy={groundY - 100} rx={22} ry={22} fill="#F5C84210" />
            <Rect x={0} y={groundY - 6} width={380} height={2} fill="#88664415" />
            <Rect x={0} y={groundY} width={380} height={1} fill="#88664410" />
            {[50, 120, 200, 280, 350].map((x, i) => (
              <Ellipse key={`wave${i}`} cx={x} cy={groundY + 12 + (i % 2) * 6} rx={25 + i * 3} ry={2} fill="#88664408" />
            ))}
          </G>
        )}

        {scene === "showroom" && (
          <G>
            <Rect x={0} y={groundY} width={380} height={1} fill="#00000015" />
            <Ellipse cx={230} cy={groundY + 14} rx={90} ry={5} fill="#00000008" />
            <Ellipse cx={230} cy={groundY + 20} rx={60} ry={3} fill="#00000006" />
          </G>
        )}

        {scene === "track" && (
          <G>
            <Rect x={0} y={groundY} width={380} height={2} fill={rarityColor + "28"} />
            <Rect x={0} y={groundY + 14} width={380} height={1} fill={rarityColor + "14"} />
            {[25, 75, 125, 175, 225, 275, 325].map((x, i) => (
              <Rect key={`dash${i}`} x={x} y={groundY + 4} width={22} height={4} rx={1} fill={rarityColor + "12"} />
            ))}
            {[-35, -15, 15, 45, 80].map((y, i) => (
              <Line key={`pl${i}`} x1={0} y1={groundY + y} x2={50 - i * 5} y2={groundY + y * 0.4} stroke={rarityColor + "08"} strokeWidth={0.5} />
            ))}
            {[-35, -15, 15, 45, 80].map((y, i) => (
              <Line key={`pr${i}`} x1={380} y1={groundY + y} x2={330 + i * 5} y2={groundY + y * 0.4} stroke={rarityColor + "08"} strokeWidth={0.5} />
            ))}
            <Rect x={2} y={groundY - 22} width={3} height={22} rx={1} fill={rarityColor + "18"} />
            <Rect x={375} y={groundY - 22} width={3} height={22} rx={1} fill={rarityColor + "18"} />
          </G>
        )}
      </Svg>

      <View style={[psc.compositionWrap, { height: canvasH - 90 }]}>
        <View style={psc.characterPos}>
          <EvolvedCharacter
            visualState={visualState ?? undefined}
            equippedWearables={equippedWearables ?? undefined}
            skinTone={skinTone ?? "tone-3"}
            bodyType={bodyType ?? "male"}
            hairStyle={hairStyle ?? "clean_cut"}
            hairColor={hairColor ?? "black"}
            size={canvasH * 0.36}
          />
        </View>
        <View style={psc.carPos}>
          {use3D ? (
            <GLBViewer
              modelFile={glbFile}
              width={CANVAS_W * 0.62}
              height={canvasH * 0.45}
              autoRotate
              autoRotateSpeed={0.4}
              onError={() => setGlbFailed(true)}
            />
          ) : (
            <CarVisual carClass={car.carClass} bodyColor={bodyColor} size={CANVAS_W * 0.58} />
          )}
        </View>
      </View>

      <View style={psc.achievementPanel}>
        {Platform.OS !== "web" ? (
          <BlurView intensity={40} tint="dark" style={psc.blurFill} />
        ) : null}
        <View style={[psc.panelBg, Platform.OS === "web" && { backgroundColor: "rgba(0,0,0,0.65)" }]} />
        <View style={psc.panelContent}>
          <View style={psc.panelTopRow}>
            <Text style={psc.carName} numberOfLines={1}>{car.name}</Text>
            {classLabel ? (
              <View style={[psc.classBadge, { borderColor: rarityColor + "50" }]}>
                <Text style={[psc.classText, { color: rarityColor }]}>{classLabel}</Text>
              </View>
            ) : null}
          </View>
          <Text style={psc.unlockedBy} numberOfLines={1}>
            Unlocked by: {username}
          </Text>
          <View style={psc.statsRow}>
            <Text style={psc.prestigeStat}>
              {"\u2605"} Prestige +{car.prestigeValue}
            </Text>
            {userLevel != null && (
              <Text style={psc.statDot}>{"\u2022"}</Text>
            )}
            {userLevel != null && (
              <Text style={psc.levelStat}>
                Lv {userLevel}
              </Text>
            )}
          </View>
          <Text style={psc.tagline} numberOfLines={1}>
            {tagline}
          </Text>
          <Text style={psc.watermark}>@LifeRPG</Text>
        </View>
      </View>
    </View>
  );
}

export default function PhotoModeScreen() {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const { user } = useAuth();

  const { data: photoData, isLoading } = useCarPhotoMode();
  const { data: charData } = useCharacterStatus();

  const ownedCars: Car[] = photoData?.ownedCars ?? [];
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [scene, setScene] = useState<Scene>("nightcity");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [isExporting, setIsExporting] = useState(false);

  const viewShotRef = useRef<ViewShot>(null);

  const activeCar: Car | null =
    ownedCars.find((c) => c.id === selectedCarId) ??
    photoData?.featuredCar ??
    ownedCars[0] ?? null;

  const username = user?.username ?? "Operator";
  const classLabel = CLASS_LABELS[activeCar?.carClass ?? ""] ?? "";
  const rarityColor = activeCar ? (RARITY_COLORS[activeCar.rarity] ?? Colors.accent) : Colors.accent;
  const userLevel = charData?.dimensionEngine?.avgLevel != null
    ? Math.round(charData.dimensionEngine.avgLevel)
    : null;

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
        link.download = `liferpg-${Date.now()}.png`;
        link.click();
        Alert.alert("Exported", "Image downloaded successfully.");
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your achievement" });
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
                username={username}
                classLabel={classLabel}
                aspectRatio={aspectRatio}
                userLevel={userLevel}
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

        <Animated.View entering={FadeInDown.delay(65).springify()} style={styles.sectionBlock}>
          <View style={styles.sectionLabelRow}>
            <Ionicons name="image-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.sectionLabel}>SCENE</Text>
          </View>
          <View style={styles.sceneRow}>
            {(["nightcity", "coastal", "showroom", "track"] as Scene[]).map((s) => {
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
          <Animated.View entering={FadeInDown.delay(75).springify()} style={styles.sectionBlock}>
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
    position: "absolute", left: 0, right: 0, bottom: 90,
    flexDirection: "row", alignItems: "flex-end",
    paddingLeft: 14, paddingBottom: 10, paddingRight: 14,
  },
  characterPos: { zIndex: 2, marginBottom: 0, marginRight: -14 },
  carPos: { zIndex: 1, flex: 1, alignItems: "center" },

  achievementPanel: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    overflow: "hidden", zIndex: 5, height: 90,
  },
  blurFill: {
    ...StyleSheet.absoluteFillObject,
  },
  panelBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  panelContent: {
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8,
  },
  panelTopRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8,
  },
  carName: {
    fontFamily: "Inter_700Bold", fontSize: 20, color: "#FFFFFF", flex: 1,
  },
  classBadge: {
    borderRadius: 6, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2,
  },
  classText: {
    fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.5,
  },
  unlockedBy: {
    fontFamily: "Inter_400Regular", fontSize: 11, color: "#FFFFFF90", marginTop: 3,
  },
  statsRow: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4,
  },
  prestigeStat: {
    fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#FFD700",
  },
  statDot: {
    fontFamily: "Inter_400Regular", fontSize: 10, color: "#FFFFFF50",
  },
  levelStat: {
    fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#FFFFFFBB",
  },
  tagline: {
    fontFamily: "Inter_400Regular", fontSize: 10, color: "#FFFFFF70",
    fontStyle: "italic", marginTop: 3,
  },
  watermark: {
    position: "absolute", bottom: 8, right: 16,
    fontFamily: "Inter_700Bold", fontSize: 8, color: "#FFFFFF66",
    letterSpacing: 1.2,
  },
});

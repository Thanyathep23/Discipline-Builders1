import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Svg, { Ellipse, Rect, Path, G } from "react-native-svg";
import { Colors } from "@/constants/colors";
import {
  useCars,
  useWearables,
  useEquipItem,
  useFeatureCar,
} from "@/hooks/useApi";
import { saveEquippedWatch } from "@/utils/watchStore";
import GLBViewer, { preloadGLBModels } from "@/components/GLBViewer";

const SCREEN_W = Dimensions.get("window").width;

type WatchKey = string;
type CarKey = string;

interface WatchEntry {
  key: WatchKey;
  id: string;
  label: string;
  icon: string;
  glbFile: string;
  prestige: number;
}

interface CarEntry {
  key: CarKey;
  id: string;
  label: string;
  icon: string;
  glbFile: string;
  prestige: number;
  rarity: string;
}

const WATCH_GLB_MAP: Record<string, string> = {
  apple_watch: "apple_watch.glb",
  apple_watch_ultra_2: "apple_watch_ultra_2.glb",
  rolex_datejust: "rolex_datejust.glb",
  patek_philippe: "patek_philippe.glb",
  breitling_superocean: "breitling_superocean_automatic_44.glb",
  richard_mille: "richard_mille_rm011.glb",
  seiko_watch: "seiko_watch.glb",
  timex_expedition: "timex_expedition_watch.glb",
  chronograph: "chronograph_watch.glb",
  hand_watch: "hand_watch.glb",
};

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

const RARITY_ICON: Record<string, string> = {
  common: "⚪",
  rare: "🔵",
  epic: "🟣",
  legendary: "🟡",
};

function buildWatchList(wearableData: any): WatchEntry[] {
  if (!wearableData?.watch) return [];
  const items: any[] = wearableData.watch;
  return items
    .filter((item: any) => item.isOwned && item.glbFile)
    .map((item: any) => {
      const slug = item.slug || item.id;
      const glbFile = item.glbFile || WATCH_GLB_MAP[slug] || "";
      return {
        key: slug,
        id: item.id,
        label: item.name,
        icon: "⌚",
        glbFile,
        prestige: item.minLevel ?? 0,
      };
    });
}

function buildCarList(carData: any): CarEntry[] {
  if (!carData?.catalog) return [];
  return carData.catalog
    .filter((car: any) => car.isOwned)
    .map((car: any) => {
      const glbFile = CAR_GLB_MAP[car.name] || "";
      return {
        key: car.id,
        id: car.id,
        label: car.name,
        icon: RARITY_ICON[car.rarity] || "🚗",
        glbFile,
        prestige: car.prestigeValue ?? 0,
        rarity: car.rarity,
      };
    });
}

export default function CustomizeScreen() {
  const insets = useSafeAreaInsets();
  const { data: wearableData, isLoading: wearLoading, error: wearError } = useWearables();
  const { data: carData, isLoading: carsLoading, error: carsError } = useCars();

  const equipItem = useEquipItem();
  const featureCar = useFeatureCar();

  const [selectedWatch, setSelectedWatch] = useState<WatchEntry | null>(null);
  const [selectedCar, setSelectedCar] = useState<CarEntry | null>(null);
  const [watchLoading, setWatchLoading] = useState(false);
  const [carLoading, setCarLoading] = useState(false);
  const [loadMs, setLoadMs] = useState<number | null>(null);

  const watches = React.useMemo(() => buildWatchList(wearableData), [wearableData]);
  const cars = React.useMemo(() => buildCarList(carData), [carData]);

  const featuredCarId = carData?.featuredCar?.id ?? null;
  const equippedWatchItems = wearableData?.watch?.filter((w: any) => w.isEquipped) ?? [];
  const equippedWatchId = equippedWatchItems.length > 0 ? equippedWatchItems[0].id : null;

  useEffect(() => {
    if (watches.length > 0 && !selectedWatch) {
      const equipped = watches.find((w) => w.id === equippedWatchId);
      if (equipped) setSelectedWatch(equipped);
    }
  }, [watches, equippedWatchId]);

  useEffect(() => {
    if (cars.length > 0 && !selectedCar) {
      const featured = cars.find((c) => c.id === featuredCarId);
      if (featured) setSelectedCar(featured);
    }
  }, [cars, featuredCarId]);

  useEffect(() => {
    const preloadFiles = [
      ...watches.slice(0, 3).map((w) => w.glbFile).filter(Boolean),
      ...cars.slice(0, 3).map((c) => c.glbFile).filter(Boolean),
    ];
    if (preloadFiles.length > 0) {
      preloadGLBModels(preloadFiles);
    }
  }, [watches, cars]);

  const selectWatch = useCallback(
    (w: WatchEntry) => {
      Haptics.selectionAsync().catch(() => {});
      setSelectedWatch(w);
      equipItem.mutate(w.id, {
        onSuccess: async () => {
          if (w.glbFile) {
            await saveEquippedWatch(w.id, w.glbFile, w.label);
          }
        },
        onError: (e: any) => {
          Alert.alert("Error", e?.message ?? "Failed to equip watch");
        },
      });
    },
    [equipItem]
  );

  const selectCar = useCallback(
    (c: CarEntry) => {
      Haptics.selectionAsync().catch(() => {});
      setSelectedCar(c);
      featureCar.mutate(c.id, {
        onError: (e: any) => {
          Alert.alert("Error", e?.message ?? "Failed to feature car");
        },
      });
    },
    [featureCar]
  );

  const isLoading = wearLoading || carsLoading;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Ionicons name="color-palette-outline" size={16} color={GOLD} />
          <Text style={s.headerTitle}>CUSTOMIZE</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={PURPLE} />
          <Text style={s.loadingTxt}>Loading your collection...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(50).springify()}>
            <View style={s.stage}>
              <View style={s.sceneRow}>
                <View style={s.charContainer}>
                  <CharacterSVG hasWatch={!!selectedWatch} />
                  {selectedWatch && selectedWatch.glbFile ? (
                    <View style={s.watchFloat}>
                      {watchLoading && (
                        <ActivityIndicator
                          size="small"
                          color={GOLD}
                          style={s.viewerSpinner}
                        />
                      )}
                      <GLBViewer
                        modelFile={selectedWatch.glbFile}
                        width={70}
                        height={70}
                        autoRotate
                        autoRotateSpeed={1.5}
                        onLoadStart={() => setWatchLoading(true)}
                        onLoadEnd={(ms) => {
                          setWatchLoading(false);
                          setLoadMs(ms);
                        }}
                        onError={() => setWatchLoading(false)}
                      />
                    </View>
                  ) : null}
                </View>

                <View style={s.carViewer}>
                  {selectedCar && selectedCar.glbFile ? (
                    <>
                      {carLoading && (
                        <View style={s.carLoadingOverlay}>
                          <ActivityIndicator size="large" color={PURPLE} />
                        </View>
                      )}
                      <GLBViewer
                        modelFile={selectedCar.glbFile}
                        width={SCREEN_W - 32 - 120}
                        height={130}
                        autoRotate
                        autoRotateSpeed={0.8}
                        onLoadStart={() => setCarLoading(true)}
                        onLoadEnd={(ms) => {
                          setCarLoading(false);
                          setLoadMs(ms);
                        }}
                        onError={() => setCarLoading(false)}
                      />
                    </>
                  ) : (
                    <View style={s.carEmpty}>
                      <Ionicons
                        name="car-sport-outline"
                        size={28}
                        color={MUTED}
                      />
                      <Text style={s.carEmptyText}>Select a vehicle</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={s.slotRow}>
                <View style={[s.slot, selectedWatch && s.slotOn]}>
                  <Text style={s.slotTxt}>
                    {selectedWatch ? selectedWatch.label : "Wrist — empty"}
                  </Text>
                </View>
                <View style={[s.slot, selectedCar && s.slotOn]}>
                  <Text style={s.slotTxt}>
                    {selectedCar ? selectedCar.label : "Vehicle — empty"}
                  </Text>
                </View>
              </View>
              {loadMs !== null && (
                <Text style={s.perfTxt}>Last load: {loadMs}ms</Text>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <Section title="WATCHES" icon="watch-outline">
              {wearError ? (
                <View style={s.emptySection}>
                  <Ionicons name="warning-outline" size={24} color="#FF6B6B" />
                  <Text style={s.emptySectionTxt}>
                    Failed to load watches. Pull down to refresh.
                  </Text>
                </View>
              ) : watches.length === 0 ? (
                <View style={s.emptySection}>
                  <Text style={s.emptySectionTxt}>
                    No watches owned yet. Visit the Wardrobe to purchase watches.
                  </Text>
                  <TouchableOpacity
                    style={s.shopBtn}
                    onPress={() => router.push("/wearables" as any)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="cart-outline" size={14} color={GOLD} />
                    <Text style={s.shopBtnTxt}>Go to Wardrobe</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={s.grid}>
                  {watches.map((w) => (
                    <TouchableOpacity
                      key={w.key}
                      style={[
                        s.card,
                        selectedWatch?.key === w.key && s.cardOn,
                      ]}
                      onPress={() => selectWatch(w)}
                      activeOpacity={0.75}
                    >
                      {selectedWatch?.key === w.key && (
                        <Text style={s.checkBadge}>✓</Text>
                      )}
                      <Text style={s.cardIcon}>{w.icon}</Text>
                      <Text style={s.cardLabel} numberOfLines={2}>
                        {w.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Section>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <Section title="VEHICLES" icon="car-sport-outline">
              {carsError ? (
                <View style={s.emptySection}>
                  <Ionicons name="warning-outline" size={24} color="#FF6B6B" />
                  <Text style={s.emptySectionTxt}>
                    Failed to load vehicles. Pull down to refresh.
                  </Text>
                </View>
              ) : cars.length === 0 ? (
                <View style={s.emptySection}>
                  <Text style={s.emptySectionTxt}>
                    No vehicles owned yet. Visit the Dream Garage to purchase
                    cars.
                  </Text>
                  <TouchableOpacity
                    style={s.shopBtn}
                    onPress={() => router.push("/cars" as any)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="car-sport-outline" size={14} color={GOLD} />
                    <Text style={s.shopBtnTxt}>Go to Garage</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[s.grid, s.grid3]}>
                  {cars.map((c) => (
                    <TouchableOpacity
                      key={c.key}
                      style={[
                        s.card,
                        s.carCard,
                        selectedCar?.key === c.key && s.cardOn,
                      ]}
                      onPress={() => selectCar(c)}
                      activeOpacity={0.75}
                    >
                      {selectedCar?.key === c.key && (
                        <Text style={s.checkBadge}>✓</Text>
                      )}
                      <Text style={s.cardIcon}>{c.icon}</Text>
                      <Text style={s.cardLabel} numberOfLines={2}>
                        {c.label}
                      </Text>
                      {c.prestige > 0 && (
                        <Text style={s.prestigeLabel}>+{c.prestige}P</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Section>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

function CharacterSVG({ hasWatch }: { hasWatch: boolean }) {
  return (
    <Svg viewBox="0 0 120 200" width={110} height={183}>
      <G>
        <Rect x="50" y="72" width="20" height="16" rx="4" fill="#f5cba7" />
        <Rect x="32" y="86" width="56" height="60" rx="8" fill="#7c5af5" />
        <Rect x="14" y="88" width="20" height="46" rx="9" fill="#7c5af5" />
        <Rect x="86" y="88" width="20" height="46" rx="9" fill="#7c5af5" />
        <Ellipse cx="24" cy="139" rx="10" ry="8" fill="#f5cba7" />
        <Ellipse cx="96" cy="139" rx="10" ry="8" fill="#f5cba7" />
        <Rect x="38" y="144" width="20" height="42" rx="8" fill="#2e2a60" />
        <Rect x="62" y="144" width="20" height="42" rx="8" fill="#2e2a60" />
        <Ellipse cx="48" cy="188" rx="14" ry="8" fill="#1a1530" />
        <Ellipse cx="72" cy="188" rx="14" ry="8" fill="#1a1530" />
        <Ellipse cx="60" cy="54" rx="26" ry="28" fill="#f5cba7" />
        <Ellipse cx="51" cy="51" rx="4" ry="5" fill="#1a1530" />
        <Ellipse cx="69" cy="51" rx="4" ry="5" fill="#1a1530" />
        <Ellipse cx="52" cy="49" rx="1.5" ry="2" fill="white" />
        <Ellipse cx="70" cy="49" rx="1.5" ry="2" fill="white" />
        <Path
          d="M54 65 Q60 70 66 65"
          stroke="#c47040"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <Ellipse cx="60" cy="36" rx="28" ry="18" fill="#2c1810" />
        <Rect x="32" y="32" width="10" height="24" rx="5" fill="#2c1810" />
        <Rect x="78" y="32" width="10" height="24" rx="5" fill="#2c1810" />
        {hasWatch && (
          <Ellipse
            cx="24"
            cy="132"
            rx="7"
            ry="5"
            fill="#f5a623"
            opacity={0.6}
          />
        )}
      </G>
    </Svg>
  );
}

const Section: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <View style={s.section}>
    <View style={s.secHeader}>
      <Ionicons name={icon as any} size={13} color={MUTED} />
      <Text style={s.secTitle}>{title}</Text>
      <View style={s.secLine} />
    </View>
    {children}
  </View>
);

const DARK = "#0a0812";
const PANEL = "#110e24";
const BORDER = "#231f3e";
const PURPLE = "#7c5af5";
const GOLD = "#f5a623";
const MUTED = "#6b658a";
const GREEN = "#2ecc71";

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PANEL,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.textPrimary,
    letterSpacing: 1.2,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingTxt: {
    fontSize: 12,
    color: MUTED,
    fontFamily: "Inter_400Regular",
  },
  scroll: { padding: 16 },

  stage: {
    backgroundColor: PANEL,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sceneRow: { flexDirection: "row", alignItems: "flex-end", gap: 10 },

  charContainer: { position: "relative" },
  watchFloat: {
    position: "absolute",
    left: 0,
    top: 108,
    width: 70,
    height: 70,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#0a0812cc",
  },
  viewerSpinner: { position: "absolute", zIndex: 10, top: 25, left: 25 },

  carViewer: {
    flex: 1,
    height: 130,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: DARK,
  },
  carLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0812aa",
    zIndex: 10,
  },
  carEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  carEmptyText: {
    color: MUTED,
    fontSize: 11,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
  },

  slotRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  slot: {
    flex: 1,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: BORDER,
    borderRadius: 8,
    padding: 6,
  },
  slotOn: {
    borderColor: GOLD,
    borderStyle: "solid",
    backgroundColor: "#f5a62308",
  },
  slotTxt: {
    color: MUTED,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  perfTxt: {
    color: GREEN,
    fontSize: 10,
    textAlign: "center",
    marginTop: 6,
    fontFamily: "Inter_400Regular",
  },

  section: {
    backgroundColor: PANEL,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 14,
  },
  secHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  secTitle: {
    color: MUTED,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  secLine: { flex: 1, height: 1, backgroundColor: BORDER },

  emptySection: { alignItems: "center", padding: 16, gap: 12 },
  emptySectionTxt: {
    color: MUTED,
    fontSize: 12,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  shopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: DARK,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  shopBtnTxt: {
    color: GOLD,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  grid3: {},

  card: {
    width: (SCREEN_W - 32 - 28 - 8 * 3) / 4,
    backgroundColor: DARK,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 8,
    alignItems: "center",
    gap: 3,
    position: "relative",
  },
  carCard: {
    width: (SCREEN_W - 32 - 28 - 8 * 2) / 3,
  },
  cardOn: { borderColor: GOLD, backgroundColor: "#f5a62310" },
  cardIcon: { fontSize: 20 },
  cardLabel: {
    color: MUTED,
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  checkBadge: {
    position: "absolute",
    top: 3,
    right: 5,
    color: GREEN,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  prestigeLabel: {
    color: GOLD,
    fontSize: 7,
    fontFamily: "Inter_700Bold",
  },
});

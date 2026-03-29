import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Modal, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { colors, typography, spacing, radius } from "@/design-system";
import { ItemVisual } from "./WardrobeItemVisuals";
import { getRarityColor, getRarityLabel, getSlotLabel, WardrobeItem } from "./wardrobeHelpers";

const API_BASE = `${process.env.EXPO_PUBLIC_DOMAIN ?? ""}/api`;

const WATCH_DETAIL_CAMERA_OVERRIDES: Record<string, { orbit: string; fov: string }> = {
  "apple_watch_ultra_2.glb":               { orbit: "0deg 70deg 100%", fov: "25deg" },
  "apple_watch.glb":                       { orbit: "0deg 70deg 100%", fov: "25deg" },
  "timex_expedition_watch.glb":            { orbit: "30deg 70deg 100%", fov: "28deg" },
  "seiko_watch.glb":                       { orbit: "0deg 75deg 100%", fov: "25deg" },
  "chronograph_watch.glb":                 { orbit: "20deg 75deg 100%", fov: "27deg" },
  "hand_watch.glb":                        { orbit: "0deg 80deg 100%", fov: "27deg" },
  "breitling_superocean_automatic_44.glb": { orbit: "0deg 70deg 100%", fov: "25deg" },
  "rolex_datejust.glb":                    { orbit: "10deg 75deg 100%", fov: "25deg" },
  "patek_philippe.glb":                    { orbit: "0deg 70deg 100%", fov: "25deg" },
  "richard_mille_rm011.glb":               { orbit: "20deg 72deg 100%", fov: "27deg" },
};

const DEFAULT_DETAIL_CAMERA = { orbit: "30deg 75deg 100%", fov: "25deg" };

function ensureModelViewerScript() {
  if (
    typeof window !== "undefined" &&
    !document.querySelector("[data-model-viewer-script]")
  ) {
    const script = document.createElement("script");
    script.type = "module";
    script.src =
      "https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js";
    script.setAttribute("data-model-viewer-script", "true");
    document.head.appendChild(script);
  }
}

function Watch3DViewer({ glbFile }: { glbFile: string }) {
  const viewerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (Platform.OS === "web") ensureModelViewerScript();
  }, []);

  if (Platform.OS !== "web") return null;

  const cam = WATCH_DETAIL_CAMERA_OVERRIDES[glbFile] ?? DEFAULT_DETAIL_CAMERA;
  const modelUrl = `${API_BASE}/models/${glbFile}`;

  const handleLoad = () => {
    const mv = viewerRef.current as any;
    if (!mv) return;
    requestAnimationFrame(() => {
      if (mv.getDimensions) {
        const dims = mv.getDimensions();
        mv.cameraOrbit = `${cam.orbit.split(" ").slice(0, 2).join(" ")} ${Math.max(dims.x, dims.y, dims.z) * 2.5}m`;
        mv.fieldOfView = cam.fov;
      }
    });
  };

  return (
    <View style={{ width: "100%", height: 220, borderRadius: 16, overflow: "hidden" }}>
      {/* @ts-ignore */}
      <model-viewer
        ref={viewerRef}
        src={modelUrl}
        auto-rotate
        auto-rotate-delay="1000"
        rotation-per-second="12deg"
        camera-orbit={cam.orbit}
        min-camera-orbit="auto auto 90%"
        max-camera-orbit="auto auto 130%"
        field-of-view={cam.fov}
        min-field-of-view="20deg"
        max-field-of-view="45deg"
        camera-target="0m 0m 0m"
        environment-image="neutral"
        shadow-intensity="1.0"
        exposure="1.1"
        camera-controls
        onLoad={handleLoad}
        style={
          {
            width: "100%",
            height: "100%",
            background: "transparent",
            "--poster-color": "transparent",
          } as React.CSSProperties
        }
        alt="3D Watch Model"
      />
    </View>
  );
}

type Props = {
  item: WardrobeItem | null;
  visible: boolean;
  onClose: () => void;
  onBuy: (itemId: string, variant: string) => void;
  onEquip: (itemId: string) => void;
  onUnequip: (itemId: string) => void;
  isBuying: boolean;
  isEquipping: boolean;
  isUnequipping: boolean;
  userLevel: number;
  userXp?: number;
  xpForNextLevel?: number;
};

export function WardrobeItemSheet({
  item, visible, onClose, onBuy, onEquip, onUnequip,
  isBuying, isEquipping, isUnequipping, userLevel, userXp, xpForNextLevel,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  useEffect(() => {
    if (item && visible) {
      setSelectedVariant(item.selectedVariant ?? item.colorVariants[0]?.key ?? null);
    }
  }, [item?.id, visible]);

  if (!item) return null;

  const rarityColor = getRarityColor(item.rarity);
  const busy = isBuying || isEquipping || isUnequipping;
  const currentHex = item.colorVariants.find((v) => v.key === selectedVariant)?.hex
    ?? item.colorVariants[0]?.hex;
  const selectedLabel = item.colorVariants.find((v) => v.key === selectedVariant)?.label ?? "";

  function renderCTA() {
    if (item!.isLocked) {
      return (
        <View>
          <Pressable style={[st.ctaBtn, st.ctaDisabled]} disabled>
            <Ionicons name="lock-closed-outline" size={14} color={colors.text.tertiary} />
            <Text style={st.ctaDisabledText}>Reach Level {item!.minLevel} to Unlock</Text>
          </Pressable>
          {userXp != null && xpForNextLevel != null && (
            <View style={st.xpRow}>
              <View style={st.xpBar}>
                <View style={[st.xpFill, { width: `${Math.min((userXp / Math.max(xpForNextLevel, 1)) * 100, 100)}%` }]} />
              </View>
              <Text style={st.xpText}>{userXp} / {xpForNextLevel} XP to Level {userLevel + 1}</Text>
            </View>
          )}
        </View>
      );
    }

    if (item!.isEquipped) {
      return (
        <View>
          <View style={st.equippedChip}>
            <Ionicons name="checkmark-circle" size={14} color={colors.accent.progression} />
            <Text style={st.equippedChipText}>Currently Equipped</Text>
          </View>
          <Pressable
            style={[st.ctaBtn, st.ctaSecondary]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onUnequip(item!.id); }}
            disabled={busy}
          >
            {isUnequipping ? <ActivityIndicator size="small" color={colors.text.secondary} /> : <Text style={st.ctaSecondaryText}>Unequip</Text>}
          </Pressable>
        </View>
      );
    }

    if (item!.isOwned) {
      return (
        <Pressable
          style={[st.ctaBtn, st.ctaPrimary]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onEquip(item!.id); }}
          disabled={busy}
        >
          {isEquipping ? <ActivityIndicator size="small" color={colors.text.inverse} /> : <Text style={st.ctaPrimaryText}>Equip</Text>}
        </Pressable>
      );
    }

    if (!item!.canAfford) {
      const needed = item!.cost - 0;
      return (
        <View>
          <Pressable style={[st.ctaBtn, st.ctaDisabled]} disabled>
            <Text style={st.ctaDisabledText}>Need More Coins</Text>
          </Pressable>
          <Pressable style={st.missionLink}>
            <Text style={st.missionLinkText}>Complete missions to earn →</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <Pressable
        style={[st.ctaBtn, st.ctaPrimary]}
        onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); onBuy(item!.id, selectedVariant ?? ""); }}
        disabled={busy}
      >
        {isBuying
          ? <ActivityIndicator size="small" color={colors.text.inverse} />
          : <Text style={st.ctaPrimaryText}>Purchase for {item!.cost.toLocaleString()} Coins</Text>
        }
      </Pressable>
    );
  }

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={st.backdrop} onPress={onClose}>
        <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill} />
      </Pressable>
      <Animated.View entering={SlideInDown.springify().damping(18)} style={[st.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={st.handle} />

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          <View style={st.visualWrap}>
            {item.glbFile && Platform.OS === "web" ? (
              <Watch3DViewer glbFile={item.glbFile} />
            ) : (
              <ItemVisual slug={item.slug} colorVariant={currentHex} size={200} />
            )}
          </View>

          {item.colorVariants.length > 1 && (
            <View style={st.swatchRow}>
              {item.colorVariants.map((v) => (
                <Pressable
                  key={v.key}
                  onPress={() => { setSelectedVariant(v.key); Haptics.selectionAsync(); }}
                  style={st.swatchWrap}
                >
                  <View style={[
                    st.swatch,
                    { backgroundColor: v.hex },
                    selectedVariant === v.key && st.swatchSelected,
                  ]} />
                </Pressable>
              ))}
            </View>
          )}
          {selectedLabel !== "" && item.colorVariants.length > 1 && (
            <Text style={st.swatchLabel}>{selectedLabel}</Text>
          )}

          <Text style={st.itemName}>{item.name}</Text>
          {item.series && <Text style={st.itemSeries}>{item.series}</Text>}

          <View style={st.metaRow}>
            <View style={[st.rarityChip, { backgroundColor: rarityColor + "20" }]}>
              <View style={[st.rarityDot, { backgroundColor: rarityColor }]} />
              <Text style={[st.rarityText, { color: rarityColor }]}>{getRarityLabel(item.rarity)}</Text>
            </View>
            <Text style={st.slotText}>{getSlotLabel(item.wearableSlot)}</Text>
          </View>

          {item.description && (
            <Text style={st.description} numberOfLines={2}>{item.description}</Text>
          )}

          <View style={st.statsRow}>
            <View style={st.statItem}>
              <Text style={st.statLabel}>LEVEL REQ</Text>
              <Text style={st.statValue}>{item.minLevel}</Text>
            </View>
            <View style={st.statDivider} />
            <View style={st.statItem}>
              <Text style={st.statLabel}>COIN COST</Text>
              <Text style={st.statValue}>{item.cost === 0 ? "Free" : item.cost.toLocaleString()}</Text>
            </View>
            {item.styleEffect && (
              <>
                <View style={st.statDivider} />
                <View style={[st.statItem, { flex: 1.5 }]}>
                  <Text style={st.statLabel}>EFFECT</Text>
                  <Text style={st.statValue} numberOfLines={1}>{item.styleEffect}</Text>
                </View>
              </>
            )}
          </View>

          <View style={st.ctaWrap}>
            {renderCTA()}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.overlay,
  },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: colors.border.default, borderBottomWidth: 0,
    paddingTop: spacing.md, paddingHorizontal: spacing.lg,
    maxHeight: "88%",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border.strong, alignSelf: "center", marginBottom: spacing.base,
  },
  visualWrap: {
    alignItems: "center", paddingVertical: spacing.lg,
    backgroundColor: colors.bg.app, borderRadius: radius.lg,
    marginBottom: spacing.base,
  },
  swatchRow: {
    flexDirection: "row", justifyContent: "center", gap: spacing.md, marginBottom: spacing.xs,
  },
  swatchWrap: { padding: 2 },
  swatch: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: "transparent",
  },
  swatchSelected: {
    borderColor: colors.accent.primary, borderWidth: 2.5,
  },
  swatchLabel: {
    ...typography.bodySmall,
    color: colors.text.secondary, textAlign: "center", marginBottom: spacing.md,
  },
  itemName: {
    ...typography.h3,
    color: colors.text.primary, marginBottom: 2,
  },
  itemSeries: {
    ...typography.bodySmall,
    color: colors.text.secondary, marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md,
  },
  rarityChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm,
  },
  rarityDot: { width: 6, height: 6, borderRadius: 3 },
  rarityText: { ...typography.label },
  slotText: { ...typography.bodySmall, color: colors.text.tertiary },
  description: {
    ...typography.body, color: colors.text.secondary, marginBottom: spacing.base,
  },
  statsRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.bg.surfaceElevated, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  statItem: { alignItems: "center", flex: 1 },
  statLabel: { ...typography.micro, color: colors.text.tertiary, marginBottom: 4 },
  statValue: { ...typography.body, color: colors.text.primary, fontFamily: "Inter_600SemiBold" },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border.default },
  ctaWrap: { marginBottom: spacing.md },
  ctaBtn: {
    height: 48, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    flexDirection: "row", gap: spacing.sm,
  },
  ctaPrimary: { backgroundColor: colors.accent.primary },
  ctaPrimaryText: { ...typography.title, color: colors.text.inverse },
  ctaSecondary: {
    backgroundColor: colors.bg.surfaceElevated,
    borderWidth: 1, borderColor: colors.border.default,
  },
  ctaSecondaryText: { ...typography.title, color: colors.text.secondary },
  ctaDisabled: { backgroundColor: colors.bg.surfaceElevated, borderWidth: 1, borderColor: colors.border.default },
  ctaDisabledText: { ...typography.title, color: colors.text.tertiary },
  equippedChip: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    alignSelf: "center", marginBottom: spacing.sm,
  },
  equippedChipText: { ...typography.bodySmall, color: colors.accent.progression },
  xpRow: { marginTop: spacing.sm, gap: spacing.xs },
  xpBar: {
    height: 4, backgroundColor: colors.bg.surfaceElevated, borderRadius: 2, overflow: "hidden",
  },
  xpFill: { height: 4, backgroundColor: colors.accent.warning, borderRadius: 2 },
  xpText: { ...typography.bodySmall, color: colors.text.tertiary, textAlign: "center" },
  missionLink: { alignSelf: "center", marginTop: spacing.sm },
  missionLinkText: { ...typography.bodySmall, color: colors.accent.primary },
});

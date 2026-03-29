import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQueryClient } from "@tanstack/react-query";
import { Colors, RARITY_COLORS } from "@/constants/colors";
import { useWearables, useEquipItem, useUnequipItem, useBuyItem } from "@/hooks/useApi";
import { useDevMode } from "@/context/DevModeContext";
import { LoadingScreen, ErrorState, Button } from "@/design-system";

// ─── Types ────────────────────────────────────────────────────────────────────

type WearableItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  wearableSlot: "top" | "watch" | "accessory";
  minLevel: number;
  styleEffect: string | null;
  rarity: string | null;
  isOwned: boolean;
  isEquipped: boolean;
  isLocked: boolean;
  canAfford: boolean;
};

type WearableSlotGroup = {
  slot: "top" | "watch" | "accessory";
  label: string;
  icon: string;
  items: WearableItem[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SLOT_META: Record<string, { label: string; icon: string }> = {
  top:       { label: "TOPS",        icon: "shirt-outline"   },
  watch:     { label: "WATCHES",     icon: "watch-outline"   },
  accessory: { label: "ACCESSORIES", icon: "diamond-outline" },
};


// ─── Confirmation Modal ────────────────────────────────────────────────────────

function ConfirmModal({
  visible, title, message, confirmLabel, onConfirm, onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={modal.overlay}>
        <View style={modal.box}>
          <Text style={modal.title}>{title}</Text>
          <Text style={modal.message}>{message}</Text>
          <View style={modal.row}>
            <Pressable style={[modal.btn, modal.cancel]} onPress={onCancel}>
              <Text style={modal.cancelTxt}>Cancel</Text>
            </Pressable>
            <Pressable style={[modal.btn, modal.confirm]} onPress={onConfirm}>
              <Text style={modal.confirmTxt}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 32 },
  box:        { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 24, width: "100%", borderWidth: 1, borderColor: Colors.border },
  title:      { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.textPrimary, marginBottom: 8 },
  message:    { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, marginBottom: 20, lineHeight: 20 },
  row:        { flexDirection: "row", gap: 12 },
  btn:        { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  cancel:     { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  confirm:    { backgroundColor: Colors.accent },
  cancelTxt:  { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textSecondary },
  confirmTxt: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#000" },
});

// ─── Wearable Item Card ────────────────────────────────────────────────────────

function WearableCard({ item, delay = 0 }: { item: WearableItem; delay?: number }) {
  const qc = useQueryClient();
  const { isDevMode } = useDevMode();
  const equipMut    = useEquipItem();
  const unequipMut  = useUnequipItem();
  const buyMut      = useBuyItem();

  const [confirmAction, setConfirmAction] = useState<"buy" | "equip" | "unequip" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const rarityColor = RARITY_COLORS[item.rarity ?? "common"] ?? RARITY_COLORS.common;
  const busy = equipMut.isPending || unequipMut.isPending || buyMut.isPending;

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["wearables"] });
    qc.invalidateQueries({ queryKey: ["character", "status"] });
  }

  function handleBuy() {
    setErrorMsg(null);
    buyMut.mutate({ itemId: item.id, devMode: isDevMode }, {
      onSuccess: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); invalidate(); },
      onError: (e: any) => setErrorMsg(e?.message ?? "Purchase failed."),
    });
    setConfirmAction(null);
  }

  function handleEquip() {
    setErrorMsg(null);
    equipMut.mutate(item.id, {
      onSuccess: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); invalidate(); },
      onError: (e: any) => setErrorMsg(e?.message ?? "Failed to equip."),
    });
    setConfirmAction(null);
  }

  function handleUnequip() {
    setErrorMsg(null);
    unequipMut.mutate(item.id, {
      onSuccess: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); invalidate(); },
      onError: (e: any) => setErrorMsg(e?.message ?? "Failed to unequip."),
    });
    setConfirmAction(null);
  }

  const confirmMeta: Record<string, { title: string; message: string; label: string; fn: () => void }> = {
    buy: {
      title:   `Buy ${item.name}?`,
      message: `This will cost ${item.price} coins. Confirm purchase?`,
      label:   "Buy Now",
      fn:      handleBuy,
    },
    equip: {
      title:   `Equip ${item.name}?`,
      message: `This will equip the item in the ${item.wearableSlot} slot. Any existing item in this slot will be unequipped.`,
      label:   "Equip",
      fn:      handleEquip,
    },
    unequip: {
      title:   `Unequip ${item.name}?`,
      message: "Remove this item from your outfit?",
      label:   "Unequip",
      fn:      handleUnequip,
    },
  };

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={[
      card.root,
      item.isEquipped && { borderColor: Colors.accent + "60" },
    ]}>
      {confirmAction && (
        <ConfirmModal
          visible
          title={confirmMeta[confirmAction].title}
          message={confirmMeta[confirmAction].message}
          confirmLabel={confirmMeta[confirmAction].label}
          onConfirm={confirmMeta[confirmAction].fn}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Equipped badge */}
      {item.isEquipped && (
        <View style={card.equippedBadge}>
          <Text style={card.equippedBadgeTxt}>EQUIPPED</Text>
        </View>
      )}

      {/* Name + rarity dot */}
      <View style={card.nameRow}>
        <View style={[card.rarityDot, { backgroundColor: rarityColor }]} />
        <Text style={card.name}>{item.name}</Text>
        {item.minLevel > 0 && (
          <View style={[card.levelChip, item.isLocked && { backgroundColor: "#7F1D1D20" }]}>
            <Ionicons name="lock-closed-outline" size={9} color={item.isLocked ? "#F87171" : Colors.textMuted} />
            <Text style={[card.levelTxt, item.isLocked && { color: "#F87171" }]}>Lv {item.minLevel}</Text>
          </View>
        )}
      </View>

      {/* Style effect */}
      {item.styleEffect && (
        <Text style={card.effect}>✦ {item.styleEffect}</Text>
      )}

      {/* Error */}
      {errorMsg && (
        <Text style={card.errorTxt}>{errorMsg}</Text>
      )}

      {/* Actions */}
      <View style={card.actions}>
        {item.isLocked ? (
          <View style={card.lockInfo}>
            <Ionicons name="lock-closed-outline" size={12} color="#F87171" />
            <Text style={card.lockTxt}>Requires Level {item.minLevel}</Text>
          </View>
        ) : item.isEquipped ? (
          <>
            <View style={card.priceChip}>
              <Text style={card.priceOwned}>Owned</Text>
            </View>
            <Pressable
              style={({ pressed }) => [card.unequipBtn, pressed && { opacity: 0.7 }]}
              onPress={() => setConfirmAction("unequip")}
              disabled={busy}
            >
              <Text style={card.unequipTxt}>Unequip</Text>
            </Pressable>
          </>
        ) : item.isOwned ? (
          <>
            <View style={card.priceChip}>
              <Text style={card.priceOwned}>Owned</Text>
            </View>
            <Pressable
              style={({ pressed }) => [card.equipBtn, pressed && { opacity: 0.7 }, !canEquip(item) && card.equipBtnDisabled]}
              onPress={() => setConfirmAction("equip")}
              disabled={busy || !canEquip(item)}
            >
              {busy && equipMut.variables === item.id
                ? <ActivityIndicator size="small" color="#000" />
                : <Text style={card.equipTxt}>Equip</Text>
              }
            </Pressable>
          </>
        ) : (
          <>
            <View style={card.priceChip}>
              <Ionicons name="logo-bitcoin" size={11} color={item.canAfford ? Colors.accent : "#9CA3AF"} />
              <Text style={[card.priceTxt, !item.canAfford && { color: "#9CA3AF" }]}>
                {item.price === 0 ? "FREE" : item.price.toLocaleString()}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [card.buyBtn, pressed && { opacity: 0.7 }, !item.canAfford && card.buyBtnDisabled]}
              onPress={() => item.price === 0 ? handleBuy() : setConfirmAction("buy")}
              disabled={busy || !item.canAfford}
            >
              {busy && buyMut.variables === item.id
                ? <ActivityIndicator size="small" color="#000" />
                : <Text style={card.buyTxt}>{item.price === 0 ? "Get Free" : "Buy"}</Text>
              }
            </Pressable>
          </>
        )}
      </View>
    </Animated.View>
  );
}

function canEquip(_item: WearableItem): boolean { return true; }

const card = StyleSheet.create({
  root:           { backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 14, marginBottom: 10, position: "relative" },
  equippedBadge:  { position: "absolute", top: 10, right: 10, backgroundColor: Colors.accent + "22", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  equippedBadgeTxt: { fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.accent, letterSpacing: 0.6 },
  nameRow:        { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  rarityDot:      { width: 7, height: 7, borderRadius: 3.5 },
  name:           { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textPrimary, flex: 1 },
  levelChip:      { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.bgElevated, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  levelTxt:       { fontSize: 9, fontFamily: "Inter_700Bold", color: Colors.textMuted },
  effect:         { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.textMuted, marginBottom: 10, fontStyle: "italic" },
  errorTxt:       { fontSize: 11, color: "#F87171", fontFamily: "Inter_400Regular", marginBottom: 8 },
  actions:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  priceChip:      { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.bgElevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  priceTxt:       { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.accent },
  priceOwned:     { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.textMuted },
  lockInfo:       { flexDirection: "row", alignItems: "center", gap: 5 },
  lockTxt:        { fontSize: 11, fontFamily: "Inter_400Regular", color: "#F87171" },
  buyBtn:         { flex: 1, backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  buyBtnDisabled: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  buyTxt:         { fontSize: 13, fontFamily: "Inter_700Bold", color: "#000" },
  equipBtn:       { flex: 1, backgroundColor: Colors.accent, borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  equipBtnDisabled: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  equipTxt:       { fontSize: 13, fontFamily: "Inter_700Bold", color: "#000" },
  unequipBtn:     { flex: 1, backgroundColor: Colors.bgElevated, borderRadius: 10, paddingVertical: 9, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  unequipTxt:     { fontSize: 13, fontFamily: "Inter_700Bold", color: Colors.textSecondary },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WardrobeScreen() {
  const insets = useSafeAreaInsets();
  const { isDevMode } = useDevMode();
  const { data, isLoading, isError, refetch } = useWearables();

  const slotGroups: WearableSlotGroup[] = data
    ? (Object.entries(data) as [string, WearableItem[]][])
        .map(([slot, items]) => ({
          slot: slot as "top" | "watch" | "accessory",
          label: SLOT_META[slot]?.label ?? slot.toUpperCase(),
          icon:  SLOT_META[slot]?.icon  ?? "shirt-outline",
          items: isDevMode
            ? items.map(i => ({ ...i, isLocked: false, canAfford: true }))
            : items,
        }))
        .sort((a, b) => ["top", "watch", "accessory"].indexOf(a.slot) - ["top", "watch", "accessory"].indexOf(b.slot))
    : [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable
          style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={s.headerCenter}>
          <Ionicons name="shirt-outline" size={16} color={Colors.accent} />
          <Text style={s.headerTitle}>WARDROBE</Text>
        </View>
        <Pressable
          style={({ pressed }) => [s.storeBtn, pressed && { opacity: 0.7 }]}
          onPress={() => router.push("/(tabs)/rewards" as any)}
        >
          <Ionicons name="cart-outline" size={15} color={Colors.accent} />
          <Text style={s.storeBtnTxt}>Store</Text>
        </Pressable>
      </View>

      {/* Body */}
      {isLoading ? (
        <LoadingScreen accentColor={Colors.accent} />
      ) : isError ? (
        <ErrorState
          type="network"
          onRetry={() => refetch()}
          retryLabel="Reload Wardrobe"
          style={{ flex: 1 }}
        />
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.subtitle}>Style your character with equipped wearables.</Text>

          {slotGroups.map((group, gi) => (
            <View key={group.slot} style={{ marginBottom: 24 }}>
              {/* Slot section header */}
              <Animated.View entering={FadeInDown.delay(gi * 60).springify()} style={s.slotHeader}>
                <Ionicons name={group.icon as any} size={14} color={Colors.textMuted} />
                <Text style={s.slotLabel}>{group.label}</Text>
                <View style={s.slotLine} />
              </Animated.View>

              {/* Items */}
              {group.items.map((item, ii) => (
                <WearableCard key={item.id} item={item} delay={gi * 60 + ii * 40} />
              ))}

              {group.items.length === 0 && (
                <Button
                  label="Browse Store"
                  onPress={() => router.push("/(tabs)/rewards" as any)}
                  variant="secondary"
                  iconLeft="cart-outline"
                />
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.bg },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:      { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle:  { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.textPrimary, letterSpacing: 1.2 },
  scroll:       { flex: 1 },
  scrollContent:{ padding: 16 },
  subtitle:     { fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular", marginBottom: 20 },
  slotHeader:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  slotLabel:    { fontSize: 11, fontFamily: "Inter_700Bold", color: Colors.textMuted, letterSpacing: 1.2 },
  slotLine:     { flex: 1, height: 1, backgroundColor: Colors.border },
  empty:        { fontSize: 12, color: Colors.textMuted, fontStyle: "italic", paddingVertical: 8 },
  emptyCard:    { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.border, borderStyle: "dashed" },
  emptyCardText: { flex: 1, fontSize: 12, color: Colors.textMuted, fontFamily: "Inter_400Regular" },
  center:       { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText:    { fontSize: 14, color: Colors.textSecondary, fontFamily: "Inter_400Regular" },
  retryBtn:     { backgroundColor: Colors.accent, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryTxt:     { fontSize: 13, fontFamily: "Inter_700Bold", color: "#000" },
  storeBtn:     { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.accentDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  storeBtnTxt:  { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.accent },
});

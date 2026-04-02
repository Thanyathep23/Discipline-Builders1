import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator,
  TextInput, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function AdminOverridesScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const qc = useQueryClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [genUserId, setGenUserId] = useState("");
  const [genCount, setGenCount] = useState("3");
  const [expireMissionId, setExpireMissionId] = useState("");
  const [expireReason, setExpireReason] = useState("");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantType, setGrantType] = useState<"badge" | "title">("badge");
  const [grantItemId, setGrantItemId] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [resetChainId, setResetChainId] = useState("");
  const [resetReason, setResetReason] = useState("");

  const generateMissions = useMutation({
    mutationFn: ({ userId, count }: { userId: string; count: number }) =>
      request<any>(`/admin/missions/generate/${userId}`, { method: "POST", body: JSON.stringify({ count }) }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      Alert.alert("Success", `Generated ${data.generated} new missions for user.`);
    },
    onError: (e: any) => Alert.alert("Error", e.message ?? "Failed to generate missions"),
  });

  const expireMission = useMutation({
    mutationFn: ({ missionId, reason }: { missionId: string; reason: string }) =>
      request<any>(`/admin/missions/${missionId}/expire`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      Alert.alert("Success", "Mission marked as expired.");
      setExpireMissionId("");
      setExpireReason("");
    },
    onError: (e: any) => Alert.alert("Error", e.message ?? "Failed to expire mission"),
  });

  const grantInventory = useMutation({
    mutationFn: ({ userId, type, itemId, note }: { userId: string; type: string; itemId: string; note: string }) =>
      request<any>(`/admin/inventory/grant`, { method: "POST", body: JSON.stringify({ userId, type, itemId, note }) }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      Alert.alert("Success", `Granted ${data.type}: ${data.badgeName ?? data.titleName}`);
      setGrantUserId("");
      setGrantItemId("");
      setGrantNote("");
    },
    onError: (e: any) => Alert.alert("Error", e.message ?? "Failed to grant item"),
  });

  const resetChain = useMutation({
    mutationFn: ({ chainId, reason }: { chainId: string; reason: string }) =>
      request<any>(`/admin/chains/${chainId}/reset`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      Alert.alert("Success", "Quest chain reset to step 0. Audit log written.");
      setResetChainId("");
      setResetReason("");
    },
    onError: (e: any) => Alert.alert("Error", e.message ?? "Failed to reset chain"),
  });

  const handleGenerate = () => {
    if (!genUserId.trim()) return Alert.alert("Missing field", "Enter a user ID.");
    const count = parseInt(genCount) || 3;
    Alert.alert(
      "Confirm",
      `Generate ${count} new AI missions for user ${genUserId}? This bypasses the pacing guard and will be audit-logged.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Generate", onPress: () => generateMissions.mutate({ userId: genUserId.trim(), count }) },
      ],
    );
  };

  const handleExpire = () => {
    if (!expireMissionId.trim()) return Alert.alert("Missing field", "Enter a mission ID.");
    Alert.alert(
      "Confirm",
      `Mark mission ${expireMissionId} as expired? This will be audit-logged.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Expire", style: "destructive", onPress: () => expireMission.mutate({ missionId: expireMissionId.trim(), reason: expireReason }) },
      ],
    );
  };

  const handleGrant = () => {
    if (!grantUserId.trim() || !grantItemId.trim()) return Alert.alert("Missing fields", "Enter user ID and item ID.");
    Alert.alert(
      "Confirm",
      `Grant ${grantType} '${grantItemId}' to user ${grantUserId}? This will be audit-logged.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Grant", onPress: () => grantInventory.mutate({ userId: grantUserId.trim(), type: grantType, itemId: grantItemId.trim(), note: grantNote }) },
      ],
    );
  };

  const handleReset = () => {
    if (!resetChainId.trim()) return Alert.alert("Missing field", "Enter a chain ID.");
    Alert.alert(
      "Confirm Reset",
      `Reset chain ${resetChainId} to step 0 and status 'active'? This will be audit-logged and cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => resetChain.mutate({ chainId: resetChainId.trim(), reason: resetReason }) },
      ],
    );
  };

  const isBusy = generateMissions.isPending || expireMission.isPending || grantInventory.isPending || resetChain.isPending;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Override Actions</Text>
        {isBusy && <ActivityIndicator color={Colors.accent} />}
      </View>

      <View style={styles.warningBanner}>
        <Ionicons name="warning" size={16} color={Colors.amber} />
        <Text style={styles.warningText}>All actions are audit-logged and require confirmation.</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>

        {/* 1. Re-run mission generation */}
        <Animated.View entering={FadeInDown.springify()} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: Colors.cyanDim }]}>
              <Ionicons name="flash-outline" size={20} color={Colors.cyan} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Generate Missions for User</Text>
              <Text style={styles.cardSub}>Bypasses pacing guard • audit-logged</Text>
            </View>
          </View>
          <TextInput style={styles.input} placeholder="User ID" placeholderTextColor={Colors.textMuted} value={genUserId} onChangeText={setGenUserId} autoCapitalize="none" />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Count (1-10)"
              placeholderTextColor={Colors.textMuted}
              value={genCount}
              onChangeText={setGenCount}
              keyboardType="number-pad"
            />
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { backgroundColor: Colors.cyan }, pressed && { opacity: 0.7 }, generateMissions.isPending && { opacity: 0.4 }]}
              onPress={handleGenerate}
              disabled={generateMissions.isPending}
            >
              <Text style={styles.actionBtnText}>Generate</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* 2. Expire a mission */}
        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: Colors.amberDim }]}>
              <Ionicons name="timer-outline" size={20} color={Colors.amber} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Expire AI Mission</Text>
              <Text style={styles.cardSub}>Pending missions only • audit-logged</Text>
            </View>
          </View>
          <TextInput style={styles.input} placeholder="Mission ID" placeholderTextColor={Colors.textMuted} value={expireMissionId} onChangeText={setExpireMissionId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Reason (optional)" placeholderTextColor={Colors.textMuted} value={expireReason} onChangeText={setExpireReason} />
          <Pressable
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: Colors.amber }, pressed && { opacity: 0.7 }, expireMission.isPending && { opacity: 0.4 }]}
            onPress={handleExpire}
            disabled={expireMission.isPending}
          >
            <Text style={[styles.actionBtnText, { color: "#000" }]}>Expire Mission</Text>
          </Pressable>
        </Animated.View>

        {/* 3. Grant badge or title */}
        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: Colors.goldDim }]}>
              <Ionicons name="ribbon-outline" size={20} color={Colors.gold} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Grant Badge / Title</Text>
              <Text style={styles.cardSub}>Idempotent — audit-logged</Text>
            </View>
          </View>
          <TextInput style={styles.input} placeholder="User ID" placeholderTextColor={Colors.textMuted} value={grantUserId} onChangeText={setGrantUserId} autoCapitalize="none" />
          <View style={styles.typeRow}>
            <Pressable
              style={[styles.typeTab, grantType === "badge" && styles.typeTabActive]}
              onPress={() => setGrantType("badge")}
            >
              <Text style={[styles.typeTabText, grantType === "badge" && { color: Colors.textPrimary }]}>Badge</Text>
            </Pressable>
            <Pressable
              style={[styles.typeTab, grantType === "title" && styles.typeTabActive]}
              onPress={() => setGrantType("title")}
            >
              <Text style={[styles.typeTabText, grantType === "title" && { color: Colors.textPrimary }]}>Title</Text>
            </Pressable>
          </View>
          <TextInput style={styles.input} placeholder={`${grantType === "badge" ? "Badge" : "Title"} ID (e.g. badge-first-ai-mission)`} placeholderTextColor={Colors.textMuted} value={grantItemId} onChangeText={setGrantItemId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Note (optional)" placeholderTextColor={Colors.textMuted} value={grantNote} onChangeText={setGrantNote} />
          <Pressable
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: Colors.gold }, pressed && { opacity: 0.7 }, grantInventory.isPending && { opacity: 0.4 }]}
            onPress={handleGrant}
            disabled={grantInventory.isPending}
          >
            <Text style={[styles.actionBtnText, { color: "#000" }]}>Grant {grantType.charAt(0).toUpperCase() + grantType.slice(1)}</Text>
          </Pressable>
        </Animated.View>

        {/* 4. Reset chain */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIcon, { backgroundColor: Colors.crimsonDim }]}>
              <Ionicons name="build-outline" size={20} color={Colors.crimson} />
            </View>
            <View>
              <Text style={styles.cardTitle}>Reset Quest Chain</Text>
              <Text style={styles.cardSub}>Resets to step 0 + active • audit-logged</Text>
            </View>
          </View>
          <TextInput style={styles.input} placeholder="Chain ID (user_quest_chains.id)" placeholderTextColor={Colors.textMuted} value={resetChainId} onChangeText={setResetChainId} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Repair reason (optional)" placeholderTextColor={Colors.textMuted} value={resetReason} onChangeText={setResetReason} />
          <Pressable
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: Colors.crimson }, pressed && { opacity: 0.7 }, resetChain.isPending && { opacity: 0.4 }]}
            onPress={handleReset}
            disabled={resetChain.isPending}
          >
            <Text style={styles.actionBtnText}>Reset Chain</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  warningBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.amberDim, marginHorizontal: 20, marginBottom: 12,
    borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.amber + "30",
  },
  warningText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.amber, flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  card: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.textPrimary },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  input: {
    backgroundColor: Colors.bgElevated, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: Colors.textPrimary, fontFamily: "Inter_400Regular", fontSize: 13,
    borderWidth: 1, borderColor: Colors.border,
  },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeTab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.bgElevated, alignItems: "center", borderWidth: 1, borderColor: Colors.border },
  typeTabActive: { backgroundColor: Colors.accentGlow, borderColor: Colors.accentDim },
  typeTabText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textMuted },
  actionBtn: { paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  actionBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
});

import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function CreateCircleScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const createMutation = useMutation({
    mutationFn: () =>
      request<{ circleId: string; inviteCode: string }>("/circles", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      }),
    onSuccess: async (data) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["circles"] });
      Alert.alert(
        "Circle Created",
        `Your invite code is: ${data.inviteCode}\n\nShare this with people you trust to build accountability with.`,
        [{ text: "Got it", onPress: () => { router.replace(`/circles/${data.circleId}`); } }]
      );
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message ?? "Could not create circle.");
    },
  });

  const canSubmit = name.trim().length >= 2 && !createMutation.isPending;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Create Circle</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.card}>
          <Text style={styles.sectionLabel}>Circle Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Morning Crew, Trading Pod, Focus 5"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={40}
            returnKeyType="next"
          />
          <Text style={styles.charCount}>{name.length}/40</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.card}>
          <Text style={styles.sectionLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="What's this circle for? Keep it short and clear."
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={120}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/120</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.rulesCard}>
          <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.rulesTitle}>Circle rules</Text>
            <Text style={styles.rulesText}>• Private by default — only members can see anything inside</Text>
            <Text style={styles.rulesText}>• Invite-only — you control who joins via your invite code</Text>
            <Text style={styles.rulesText}>• Max 8 members — designed for trusted, tight-knit pods</Text>
            <Text style={styles.rulesText}>• You own up to 3 circles simultaneously</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).springify()}>
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              !canSubmit && styles.submitBtnDisabled,
              pressed && canSubmit && { opacity: 0.85 },
            ]}
            onPress={() => createMutation.mutate()}
            disabled={!canSubmit}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="people" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Create Circle</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg },
  header:           { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn:          { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle:      { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  scroll:           { paddingHorizontal: 20, gap: 16 },

  card:             { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  sectionLabel:     { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textSecondary, letterSpacing: 0.8, textTransform: "uppercase" },
  input:            { backgroundColor: Colors.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  inputMulti:       { minHeight: 80, paddingTop: 12 },
  charCount:        { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, textAlign: "right" },

  rulesCard:        { flexDirection: "row", gap: 10, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, alignItems: "flex-start" },
  rulesTitle:       { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  rulesText:        { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, lineHeight: 18 },

  submitBtn:        { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitBtnDisabled:{ opacity: 0.4 },
  submitBtnText:    { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});

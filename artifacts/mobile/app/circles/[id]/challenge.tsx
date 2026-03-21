import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const SKILL_OPTIONS = [
  { id: "focus",      label: "Focus",      icon: "eye",          color: "#7C5CFC" },
  { id: "discipline", label: "Discipline", icon: "shield",       color: "#FF7043" },
  { id: "learning",   label: "Learning",   icon: "book",         color: "#00D4FF" },
  { id: "sleep",      label: "Sleep",      icon: "moon",         color: "#00BCD4" },
  { id: "fitness",    label: "Fitness",    icon: "barbell",      color: "#00E676" },
  { id: "trading",    label: "Trading",    icon: "trending-up",  color: "#F5C842" },
];

const DURATION_OPTIONS = [
  { days: 3, label: "3 Days" },
  { days: 7, label: "1 Week" },
  { days: 14, label: "2 Weeks" },
  { days: 30, label: "1 Month" },
];

const PRESETS = [
  { label: "Focus Weekend", description: "Commit to 3 deep work sessions this weekend.", skillId: "focus", icon: "eye", color: "#7C5CFC", durationDays: 3 },
  { label: "3-Day Momentum Reset", description: "Complete a mission each day for 3 days straight.", skillId: "discipline", icon: "shield", color: "#FF7043", durationDays: 3 },
  { label: "Learning Sprint", description: "Finish a structured learning block this week.", skillId: "learning", icon: "book", color: "#00D4FF", durationDays: 7 },
  { label: "Recovery Week", description: "Prioritize sleep and recovery for 7 days.", skillId: "sleep", icon: "moon", color: "#00BCD4", durationDays: 7 },
  { label: "Trading Review Sprint", description: "Do a daily trading journal review for 5 days.", skillId: "trading", icon: "trending-up", color: "#F5C842", durationDays: 5 },
];

export default function CreateChallengeScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  const { id: circleId } = useLocalSearchParams<{ id: string }>();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [durationDays, setDurationDays] = useState(7);

  const createMutation = useMutation({
    mutationFn: () =>
      request<{ challengeId: string }>(`/circles/${circleId}/challenges`, {
        method: "POST",
        body: JSON.stringify({
          label: label.trim(),
          description: description.trim(),
          skillId: selectedSkill,
          icon: SKILL_OPTIONS.find(s => s.id === selectedSkill)?.icon ?? "flash",
          color: SKILL_OPTIONS.find(s => s.id === selectedSkill)?.color ?? "#7C5CFC",
          durationDays,
        }),
      }),
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["circle", circleId] });
      router.back();
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  function applyPreset(preset: typeof PRESETS[0]) {
    setLabel(preset.label);
    setDescription(preset.description);
    setSelectedSkill(preset.skillId);
    setDurationDays(preset.durationDays);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const canSubmit = label.trim().length >= 2 && !createMutation.isPending;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>New Shared Challenge</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Quick presets */}
        <Animated.View entering={FadeInDown.springify()} style={styles.card}>
          <Text style={styles.sectionLabel}>Quick Presets</Text>
          <View style={{ gap: 8 }}>
            {PRESETS.map((p) => (
              <Pressable
                key={p.label}
                style={({ pressed }) => [styles.presetRow, pressed && { opacity: 0.7 }]}
                onPress={() => applyPreset(p)}
              >
                <View style={[styles.presetIcon, { backgroundColor: p.color + "18" }]}>
                  <Ionicons name={p.icon as any} size={16} color={p.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.presetLabel}>{p.label}</Text>
                  <Text style={styles.presetDays}>{p.durationDays} days · {SKILL_OPTIONS.find(s => s.id === p.skillId)?.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Custom input */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.card}>
          <Text style={styles.sectionLabel}>Challenge Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Name your challenge"
            placeholderTextColor={Colors.textMuted}
            value={label}
            onChangeText={setLabel}
            maxLength={60}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.card}>
          <Text style={styles.sectionLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            placeholder="What does it mean to complete this challenge?"
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={120}
            textAlignVertical="top"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.card}>
          <Text style={styles.sectionLabel}>Related Skill</Text>
          <View style={styles.skillGrid}>
            {SKILL_OPTIONS.map((s) => (
              <Pressable
                key={s.id}
                style={[
                  styles.skillChip,
                  selectedSkill === s.id && { backgroundColor: s.color + "18", borderColor: s.color + "60" },
                ]}
                onPress={() => setSelectedSkill(s.id === selectedSkill ? null : s.id)}
              >
                <Ionicons name={s.icon as any} size={14} color={selectedSkill === s.id ? s.color : Colors.textMuted} />
                <Text style={[styles.skillChipText, selectedSkill === s.id && { color: s.color }]}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.card}>
          <Text style={styles.sectionLabel}>Duration</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((d) => (
              <Pressable
                key={d.days}
                style={[styles.durationChip, durationDays === d.days && styles.durationChipActive]}
                onPress={() => setDurationDays(d.days)}
              >
                <Text style={[styles.durationChipText, durationDays === d.days && styles.durationChipTextActive]}>
                  {d.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).springify()}>
          <Pressable
            style={({ pressed }) => [styles.submitBtn, !canSubmit && styles.submitBtnDisabled, pressed && canSubmit && { opacity: 0.85 }]}
            onPress={() => createMutation.mutate()}
            disabled={!canSubmit}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="flash" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Launch Challenge</Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.bg },
  header:             { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn:            { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle:        { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  scroll:             { paddingHorizontal: 20, gap: 16 },

  card:               { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  sectionLabel:       { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textSecondary, letterSpacing: 0.8, textTransform: "uppercase" },
  input:              { backgroundColor: Colors.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  inputMulti:         { minHeight: 70, paddingTop: 12 },

  presetRow:          { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.bgElevated, borderRadius: 12, padding: 12 },
  presetIcon:         { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  presetLabel:        { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  presetDays:         { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  skillGrid:          { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip:          { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  skillChipText:      { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },

  durationRow:        { flexDirection: "row", gap: 8 },
  durationChip:       { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  durationChipActive: { backgroundColor: Colors.accentGlow, borderColor: Colors.accentDim },
  durationChipText:   { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textMuted },
  durationChipTextActive: { color: Colors.accent },

  submitBtn:          { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitBtnDisabled:  { opacity: 0.4 },
  submitBtnText:      { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});

import React, { useState, useMemo } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  Platform, ActivityIndicator, Alert, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useCreateMission } from "@/hooks/useApi";

const PRIORITIES = ["low", "medium", "high", "critical"] as const;

const CATEGORIES: { key: string; label: string; icon: string; hint: string }[] = [
  { key: "trading",   label: "Trading",   icon: "trending-up",  hint: "Include analysis details, setups, and outcomes" },
  { key: "fitness",   label: "Fitness",    icon: "barbell",      hint: "List exercises, sets, reps, or distance" },
  { key: "learning",  label: "Learning",   icon: "book",         hint: "Describe what you studied and key takeaways" },
  { key: "deep_work", label: "Deep Work",  icon: "code-slash",   hint: "Show concrete output — code, writing, designs" },
  { key: "habit",     label: "Habit",      icon: "repeat",       hint: "Brief honest reflection is enough" },
  { key: "sleep",     label: "Sleep",      icon: "moon",         hint: "Log bed time and wake time" },
  { key: "other",     label: "Other",      icon: "ellipsis-horizontal", hint: "Be specific about what you accomplished" },
];

const PROOF_TYPES = ["text", "image", "screenshot", "link", "file"] as const;

const IMPACT_LABELS: Record<number, string> = {
  1: "Minor task",
  2: "Useful step",
  3: "Meaningful progress",
  4: "High impact work",
  5: "Critical milestone",
};

export default function NewMissionScreen() {
  const insets = useSafeAreaInsets();
  const createMission = useCreateMission();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "deep_work",
    targetDurationMinutes: 30,
    priority: "medium" as typeof PRIORITIES[number],
    impactLevel: 3,
    purpose: "",
    requiredProofTypes: ["text"] as typeof PROOF_TYPES[number][],
    proofRequired: true,
    dueDate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedCategory = useMemo(
    () => CATEGORIES.find(c => c.key === form.category) ?? CATEGORIES[3],
    [form.category],
  );

  function validate() {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 3) e.title = "Title must be at least 3 characters";
    if (form.targetDurationMinutes < 5) e.duration = "Minimum 5 minutes";
    if (!form.requiredProofTypes.length) e.proof = "Select at least one proof type";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreate() {
    if (!validate()) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await createMission.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        targetDurationMinutes: form.targetDurationMinutes,
        priority: form.priority,
        impactLevel: form.impactLevel,
        purpose: form.purpose.trim() || null,
        requiredProofTypes: form.requiredProofTypes,
        proofRequired: form.proofRequired,
        dueDate: form.dueDate.trim() || null,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>New Mission</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.field}>
          <Text style={styles.label}>Mission Title <Text style={{ color: Colors.crimson }}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="e.g. Finish project proposal"
            placeholderTextColor={Colors.textMuted}
            value={form.title}
            onChangeText={t => setForm(f => ({ ...f, title: t }))}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="What exactly needs to happen?"
            placeholderTextColor={Colors.textMuted}
            value={form.description}
            onChangeText={t => setForm(f => ({ ...f, description: t }))}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.field}>
          <Text style={styles.label}>Why does this matter?</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Your purpose — the AI judge uses this"
            placeholderTextColor={Colors.textMuted}
            value={form.purpose}
            onChangeText={t => setForm(f => ({ ...f, purpose: t }))}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(c => {
              const active = form.category === c.key;
              return (
                <Pressable
                  key={c.key}
                  style={[styles.categoryCard, active && styles.categoryCardActive]}
                  onPress={() => { setForm(f => ({ ...f, category: c.key })); Haptics.selectionAsync(); }}
                >
                  <Ionicons name={c.icon as any} size={18} color={active ? Colors.accent : Colors.textMuted} />
                  <Text style={[styles.categoryLabel, active && { color: Colors.accent }]}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.hintText}>Proof tip: {selectedCategory.hint}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.field}>
          <Text style={styles.label}>Target Duration: <Text style={{ color: Colors.textPrimary }}>{form.targetDurationMinutes} min</Text></Text>
          <View style={styles.durationRow}>
            {[15, 25, 30, 45, 60, 90, 120].map(d => (
              <Pressable
                key={d}
                style={[styles.durationChip, form.targetDurationMinutes === d && styles.chipActive]}
                onPress={() => { setForm(f => ({ ...f, targetDurationMinutes: d })); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.chipText, form.targetDurationMinutes === d && styles.chipTextActive]}>{d}m</Text>
              </Pressable>
            ))}
          </View>
          {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.field}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map(p => {
              const colorMap: Record<string, string> = {
                low: Colors.priorityLow, medium: Colors.priorityMedium,
                high: Colors.priorityHigh, critical: Colors.priorityCritical,
              };
              const c = colorMap[p];
              const active = form.priority === p;
              return (
                <Pressable
                  key={p}
                  style={[styles.priorityChip, active && { backgroundColor: c + "30", borderColor: c }]}
                  onPress={() => { setForm(f => ({ ...f, priority: p })); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.priorityText, active && { color: c }]}>{p.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.field}>
          <Text style={styles.label}>Impact Level: <Text style={{ color: Colors.accent }}>{form.impactLevel}/5</Text></Text>
          <Text style={styles.impactDesc}>{IMPACT_LABELS[form.impactLevel]}</Text>
          <View style={styles.impactRow}>
            {[1, 2, 3, 4, 5].map(n => (
              <Pressable
                key={n}
                style={[styles.impactBlock, n <= form.impactLevel && { backgroundColor: Colors.accent }]}
                onPress={() => { setForm(f => ({ ...f, impactLevel: n })); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.impactNum, n <= form.impactLevel && { color: "#fff" }]}>{n}</Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.field}>
          <Text style={styles.label}>Required Proof <Text style={{ color: Colors.crimson }}>*</Text></Text>
          <Text style={styles.sublabel}>AI judge uses this to evaluate your submission</Text>
          <View style={styles.proofRow}>
            {PROOF_TYPES.map(pt => {
              const iconMap: Record<string, string> = {
                text: "document-text", image: "image", screenshot: "phone-portrait",
                link: "link", file: "attach",
              };
              const active = form.requiredProofTypes.includes(pt);
              return (
                <Pressable
                  key={pt}
                  style={[styles.proofChip, active && styles.proofChipActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setForm(f => ({
                      ...f,
                      requiredProofTypes: active
                        ? f.requiredProofTypes.filter(x => x !== pt)
                        : [...f.requiredProofTypes, pt],
                    }));
                  }}
                >
                  <Ionicons name={iconMap[pt] as any} size={14} color={active ? Colors.accent : Colors.textMuted} />
                  <Text style={[styles.proofChipText, active && { color: Colors.accent }]}>{pt}</Text>
                </Pressable>
              );
            })}
          </View>
          {errors.proof && <Text style={styles.errorText}>{errors.proof}</Text>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.field}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Proof Required</Text>
              <Text style={styles.sublabel}>Require proof submission to complete</Text>
            </View>
            <Switch
              value={form.proofRequired}
              onValueChange={(v) => setForm(f => ({ ...f, proofRequired: v }))}
              trackColor={{ false: Colors.border, true: Colors.accent + "60" }}
              thumbColor={form.proofRequired ? Colors.accent : Colors.textMuted}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(360).springify()} style={styles.field}>
          <Text style={styles.label}>Due Date <Text style={styles.sublabel}>(optional)</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
            value={form.dueDate}
            onChangeText={t => setForm(f => ({ ...f, dueDate: t }))}
            keyboardType="numbers-and-punctuation"
          />
        </Animated.View>

        <Pressable
          style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }, createMission.isPending && styles.btnDisabled]}
          onPress={handleCreate}
          disabled={createMission.isPending}
        >
          {createMission.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="flash" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>Create Mission</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, gap: 24 },
  field: { gap: 10 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  sublabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: -6 },
  input: {
    backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 14, fontFamily: "Inter_400Regular",
    fontSize: 15, color: Colors.textPrimary,
  },
  inputError: { borderColor: Colors.crimson },
  textarea: { minHeight: 80, paddingTop: 14 },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.crimson },
  chipActive: { backgroundColor: Colors.accentGlow, borderColor: Colors.accent },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.accent },

  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  categoryCardActive: { backgroundColor: Colors.accentGlow, borderColor: Colors.accent },
  categoryLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary },
  hintBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.bgElevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
  },
  hintText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, flex: 1 },

  durationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  durationChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityChip: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  priorityText: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 0.8 },

  impactRow: { flexDirection: "row", gap: 8 },
  impactBlock: {
    flex: 1, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  impactNum: { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textMuted },
  impactDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: -6 },

  proofRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  proofChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  proofChipActive: { backgroundColor: Colors.accentGlow, borderColor: Colors.accent },
  proofChipText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textMuted },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  submitBtn: {
    backgroundColor: Colors.accent, borderRadius: 14, height: 56, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});

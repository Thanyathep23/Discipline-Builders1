import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useSaveLifeProfile, useLifeProfile } from "@/hooks/useApi";

const IMPROVEMENT_AREAS = [
  { id: "focus",      label: "Focus",      icon: "eye-outline" },
  { id: "discipline", label: "Discipline", icon: "shield-outline" },
  { id: "learning",   label: "Learning",   icon: "book-outline" },
  { id: "health",     label: "Health",     icon: "heart-outline" },
  { id: "finance",    label: "Finance",    icon: "cash-outline" },
  { id: "creativity", label: "Creativity", icon: "color-palette-outline" },
];

const WORK_OPTIONS = [
  { id: "working_full",  label: "Working Full-Time",     icon: "briefcase-outline" },
  { id: "working_part",  label: "Working Part-Time",     icon: "time-outline" },
  { id: "studying",      label: "Studying",              icon: "school-outline" },
  { id: "building",      label: "Building / Freelance",  icon: "construct-outline" },
  { id: "transitioning", label: "Between Things",        icon: "swap-horizontal-outline" },
];

const STRICTNESS_OPTIONS = [
  { id: "easy",    label: "Easy",    subtitle: "Encouragement, lower proof bar",   icon: "sunny-outline",        color: Colors.green },
  { id: "normal",  label: "Normal",  subtitle: "Balanced challenge and fairness",  icon: "partly-sunny-outline", color: Colors.accent },
  { id: "strict",  label: "Strict",  subtitle: "High standards, tough but fair",   icon: "thunderstorm-outline", color: Colors.amber },
  { id: "extreme", label: "Extreme", subtitle: "No mercy. Results or punishment",  icon: "flame-outline",        color: Colors.crimson },
];

const HOURS_OPTIONS = [1, 2, 3, 4, 6, 8];

const STEPS = [
  { key: "goal",       title: "What's your main goal right now?",       why: "This shapes every mission the AI generates for you." },
  { key: "problem",    title: "What's the biggest obstacle you face?",  why: "The AI Game Master needs to know what's holding you back." },
  { key: "status",     title: "What's your current situation?",         why: "Your schedule determines how your missions are scoped." },
  { key: "hours",      title: "How many hours per day can you commit?", why: "Honest time allocation prevents burnout and builds momentum." },
  { key: "areas",      title: "Which skills do you want to upgrade?",   why: "These map to your character's skill tree." },
  { key: "strictness", title: "How strict should your Game Master be?", why: "Strictness affects proof requirements and penalties." },
];

type FormState = {
  mainGoal: string;
  mainProblem: string;
  workStudyStatus: string;
  availableHoursPerDay: number;
  improvementAreas: string[];
  strictnessPreference: string;
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    mainGoal: "",
    mainProblem: "",
    workStudyStatus: "",
    availableHoursPerDay: 2,
    improvementAreas: [],
    strictnessPreference: "normal",
  });
  const [initialized, setInitialized] = useState(false);
  const { data: existingProfile } = useLifeProfile();
  const { mutateAsync: saveProfile, isPending } = useSaveLifeProfile();

  useEffect(() => {
    if (!initialized && existingProfile?.exists && existingProfile?.profile) {
      const p = existingProfile.profile;
      setForm({
        mainGoal:             p.mainGoal ?? "",
        mainProblem:          p.mainProblem ?? "",
        workStudyStatus:      p.workStudyStatus ?? "",
        availableHoursPerDay: p.availableHoursPerDay ?? 2,
        improvementAreas:     Array.isArray(p.improvementAreas) ? p.improvementAreas : [],
        strictnessPreference: p.strictnessPreference ?? "normal",
      });
      setInitialized(true);
    } else if (!initialized && existingProfile !== undefined) {
      setInitialized(true);
    }
  }, [existingProfile, initialized]);

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  function toggleArea(id: string) {
    Haptics.selectionAsync();
    setForm((f) => ({
      ...f,
      improvementAreas: f.improvementAreas.includes(id)
        ? f.improvementAreas.filter((a) => a !== id)
        : [...f.improvementAreas, id],
    }));
  }

  function canAdvance() {
    if (step === 0) return form.mainGoal.trim().length > 5;
    if (step === 1) return form.mainProblem.trim().length > 5;
    if (step === 2) return form.workStudyStatus.length > 0;
    if (step === 3) return form.availableHoursPerDay > 0;
    if (step === 4) return form.improvementAreas.length > 0;
    if (step === 5) return form.strictnessPreference.length > 0;
    return true;
  }

  async function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < STEPS.length - 1) {
      await savePartial(false);
      setStep((s) => s + 1);
    } else {
      await handleFinish();
    }
  }

  async function savePartial(done: boolean) {
    try {
      await saveProfile({
        ...form,
        quickStartDone: done,
        onboardingStage: done ? "quick_start" : "not_started",
      });
    } catch {
    }
  }

  async function handleSaveLater() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await savePartial(false);
    router.replace("/(tabs)");
  }

  async function handleFinish() {
    try {
      await saveProfile({
        ...form,
        quickStartDone: true,
        onboardingStage: "quick_start",
      });
    } catch {
    }
    router.replace("/(tabs)");
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.header}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.stepLabel}>{step + 1} of {STEPS.length}</Text>
          {step > 0 && (
            <Pressable onPress={handleSaveLater} style={styles.laterBtn}>
              <Text style={styles.laterBtnText}>Continue later</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{currentStep.title}</Text>
        <View style={styles.whyBox}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.accent} />
          <Text style={styles.why}>{currentStep.why}</Text>
        </View>

        {step === 0 && (
          <TextInput
            style={styles.textInput}
            value={form.mainGoal}
            onChangeText={(t) => setForm((f) => ({ ...f, mainGoal: t }))}
            placeholder="e.g. Build my freelance income to $5k/month"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={200}
          />
        )}

        {step === 1 && (
          <TextInput
            style={styles.textInput}
            value={form.mainProblem}
            onChangeText={(t) => setForm((f) => ({ ...f, mainProblem: t }))}
            placeholder="e.g. I procrastinate and get distracted by social media"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={200}
          />
        )}

        {step === 2 && (
          <View style={styles.optionGrid}>
            {WORK_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                style={[styles.optionCard, form.workStudyStatus === opt.id && styles.optionCardSelected]}
                onPress={() => { Haptics.selectionAsync(); setForm((f) => ({ ...f, workStudyStatus: opt.id })); }}
              >
                <Ionicons name={opt.icon as any} size={22} color={form.workStudyStatus === opt.id ? Colors.accent : Colors.textSecondary} />
                <Text style={[styles.optionLabel, form.workStudyStatus === opt.id && styles.optionLabelSelected]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {step === 3 && (
          <View style={styles.hoursGrid}>
            {HOURS_OPTIONS.map((h) => (
              <Pressable
                key={h}
                style={[styles.hourCard, form.availableHoursPerDay === h && styles.hourCardSelected]}
                onPress={() => { Haptics.selectionAsync(); setForm((f) => ({ ...f, availableHoursPerDay: h })); }}
              >
                <Text style={[styles.hourNumber, form.availableHoursPerDay === h && styles.hourNumberSelected]}>{h}</Text>
                <Text style={styles.hourLabel}>hr{h > 1 ? "s" : ""}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {step === 4 && (
          <View style={styles.areaGrid}>
            {IMPROVEMENT_AREAS.map((area) => {
              const selected = form.improvementAreas.includes(area.id);
              return (
                <Pressable key={area.id} style={[styles.areaCard, selected && styles.areaCardSelected]} onPress={() => toggleArea(area.id)}>
                  <Ionicons name={area.icon as any} size={24} color={selected ? Colors.accent : Colors.textSecondary} />
                  <Text style={[styles.areaLabel, selected && styles.areaLabelSelected]}>{area.label}</Text>
                  {selected && <View style={styles.areaCheck}><Ionicons name="checkmark" size={12} color={Colors.accent} /></View>}
                </Pressable>
              );
            })}
          </View>
        )}

        {step === 5 && (
          <View style={styles.strictnessGrid}>
            {STRICTNESS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                style={[styles.strictCard, form.strictnessPreference === opt.id && { borderColor: opt.color, backgroundColor: `${opt.color}12` }]}
                onPress={() => { Haptics.selectionAsync(); setForm((f) => ({ ...f, strictnessPreference: opt.id })); }}
              >
                <View style={styles.strictHeader}>
                  <Ionicons name={opt.icon as any} size={20} color={opt.color} />
                  <Text style={[styles.strictLabel, { color: opt.color }]}>{opt.label}</Text>
                </View>
                <Text style={styles.strictSubtitle}>{opt.subtitle}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        {step > 0 && (
          <Pressable style={styles.backBtn} onPress={() => { Haptics.selectionAsync(); setStep((s) => s - 1); }}>
            <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
          </Pressable>
        )}
        <Pressable
          style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={!canAdvance() || isPending}
        >
          <Text style={styles.nextBtnText}>
            {step === STEPS.length - 1 ? (isPending ? "Saving..." : "Begin Game") : "Continue"}
          </Text>
          <Ionicons
            name={step === STEPS.length - 1 ? "game-controller-outline" : "arrow-forward"}
            size={18}
            color={Colors.bg}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:             { flex: 1, backgroundColor: Colors.bg },
  header:                { paddingHorizontal: 24, gap: 8, marginBottom: 8 },
  progressBar:           { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden" },
  progressFill:          { height: "100%", backgroundColor: Colors.accent, borderRadius: 2 },
  headerMeta:            { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepLabel:             { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  laterBtn:              { paddingVertical: 4, paddingHorizontal: 8 },
  laterBtnText:          { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, textDecorationLine: "underline" },
  scroll:                { paddingHorizontal: 24, paddingBottom: 40, gap: 24, paddingTop: 16 },
  title:                 { fontFamily: "Inter_700Bold", fontSize: 26, color: Colors.textPrimary, lineHeight: 34 },
  whyBox:                { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: Colors.accentGlow, padding: 12, borderRadius: 12 },
  why:                   { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textAccent, flex: 1 },
  textInput:             {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderRadius: 16,
    padding: 16, fontFamily: "Inter_400Regular", fontSize: 16, color: Colors.textPrimary,
    minHeight: 120, textAlignVertical: "top",
  },
  optionGrid:            { gap: 12 },
  optionCard:            { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  optionCardSelected:    { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  optionLabel:           { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },
  optionLabelSelected:   { color: Colors.accent },
  hoursGrid:             { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  hourCard:              { width: "30%", aspectRatio: 1.2, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  hourCardSelected:      { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  hourNumber:            { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.textSecondary },
  hourNumberSelected:    { color: Colors.accent },
  hourLabel:             { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  areaGrid:              { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  areaCard:              { width: "47%", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  areaCardSelected:      { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  areaLabel:             { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },
  areaLabelSelected:     { color: Colors.accent },
  areaCheck:             { position: "absolute", top: 8, right: 8, backgroundColor: Colors.accentGlow, borderRadius: 10, padding: 2 },
  strictnessGrid:        { gap: 12 },
  strictCard:            { padding: 16, backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  strictHeader:          { flexDirection: "row", alignItems: "center", gap: 10 },
  strictLabel:           { fontFamily: "Inter_700Bold", fontSize: 16 },
  strictSubtitle:        { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary },
  footer:                { flexDirection: "row", paddingHorizontal: 24, paddingTop: 16, gap: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  backBtn:               { width: 48, height: 52, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  nextBtn:               { flex: 1, height: 52, borderRadius: 14, backgroundColor: Colors.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  nextBtnDisabled:       { opacity: 0.4 },
  nextBtnText:           { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.bg },
});

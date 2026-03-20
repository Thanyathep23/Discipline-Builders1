import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useSaveLifeProfile, useLifeProfile } from "@/hooks/useApi";

const SLEEP_OPTIONS = [
  { id: "early",    label: "Early Bird",    subtitle: "Sleep 9–10pm, wake 5–6am",  icon: "sunny-outline" },
  { id: "normal",   label: "Normal",        subtitle: "Sleep 10–11pm, wake 6–7am", icon: "partly-sunny-outline" },
  { id: "late",     label: "Night Owl",     subtitle: "Sleep midnight+, wake 8am+", icon: "moon-outline" },
  { id: "irregular", label: "Irregular",   subtitle: "No fixed pattern",           icon: "shuffle-outline" },
];

const HEALTH_OPTIONS = [
  { id: "high",     label: "High Energy",   subtitle: "Consistent training, feel strong", icon: "barbell-outline" },
  { id: "moderate", label: "Moderate",      subtitle: "Some activity, average energy",    icon: "walk-outline" },
  { id: "low",      label: "Low Energy",    subtitle: "Fatigued, sedentary most days",    icon: "bed-outline" },
  { id: "rebuilding", label: "Rebuilding",  subtitle: "In recovery or restarting habits", icon: "refresh-outline" },
];

const FINANCE_OPTIONS = [
  { id: "tight",    label: "Tight",         subtitle: "Every dollar counts right now" },
  { id: "stable",   label: "Stable",        subtitle: "Covering needs, some flexibility" },
  { id: "growing",  label: "Growing",       subtitle: "Actively building savings/income" },
  { id: "comfortable", label: "Comfortable", subtitle: "Not a daily concern" },
];

const STEPS = [
  {
    key: "dailyRoutine",
    title: "Describe your typical day",
    why: "Your daily structure helps the AI understand when you are most productive and where discipline gaps exist.",
    optional: false,
  },
  {
    key: "distractionTriggers",
    title: "What pulls you off focus most?",
    why: "Knowing your distraction patterns lets the AI target proof requirements that build awareness.",
    optional: false,
  },
  {
    key: "weakPoints",
    title: "Which habits do you consistently struggle with?",
    why: "Honest self-diagnosis surfaces the real weak zones for mission targeting.",
    optional: false,
  },
  {
    key: "currentHabits",
    title: "What habits do you already maintain?",
    why: "Your existing strengths help calibrate what can be built upon versus what needs to start fresh.",
    optional: true,
  },
  {
    key: "sleepPattern",
    title: "What is your sleep pattern?",
    why: "Sleep quality directly affects focus, discipline, and performance capacity.",
    optional: false,
  },
  {
    key: "healthStatus",
    title: "How would you rate your current energy and health?",
    why: "Physical state determines how aggressive your mission load should be.",
    optional: false,
  },
  {
    key: "financeRange",
    title: "What is your current financial situation?",
    why: "Financial pressure affects what missions are realistic. No exact numbers — range only.",
    optional: true,
  },
];

type FormState = {
  dailyRoutine: string;
  distractionTriggers: string;
  weakPoints: string;
  currentHabits: string;
  sleepPattern: string;
  healthStatus: string;
  financeRange: string;
};

export default function StandardProfileScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    dailyRoutine: "",
    distractionTriggers: "",
    weakPoints: "",
    currentHabits: "",
    sleepPattern: "",
    healthStatus: "",
    financeRange: "",
  });
  const [initialized, setInitialized] = useState(false);
  const { data: existingProfile } = useLifeProfile();
  const { mutateAsync: saveProfile, isPending } = useSaveLifeProfile();

  useEffect(() => {
    if (!initialized && existingProfile?.exists && existingProfile?.profile) {
      const p = existingProfile.profile;
      setForm({
        dailyRoutine:        p.dailyRoutine ?? "",
        distractionTriggers: p.distractionTriggers ?? "",
        weakPoints:          p.weakPoints ?? "",
        currentHabits:       p.currentHabits ?? "",
        sleepPattern:        p.sleepPattern ?? "",
        healthStatus:        p.healthStatus ?? "",
        financeRange:        p.financeRange ?? "",
      });
      setInitialized(true);
    } else if (!initialized && existingProfile !== undefined) {
      setInitialized(true);
    }
  }, [existingProfile, initialized]);

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  function getFieldValue(key: keyof FormState): string {
    return form[key];
  }

  function canAdvance() {
    if (currentStep.optional) return true;
    const val = getFieldValue(currentStep.key as keyof FormState);
    if (currentStep.key === "sleepPattern" || currentStep.key === "healthStatus" || currentStep.key === "financeRange") {
      return val.length > 0;
    }
    return val.trim().length > 8;
  }

  async function savePartial(done: boolean) {
    try {
      await saveProfile({
        ...form,
        standardDone: done,
        onboardingStage: done ? "standard" : "quick_start",
      });
    } catch {
    }
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

  async function handleSkip() {
    Haptics.selectionAsync();
    if (step < STEPS.length - 1) {
      await savePartial(false);
      setStep((s) => s + 1);
    } else {
      await handleFinish();
    }
  }

  async function handleSaveLater() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await savePartial(false);
    router.replace("/(tabs)/profile");
  }

  async function handleFinish() {
    try {
      await saveProfile({
        ...form,
        standardDone: true,
        onboardingStage: "standard",
      });
    } catch {
    }
    router.replace("/(tabs)/profile");
  }

  const isTextStep =
    currentStep.key === "dailyRoutine" ||
    currentStep.key === "distractionTriggers" ||
    currentStep.key === "weakPoints" ||
    currentStep.key === "currentHabits";

  const isSleepStep = currentStep.key === "sleepPattern";
  const isHealthStep = currentStep.key === "healthStatus";
  const isFinanceStep = currentStep.key === "financeRange";

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.header}>
        <View style={styles.layerBadge}>
          <Ionicons name="layers-outline" size={12} color={Colors.accent} />
          <Text style={styles.layerText}>STANDARD PROFILE</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.stepLabel}>{step + 1} of {STEPS.length}</Text>
          <Pressable onPress={handleSaveLater} style={styles.laterBtn}>
            <Text style={styles.laterBtnText}>Continue later</Text>
          </Pressable>
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
        {currentStep.optional && (
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalText}>Optional — skip if unsure</Text>
          </View>
        )}

        {isTextStep && (
          <TextInput
            style={styles.textInput}
            value={getFieldValue(currentStep.key as keyof FormState)}
            onChangeText={(t) => setForm((f) => ({ ...f, [currentStep.key]: t }))}
            placeholder={
              currentStep.key === "dailyRoutine"
                ? "e.g. Wake at 7am, work 9–5, gym at 6pm, sleep at 11pm..."
                : currentStep.key === "distractionTriggers"
                ? "e.g. Social media, phone notifications, boredom between tasks..."
                : currentStep.key === "weakPoints"
                ? "e.g. I keep skipping morning routines, I procrastinate on hard tasks..."
                : "e.g. Daily journaling, reading before bed, weekly workouts..."
            }
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={400}
          />
        )}

        {isSleepStep && (
          <View style={styles.optionGrid}>
            {SLEEP_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                style={[styles.optionCard, form.sleepPattern === opt.id && styles.optionCardSelected]}
                onPress={() => { Haptics.selectionAsync(); setForm((f) => ({ ...f, sleepPattern: opt.id })); }}
              >
                <Ionicons name={opt.icon as any} size={20} color={form.sleepPattern === opt.id ? Colors.accent : Colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, form.sleepPattern === opt.id && styles.optionLabelSelected]}>{opt.label}</Text>
                  <Text style={styles.optionSub}>{opt.subtitle}</Text>
                </View>
                {form.sleepPattern === opt.id && (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {isHealthStep && (
          <View style={styles.optionGrid}>
            {HEALTH_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                style={[styles.optionCard, form.healthStatus === opt.id && styles.optionCardSelected]}
                onPress={() => { Haptics.selectionAsync(); setForm((f) => ({ ...f, healthStatus: opt.id })); }}
              >
                <Ionicons name={opt.icon as any} size={20} color={form.healthStatus === opt.id ? Colors.accent : Colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, form.healthStatus === opt.id && styles.optionLabelSelected]}>{opt.label}</Text>
                  <Text style={styles.optionSub}>{opt.subtitle}</Text>
                </View>
                {form.healthStatus === opt.id && (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {isFinanceStep && (
          <View style={styles.optionGrid}>
            {FINANCE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                style={[styles.optionCard, form.financeRange === opt.id && styles.optionCardSelected]}
                onPress={() => { Haptics.selectionAsync(); setForm((f) => ({ ...f, financeRange: opt.id })); }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, form.financeRange === opt.id && styles.optionLabelSelected]}>{opt.label}</Text>
                  <Text style={styles.optionSub}>{opt.subtitle}</Text>
                </View>
                {form.financeRange === opt.id && (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
                )}
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
        {currentStep.optional && (
          <Pressable style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipBtnText}>Skip</Text>
          </Pressable>
        )}
        <Pressable
          style={[styles.nextBtn, !canAdvance() && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={(!canAdvance() && !currentStep.optional) || isPending}
        >
          <Text style={styles.nextBtnText}>
            {step === STEPS.length - 1 ? (isPending ? "Saving..." : "Complete Standard") : "Continue"}
          </Text>
          <Ionicons
            name={step === STEPS.length - 1 ? "checkmark-circle-outline" : "arrow-forward"}
            size={18}
            color={Colors.bg}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: Colors.bg },
  header:              { paddingHorizontal: 24, gap: 8, marginBottom: 8 },
  layerBadge:          { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: Colors.accentGlow, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  layerText:           { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.accent, letterSpacing: 1 },
  progressBar:         { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden" },
  progressFill:        { height: "100%", backgroundColor: Colors.accent, borderRadius: 2 },
  headerMeta:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepLabel:           { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  laterBtn:            { paddingVertical: 4, paddingHorizontal: 8 },
  laterBtnText:        { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, textDecorationLine: "underline" },
  scroll:              { paddingHorizontal: 24, paddingBottom: 40, gap: 20, paddingTop: 16 },
  title:               { fontFamily: "Inter_700Bold", fontSize: 24, color: Colors.textPrimary, lineHeight: 32 },
  whyBox:              { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: Colors.accentGlow, padding: 12, borderRadius: 12 },
  why:                 { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textAccent, flex: 1 },
  optionalBadge:       { alignSelf: "flex-start", backgroundColor: Colors.bgElevated, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  optionalText:        { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  textInput:           {
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderRadius: 16,
    padding: 16, fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.textPrimary,
    minHeight: 140, textAlignVertical: "top",
  },
  optionGrid:          { gap: 10 },
  optionCard:          { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, backgroundColor: Colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  optionCardSelected:  { borderColor: Colors.accent, backgroundColor: Colors.accentGlow },
  optionLabel:         { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  optionLabelSelected: { color: Colors.accent },
  optionSub:           { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  footer:              { flexDirection: "row", paddingHorizontal: 24, paddingTop: 16, gap: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  backBtn:             { width: 48, height: 52, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  skipBtn:             { height: 52, paddingHorizontal: 16, borderRadius: 14, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  skipBtnText:         { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },
  nextBtn:             { flex: 1, height: 52, borderRadius: 14, backgroundColor: Colors.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  nextBtnDisabled:     { opacity: 0.4 },
  nextBtnText:         { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.bg },
});

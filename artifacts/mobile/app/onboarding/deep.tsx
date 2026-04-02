import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useSaveLifeProfile, useLifeProfile } from "@/hooks/useApi";

const STEPS = [
  {
    key: "longtermGoals",
    title: "Where do you want to be in 3–5 years?",
    why: "Long-term context lets the AI issue missions that build toward your actual destination, not just short-term comfort.",
    placeholder: "e.g. Running a profitable trading desk, living on my own terms, physically peak...",
    optional: false,
  },
  {
    key: "lifeConstraints",
    title: "What real-world constraints limit your growth right now?",
    why: "The AI will never issue missions that conflict with your actual reality. Honesty here is rewarded with useful missions.",
    placeholder: "e.g. Full-time job, limited funds, caregiver responsibilities, recovering from burnout...",
    optional: true,
  },
  {
    key: "supportSystem",
    title: "Who or what supports your growth?",
    why: "Support context helps calibrate how much accountability is built into your missions.",
    placeholder: "e.g. Accountability partner, mentor, no one — solo operator, online community...",
    optional: true,
  },
  {
    key: "selfDescribed",
    title: "Describe yourself honestly in 2–3 sentences.",
    why: "This is for the AI's reference only. The more real, the more personalized your game becomes.",
    placeholder: "e.g. I'm driven but prone to distractions. I'm good at starting things but struggle to finish them consistently. I have high standards but low follow-through when I'm not held accountable.",
    optional: true,
  },
];

type FormState = {
  longtermGoals: string;
  lifeConstraints: string;
  supportSystem: string;
  selfDescribed: string;
};

export default function DeepProfileScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    longtermGoals: "",
    lifeConstraints: "",
    supportSystem: "",
    selfDescribed: "",
  });
  const [initialized, setInitialized] = useState(false);
  const { data: existingProfile } = useLifeProfile();
  const { mutateAsync: saveProfile, isPending } = useSaveLifeProfile();

  useEffect(() => {
    if (!initialized && existingProfile?.exists && existingProfile?.profile) {
      const p = existingProfile.profile;
      setForm({
        longtermGoals:  p.longtermGoals ?? "",
        lifeConstraints: p.lifeConstraints ?? "",
        supportSystem:  p.supportSystem ?? "",
        selfDescribed:  p.selfDescribed ?? "",
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
    return getFieldValue(currentStep.key as keyof FormState).trim().length > 10;
  }

  async function savePartial(done: boolean) {
    try {
      await saveProfile({
        ...form,
        deepDone: done,
        onboardingStage: done ? "deep" : "standard",
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
        deepDone: true,
        onboardingStage: "deep",
      });
    } catch {
    }
    router.replace("/(tabs)/profile");
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.header}>
        <View style={styles.layerBadge}>
          <Ionicons name="diamond-outline" size={12} color={Colors.gold} />
          <Text style={styles.layerText}>DEEP PROFILE</Text>
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
            <Text style={styles.optionalText}>Optional — skip if not ready</Text>
          </View>
        )}

        <TextInput
          style={styles.textInput}
          value={getFieldValue(currentStep.key as keyof FormState)}
          onChangeText={(t) => setForm((f) => ({ ...f, [currentStep.key]: t }))}
          placeholder={currentStep.placeholder}
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={600}
        />
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
            {step === STEPS.length - 1 ? (isPending ? "Saving..." : "Complete Deep Profile") : "Continue"}
          </Text>
          <Ionicons
            name={step === STEPS.length - 1 ? "diamond-outline" : "arrow-forward"}
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
  layerBadge:          { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", backgroundColor: Colors.goldDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  layerText:           { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.gold, letterSpacing: 1 },
  progressBar:         { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: "hidden" },
  progressFill:        { height: "100%", backgroundColor: Colors.gold, borderRadius: 2 },
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
    minHeight: 160, textAlignVertical: "top",
  },
  footer:              { flexDirection: "row", paddingHorizontal: 24, paddingTop: 16, gap: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  backBtn:             { width: 48, height: 52, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  skipBtn:             { height: 52, paddingHorizontal: 16, borderRadius: 14, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  skipBtnText:         { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textSecondary },
  nextBtn:             { flex: 1, height: 52, borderRadius: 14, backgroundColor: Colors.gold, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  nextBtnDisabled:     { opacity: 0.4 },
  nextBtnText:         { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.bg },
});

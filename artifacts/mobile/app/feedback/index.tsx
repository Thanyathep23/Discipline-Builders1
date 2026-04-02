import React, { useState } from "react";
import {
  View, Text, Pressable, StyleSheet, ScrollView, TextInput,
  Platform, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";

const CATEGORIES: { key: string; label: string; icon: any; color: string }[] = [
  { key: "confusing",      label: "Confusing",          icon: "help-circle-outline",    color: Colors.amber },
  { key: "too_hard",       label: "Too Hard",            icon: "flame-outline",          color: Colors.crimson },
  { key: "too_easy",       label: "Too Easy",            icon: "sunny-outline",          color: Colors.gold },
  { key: "proof_annoying", label: "Proof Annoying",      icon: "document-text-outline",  color: Colors.accent },
  { key: "reward_unfair",  label: "Reward Feels Unfair", icon: "wallet-outline",         color: Colors.cyan },
  { key: "bug",            label: "Bug / Problem",       icon: "bug-outline",            color: Colors.crimson },
  { key: "favorite_part",  label: "Favorite Part",       icon: "heart-outline",          color: Colors.green },
];

type Status = "idle" | "submitting" | "success" | "error";

export default function FeedbackScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit() {
    if (!selected) return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      await request("/feedback", {
        method: "POST",
        body: JSON.stringify({ category: selected, note: note.trim() || undefined, context: "feedback_screen" }),
      });
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err?.message ?? "Something went wrong. Please try again.");
    }
  }

  function handleReset() {
    setSelected(null);
    setNote("");
    setStatus("idle");
    setErrorMsg("");
  }

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Send Feedback</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {status === "success" ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.successCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={52} color={Colors.green} />
            </View>
            <Text style={styles.successTitle}>Feedback Received</Text>
            <Text style={styles.successSub}>Thanks — every signal helps make this better.</Text>
            <Pressable style={styles.successBtn} onPress={handleReset}>
              <Text style={styles.successBtnText}>Send More Feedback</Text>
            </Pressable>
            <Pressable style={styles.backLink} onPress={() => router.back()}>
              <Text style={styles.backLinkText}>Back</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.springify()}>
              <Text style={styles.prompt}>What do you want to flag?</Text>
              <Text style={styles.promptSub}>Pick the category that fits best.</Text>
              <View style={styles.categoriesGrid}>
                {CATEGORIES.map((cat) => {
                  const active = selected === cat.key;
                  return (
                    <Pressable
                      key={cat.key}
                      style={({ pressed }) => [
                        styles.catCard,
                        active && { borderColor: cat.color, backgroundColor: cat.color + "18" },
                        pressed && { opacity: 0.75 },
                      ]}
                      onPress={() => setSelected(cat.key)}
                    >
                      <Ionicons name={cat.icon} size={22} color={active ? cat.color : Colors.textSecondary} />
                      <Text style={[styles.catLabel, active && { color: cat.color }]}>{cat.label}</Text>
                      {active && (
                        <View style={[styles.catCheck, { backgroundColor: cat.color }]}>
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).springify()}>
              <Text style={styles.noteLabel}>Additional notes <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Describe what happened or what you'd like improved..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{note.length} / 1000</Text>
            </Animated.View>

            {status === "error" && (
              <View style={styles.errorBar}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.crimson} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                !selected && styles.submitBtnDisabled,
                pressed && selected && { opacity: 0.8 },
              ]}
              onPress={handleSubmit}
              disabled={!selected || status === "submitting"}
            >
              {status === "submitting" ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color={!selected ? Colors.textMuted : "#fff"} />
                  <Text style={[styles.submitText, !selected && { color: Colors.textMuted }]}>Send Feedback</Text>
                </>
              )}
            </Pressable>

            <Text style={styles.privacyNote}>
              Your feedback is private and reviewed by the team only. No personal data is exposed.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, gap: 28 },

  prompt: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary, marginBottom: 4 },
  promptSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  categoriesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.bgCard, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 14,
    borderWidth: 1, borderColor: Colors.border,
    width: "47%",
    position: "relative",
  },
  catLabel: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.textSecondary, flex: 1, flexWrap: "wrap" },
  catCheck: {
    position: "absolute", top: 8, right: 8,
    width: 16, height: 16, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },

  noteLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary, marginBottom: 8 },
  optional: { fontFamily: "Inter_400Regular", color: Colors.textMuted, fontSize: 13 },
  noteInput: {
    backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    color: Colors.textPrimary, fontFamily: "Inter_400Regular", fontSize: 14,
    padding: 14, minHeight: 100,
  },
  charCount: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, textAlign: "right", marginTop: 4 },

  errorBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.crimsonDim, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: Colors.crimson + "40",
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.crimson, flex: 1 },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16,
  },
  submitBtnDisabled: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  submitText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },

  privacyNote: {
    fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted,
    textAlign: "center", lineHeight: 18,
  },

  successCard: {
    backgroundColor: Colors.bgCard, borderRadius: 20, padding: 32,
    alignItems: "center", gap: 14, borderWidth: 1, borderColor: Colors.border,
    marginTop: 40,
  },
  successIcon: { marginBottom: 4 },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary },
  successSub: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
  successBtn: {
    backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginTop: 8,
  },
  successBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff" },
  backLink: { marginTop: 4 },
  backLinkText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
});

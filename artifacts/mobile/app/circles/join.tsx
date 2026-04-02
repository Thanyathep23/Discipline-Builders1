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

export default function JoinCircleScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [code, setCode] = useState("");

  const joinMutation = useMutation({
    mutationFn: () =>
      request<{ circleId: string; name: string }>("/circles/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode: code.trim().toUpperCase() }),
      }),
    onSuccess: async (data) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["circles"] });
      Alert.alert(
        "Joined Circle",
        `You've joined "${data.name}". Welcome to your accountability pod.`,
        [{ text: "Let's go", onPress: () => router.replace(`/circles/${data.circleId}`) }]
      );
    },
    onError: (err: any) => {
      Alert.alert("Could not join", err.message ?? "Invalid or expired invite code.");
    },
  });

  const canSubmit = code.trim().length >= 4 && !joinMutation.isPending;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Join a Circle</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.springify()} style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="enter" size={28} color={Colors.accent} />
          </View>
          <Text style={styles.heroTitle}>Enter Invite Code</Text>
          <Text style={styles.heroText}>
            Get the code from someone you trust. Circles are invite-only — there's no public discovery.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.card}>
          <Text style={styles.sectionLabel}>Invite Code</Text>
          <TextInput
            style={styles.codeInput}
            placeholder="POD-XXXXX"
            placeholderTextColor={Colors.textMuted}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            returnKeyType="done"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              !canSubmit && styles.submitBtnDisabled,
              pressed && canSubmit && { opacity: 0.85 },
            ]}
            onPress={() => joinMutation.mutate()}
            disabled={!canSubmit}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Join Circle</Text>
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

  heroCard:         { backgroundColor: Colors.bgCard, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border, alignItems: "center", gap: 12 },
  heroIcon:         { width: 60, height: 60, borderRadius: 18, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  heroTitle:        { fontFamily: "Inter_700Bold", fontSize: 20, color: Colors.textPrimary },
  heroText:         { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },

  card:             { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  sectionLabel:     { fontFamily: "Inter_700Bold", fontSize: 12, color: Colors.textSecondary, letterSpacing: 0.8, textTransform: "uppercase" },
  codeInput:        {
    backgroundColor: Colors.bgInput, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.accent, borderWidth: 2, borderColor: Colors.accentDim,
    textAlign: "center", letterSpacing: 4,
  },

  submitBtn:        { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitBtnDisabled:{ opacity: 0.4 },
  submitBtnText:    { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});

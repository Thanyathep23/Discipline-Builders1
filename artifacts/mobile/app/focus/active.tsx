import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, StyleSheet, Platform, Alert, AppState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useActiveSession, usePauseSession, useResumeSession, useStopSession, useHeartbeat } from "@/hooks/useApi";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const STRICTNESS_PAUSE_LIMITS: Record<string, number> = { normal: 3, strict: 1, extreme: 0 };
const STRICTNESS_COLORS: Record<string, string> = {
  normal: Colors.strictNormal,
  strict: Colors.strictStrict,
  extreme: Colors.strictExtreme,
};

export default function ActiveFocusScreen() {
  const insets = useSafeAreaInsets();
  const { data, refetch } = useActiveSession();
  const pauseSession = usePauseSession();
  const resumeSession = useResumeSession();
  const stopSession = useStopSession();
  const heartbeat = useHeartbeat();
  const [localElapsed, setLocalElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();

  const session = data?.session;
  const mission = session?.mission;
  const isActive = session?.status === "active";
  const isPaused = session?.status === "paused";

  // Pulse animation for active state
  const pulseOpacity = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  useEffect(() => {
    if (isActive) {
      pulseOpacity.value = withRepeat(withTiming(0.4, { duration: 1000 }), -1, true);
    } else {
      pulseOpacity.value = 1;
    }
  }, [isActive]);

  // Local timer sync
  useEffect(() => {
    if (session?.elapsedSeconds !== undefined) {
      setLocalElapsed(session.elapsedSeconds);
    }
  }, [session?.elapsedSeconds]);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setLocalElapsed(e => e + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive]);

  // Heartbeat
  useEffect(() => {
    if (!session?.id) return;
    heartbeatRef.current = setInterval(async () => {
      if (isActive) {
        await heartbeat.mutateAsync(session.id).catch(() => {});
      }
    }, 30000);
    return () => clearInterval(heartbeatRef.current);
  }, [session?.id, isActive]);

  if (!data?.hasActive) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="telescope-outline" size={64} color={Colors.textMuted} />
        <Text style={styles.noSessionTitle}>No Active Session</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const targetSeconds = (mission?.targetDurationMinutes ?? 0) * 60;
  const progress = targetSeconds > 0 ? Math.min(1, localElapsed / targetSeconds) : 0;
  const strictColor = STRICTNESS_COLORS[session?.strictnessMode ?? "normal"] ?? Colors.green;
  const pauseLimit = STRICTNESS_PAUSE_LIMITS[session?.strictnessMode ?? "normal"] ?? 3;
  const pausesLeft = Math.max(0, pauseLimit - (session?.pauseCount ?? 0));

  async function handlePause() {
    if (pausesLeft === 0) {
      Alert.alert("No pauses left", `${session?.strictnessMode} mode doesn't allow more pauses.`);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await pauseSession.mutateAsync(session!.id);
    refetch();
  }

  async function handleResume() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await resumeSession.mutateAsync(session!.id);
    refetch();
  }

  async function handleStop(reason: "completed" | "abandoned" | "emergency") {
    const messages: Record<string, string> = {
      completed: "Mark this session as completed and proceed to proof submission?",
      abandoned: "Abandon this session? You may receive a penalty.",
      emergency: "Emergency stop? This will apply a penalty.",
    };
    Alert.alert(
      reason === "completed" ? "Complete Session" : "Stop Session",
      messages[reason],
      [
        { text: "Cancel", style: "cancel" },
        {
          text: reason === "completed" ? "Complete & Submit Proof" : "Stop",
          style: reason === "completed" ? "default" : "destructive",
          onPress: async () => {
            await Haptics.notificationAsync(
              reason === "completed" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
            );
            await stopSession.mutateAsync({ sessionId: session!.id, reason });
            if (reason === "completed") {
              router.replace(`/proof/${session!.id}`);
            } else {
              router.replace("/(tabs)");
            }
          },
        },
      ]
    );
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: insets.bottom + 24 }]}>
      {/* Strictness Header */}
      <Animated.View entering={FadeIn} style={styles.strictBanner}>
        <View style={[styles.strictDot, { backgroundColor: strictColor }]} />
        <Text style={[styles.strictLabel, { color: strictColor }]}>
          {session?.strictnessMode?.toUpperCase()} MODE
        </Text>
        <View style={styles.strictRight}>
          <Ionicons name="shield" size={12} color={strictColor} />
          <Text style={[styles.strictRight, { color: strictColor, fontSize: 12 }]}>
            {pausesLeft} pause{pausesLeft !== 1 ? "s" : ""} left
          </Text>
        </View>
      </Animated.View>

      {/* Mission Info */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.missionBox}>
        <Text style={styles.missionLabel}>ACTIVE MISSION</Text>
        <Text style={styles.missionTitle}>{mission?.title}</Text>
        {mission?.category && (
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{mission.category}</Text>
          </View>
        )}
      </Animated.View>

      {/* Timer */}
      <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.timerContainer}>
        <Animated.View style={[styles.timerRing, pulseStyle, { borderColor: strictColor }]}>
          <View style={[styles.timerInner, { borderColor: strictColor + "40" }]}>
            <Text style={[styles.timerText, isActive ? {} : { color: Colors.textSecondary }]}>
              {formatTime(localElapsed)}
            </Text>
            <Text style={styles.timerTarget}>/ {formatTime(targetSeconds)}</Text>
          </View>
        </Animated.View>

        {/* Progress Ring overlay text */}
        <View style={styles.progressText}>
          <Text style={[styles.progressPercent, { color: strictColor }]}>{Math.round(progress * 100)}%</Text>
        </View>
      </Animated.View>

      {/* Stats Row */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.statsRow}>
        {[
          { label: "Distractions", value: session?.blockedAttemptCount ?? 0, icon: "ban", color: Colors.crimson },
          { label: "Pauses Used", value: session?.pauseCount ?? 0, icon: "pause", color: Colors.amber },
          { label: "Status", value: isPaused ? "PAUSED" : "LIVE", icon: isPaused ? "pause-circle" : "radio-button-on", color: isPaused ? Colors.amber : Colors.green },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Ionicons name={s.icon as any} size={16} color={s.color} />
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Controls */}
      <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.controls}>
        {isActive && (
          <Pressable
            style={({ pressed }) => [styles.controlBtn, styles.pauseBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
            onPress={handlePause}
            disabled={pauseSession.isPending}
          >
            <Ionicons name="pause" size={22} color={Colors.textPrimary} />
            <Text style={styles.controlBtnText}>Pause</Text>
          </Pressable>
        )}

        {isPaused && (
          <Pressable
            style={({ pressed }) => [styles.controlBtn, styles.resumeBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
            onPress={handleResume}
            disabled={resumeSession.isPending}
          >
            <Ionicons name="play" size={22} color="#fff" />
            <Text style={[styles.controlBtnText, { color: "#fff" }]}>Resume</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.controlBtn, styles.completeBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
          onPress={() => handleStop("completed")}
          disabled={stopSession.isPending}
        >
          <Ionicons name="checkmark" size={22} color="#fff" />
          <Text style={[styles.controlBtnText, { color: "#fff" }]}>Done — Submit Proof</Text>
        </Pressable>
      </Animated.View>

      {/* Emergency Stop */}
      <Pressable
        style={({ pressed }) => [styles.emergencyBtn, pressed && { opacity: 0.7 }]}
        onPress={() => handleStop("abandoned")}
      >
        <Ionicons name="stop-circle-outline" size={16} color={Colors.crimson} />
        <Text style={styles.emergencyText}>Abandon Session</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 24 },
  centered: { justifyContent: "center", alignItems: "center", gap: 16 },
  noSessionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.textSecondary },
  backBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.bgCard, borderRadius: 12 },
  backBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  strictBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.bgCard, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  strictDot: { width: 8, height: 8, borderRadius: 4 },
  strictLabel: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1 },
  strictRight: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 4 },
  missionBox: { alignItems: "center", gap: 8, marginBottom: 32 },
  missionLabel: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 2 },
  missionTitle: { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.textPrimary, textAlign: "center", letterSpacing: -0.3 },
  categoryChip: { backgroundColor: Colors.bgElevated, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  categoryText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textSecondary },
  timerContainer: { alignItems: "center", justifyContent: "center", marginBottom: 32, position: "relative" },
  timerRing: {
    width: 220, height: 220, borderRadius: 110,
    borderWidth: 3, alignItems: "center", justifyContent: "center",
  },
  timerInner: {
    width: 190, height: 190, borderRadius: 95,
    borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 4,
  },
  timerText: { fontFamily: "Inter_700Bold", fontSize: 48, color: Colors.textPrimary, letterSpacing: -2 },
  timerTarget: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  progressText: { position: "absolute", bottom: -8 },
  progressPercent: { fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 0.5 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 32 },
  statCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
    alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 16 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, textAlign: "center" },
  controls: { gap: 12 },
  controlBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    height: 54, borderRadius: 16,
  },
  pauseBtn: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  resumeBtn: { backgroundColor: Colors.green, shadowColor: Colors.green, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  completeBtn: { backgroundColor: Colors.accent, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  controlBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  emergencyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 16 },
  emergencyText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.crimson },
});

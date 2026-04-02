import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, StyleSheet, Platform, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown, FadeIn, FadeOutUp,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import {
  useActiveSession, usePauseSession, useResumeSession, useStopSession, useHeartbeat,
} from "@/hooks/useApi";
import { useFocusSession } from "@/context/FocusSessionContext";

// Fire-and-forget haptic helper — never throws, never blocks
function haptic(type: "light" | "medium" | "success" | "warning") {
  try {
    if (type === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (type === "warning") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else if (type === "medium") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  } catch {}
}

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

// ─── In-screen confirmation modal (works on web + mobile) ────────────────────

type ModalConfig = {
  title: string;
  body: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  cancelLabel?: string;
};

function ConfirmModal({
  config,
  onCancel,
}: {
  config: ModalConfig;
  onCancel: () => void;
}) {
  return (
    <View style={modalStyles.overlay}>
      <Animated.View entering={FadeInDown.springify()} style={modalStyles.card}>
        <Text style={modalStyles.title}>{config.title}</Text>
        <Text style={modalStyles.body}>{config.body}</Text>
        <View style={modalStyles.actions}>
          <Pressable
            style={({ pressed }) => [modalStyles.cancelBtn, pressed && { opacity: 0.7 }]}
            onPress={onCancel}
          >
            <Text style={modalStyles.cancelText}>{config.cancelLabel ?? "Cancel"}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              modalStyles.confirmBtn,
              { backgroundColor: config.confirmColor },
              pressed && { opacity: 0.85 },
            ]}
            onPress={config.onConfirm}
          >
            <Text style={modalStyles.confirmText}>{config.confirmLabel}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── In-screen error banner ──────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <Animated.View entering={FadeIn} style={errorStyles.banner}>
      <Ionicons name="alert-circle" size={16} color={Colors.crimson} />
      <Text style={errorStyles.text} numberOfLines={2}>{message}</Text>
      <Pressable onPress={onDismiss} hitSlop={10}>
        <Ionicons name="close" size={16} color={Colors.crimson} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ActiveFocusScreen() {
  const insets = useSafeAreaInsets();
  const { data, refetch } = useActiveSession();
  const pauseSession = usePauseSession();
  const resumeSession = useResumeSession();
  const stopSession = useStopSession();
  const heartbeat = useHeartbeat();

  const { distractionCount, totalDistractionSeconds } = useFocusSession();

  const [localElapsed, setLocalElapsed] = useState(0);
  const [showTip, setShowTip] = useState(true);
  const [modal, setModal] = useState<ModalConfig | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const session = data?.session;
  const mission = session?.mission;
  const isActive = session?.status === "active";
  const isPaused = session?.status === "paused";

  // Pulse animation
  const pulseOpacity = useSharedValue(1);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  useEffect(() => {
    if (isActive) {
      pulseOpacity.value = withRepeat(withTiming(0.4, { duration: 1000 }), -1, true);
    } else {
      pulseOpacity.value = 1;
    }
  }, [isActive]);

  // Sync timer from server
  useEffect(() => {
    if (session?.elapsedSeconds !== undefined) {
      setLocalElapsed(session.elapsedSeconds);
    }
  }, [session?.elapsedSeconds]);

  // Local 1-second tick
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => setLocalElapsed(e => e + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive]);

  // Heartbeat every 30s
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
  const isEligibleToComplete = targetSeconds === 0 || localElapsed >= targetSeconds;
  const isBusy = pauseSession.isPending || resumeSession.isPending || stopSession.isPending;

  // ── Action helpers ──────────────────────────────────────────────────────────

  async function handlePause() {
    setErrorMsg(null);
    if (pausesLeft === 0) {
      setModal({
        title: "No Pauses Left",
        body: `${session?.strictnessMode ?? "Strict"} mode doesn't allow any more pauses for this session.`,
        confirmLabel: "Got it",
        confirmColor: Colors.bgElevated,
        cancelLabel: "Close",
        onConfirm: () => setModal(null),
      });
      return;
    }
    haptic("medium");
    try {
      await pauseSession.mutateAsync(session!.id);
      refetch();
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Could not pause session. Please try again.");
    }
  }

  async function handleResume() {
    setErrorMsg(null);
    haptic("medium");
    try {
      await resumeSession.mutateAsync(session!.id);
      refetch();
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Could not resume session. Please try again.");
    }
  }

  // Executes the confirmed stop — called after the user confirms in the modal
  async function executeStop(reason: "completed" | "abandoned") {
    setModal(null);
    setErrorMsg(null);
    haptic(reason === "completed" ? "success" : "warning");
    try {
      await stopSession.mutateAsync({
        sessionId: session!.id,
        reason,
        distractionCount,
        totalDistractionSeconds,
      });
      if (reason === "completed") {
        router.replace(`/proof/${session!.id}`);
      } else {
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Could not stop session. Please try again.");
    }
  }

  function handleComplete() {
    setErrorMsg(null);
    if (!isEligibleToComplete) {
      const pct = Math.round(progress * 100);
      setModal({
        title: "End Early?",
        body: `You've completed ${pct}% of your target time (${formatTime(localElapsed)} of ${formatTime(targetSeconds)}).\n\nEnding early may result in a partial verdict and reduced rewards.`,
        confirmLabel: "End Early & Submit Proof",
        confirmColor: Colors.amber,
        cancelLabel: "Keep Going",
        onConfirm: () => executeStop("completed"),
      });
    } else {
      setModal({
        title: "Complete Session",
        body: "Mark this session as complete and proceed to proof submission?",
        confirmLabel: "Complete & Submit Proof",
        confirmColor: Colors.accent,
        onConfirm: () => executeStop("completed"),
      });
    }
  }

  function handleAbandon() {
    setErrorMsg(null);
    setModal({
      title: "Abandon Session?",
      body: "Abandoning this session will apply a penalty and no rewards will be awarded. This cannot be undone.",
      confirmLabel: "Abandon",
      confirmColor: Colors.crimson,
      onConfirm: () => executeStop("abandoned"),
    });
  }

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: insets.bottom + 24 }]}>

      {/* In-screen confirmation modal overlay */}
      {modal && (
        <ConfirmModal config={modal} onCancel={() => setModal(null)} />
      )}

      {/* Strictness Banner */}
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

      {/* Error banner */}
      {errorMsg && (
        <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      )}

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

      {/* Guidance Tip */}
      {showTip && localElapsed < 30 && (
        <Animated.View entering={FadeIn.duration(400)} exiting={FadeOutUp.duration(300)} style={tipStyles.card}>
          <View style={tipStyles.header}>
            <Ionicons name="bulb-outline" size={14} color={Colors.cyan} />
            <Text style={tipStyles.label}>WHAT HAPPENS NEXT</Text>
            <Pressable onPress={() => setShowTip(false)} hitSlop={10}>
              <Ionicons name="close" size={14} color={Colors.textMuted} />
            </Pressable>
          </View>
          <Text style={tipStyles.body}>
            Stay focused and do the work. When done, tap{" "}
            <Text style={{ color: Colors.green, fontFamily: "Inter_600SemiBold" }}>End Session</Text>
            {" "}and you'll be taken to submit proof.
          </Text>
        </Animated.View>
      )}

      {/* Controls */}
      <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.controls}>
        {/* Pause */}
        {isActive && (
          <Pressable
            style={({ pressed }) => [styles.controlBtn, styles.pauseBtn, (pressed || isBusy) && { opacity: 0.7 }]}
            onPress={handlePause}
            disabled={isBusy}
          >
            <Ionicons name="pause" size={22} color={Colors.textPrimary} />
            <Text style={styles.controlBtnText}>
              {pauseSession.isPending ? "Pausing..." : "Pause"}
            </Text>
          </Pressable>
        )}

        {/* Resume */}
        {isPaused && (
          <Pressable
            style={({ pressed }) => [styles.controlBtn, styles.resumeBtn, (pressed || isBusy) && { opacity: 0.7 }]}
            onPress={handleResume}
            disabled={isBusy}
          >
            <Ionicons name="play" size={22} color="#fff" />
            <Text style={[styles.controlBtnText, { color: "#fff" }]}>
              {resumeSession.isPending ? "Resuming..." : "Resume"}
            </Text>
          </Pressable>
        )}

        {/* Done / End Early */}
        {isEligibleToComplete ? (
          <Pressable
            style={({ pressed }) => [styles.controlBtn, styles.completeBtn, (pressed || isBusy) && { opacity: 0.7 }]}
            onPress={handleComplete}
            disabled={isBusy}
          >
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={[styles.controlBtnText, { color: "#fff" }]}>
              {stopSession.isPending ? "Finishing..." : "Done — Submit Proof"}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.controlBtn, styles.earlyBtn, (pressed || isBusy) && { opacity: 0.7 }]}
            onPress={handleComplete}
            disabled={isBusy}
          >
            <Ionicons name="exit-outline" size={20} color={Colors.amber} />
            <Text style={[styles.controlBtnText, { color: Colors.amber }]}>
              {stopSession.isPending ? "Stopping..." : "End Early"}
            </Text>
          </Pressable>
        )}
      </Animated.View>

      {/* Remaining time hint */}
      {!isEligibleToComplete && targetSeconds > 0 && (
        <Animated.View entering={FadeIn.delay(300)} style={styles.progressHint}>
          <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.progressHintText}>
            {formatTime(Math.max(0, targetSeconds - localElapsed))} remaining to reach your target
          </Text>
        </Animated.View>
      )}

      {/* Abandon */}
      <Pressable
        style={({ pressed }) => [styles.emergencyBtn, (pressed || isBusy) && { opacity: 0.7 }]}
        onPress={handleAbandon}
        disabled={isBusy}
      >
        <Ionicons name="stop-circle-outline" size={16} color={Colors.crimson} />
        <Text style={styles.emergencyText}>Abandon Session</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 24 },
  centered: { justifyContent: "center", alignItems: "center", gap: 16 },
  noSessionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: Colors.textSecondary },
  backBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.bgCard, borderRadius: 12 },
  backBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textPrimary },
  strictBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.bgCard, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
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
  timerRing: { width: 220, height: 220, borderRadius: 110, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  timerInner: { width: 190, height: 190, borderRadius: 95, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  timerText: { fontFamily: "Inter_700Bold", fontSize: 48, color: Colors.textPrimary, letterSpacing: -2 },
  timerTarget: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  progressText: { position: "absolute", bottom: -8 },
  progressPercent: { fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 0.5 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 32 },
  statCard: { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 16 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.textMuted, textAlign: "center" },
  controls: { gap: 12 },
  controlBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 54, borderRadius: 16 },
  pauseBtn: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  resumeBtn: { backgroundColor: Colors.green, shadowColor: Colors.green, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  completeBtn: { backgroundColor: Colors.accent, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  earlyBtn: { backgroundColor: Colors.amberDim, borderWidth: 1, borderColor: Colors.amber + "50" },
  controlBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.textPrimary },
  progressHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4, paddingBottom: 8 },
  progressHintText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  emergencyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 16, marginTop: 4 },
  emergencyText: { fontFamily: "Inter_500Medium", fontSize: 13, color: Colors.crimson },
});

const modalStyles = StyleSheet.create({
  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "#00000088",
    alignItems: "center", justifyContent: "center",
    zIndex: 100, paddingHorizontal: 24,
  },
  card: {
    width: "100%", backgroundColor: Colors.bgElevated,
    borderRadius: 20, padding: 24, gap: 16,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 20,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  body: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  actions: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  cancelText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  confirmBtn: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  confirmText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#fff", textAlign: "center" },
});

const errorStyles = StyleSheet.create({
  banner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.crimson + "18", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.crimson + "40", marginBottom: 12,
  },
  text: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.crimson, lineHeight: 18 },
});

const tipStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cyan + "10", borderRadius: 14,
    borderWidth: 1, borderColor: Colors.cyan + "30",
    padding: 12, gap: 8, marginBottom: 16,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.cyan, letterSpacing: 1.2, flex: 1 },
  body: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
});

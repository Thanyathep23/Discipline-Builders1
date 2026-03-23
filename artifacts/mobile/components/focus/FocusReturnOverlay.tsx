import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useFocusSession } from "@/context/FocusSessionContext";
import { useStopSession } from "@/hooks/useApi";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function FocusReturnOverlay() {
  const {
    showReturnOverlay,
    missionTitle,
    endTime,
    distractionCount,
    totalDistractionSeconds,
    strictnessMode,
    dismissOverlay,
    sessionId,
  } = useFocusSession();

  const stopSession = useStopSession();
  const [canResume, setCanResume] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");

  const minDelay = strictnessMode === "strict" || strictnessMode === "extreme" ? 5000 : 3000;

  useEffect(() => {
    if (!showReturnOverlay) {
      setCanResume(false);
      setShowEndConfirm(false);
      return;
    }
    setCanResume(false);
    const timer = setTimeout(() => setCanResume(true), minDelay);
    return () => clearTimeout(timer);
  }, [showReturnOverlay, minDelay]);

  useEffect(() => {
    if (!showReturnOverlay || !endTime) return;
    const tick = () => {
      const remaining = endTime - Date.now();
      setTimeRemaining(formatCountdown(Math.max(0, remaining)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [showReturnOverlay, endTime]);

  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      await stopSession.mutateAsync({
        sessionId,
        reason: "abandoned",
        distractionCount,
        totalDistractionSeconds,
      });
    } catch {}
    dismissOverlay();
  };

  if (!showReturnOverlay) return null;

  const warningMessage =
    strictnessMode !== "normal" && distractionCount >= 5
      ? "Focus quality is low. Consider restarting this session."
      : strictnessMode !== "normal" && distractionCount >= 3
        ? "3 distractions recorded. This will affect your reward."
        : distractionCount >= 5
          ? "Focus quality is low. Consider restarting this session."
          : null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning-outline" size={48} color={Colors.amber} />
            </View>

            <Text style={styles.title}>You left the app</Text>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Working on</Text>
              <Text style={styles.infoValue} numberOfLines={2}>
                {missionTitle ?? "Focus Session"}
              </Text>
            </View>

            {endTime && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Focus ends in</Text>
                <Text style={[styles.infoValue, styles.timeValue]}>{timeRemaining}</Text>
              </View>
            )}

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Times left app</Text>
              <Text style={[styles.infoValue, distractionCount >= 3 ? styles.warningValue : undefined]}>
                {distractionCount}
              </Text>
            </View>

            {warningMessage && (
              <Animated.View entering={FadeIn.delay(200)} style={styles.warningBanner}>
                <Ionicons name="alert-circle" size={16} color={Colors.crimson} />
                <Text style={styles.warningText}>{warningMessage}</Text>
              </Animated.View>
            )}

            {!showEndConfirm ? (
              <View style={styles.actions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.resumeButton,
                    !canResume && styles.buttonDisabled,
                    pressed && canResume && { opacity: 0.85 },
                  ]}
                  onPress={canResume ? dismissOverlay : undefined}
                  disabled={!canResume}
                >
                  <Ionicons name="play" size={18} color={Colors.textOnAccent} />
                  <Text style={styles.resumeText}>
                    {canResume ? "Resume Focus" : `Wait ${Math.ceil(minDelay / 1000)}s...`}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.endButton, pressed && { opacity: 0.7 }]}
                  onPress={() => setShowEndConfirm(true)}
                >
                  <Text style={styles.endText}>End Session Early</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.actions}>
                <Text style={styles.confirmText}>
                  End this session? Progress will be saved but you may receive a penalty.
                </Text>
                <Pressable
                  style={({ pressed }) => [styles.confirmEndButton, pressed && { opacity: 0.85 }]}
                  onPress={handleEndSession}
                >
                  <Text style={styles.confirmEndText}>Yes, End Session</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.cancelButton, pressed && { opacity: 0.7 }]}
                  onPress={() => setShowEndConfirm(false)}
                >
                  <Text style={styles.cancelText}>Go Back</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.amberDim,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
    marginBottom: 24,
    textAlign: "center",
  },
  infoCard: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.textPrimary,
    maxWidth: "60%",
    textAlign: "right",
  },
  timeValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: Colors.accent,
  },
  warningValue: {
    color: Colors.crimson,
  },
  warningBanner: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.crimsonDim,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  warningText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.crimson,
    flex: 1,
  },
  actions: {
    width: "100%",
    marginTop: 24,
    gap: 12,
  },
  resumeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  resumeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: Colors.textOnAccent,
  },
  endButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.crimson + "40",
  },
  endText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.crimson,
  },
  confirmText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 4,
  },
  confirmEndButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.crimson,
    borderRadius: 14,
    paddingVertical: 16,
  },
  confirmEndText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    paddingVertical: 14,
  },
  cancelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

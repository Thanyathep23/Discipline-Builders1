import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  Platform, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useSubmitProof, useProof, useAnswerFollowup, useUploadProofFile } from "@/hooks/useApi";

const VERDICT_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  approved: { color: Colors.green, icon: "checkmark-circle", label: "Approved" },
  partial: { color: Colors.amber, icon: "alert-circle", label: "Partial Approval" },
  rejected: { color: Colors.crimson, icon: "close-circle", label: "Rejected" },
  flagged: { color: Colors.crimson, icon: "flag", label: "Flagged for Review" },
  followup_needed: { color: Colors.amber, icon: "chatbubble-ellipses", label: "Follow-up Needed" },
  reviewing: { color: Colors.cyan, icon: "hourglass", label: "AI Reviewing..." },
  pending: { color: Colors.textMuted, icon: "time", label: "Pending Review" },
};

interface AttachedFile {
  fileId: string;
  originalName: string;
  mimeType: string;
  fileSizeKb: number;
  uploading?: boolean;
  error?: string;
}

function fileIcon(mimeType: string): "image-outline" | "document-text-outline" | "document-outline" {
  if (mimeType.startsWith("image/")) return "image-outline";
  if (mimeType === "application/pdf") return "document-text-outline";
  return "document-outline";
}

export default function ProofSubmissionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const insets = useSafeAreaInsets();
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [textSummary, setTextSummary] = useState("");
  const [link, setLink] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [followupAnswer, setFollowupAnswer] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const submitProof = useSubmitProof();
  const { data: proof, isLoading: proofLoading } = useProof(submissionId);
  const answerFollowup = useAnswerFollowup();
  const uploadFile = useUploadProofFile();

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  function addLink() {
    if (link.trim() && !links.includes(link.trim())) {
      setLinks(l => [...l, link.trim()]);
      setLink("");
    }
  }

  async function pickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Allow photo library access to attach images.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const name = asset.fileName ?? `photo_${Date.now()}.jpg`;
      const type = asset.mimeType ?? "image/jpeg";

      await doUpload(uri, name, type);
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not pick image.");
    }
  }

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      await doUpload(asset.uri, asset.name, asset.mimeType ?? "application/octet-stream");
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Could not pick document.");
    }
  }

  async function doUpload(uri: string, name: string, type: string) {
    if (attachedFiles.length >= 5) {
      Alert.alert("Limit reached", "You can attach up to 5 files per proof.");
      return;
    }

    setUploadingFile(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await uploadFile.mutateAsync({ uri, name, type });
      setAttachedFiles(prev => [...prev, {
        fileId: res.fileId,
        originalName: res.originalName,
        mimeType: res.mimeType,
        fileSizeKb: res.fileSizeKb,
      }]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Upload failed", err.message ?? "Could not upload file. Max 10MB, images and PDFs only.");
    } finally {
      setUploadingFile(false);
    }
  }

  function showAttachOptions() {
    Alert.alert("Attach Evidence", "Choose file type", [
      { text: "Photo / Image", onPress: pickImage },
      { text: "Document / PDF", onPress: pickDocument },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handleSubmit() {
    const hasText = textSummary.trim().length > 0;
    const hasLinks = links.length > 0;
    const hasFiles = attachedFiles.length > 0;

    if (!hasText && !hasLinks && !hasFiles) {
      Alert.alert("Proof required", "Provide a text summary, link, or attach a file.");
      return;
    }
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const result = await submitProof.mutateAsync({
        sessionId: sessionId!,
        textSummary: textSummary.trim() || undefined,
        links,
        proofFileIds: attachedFiles.map(f => f.fileId),
      });
      setSubmissionId(result.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }

  async function handleFollowup() {
    if (followupAnswer.trim().length < 20) {
      Alert.alert("Too short", "Please provide a detailed answer (at least 20 characters).");
      return;
    }
    try {
      await answerFollowup.mutateAsync({ submissionId: submissionId!, answers: followupAnswer.trim() });
      setFollowupAnswer("");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  }

  const verdictConfig = proof ? VERDICT_CONFIG[proof.status] : null;
  const isFinalized = proof && ["approved", "partial", "rejected", "flagged"].includes(proof.status);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(tabs)")} style={styles.backBtn}>
          <Ionicons name="home" size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Submit Proof</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        {!submissionId && (
          <>
            <Animated.View entering={FadeInDown.springify()}>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={Colors.cyan} />
                <Text style={styles.infoText}>
                  The AI judge will review your proof against the mission requirements.
                  Be specific about what you did, the outcome, and what remains.
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.field}>
              <Text style={styles.label}>What did you accomplish? <Text style={{ color: Colors.crimson }}>*</Text></Text>
              <Text style={styles.sublabel}>Describe specifically what you did, outcomes produced, and what remains</Text>
              <TextInput
                style={[styles.textarea]}
                placeholder="I completed the first 3 sections of the project proposal, including the executive summary and market analysis. The outcome is a 4-page draft..."
                placeholderTextColor={Colors.textMuted}
                value={textSummary}
                onChangeText={setTextSummary}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={[styles.sublabel, { textAlign: "right", marginTop: 4 }]}>{textSummary.length} chars</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.field}>
              <Text style={styles.label}>Evidence Links (optional)</Text>
              <View style={styles.linkRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="https://..."
                  placeholderTextColor={Colors.textMuted}
                  value={link}
                  onChangeText={setLink}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <Pressable style={styles.addLinkBtn} onPress={addLink}>
                  <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
              </View>
              {links.map((l, i) => (
                <View key={i} style={styles.linkChip}>
                  <Ionicons name="link" size={14} color={Colors.cyan} />
                  <Text style={styles.linkText} numberOfLines={1}>{l}</Text>
                  <Pressable onPress={() => setLinks(ls => ls.filter((_, j) => j !== i))}>
                    <Ionicons name="close" size={16} color={Colors.textMuted} />
                  </Pressable>
                </View>
              ))}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.field}>
              <View style={styles.attachHeader}>
                <Text style={styles.label}>File Attachments (optional)</Text>
                <Text style={styles.sublabel}>Images, screenshots, PDFs, journals — max 10MB each</Text>
              </View>

              {attachedFiles.map((f, i) => (
                <View key={f.fileId} style={styles.fileChip}>
                  <Ionicons name={fileIcon(f.mimeType)} size={16} color={Colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>{f.originalName}</Text>
                    <Text style={styles.fileMeta}>{f.mimeType.split("/").pop()?.toUpperCase()} · {f.fileSizeKb}KB</Text>
                  </View>
                  <Pressable onPress={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}>
                    <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                  </Pressable>
                </View>
              ))}

              <Pressable
                style={[styles.attachBtn, (uploadingFile || attachedFiles.length >= 5) && { opacity: 0.5 }]}
                onPress={showAttachOptions}
                disabled={uploadingFile || attachedFiles.length >= 5}
              >
                {uploadingFile ? (
                  <>
                    <ActivityIndicator color={Colors.accent} size="small" />
                    <Text style={styles.attachBtnText}>Uploading...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="attach" size={18} color={Colors.accent} />
                    <Text style={styles.attachBtnText}>
                      {attachedFiles.length === 0 ? "Attach File" : `Attach Another (${attachedFiles.length}/5)`}
                    </Text>
                  </>
                )}
              </Pressable>
            </Animated.View>

            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }, submitProof.isPending && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitProof.isPending}
            >
              {submitProof.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Submit for AI Review</Text>
                </>
              )}
            </Pressable>
          </>
        )}

        {submissionId && (
          <>
            <Animated.View entering={FadeInDown.springify()}>
              {(!proof || proof.status === "reviewing" || proof.status === "pending") ? (
                <View style={styles.reviewingBox}>
                  <ActivityIndicator color={Colors.cyan} size="large" />
                  <Text style={styles.reviewingTitle}>AI Reviewing Your Proof</Text>
                  <Text style={styles.reviewingText}>This usually takes 5-15 seconds...</Text>
                </View>
              ) : (
                <View style={[styles.verdictCard, { borderColor: verdictConfig?.color + "60" }]}>
                  <Ionicons name={verdictConfig?.icon as any} size={48} color={verdictConfig?.color} />
                  <Text style={[styles.verdictLabel, { color: verdictConfig?.color }]}>{verdictConfig?.label}</Text>
                  <Text style={styles.verdictExplanation}>{proof.aiExplanation}</Text>

                  {proof.coinsAwarded != null && proof.coinsAwarded > 0 && (
                    <View style={styles.coinsRow}>
                      <Ionicons name="flash" size={20} color={Colors.gold} />
                      <Text style={styles.coinsText}>+{proof.coinsAwarded} coins earned</Text>
                    </View>
                  )}

                  {proof.fileUrls?.length > 0 || attachedFiles.length > 0 ? (
                    <View style={styles.filesSummary}>
                      <Ionicons name="attach" size={14} color={Colors.textMuted} />
                      <Text style={styles.filesSummaryText}>
                        {attachedFiles.length} file{attachedFiles.length !== 1 ? "s" : ""} included in submission
                      </Text>
                    </View>
                  ) : null}

                  {proof.aiRubric && (
                    <View style={styles.rubric}>
                      <Text style={styles.rubricTitle}>EVALUATION RUBRIC</Text>
                      {Object.entries(proof.aiRubric).map(([key, val]: [string, any]) => (
                        <View key={key} style={styles.rubricRow}>
                          <Text style={styles.rubricLabel}>{key.replace(/([A-Z])/g, ' $1').replace('Score', '').trim()}</Text>
                          <View style={styles.rubricBar}>
                            <View style={[styles.rubricFill, { width: `${Math.round((val ?? 0) * 100)}%`, backgroundColor: (val ?? 0) > 0.6 ? Colors.green : (val ?? 0) > 0.3 ? Colors.amber : Colors.crimson }]} />
                          </View>
                          <Text style={styles.rubricVal}>{Math.round((val ?? 0) * 100)}%</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </Animated.View>

            {proof?.status === "followup_needed" && (
              <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.followupBox}>
                <View style={styles.followupHeader}>
                  <Ionicons name="chatbubble-ellipses" size={20} color={Colors.amber} />
                  <Text style={styles.followupTitle}>AI Follow-up Questions</Text>
                </View>
                <Text style={styles.followupQuestions}>{proof.followupQuestions}</Text>
                <TextInput
                  style={styles.textarea}
                  placeholder="Answer the questions above with specific details..."
                  placeholderTextColor={Colors.textMuted}
                  value={followupAnswer}
                  onChangeText={setFollowupAnswer}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Pressable
                  style={[styles.followupBtn, answerFollowup.isPending && { opacity: 0.6 }]}
                  onPress={handleFollowup}
                  disabled={answerFollowup.isPending}
                >
                  {answerFollowup.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.followupBtnText}>Submit Answer</Text>
                  )}
                </Pressable>
              </Animated.View>
            )}

            {isFinalized && (
              <Animated.View entering={FadeInDown.delay(200).springify()}>
                <Pressable
                  style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.85 }]}
                  onPress={() => router.replace("/(tabs)")}
                >
                  <Ionicons name="home" size={18} color="#fff" />
                  <Text style={styles.homeBtnText}>Return to HQ</Text>
                </Pressable>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, gap: 20 },
  infoBox: { flexDirection: "row", gap: 10, backgroundColor: Colors.cyanDim, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.cyan + "40" },
  infoText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  field: { gap: 10 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.textSecondary },
  sublabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  textarea: {
    backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 14, fontFamily: "Inter_400Regular",
    fontSize: 14, color: Colors.textPrimary, minHeight: 120,
  },
  input: {
    backgroundColor: Colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 14, fontFamily: "Inter_400Regular",
    fontSize: 14, color: Colors.textPrimary, height: 50,
  },
  linkRow: { flexDirection: "row", gap: 10 },
  addLinkBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  linkChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.cyanDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: Colors.cyan + "30" },
  linkText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.cyan },
  attachHeader: { gap: 4 },
  attachBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: Colors.accent + "60", borderRadius: 12,
    paddingVertical: 12, backgroundColor: Colors.accent + "10",
    borderStyle: "dashed",
  },
  attachBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.accent },
  fileChip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.accent + "30",
  },
  fileName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  fileMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  submitBtn: {
    backgroundColor: Colors.accent, borderRadius: 14, height: 56,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  submitBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
  reviewingBox: { alignItems: "center", gap: 16, padding: 48 },
  reviewingTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  reviewingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary },
  verdictCard: {
    backgroundColor: Colors.bgCard, borderRadius: 20, padding: 24,
    alignItems: "center", gap: 16, borderWidth: 1,
  },
  verdictLabel: { fontFamily: "Inter_700Bold", fontSize: 20 },
  verdictExplanation: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 },
  coinsRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.goldDim + "40", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  coinsText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.gold },
  filesSummary: { flexDirection: "row", alignItems: "center", gap: 6 },
  filesSummaryText: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
  rubric: { width: "100%", gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  rubricTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  rubricRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rubricLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, width: 80 },
  rubricBar: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  rubricFill: { height: "100%", borderRadius: 3 },
  rubricVal: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.textPrimary, width: 32, textAlign: "right" },
  followupBox: { backgroundColor: Colors.amberDim, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.amber + "40", gap: 14 },
  followupHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  followupTitle: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.amber },
  followupQuestions: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  followupBtn: { backgroundColor: Colors.amber, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center" },
  followupBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.bg },
  homeBtn: {
    backgroundColor: Colors.accent, borderRadius: 14, height: 54,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  homeBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },
});

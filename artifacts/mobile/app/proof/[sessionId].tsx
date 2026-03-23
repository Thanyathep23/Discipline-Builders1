import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
  Platform, ActivityIndicator, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { useSubmitProof, useProof, useAnswerFollowup, useUploadProofFile } from "@/hooks/useApi";

// ─── Verdict configuration — drives all result rendering ──────────────────────

const VERDICT_CONFIG: Record<string, {
  color: string; icon: string; label: string;
  headline: string; gradColors: [string, string];
}> = {
  approved:       { color: Colors.green,   icon: "checkmark-circle",     label: "Approved",          headline: "Mission Complete",      gradColors: [Colors.green + "26",  "#08100E"] },
  partial:        { color: Colors.amber,   icon: "alert-circle",          label: "Partial Approval",  headline: "Partially Accepted",    gradColors: [Colors.amber + "22",  "#100E06"] },
  rejected:       { color: Colors.crimson, icon: "close-circle",          label: "Rejected",          headline: "Not Approved",          gradColors: [Colors.crimson + "22","#100608"] },
  flagged:        { color: Colors.crimson, icon: "flag",                  label: "Flagged for Review",headline: "Under Review",          gradColors: [Colors.crimson + "18","#100608"] },
  followup_needed:{ color: "#A855F7",      icon: "help-circle",            label: "Follow-up Required", headline: "Evidence Needs Clarification", gradColors: ["#A855F722", "#0C0610"] },
  manual_review:  { color: Colors.amber,   icon: "eye-outline",            label: "Manual Review",     headline: "Queued for Manual Review",  gradColors: [Colors.amber + "18",  "#100E06"] },
  reviewing:      { color: Colors.cyan,    icon: "hourglass-outline",     label: "AI Reviewing...",   headline: "",                      gradColors: [Colors.cyan + "14",   "#060C10"] },
  pending:        { color: Colors.textMuted,icon: "time-outline",         label: "Pending",           headline: "",                      gradColors: [Colors.bgElevated,    Colors.bgCard] },
};

// ─── Progression impact copy per verdict ──────────────────────────────────────

const IMPACT_APPROVED = [
  { icon: "flash",             color: Colors.gold,   text: "Coins credited to your wallet" },
  { icon: "star",              color: Colors.cyan,    text: "XP earned toward next level" },
  { icon: "trending-up",       color: Colors.green,  text: "Skill XP applied to targeted skills" },
  { icon: "checkmark-circle",  color: Colors.green,  text: "Mission marked complete" },
  { icon: "shield-checkmark",  color: Colors.accent, text: "Trust score increased" },
];
const IMPACT_PARTIAL = [
  { icon: "flash",             color: Colors.gold,   text: "Partial coins credited" },
  { icon: "star",              color: Colors.cyan,    text: "Partial XP earned" },
  { icon: "trending-up",       color: Colors.amber,  text: "Partial skill XP applied" },
  { icon: "arrow-redo-outline",color: Colors.amber,  text: "Retry with fuller evidence for 100% credit" },
];
const IMPACT_REJECTED = [
  { icon: "close-circle",          color: Colors.crimson, text: "No coins awarded this attempt" },
  { icon: "shield-checkmark-outline", color: Colors.cyan, text: "Trust score may decrease slightly" },
  { icon: "arrow-redo-outline",    color: Colors.accent,  text: "Retry with clearer, specific evidence" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface AttachedFile {
  fileId: string;
  originalName: string;
  mimeType: string;
  fileSizeKb: number;
  localUri?: string;
  uploadError?: string;
}

function isImage(mimeType: string) { return mimeType.startsWith("image/"); }

function fileTypeLabel(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "image/png") return "PNG";
  if (mimeType === "image/jpeg" || mimeType === "image/jpg") return "JPEG";
  if (mimeType === "image/gif") return "GIF";
  if (mimeType === "image/webp") return "WebP";
  return mimeType.split("/").pop()?.toUpperCase() ?? "FILE";
}

function formatRubricKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/score$/i, "")
    .replace(/^./, c => c.toUpperCase())
    .trim() || key;
}

// ─── Inline Error Banner ───────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <Animated.View entering={FadeInDown.springify()} style={errorBannerStyles.wrap}>
      <Ionicons name="alert-circle" size={16} color={Colors.crimson} />
      <Text style={errorBannerStyles.text}>{message}</Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={16} color={Colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [followupError, setFollowupError] = useState<string | null>(null);
  const [attachMode, setAttachMode] = useState(false);

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

  function removeFile(index: number) {
    setAttachedFiles(prev => prev.filter((_, j) => j !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function pickImage() {
    setAttachMode(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setUploadError("Allow photo library access to attach images.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      await doUpload(asset.uri, asset.fileName ?? `photo_${Date.now()}.jpg`, asset.mimeType ?? "image/jpeg", asset.uri);
    } catch (err: any) {
      setUploadError(err.message ?? "Could not pick image.");
    }
  }

  async function pickDocument() {
    setAttachMode(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const isImg = (asset.mimeType ?? "").startsWith("image/");
      await doUpload(asset.uri, asset.name, asset.mimeType ?? "application/octet-stream", isImg ? asset.uri : undefined);
    } catch (err: any) {
      setUploadError(err.message ?? "Could not pick document.");
    }
  }

  async function doUpload(uri: string, name: string, type: string, localUri?: string) {
    if (attachedFiles.length >= 5) {
      setUploadError("You can attach up to 5 files per proof submission.");
      return;
    }
    setUploadingFile(true);
    setUploadError(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await uploadFile.mutateAsync({ uri, name, type });
      setAttachedFiles(prev => [...prev, {
        fileId: res.fileId,
        originalName: res.originalName,
        mimeType: res.mimeType,
        fileSizeKb: res.fileSizeKb,
        localUri,
      }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setUploadError(err?.message ?? "Upload failed. Max 10MB, images and PDFs only.");
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleSubmit() {
    setSubmitError(null);
    const hasText = textSummary.trim().length > 0;
    const hasLinks = links.length > 0;
    const hasFiles = attachedFiles.length > 0;
    if (!hasText && !hasLinks && !hasFiles) {
      setSubmitError("Provide a text summary, link, or attach a file.");
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const result = await submitProof.mutateAsync({
        sessionId: sessionId!,
        textSummary: textSummary.trim() || undefined,
        links,
        proofFileIds: attachedFiles.map(f => f.fileId),
      });
      setSubmissionId(result.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setSubmitError(err.message ?? "Submission failed. Please try again.");
    }
  }

  async function handleFollowup() {
    setFollowupError(null);
    if (followupAnswer.trim().length < 10) {
      setFollowupError("Please provide a more detailed answer (at least 10 characters).");
      return;
    }
    try {
      await answerFollowup.mutateAsync({ submissionId: submissionId!, answers: followupAnswer.trim() });
      setFollowupAnswer("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setFollowupError(err.message ?? "Submission failed. Please try again.");
    }
  }

  const verdictConfig = proof ? VERDICT_CONFIG[proof.status] : null;
  const isFinalized = proof && ["approved", "partial", "rejected", "flagged"].includes(proof.status);
  const isSuccess = proof && ["approved", "partial"].includes(proof.status);
  const isRejected = proof?.status === "rejected" || proof?.status === "flagged";

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(tabs)")} style={styles.backBtn}>
          <Ionicons name="home" size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {submissionId ? "Result" : "Submit Proof"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── SUBMISSION FORM (unchanged logic) ── */}
        {!submissionId && (
          <>
            <Animated.View entering={FadeInDown.springify()}>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color={Colors.cyan} />
                <Text style={styles.infoText}>
                  The AI judge will review your proof against mission requirements. Be specific about what you did, outcomes produced, and what remains.
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.field}>
              <Text style={styles.label}>What did you accomplish?</Text>
              <Text style={styles.sublabel}>Describe specifically what you did, outcomes produced, and what remains</Text>
              <TextInput
                style={styles.textarea}
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
                <Text style={styles.sublabel}>Images, screenshots, PDFs — max 10MB · up to 5 files</Text>
              </View>

              {attachedFiles.map((f, i) => (
                <View key={f.fileId} style={styles.fileCard}>
                  {isImage(f.mimeType) && f.localUri ? (
                    <Image source={{ uri: f.localUri }} style={styles.thumbnail} resizeMode="cover" />
                  ) : (
                    <View style={styles.pdfBadge}>
                      <Ionicons name="document-text" size={22} color={Colors.accent} />
                    </View>
                  )}
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{f.originalName}</Text>
                    <Text style={styles.fileMeta}>
                      <Text style={isImage(f.mimeType) ? styles.imageTag : styles.docTag}>
                        {fileTypeLabel(f.mimeType)}
                      </Text>
                      {"  "}{f.fileSizeKb}KB
                    </Text>
                  </View>
                  <Pressable onPress={() => removeFile(i)} style={styles.removeBtn} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
                  </Pressable>
                </View>
              ))}

              {uploadError && (
                <ErrorBanner message={uploadError} onDismiss={() => setUploadError(null)} />
              )}

              {/* Attach picker — inline instead of Alert.alert menu */}
              {!attachMode ? (
                <Pressable
                  style={[styles.attachBtn, (uploadingFile || attachedFiles.length >= 5) && { opacity: 0.5 }]}
                  onPress={() => setAttachMode(true)}
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
              ) : (
                <View style={styles.attachPicker}>
                  <Pressable style={styles.attachPickerOption} onPress={pickImage}>
                    <Ionicons name="image-outline" size={18} color={Colors.accent} />
                    <Text style={styles.attachPickerText}>Photo / Image</Text>
                  </Pressable>
                  <View style={styles.attachPickerDivider} />
                  <Pressable style={styles.attachPickerOption} onPress={pickDocument}>
                    <Ionicons name="document-text-outline" size={18} color={Colors.accent} />
                    <Text style={styles.attachPickerText}>Document / PDF</Text>
                  </Pressable>
                  <View style={styles.attachPickerDivider} />
                  <Pressable style={[styles.attachPickerOption, { justifyContent: "center" }]} onPress={() => setAttachMode(false)}>
                    <Text style={[styles.attachPickerText, { color: Colors.textMuted }]}>Cancel</Text>
                  </Pressable>
                </View>
              )}
            </Animated.View>

            {submitError && (
              <ErrorBanner message={submitError} onDismiss={() => setSubmitError(null)} />
            )}

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                submitProof.isPending && { opacity: 0.6 },
              ]}
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

        {/* ── RESULT SECTION ── */}
        {submissionId && (
          <>

            {/* ── REVIEWING STATE ── */}
            {(!proof || proof.status === "reviewing" || proof.status === "pending") && (
              <Animated.View entering={FadeInDown.springify()}>
                <LinearGradient
                  colors={[Colors.cyan + "14", Colors.bgCard]}
                  style={styles.reviewingCard}
                >
                  <View style={styles.reviewingIconWrap}>
                    <ActivityIndicator color={Colors.cyan} size="large" />
                  </View>
                  <Text style={styles.reviewingTitle}>AI is reviewing your proof</Text>
                  <Text style={styles.reviewingSubtitle}>
                    Evaluating completeness, specificity, and evidence quality
                  </Text>
                  <View style={styles.reviewingChecks}>
                    {["Checking mission requirements", "Evaluating your evidence", "Calculating reward"].map((step, i) => (
                      <View key={i} style={styles.reviewingCheckRow}>
                        <ActivityIndicator color={Colors.cyan} size="small" />
                        <Text style={styles.reviewingCheckText}>{step}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </Animated.View>
            )}

            {/* ── FINALIZED / FOLLOWUP VERDICT ── */}
            {proof && !["reviewing", "pending"].includes(proof.status) && verdictConfig && (
              <>

                {/* 1. VERDICT HERO — who/what/why */}
                <Animated.View entering={FadeIn.duration(500)}>
                  <LinearGradient
                    colors={verdictConfig.gradColors}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={[styles.verdictHero, { borderColor: verdictConfig.color + "50" }]}
                  >
                    {/* Icon with glow ring */}
                    <View style={styles.verdictIconWrap}>
                      <View style={[styles.verdictIconRing, { borderColor: verdictConfig.color + "30" }]} />
                      <Ionicons name={verdictConfig.icon as any} size={64} color={verdictConfig.color} />
                    </View>

                    {/* Headline + verdict label */}
                    {verdictConfig.headline ? (
                      <Text style={styles.verdictHeadline}>{verdictConfig.headline}</Text>
                    ) : null}
                    <View style={[styles.verdictLabelPill, { borderColor: verdictConfig.color + "50", backgroundColor: verdictConfig.color + "18" }]}>
                      <Text style={[styles.verdictLabelText, { color: verdictConfig.color }]}>
                        {verdictConfig.label}
                      </Text>
                    </View>

                    {/* AI Explanation — the "why" */}
                    <Text style={styles.verdictExplanation}>{proof.aiExplanation}</Text>

                    {/* Coins — inside hero for immediate emotional payoff (approved/partial only) */}
                    {isSuccess && proof.coinsAwarded != null && proof.coinsAwarded > 0 && (
                      <View style={[styles.coinsHeroWrap, { borderColor: Colors.gold + "40" }]}>
                        <Ionicons name="flash" size={22} color={Colors.gold} />
                        <Text style={styles.coinsHeroNum}>+{proof.coinsAwarded}</Text>
                        <Text style={styles.coinsHeroLabel}>COINS</Text>
                      </View>
                    )}
                  </LinearGradient>
                </Animated.View>

                {/* 2. HOW THIS WAS JUDGED — rubric (only if AI returned one) */}
                {proof.aiRubric && Object.keys(proof.aiRubric).length > 0 && (
                  <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.rubricCard}>
                    <View style={styles.rubricHeader}>
                      <Ionicons name="analytics-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.rubricTitle}>HOW THE AI JUDGED THIS</Text>
                    </View>
                    {Object.entries(proof.aiRubric).map(([key, val]: [string, any]) => {
                      const pct = Math.round((val ?? 0) * 100);
                      const barColor = pct >= 70 ? Colors.green : pct >= 40 ? Colors.amber : Colors.crimson;
                      return (
                        <View key={key} style={styles.rubricRow}>
                          <Text style={styles.rubricLabel}>{formatRubricKey(key)}</Text>
                          <View style={styles.rubricBarBg}>
                            <View style={[styles.rubricBarFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
                          </View>
                          <Text style={[styles.rubricPct, { color: barColor }]}>{pct}%</Text>
                        </View>
                      );
                    })}
                  </Animated.View>
                )}

                {/* 3. WHAT CHANGED — progression impact */}
                {isFinalized && (
                  <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.impactCard}>
                    <View style={styles.impactHeader}>
                      <Ionicons name="layers-outline" size={13} color={Colors.textMuted} />
                      <Text style={styles.impactTitle}>WHAT CHANGED</Text>
                    </View>
                    {(isSuccess
                      ? proof.status === "approved" ? IMPACT_APPROVED : IMPACT_PARTIAL
                      : IMPACT_REJECTED
                    ).map((item, i) => (
                      <View key={i} style={styles.impactRow}>
                        <View style={[styles.impactIconWrap, { backgroundColor: item.color + "18" }]}>
                          <Ionicons name={item.icon as any} size={14} color={item.color} />
                        </View>
                        <Text style={styles.impactText}>{item.text}</Text>
                      </View>
                    ))}
                  </Animated.View>
                )}

                {/* 4. FOLLOW-UP QUESTIONS (if followup_needed) */}
                {proof.status === "followup_needed" && (
                  <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.followupCard}>
                    <View style={styles.followupHeader}>
                      <Ionicons name="chatbubble-ellipses" size={18} color={Colors.amber} />
                      <Text style={styles.followupTitle}>The AI needs more information</Text>
                    </View>
                    <View style={styles.followupCountRow}>
                      <Ionicons name="repeat-outline" size={14} color={Colors.textMuted} />
                      <Text style={styles.followupCountText}>
                        Follow-up {Math.min((proof as any).followupCount ?? 0, 2) + 1} of 2 max
                      </Text>
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
                    {followupError && (
                      <ErrorBanner message={followupError} onDismiss={() => setFollowupError(null)} />
                    )}
                    <Pressable
                      style={[styles.followupSubmitBtn, answerFollowup.isPending && { opacity: 0.6 }]}
                      onPress={handleFollowup}
                      disabled={answerFollowup.isPending}
                    >
                      {answerFollowup.isPending ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="send" size={15} color="#fff" />
                          <Text style={styles.followupSubmitText}>Submit Answer</Text>
                        </>
                      )}
                    </Pressable>
                  </Animated.View>
                )}

                {/* 5. WHAT NEXT — finalized states only */}
                {isFinalized && (
                  <Animated.View entering={FadeInDown.delay(200).springify()} style={{ gap: 10 }}>

                    {/* Primary CTA — full width, verdict-tinted */}
                    {proof.status === "approved" && (
                      <Pressable
                        style={({ pressed }) => [styles.primaryCTA, { backgroundColor: Colors.green }, pressed && { opacity: 0.87, transform: [{ scale: 0.98 }] }]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.replace("/mission/new"); }}
                      >
                        <Ionicons name="add-circle" size={20} color="#fff" />
                        <Text style={styles.primaryCTAText}>Start Next Mission</Text>
                      </Pressable>
                    )}

                    {proof.status === "partial" && (
                      <Pressable
                        style={({ pressed }) => [styles.primaryCTA, { backgroundColor: Colors.amber }, pressed && { opacity: 0.87, transform: [{ scale: 0.98 }] }]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.replace("/(tabs)/missions"); }}
                      >
                        <Ionicons name="arrow-redo" size={20} color={Colors.bg} />
                        <Text style={[styles.primaryCTAText, { color: Colors.bg }]}>Continue on Missions</Text>
                      </Pressable>
                    )}

                    {(proof.status === "rejected" || proof.status === "flagged") && (
                      <Pressable
                        style={({ pressed }) => [styles.primaryCTA, { backgroundColor: Colors.accent }, pressed && { opacity: 0.87, transform: [{ scale: 0.98 }] }]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.replace("/mission/new"); }}
                      >
                        <Ionicons name="add-circle" size={20} color="#fff" />
                        <Text style={styles.primaryCTAText}>Create a New Mission</Text>
                      </Pressable>
                    )}

                    {/* Secondary chip row */}
                    <View style={styles.secondaryRow}>
                      {isSuccess && (
                        <Pressable
                          style={({ pressed }) => [styles.secondaryChip, { borderColor: Colors.gold + "50", backgroundColor: Colors.gold + "10" }, pressed && { opacity: 0.8 }]}
                          onPress={() => { Haptics.selectionAsync(); router.replace("/(tabs)/rewards"); }}
                        >
                          <Ionicons name="flash" size={14} color={Colors.gold} />
                          <Text style={[styles.secondaryChipText, { color: Colors.gold }]}>Spend Coins</Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={({ pressed }) => [styles.secondaryChip, { borderColor: Colors.accent + "50", backgroundColor: Colors.accent + "10" }, pressed && { opacity: 0.8 }]}
                        onPress={() => { Haptics.selectionAsync(); router.replace("/character"); }}
                      >
                        <Ionicons name="person-outline" size={14} color={Colors.accent} />
                        <Text style={[styles.secondaryChipText, { color: Colors.accent }]}>View Character</Text>
                      </Pressable>
                      {isRejected && (
                        <Pressable
                          style={({ pressed }) => [styles.secondaryChip, { borderColor: Colors.cyan + "50", backgroundColor: Colors.cyan + "10" }, pressed && { opacity: 0.8 }]}
                          onPress={() => { Haptics.selectionAsync(); router.replace("/(tabs)/missions"); }}
                        >
                          <Ionicons name="list-outline" size={14} color={Colors.cyan} />
                          <Text style={[styles.secondaryChipText, { color: Colors.cyan }]}>All Missions</Text>
                        </Pressable>
                      )}
                    </View>

                    {/* Return to HQ — always present, prominent enough to find */}
                    <Pressable
                      style={({ pressed }) => [styles.homeBtn, pressed && { opacity: 0.8 }]}
                      onPress={() => router.replace("/(tabs)")}
                    >
                      <Ionicons name="home" size={17} color={Colors.textSecondary} />
                      <Text style={styles.homeBtnText}>Return to HQ</Text>
                    </Pressable>
                  </Animated.View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, color: Colors.textPrimary },
  scroll: { paddingHorizontal: 20, gap: 20 },

  // Info box (submission form)
  infoBox: {
    flexDirection: "row", gap: 10, backgroundColor: Colors.cyanDim, borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: Colors.cyan + "40",
  },
  infoText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  // Form fields
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
  addLinkBtn: {
    width: 50, height: 50, borderRadius: 12, backgroundColor: Colors.accent,
    alignItems: "center", justifyContent: "center",
  },
  linkChip: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.cyanDim,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.cyan + "30",
  },
  linkText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.cyan },
  attachHeader: { gap: 4 },

  // Attach picker (inline, no Alert)
  attachBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: Colors.accent + "60", borderRadius: 12,
    paddingVertical: 12, backgroundColor: Colors.accent + "10", borderStyle: "dashed",
  },
  attachBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.accent },
  attachPicker: {
    backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden",
  },
  attachPickerOption: {
    flexDirection: "row", alignItems: "center", gap: 10, padding: 14,
  },
  attachPickerText: { fontFamily: "Inter_500Medium", fontSize: 14, color: Colors.textPrimary },
  attachPickerDivider: { height: 1, backgroundColor: Colors.border },

  // File cards
  fileCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: Colors.accent + "30",
  },
  thumbnail: { width: 52, height: 52, borderRadius: 8, backgroundColor: Colors.border },
  pdfBadge: {
    width: 52, height: 52, borderRadius: 8, backgroundColor: Colors.accent + "18",
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.accent + "30",
  },
  fileInfo: { flex: 1, gap: 3 },
  fileName: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.textPrimary },
  fileMeta: { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  imageTag: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.green },
  docTag: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.accent },
  removeBtn: { padding: 4 },

  // Submit button
  submitBtn: {
    backgroundColor: Colors.accent, borderRadius: 14, height: 56,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  submitBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },

  // ── Reviewing state ──
  reviewingCard: {
    borderRadius: 22, padding: 32, alignItems: "center", gap: 14,
    borderWidth: 1, borderColor: Colors.cyan + "30",
  },
  reviewingIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: Colors.cyan + "15", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.cyan + "30",
  },
  reviewingTitle: { fontFamily: "Inter_700Bold", fontSize: 19, color: Colors.textPrimary, textAlign: "center" },
  reviewingSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, textAlign: "center", lineHeight: 19 },
  reviewingChecks: { gap: 8, width: "100%", marginTop: 8 },
  reviewingCheckRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewingCheckText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textMuted },

  // ── Verdict Hero ──
  verdictHero: {
    borderRadius: 24, padding: 28, alignItems: "center", gap: 14,
    borderWidth: 1, overflow: "hidden",
  },
  verdictIconWrap: { position: "relative", alignItems: "center", justifyContent: "center" },
  verdictIconRing: {
    position: "absolute", width: 96, height: 96, borderRadius: 48, borderWidth: 1,
  },
  verdictHeadline: {
    fontFamily: "Inter_700Bold", fontSize: 24,
    color: Colors.textPrimary, letterSpacing: -0.5, textAlign: "center",
  },
  verdictLabelPill: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1,
  },
  verdictLabelText: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1.5 },
  verdictExplanation: {
    fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary,
    textAlign: "center", lineHeight: 22, paddingHorizontal: 4,
  },

  // Coins hero (inside verdict card)
  coinsHeroWrap: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.gold + "15", paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 24, borderWidth: 1, marginTop: 4,
  },
  coinsHeroNum: { fontFamily: "Inter_700Bold", fontSize: 28, color: Colors.gold, letterSpacing: -0.5 },
  coinsHeroLabel: { fontFamily: "Inter_700Bold", fontSize: 11, color: Colors.gold, letterSpacing: 2, marginTop: 3 },

  // ── Rubric card ──
  rubricCard: {
    backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  rubricHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 2 },
  rubricTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.8 },
  rubricRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rubricLabel: {
    fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary,
    width: 100, flexShrink: 0,
  },
  rubricBarBg: { flex: 1, height: 7, backgroundColor: Colors.bgElevated, borderRadius: 4, overflow: "hidden" },
  rubricBarFill: { height: "100%", borderRadius: 4 },
  rubricPct: { fontFamily: "Inter_700Bold", fontSize: 12, width: 36, textAlign: "right" },

  // ── Impact / What Changed card ──
  impactCard: {
    backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border, gap: 11,
  },
  impactHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 2 },
  impactTitle: { fontFamily: "Inter_700Bold", fontSize: 10, color: Colors.textMuted, letterSpacing: 1.8 },
  impactRow: { flexDirection: "row", alignItems: "center", gap: 11 },
  impactIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  impactText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 19 },

  // ── Follow-up ──
  followupCard: {
    backgroundColor: Colors.amberDim, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.amber + "40", gap: 14,
  },
  followupHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  followupTitle: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.amber, flex: 1 },
  followupCountRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.bg + "60", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  followupCountText: { fontFamily: "Inter_500Medium", fontSize: 12, color: Colors.textMuted },
  followupQuestions: {
    fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textSecondary,
    lineHeight: 21, backgroundColor: Colors.bg + "60", borderRadius: 10, padding: 12,
  },
  followupSubmitBtn: {
    backgroundColor: Colors.amber, borderRadius: 12, height: 50,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  followupSubmitText: { fontFamily: "Inter_700Bold", fontSize: 15, color: Colors.bg },

  // ── CTAs ──
  primaryCTA: {
    borderRadius: 16, height: 58,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
  },
  primaryCTAText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },

  secondaryRow: { flexDirection: "row", gap: 10 },
  secondaryChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 11,
  },
  secondaryChipText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

  homeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.bgCard, borderRadius: 14, height: 50,
    borderWidth: 1, borderColor: Colors.border,
  },
  homeBtnText: { fontFamily: "Inter_500Medium", fontSize: 15, color: Colors.textSecondary },
});

// ─── Error Banner Styles ───────────────────────────────────────────────────────

const errorBannerStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.crimson + "15", borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.crimson + "40",
  },
  text: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.crimson, lineHeight: 18 },
});

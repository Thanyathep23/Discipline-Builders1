import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  ActivityIndicator, Alert, Clipboard, Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

const SKILL_COLORS: Record<string, string> = {
  focus: "#7C5CFC", discipline: "#FF7043", learning: "#00D4FF",
  sleep: "#00BCD4", fitness: "#00E676", trading: "#F5C842",
};

const EVENT_ICONS: Record<string, { icon: string; color: string }> = {
  badge_earned:         { icon: "ribbon", color: "#F5C842" },
  title_unlocked:       { icon: "trophy", color: "#9C27B0" },
  chain_completed:      { icon: "git-branch", color: "#00E676" },
  challenge_completed:  { icon: "flash", color: "#7C5CFC" },
  milestone:            { icon: "star", color: "#FFB300" },
  win_shared:           { icon: "heart", color: "#FF3D71" },
};

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CircleDetailScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["circle", id],
    queryFn: () => request<any>(`/circles/${id}`),
    enabled: !!id,
  });

  const leaveMutation = useMutation({
    mutationFn: () => request<any>(`/circles/${id}/leave`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circles"] });
      router.replace("/circles");
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (targetUserId: string) =>
      request<any>(`/circles/${id}/members/${targetUserId}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["circle", id] }); refetch(); },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const joinChallengeMutation = useMutation({
    mutationFn: ({ challengeId, action }: { challengeId: string; action: string }) =>
      request<any>(`/circles/${id}/challenges/${challengeId}/${action}`, { method: "POST" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["circle", id] }); refetch(); },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const reportMutation = useMutation({
    mutationFn: (reason: string) =>
      request<any>(`/circles/${id}/report`, { method: "POST", body: JSON.stringify({ reason }) }),
    onSuccess: () => Alert.alert("Reported", "Your report has been submitted. We take safety seriously."),
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  function handleCopyCode() {
    if (!data?.inviteCode) return;
    Clipboard.setString(data.inviteCode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleShareCode() {
    if (!data?.inviteCode) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Share.share({ message: `Join my accountability circle "${data.name}" on DisciplineOS.\n\nUse code: ${data.inviteCode}` });
  }

  function handleLeave() {
    Alert.alert("Leave Circle", "Are you sure you want to leave this circle?", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: () => leaveMutation.mutate() },
    ]);
  }

  function handleRemoveMember(memberId: string, memberName: string) {
    Alert.alert("Remove Member", `Remove ${memberName} from this circle?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMemberMutation.mutate(memberId) },
    ]);
  }

  function handleReport() {
    Alert.prompt("Report", "Briefly describe the issue:", (text) => {
      if (text && text.trim().length >= 3) reportMutation.mutate(text.trim());
    });
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topPad }]}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topPad }]}>
        <Text style={styles.errorText}>Circle not found or access denied.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtnAlt}>
          <Text style={{ color: Colors.accent, fontFamily: "Inter_600SemiBold" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const isOwner = data.myRole === "owner";
  const members: any[] = data.members ?? [];
  const activity: any[] = data.activity ?? [];
  const challenges: any[] = data.challenges ?? [];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{data.name}</Text>
          <Text style={styles.headerSub}>{members.length}/{data.maxMembers} members · {isOwner ? "Owner" : "Member"}</Text>
        </View>
        {!isOwner && (
          <Pressable onPress={handleLeave} style={styles.leaveBtn}>
            <Text style={styles.leaveBtnText}>Leave</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Invite code (owner only) */}
        {isOwner && data.inviteCode && (
          <Animated.View entering={FadeInDown.springify()} style={styles.codeCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.codeLabel}>INVITE CODE</Text>
              <Text style={styles.codeValue}>{data.inviteCode}</Text>
              <Text style={styles.codeSub}>Share this privately — anyone with the code can join.</Text>
            </View>
            <View style={styles.codeBtns}>
              <Pressable style={({ pressed }) => [styles.codeBtn, pressed && { opacity: 0.7 }]} onPress={handleCopyCode}>
                <Ionicons name="copy-outline" size={18} color={Colors.textSecondary} />
              </Pressable>
              <Pressable style={({ pressed }) => [styles.codeBtn, pressed && { opacity: 0.7 }]} onPress={handleShareCode}>
                <Ionicons name="share-outline" size={18} color={Colors.textSecondary} />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {/* Active Challenges */}
        {challenges.length > 0 && (
          <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Active Challenges</Text>
            <View style={{ gap: 10 }}>
              {challenges.map((ch: any) => {
                const myStatus = ch.myStatus;
                const canJoin = !myStatus;
                const canComplete = myStatus === "joined";
                return (
                  <View key={ch.id} style={[styles.challengeCard, { borderColor: ch.color + "50" }]}>
                    <View style={[styles.challengeIconWrap, { backgroundColor: ch.color + "15" }]}>
                      <Ionicons name={ch.icon as any} size={20} color={ch.color} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.challengeLabel}>{ch.label}</Text>
                      {ch.description ? <Text style={styles.challengeDesc}>{ch.description}</Text> : null}
                      <Text style={styles.challengeMeta}>
                        {ch.participantCount} joined · {ch.completedCount} completed
                      </Text>
                      {myStatus === "completed" && (
                        <View style={styles.completedPill}>
                          <Ionicons name="checkmark-circle" size={12} color={Colors.green} />
                          <Text style={styles.completedPillText}>Completed</Text>
                        </View>
                      )}
                      {myStatus === "joined" && (
                        <View style={styles.joinedPill}>
                          <Text style={styles.joinedPillText}>Participating</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ gap: 6 }}>
                      {canJoin && (
                        <Pressable
                          style={({ pressed }) => [styles.challengeBtn, { backgroundColor: ch.color }, pressed && { opacity: 0.8 }]}
                          onPress={() => joinChallengeMutation.mutate({ challengeId: ch.id, action: "join" })}
                        >
                          <Text style={styles.challengeBtnText}>Join</Text>
                        </Pressable>
                      )}
                      {canComplete && (
                        <Pressable
                          style={({ pressed }) => [styles.challengeBtn, { backgroundColor: Colors.green }, pressed && { opacity: 0.8 }]}
                          onPress={() => joinChallengeMutation.mutate({ challengeId: ch.id, action: "complete" })}
                        >
                          <Text style={styles.challengeBtnText}>Done</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Create challenge (owner only) */}
        {isOwner && (
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <Pressable
              style={({ pressed }) => [styles.createChallengeBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.push(`/circles/${id}/challenge`)}
            >
              <Ionicons name="flash-outline" size={16} color={Colors.accent} />
              <Text style={styles.createChallengeBtnText}>Start a Shared Challenge</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* Members */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Members</Text>
          <View style={styles.membersGrid}>
            {members.map((m: any) => (
              <Pressable
                key={m.userId}
                style={({ pressed }) => [styles.memberCard, pressed && { opacity: 0.8 }]}
                onLongPress={() => {
                  if (isOwner && m.userId !== user?.id) {
                    handleRemoveMember(m.userId, m.username);
                  }
                }}
                onPress={() => router.push(`/showcase/${m.userId}`)}
              >
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>{m.username?.[0]?.toUpperCase() ?? "?"}</Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>{m.username}</Text>
                {m.role === "owner" && (
                  <View style={styles.memberOwnerDot} />
                )}
                {m.activeTitle && (
                  <Text style={styles.memberTitle} numberOfLines={1}>{m.activeTitle.name}</Text>
                )}
                {m.topSkills?.length > 0 && (
                  <View style={styles.memberSkills}>
                    {m.topSkills.slice(0, 3).map((s: any) => (
                      <View key={s.skillId} style={[styles.memberSkillDot, { backgroundColor: SKILL_COLORS[s.skillId] ?? Colors.accent }]} />
                    ))}
                  </View>
                )}
              </Pressable>
            ))}
          </View>
          {isOwner && (
            <Text style={styles.memberHint}>Long-press a member to remove them from the circle.</Text>
          )}
        </Animated.View>

        {/* Activity Feed */}
        {activity.length > 0 && (
          <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Wins</Text>
            <View style={styles.activityList}>
              {activity.map((a: any, i: number) => {
                const meta = EVENT_ICONS[a.eventType] ?? { icon: "star", color: Colors.gold };
                const payload = a.payload ?? {};
                return (
                  <View key={a.id} style={[styles.activityRow, i === activity.length - 1 && styles.activityRowLast]}>
                    <View style={[styles.activityIcon, { backgroundColor: (payload.color ?? meta.color) + "18" }]}>
                      <Ionicons name={(payload.icon ?? meta.icon) as any} size={14} color={payload.color ?? meta.color} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.activityUsername}>{a.username}</Text>
                      <Text style={styles.activityLabel}>{payload.label ?? a.eventType.replace(/_/g, " ")}</Text>
                    </View>
                    <Text style={styles.activityTime}>{timeAgo(a.createdAt)}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* Safety / report */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Pressable
            style={({ pressed }) => [styles.reportBtn, pressed && { opacity: 0.7 }]}
            onPress={handleReport}
          >
            <Ionicons name="flag-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.reportBtnText}>Report an issue with this circle</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg },
  centered:         { alignItems: "center", justifyContent: "center" },
  errorText:        { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.textMuted },
  backBtnAlt:       { marginTop: 16, padding: 10 },
  header:           { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16 },
  backBtn:          { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bgCard },
  headerTitle:      { fontFamily: "Inter_700Bold", fontSize: 19, color: Colors.textPrimary },
  headerSub:        { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  leaveBtn:         { backgroundColor: Colors.crimsonDim, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: Colors.crimson + "30" },
  leaveBtnText:     { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.crimson },
  scroll:           { paddingHorizontal: 20, gap: 20 },

  codeCard:         { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.accentDim },
  codeLabel:        { fontFamily: "Inter_700Bold", fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 4 },
  codeValue:        { fontFamily: "Inter_700Bold", fontSize: 22, color: Colors.accent, letterSpacing: 3 },
  codeSub:          { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, marginTop: 4, lineHeight: 16 },
  codeBtns:         { gap: 8 },
  codeBtn:          { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.border },

  section:          { gap: 12 },
  sectionTitle:     { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 },

  challengeCard:    { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1 },
  challengeIconWrap:{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  challengeLabel:   { fontFamily: "Inter_700Bold", fontSize: 14, color: Colors.textPrimary },
  challengeDesc:    { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  challengeMeta:    { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },
  challengeBtn:     { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, alignItems: "center" },
  challengeBtnText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
  completedPill:    { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  completedPillText:{ fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.green },
  joinedPill:       { marginTop: 2 },
  joinedPillText:   { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },

  createChallengeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.accentGlow, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: Colors.accentDim },
  createChallengeBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.accent },

  membersGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  memberCard:       { width: "47%", backgroundColor: Colors.bgCard, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.border, gap: 6, position: "relative" },
  memberAvatar:     { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.accentGlow, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontFamily: "Inter_700Bold", fontSize: 16, color: Colors.accent },
  memberName:       { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textPrimary },
  memberTitle:      { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.gold, numberOfLines: 1 },
  memberOwnerDot:   { position: "absolute", top: 10, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.accent },
  memberSkills:     { flexDirection: "row", gap: 4 },
  memberSkillDot:   { width: 8, height: 8, borderRadius: 4 },
  memberHint:       { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted, textAlign: "center" },

  activityList:     { backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: "hidden" },
  activityRow:      { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  activityRowLast:  { borderBottomWidth: 0 },
  activityIcon:     { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  activityUsername: { fontFamily: "Inter_700Bold", fontSize: 13, color: Colors.textPrimary },
  activityLabel:    { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textSecondary },
  activityTime:     { fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.textMuted },

  reportBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  reportBtnText:    { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.textMuted },
});

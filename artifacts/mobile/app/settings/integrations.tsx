import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, Platform,
  Alert, TextInput, ActivityIndicator, Modal, Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useApiClient } from "@/hooks/useApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = `${process.env.EXPO_PUBLIC_DOMAIN ?? ""}/api`;

// ── Shared component helpers ──────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.tag, { backgroundColor: color + "20", borderColor: color + "40" }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function IntegrationsScreen() {
  const insets = useSafeAreaInsets();
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [activeTab, setActiveTab] = useState<"overview" | "api-keys" | "webhooks" | "export" | "calendar">("overview");

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["platform", "status"],
    queryFn: () => request<any>("/platform/integrations/status"),
    staleTime: 15000,
  });

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Integrations</Text>
          <Text style={styles.headerSubtitle}>Platform & Automation</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: Colors.green }]} />
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        style={styles.tabScroll}
      >
        {(["overview", "api-keys", "webhooks", "export", "calendar"] as const).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => { setActiveTab(tab); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === "api-keys" ? "API Keys" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {activeTab === "overview" && <OverviewTab statusData={statusData} isLoading={statusLoading} />}
        {activeTab === "api-keys" && <ApiKeysTab />}
        {activeTab === "webhooks" && <WebhooksTab />}
        {activeTab === "export" && <ExportTab />}
        {activeTab === "calendar" && <CalendarTab />}
      </ScrollView>
    </View>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ statusData, isLoading }: { statusData: any; isLoading: boolean }) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.accent} size="large" />
      </View>
    );
  }

  const apiKeys = statusData?.apiKeys ?? { total: 0, active: 0 };
  const webhooks = statusData?.webhooks ?? { total: 0, active: 0 };
  const caps = statusData?.capabilities ?? {};

  return (
    <Animated.View entering={FadeInDown.duration(350)}>
      <SectionHeader title="Platform Status" subtitle="Your DisciplineOS integration layer" />

      <View style={styles.statsRow}>
        <Card style={[styles.statCard, { borderColor: Colors.accent + "40" }]}>
          <Ionicons name="key-outline" size={20} color={Colors.accent} />
          <Text style={styles.statValue}>{apiKeys.active}</Text>
          <Text style={styles.statLabel}>Active Keys</Text>
        </Card>
        <Card style={[styles.statCard, { borderColor: Colors.cyan + "40" }]}>
          <Ionicons name="flash-outline" size={20} color={Colors.cyan} />
          <Text style={styles.statValue}>{webhooks.active}</Text>
          <Text style={styles.statLabel}>Webhooks</Text>
        </Card>
        <Card style={[styles.statCard, { borderColor: Colors.green + "40" }]}>
          <Ionicons name="checkmark-circle-outline" size={20} color={Colors.green} />
          <Text style={styles.statValue}>6</Text>
          <Text style={styles.statLabel}>Capabilities</Text>
        </Card>
      </View>

      <SectionHeader title="Capabilities" subtitle="What you can connect to" />

      {[
        { label: "Controlled API",      desc: "Read/write programmatic access via API keys",  icon: "code-slash-outline",   color: Colors.accent,   active: true },
        { label: "Automation Hooks",    desc: "Webhook callbacks for key product events",       icon: "flash-outline",        color: Colors.cyan,     active: true },
        { label: "Calendar Export",     desc: "Export missions & focus sessions as .ics",       icon: "calendar-outline",     color: Colors.green,    active: true },
        { label: "Mission Export",      desc: "Download mission history in JSON or CSV",        icon: "download-outline",     color: Colors.gold,     active: true },
        { label: "Reward Export",       desc: "Download full reward & coin transaction log",    icon: "receipt-outline",      color: Colors.amber,    active: true },
        { label: "Mission Import",      desc: "Bulk import seed missions from structured JSON", icon: "cloud-upload-outline", color: Colors.textAccent, active: true },
      ].map((cap, i) => (
        <Animated.View key={cap.label} entering={FadeInDown.delay(i * 40).duration(300)}>
          <Card style={styles.capCard}>
            <View style={[styles.capIcon, { backgroundColor: cap.color + "20" }]}>
              <Ionicons name={cap.icon as any} size={18} color={cap.color} />
            </View>
            <View style={styles.capText}>
              <Text style={styles.capLabel}>{cap.label}</Text>
              <Text style={styles.capDesc}>{cap.desc}</Text>
            </View>
            <View style={[styles.capBadge, { backgroundColor: Colors.green + "20" }]}>
              <Text style={[styles.capBadgeText, { color: Colors.green }]}>Active</Text>
            </View>
          </Card>
        </Animated.View>
      ))}

      <SectionHeader title="Available Webhook Events" subtitle="Events your endpoints can subscribe to" />
      <Card>
        <View style={styles.eventGrid}>
          {(caps.availableWebhookEvents ?? []).map((ev: string) => (
            <Tag key={ev} label={ev} color={Colors.accent} />
          ))}
        </View>
      </Card>

      <View style={{ height: 40 }} />
    </Animated.View>
  );
}

// ── API Keys Tab ──────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const { request } = useApiClient();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [label, setLabel] = useState("");
  const [scope, setScope] = useState<"read" | "read_write">("read");
  const [newKey, setNewKey] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["platform", "api-keys"],
    queryFn: () => request<any>("/platform/keys"),
    staleTime: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => request<any>("/platform/keys", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (res) => {
      setNewKey(res.key);
      setLabel("");
      refetch();
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => request<any>(`/platform/keys/${id}`, { method: "DELETE" }),
    onSuccess: () => { refetch(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const keys = data?.keys ?? [];

  function handleRevoke(id: string, keyLabel: string) {
    Alert.alert("Revoke Key", `Revoke "${keyLabel}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Revoke", style: "destructive", onPress: () => revokeMutation.mutate(id) },
    ]);
  }

  return (
    <Animated.View entering={FadeInDown.duration(350)}>
      <SectionHeader title="API Keys" subtitle="Scoped keys for programmatic access" />

      {newKey && (
        <Card style={[styles.alertCard, { borderColor: Colors.gold + "60" }]}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning-outline" size={18} color={Colors.gold} />
            <Text style={[styles.alertTitle, { color: Colors.gold }]}>Save this key now</Text>
          </View>
          <Text style={styles.alertBody}>This key will not be shown again.</Text>
          <Pressable
            style={styles.keyBox}
            onPress={() => {
              Share.share({ message: newKey }).catch(() => {});
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            }}
          >
            <Text style={styles.keyText} selectable>{newKey}</Text>
            <Ionicons name="copy-outline" size={16} color={Colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => setNewKey(null)} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>Dismiss</Text>
          </Pressable>
        </Card>
      )}

      {showCreate && (
        <Card style={styles.createCard}>
          <Text style={styles.createTitle}>Create API Key</Text>
          <TextInput
            style={styles.input}
            placeholder="Key label (e.g. My Automation)"
            placeholderTextColor={Colors.textMuted}
            value={label}
            onChangeText={setLabel}
          />
          <View style={styles.scopeRow}>
            <Text style={styles.scopeLabel}>Scope:</Text>
            {(["read", "read_write"] as const).map((s) => (
              <Pressable
                key={s}
                style={[styles.scopeBtn, scope === s && styles.scopeBtnActive]}
                onPress={() => setScope(s)}
              >
                <Text style={[styles.scopeBtnText, scope === s && { color: Colors.accent }]}>
                  {s === "read" ? "Read Only" : "Read + Write"}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.createActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, (!label.trim() || createMutation.isPending) && styles.btnDisabled]}
              onPress={() => { if (label.trim()) createMutation.mutate({ label: label.trim(), scope }); }}
              disabled={!label.trim() || createMutation.isPending}
            >
              {createMutation.isPending
                ? <ActivityIndicator color={Colors.textPrimary} size="small" />
                : <Text style={styles.primaryBtnText}>Generate Key</Text>}
            </Pressable>
          </View>
        </Card>
      )}

      {!showCreate && (
        <Pressable style={styles.addBtn} onPress={() => { setShowCreate(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.accent} />
          <Text style={styles.addBtnText}>Create New Key</Text>
        </Pressable>
      )}

      {isLoading
        ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 20 }} />
        : keys.length === 0
          ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="key-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No API keys yet</Text>
              <Text style={styles.emptySubtext}>Create a key to access the DisciplineOS API from external tools</Text>
            </Card>
          )
          : keys.map((k: any, i: number) => (
            <Animated.View key={k.id} entering={FadeInDown.delay(i * 40).duration(300)}>
              <Card style={[styles.keyCard, !k.isActive && { opacity: 0.5 }]}>
                <View style={styles.keyCardRow}>
                  <View style={[styles.keyIconBox, { backgroundColor: k.isActive ? Colors.accent + "20" : Colors.textMuted + "20" }]}>
                    <Ionicons name="key-outline" size={16} color={k.isActive ? Colors.accent : Colors.textMuted} />
                  </View>
                  <View style={styles.keyCardText}>
                    <Text style={styles.keyLabel}>{k.label}</Text>
                    <Text style={styles.keyPrefix}>{k.keyPrefix}••••••••</Text>
                  </View>
                  <Tag label={k.scope === "read_write" ? "R+W" : "Read"} color={k.scope === "read_write" ? Colors.amber : Colors.cyan} />
                </View>
                <View style={styles.keyCardMeta}>
                  <Text style={styles.keyMeta}>
                    {k.isActive ? "Active" : "Revoked"}
                    {k.lastUsedAt ? ` · Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : " · Never used"}
                  </Text>
                  {k.isActive && (
                    <Pressable onPress={() => handleRevoke(k.id, k.label)} style={styles.revokeBtn}>
                      <Text style={styles.revokeBtnText}>Revoke</Text>
                    </Pressable>
                  )}
                </View>
              </Card>
            </Animated.View>
          ))
      }

      <Card style={[styles.infoCard, { marginTop: 16 }]}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.textSecondary} />
        <Text style={styles.infoText}>
          Use{" "}
          <Text style={{ color: Colors.textPrimary }}>X-API-Key: your-key</Text>
          {" "}header to authenticate. Base URL:{" "}
          <Text style={{ color: Colors.textPrimary }}>/api/v1/</Text>
        </Text>
      </Card>

      <View style={{ height: 40 }} />
    </Animated.View>
  );
}

// ── Webhooks Tab ──────────────────────────────────────────────────────────────

function WebhooksTab() {
  const { request } = useApiClient();
  const [showCreate, setShowCreate] = useState(false);
  const [wLabel, setWLabel] = useState("");
  const [wUrl, setWUrl] = useState("");
  const [wEvents, setWEvents] = useState<string[]>(["proof.approved", "mission.completed"]);

  const AVAILABLE_EVENTS = [
    "mission.created", "mission.completed", "ai_mission.accepted",
    "proof.approved", "proof.rejected", "chain.completed",
    "title.unlocked", "badge.unlocked", "focus.completed", "arc.changed", "streak.milestone",
  ];

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["platform", "webhooks"],
    queryFn: () => request<any>("/platform/webhooks"),
    staleTime: 10000,
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => request<any>("/platform/webhooks", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (res) => {
      setShowCreate(false); setWLabel(""); setWUrl(""); setWEvents(["proof.approved"]);
      Alert.alert("Webhook Created", `Secret: ${res.secret}\n\nSave this secret — it is used to verify signatures.`);
      refetch();
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => request<any>(`/platform/webhooks/${id}`, { method: "DELETE" }),
    onSuccess: () => refetch(),
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => request<any>(`/platform/webhooks/${id}/test`, { method: "POST" }),
    onSuccess: (res) => Alert.alert("Test Result", res.success ? `Success (HTTP ${res.httpStatus})` : `Failed: ${res.response}`),
    onError: (e: any) => Alert.alert("Test failed", e.message),
  });

  const subs = data?.subscriptions ?? [];

  function toggleEvent(ev: string) {
    setWEvents((prev) => prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]);
  }

  return (
    <Animated.View entering={FadeInDown.duration(350)}>
      <SectionHeader title="Webhook Subscriptions" subtitle="Receive HTTP callbacks when key events fire" />

      {showCreate && (
        <Card style={styles.createCard}>
          <Text style={styles.createTitle}>New Webhook</Text>
          <TextInput
            style={styles.input}
            placeholder="Label"
            placeholderTextColor={Colors.textMuted}
            value={wLabel}
            onChangeText={setWLabel}
          />
          <TextInput
            style={styles.input}
            placeholder="Endpoint URL (https://...)"
            placeholderTextColor={Colors.textMuted}
            value={wUrl}
            onChangeText={setWUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text style={[styles.scopeLabel, { marginBottom: 8 }]}>Events to subscribe:</Text>
          <View style={styles.eventGrid}>
            {AVAILABLE_EVENTS.map((ev) => (
              <Pressable key={ev} onPress={() => toggleEvent(ev)}>
                <Tag label={ev} color={wEvents.includes(ev) ? Colors.accent : Colors.textMuted} />
              </Pressable>
            ))}
          </View>
          <View style={styles.createActions}>
            <Pressable style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryBtn, (!wLabel.trim() || !wUrl.trim() || wEvents.length === 0 || createMutation.isPending) && styles.btnDisabled]}
              onPress={() => { if (wLabel.trim() && wUrl.trim() && wEvents.length > 0) createMutation.mutate({ label: wLabel.trim(), endpointUrl: wUrl.trim(), events: wEvents }); }}
              disabled={!wLabel.trim() || !wUrl.trim() || wEvents.length === 0 || createMutation.isPending}
            >
              {createMutation.isPending
                ? <ActivityIndicator color={Colors.textPrimary} size="small" />
                : <Text style={styles.primaryBtnText}>Create Webhook</Text>}
            </Pressable>
          </View>
        </Card>
      )}

      {!showCreate && (
        <Pressable style={styles.addBtn} onPress={() => { setShowCreate(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.cyan} />
          <Text style={[styles.addBtnText, { color: Colors.cyan }]}>Add Webhook</Text>
        </Pressable>
      )}

      {isLoading
        ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 20 }} />
        : subs.length === 0
          ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="flash-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No webhooks configured</Text>
              <Text style={styles.emptySubtext}>Subscribe to product events and receive HTTP callbacks when they fire</Text>
            </Card>
          )
          : subs.map((s: any, i: number) => (
            <Animated.View key={s.id} entering={FadeInDown.delay(i * 40).duration(300)}>
              <Card style={[styles.webhookCard, !s.isActive && { opacity: 0.55 }]}>
                <View style={styles.webhookHeader}>
                  <Ionicons name="flash-outline" size={16} color={s.isActive ? Colors.cyan : Colors.textMuted} />
                  <Text style={styles.webhookLabel}>{s.label}</Text>
                  <Tag label={s.isActive ? "Active" : "Disabled"} color={s.isActive ? Colors.green : Colors.textMuted} />
                </View>
                <Text style={styles.webhookUrl} numberOfLines={1}>{s.endpointUrl}</Text>
                <View style={styles.eventGrid}>
                  {(s.events ?? []).slice(0, 6).map((ev: string) => (
                    <Tag key={ev} label={ev} color={Colors.accent} />
                  ))}
                  {(s.events ?? []).length > 6 && <Tag label={`+${s.events.length - 6}`} color={Colors.textMuted} />}
                </View>
                <View style={styles.webhookMeta}>
                  <Text style={styles.keyMeta}>
                    {s.failureCount > 0 ? `${s.failureCount} failures` : "No failures"}
                    {s.lastDeliveredAt ? ` · Last delivery ${new Date(s.lastDeliveredAt).toLocaleDateString()}` : ""}
                  </Text>
                  <View style={styles.webhookActions}>
                    <Pressable
                      style={styles.testBtn}
                      onPress={() => testMutation.mutate(s.id)}
                      disabled={testMutation.isPending}
                    >
                      <Text style={styles.testBtnText}>Test</Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => Alert.alert("Delete Webhook", `Delete "${s.label}"?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(s.id) },
                      ])}
                    >
                      <Ionicons name="trash-outline" size={15} color={Colors.crimson} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            </Animated.View>
          ))
      }

      <View style={{ height: 40 }} />
    </Animated.View>
  );
}

// ── Export Tab ────────────────────────────────────────────────────────────────

function ExportTab() {
  const { request } = useApiClient();
  const [importing, setImporting] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleExport(path: string, filename: string, format = "json") {
    setExporting(filename);
    try {
      const res = await fetch(
        `${API_BASE}/platform/${path}?format=${format}`,
        {
          headers: {
            Authorization: `Bearer ${(await request<any>("/auth/me")) ? "" : ""}`,
          },
        },
      );
      const text = await res.text();
      await Share.share({ message: text, title: filename });
    } catch (e: any) {
      Alert.alert("Export failed", e.message);
    } finally {
      setExporting(null);
    }
  }

  async function handleProgressExport() {
    setExporting("progress");
    try {
      const data = await request<any>("/platform/export/progress");
      await Share.share({ message: JSON.stringify(data, null, 2), title: "DisciplineOS Progress" });
    } catch (e: any) {
      Alert.alert("Export failed", e.message);
    } finally {
      setExporting(null);
    }
  }

  async function handleMissionExport(format: "json" | "csv") {
    setExporting("missions-" + format);
    try {
      const data = await request<any>(`/platform/export/missions?format=${format}`);
      if (format === "json") {
        await Share.share({ message: JSON.stringify(data, null, 2), title: "missions.json" });
      }
    } catch (e: any) {
      Alert.alert("Export failed", e.message);
    } finally {
      setExporting(null);
    }
  }

  async function handleRewardExport(format: "json" | "csv") {
    setExporting("rewards-" + format);
    try {
      const data = await request<any>(`/platform/export/rewards?format=${format}`);
      if (format === "json") {
        await Share.share({ message: JSON.stringify(data, null, 2), title: "rewards.json" });
      }
    } catch (e: any) {
      Alert.alert("Export failed", e.message);
    } finally {
      setExporting(null);
    }
  }

  async function handleImport() {
    if (!importJson.trim()) return;
    setImporting(true);
    try {
      const parsed = JSON.parse(importJson);
      const missions = Array.isArray(parsed) ? parsed : parsed.missions ?? [parsed];
      const result = await request<any>("/platform/import/missions", {
        method: "POST",
        body: JSON.stringify({ missions }),
      });
      Alert.alert("Import Complete", `Imported ${result.imported} mission(s)${result.errors.length > 0 ? `\nErrors: ${result.errors.join(", ")}` : ""}`);
      setShowImport(false);
      setImportJson("");
    } catch (e: any) {
      Alert.alert("Import failed", e.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Animated.View entering={FadeInDown.duration(350)}>
      <SectionHeader title="Export" subtitle="Download your progress data" />

      {[
        { label: "Full Progress Summary", desc: "Level, skills, arc, badges, titles", icon: "person-outline", color: Colors.accent, action: handleProgressExport, key: "progress" },
      ].map((item) => (
        <Card key={item.key} style={styles.exportCard}>
          <View style={styles.exportRow}>
            <View style={[styles.exportIcon, { backgroundColor: item.color + "20" }]}>
              <Ionicons name={item.icon as any} size={18} color={item.color} />
            </View>
            <View style={styles.exportText}>
              <Text style={styles.exportLabel}>{item.label}</Text>
              <Text style={styles.exportDesc}>{item.desc}</Text>
            </View>
          </View>
          <Pressable
            style={[styles.exportBtn, { borderColor: item.color + "50" }]}
            onPress={item.action}
            disabled={exporting === item.key}
          >
            {exporting === item.key
              ? <ActivityIndicator size="small" color={item.color} />
              : <>
                  <Ionicons name="download-outline" size={15} color={item.color} />
                  <Text style={[styles.exportBtnText, { color: item.color }]}>Export JSON</Text>
                </>
            }
          </Pressable>
        </Card>
      ))}

      <Card style={styles.exportCard}>
        <View style={styles.exportRow}>
          <View style={[styles.exportIcon, { backgroundColor: Colors.gold + "20" }]}>
            <Ionicons name="list-outline" size={18} color={Colors.gold} />
          </View>
          <View style={styles.exportText}>
            <Text style={styles.exportLabel}>Mission History</Text>
            <Text style={styles.exportDesc}>All missions including completed and archived</Text>
          </View>
        </View>
        <View style={styles.formatRow}>
          {(["json", "csv"] as const).map((fmt) => (
            <Pressable
              key={fmt}
              style={[styles.exportBtn, { borderColor: Colors.gold + "50", marginRight: 8 }]}
              onPress={() => handleMissionExport(fmt)}
              disabled={exporting === `missions-${fmt}`}
            >
              {exporting === `missions-${fmt}`
                ? <ActivityIndicator size="small" color={Colors.gold} />
                : <>
                    <Ionicons name="download-outline" size={15} color={Colors.gold} />
                    <Text style={[styles.exportBtnText, { color: Colors.gold }]}>{fmt.toUpperCase()}</Text>
                  </>
              }
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.exportCard}>
        <View style={styles.exportRow}>
          <View style={[styles.exportIcon, { backgroundColor: Colors.amber + "20" }]}>
            <Ionicons name="receipt-outline" size={18} color={Colors.amber} />
          </View>
          <View style={styles.exportText}>
            <Text style={styles.exportLabel}>Reward Transactions</Text>
            <Text style={styles.exportDesc}>Complete coin and XP transaction log</Text>
          </View>
        </View>
        <View style={styles.formatRow}>
          {(["json", "csv"] as const).map((fmt) => (
            <Pressable
              key={fmt}
              style={[styles.exportBtn, { borderColor: Colors.amber + "50", marginRight: 8 }]}
              onPress={() => handleRewardExport(fmt)}
              disabled={exporting === `rewards-${fmt}`}
            >
              {exporting === `rewards-${fmt}`
                ? <ActivityIndicator size="small" color={Colors.amber} />
                : <>
                    <Ionicons name="download-outline" size={15} color={Colors.amber} />
                    <Text style={[styles.exportBtnText, { color: Colors.amber }]}>{fmt.toUpperCase()}</Text>
                  </>
              }
            </Pressable>
          ))}
        </View>
      </Card>

      <SectionHeader title="Import" subtitle="Bulk import missions from structured data" />

      <Pressable
        style={[styles.addBtn, { borderColor: Colors.textAccent + "40" }]}
        onPress={() => setShowImport(!showImport)}
      >
        <Ionicons name="cloud-upload-outline" size={18} color={Colors.textAccent} />
        <Text style={[styles.addBtnText, { color: Colors.textAccent }]}>
          {showImport ? "Cancel Import" : "Import Missions"}
        </Text>
      </Pressable>

      {showImport && (
        <Card style={styles.createCard}>
          <Text style={styles.createTitle}>Import Missions (JSON)</Text>
          <Text style={styles.importHint}>
            Paste a JSON array of missions. Each mission needs: title, category, targetDurationMinutes, priority, impactLevel, requiredProofTypes.
          </Text>
          <TextInput
            style={[styles.input, { height: 120, textAlignVertical: "top" }]}
            placeholder='[{"title":"...","category":"...","targetDurationMinutes":60,"priority":"medium","impactLevel":5,"requiredProofTypes":["text"]}]'
            placeholderTextColor={Colors.textMuted}
            value={importJson}
            onChangeText={setImportJson}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.primaryBtn, (!importJson.trim() || importing) && styles.btnDisabled]}
            onPress={handleImport}
            disabled={!importJson.trim() || importing}
          >
            {importing
              ? <ActivityIndicator color={Colors.textPrimary} size="small" />
              : <Text style={styles.primaryBtnText}>Import</Text>}
          </Pressable>
        </Card>
      )}

      <View style={{ height: 40 }} />
    </Animated.View>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────

function CalendarTab() {
  const { request } = useApiClient();
  const [title, setTitle] = useState("Focus Block");
  const [duration, setDuration] = useState("60");
  const [exporting, setExporting] = useState<string | null>(null);

  async function handleCalExport(endpoint: string, filename: string) {
    setExporting(filename);
    try {
      const data = await request<any>(`/calendar/${endpoint}`);
      await Share.share({ message: JSON.stringify(data), title: filename });
    } catch (e: any) {
      Alert.alert("Calendar export failed", e.message);
    } finally {
      setExporting(null);
    }
  }

  async function handleFocusBlock() {
    setExporting("focus-block");
    try {
      const data = await request<any>("/calendar/focus-block", {
        method: "POST",
        body: JSON.stringify({ title: title.trim() || "Focus Block", durationMinutes: parseInt(duration) || 60 }),
      });
      await Share.share({ message: JSON.stringify(data), title: "focus-block.ics" });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setExporting(null);
    }
  }

  return (
    <Animated.View entering={FadeInDown.duration(350)}>
      <SectionHeader title="Calendar Integration" subtitle="Export your schedule to any calendar app" />

      <Card style={[styles.infoCard, { marginBottom: 16 }]}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.cyan} />
        <Text style={styles.infoText}>
          Exports generate standard .ics files compatible with Apple Calendar, Google Calendar, Outlook, and any iCalendar-compatible app.
        </Text>
      </Card>

      {[
        { label: "Full Calendar Export",   desc: "Active missions + recent focus sessions",  icon: "calendar-outline",     color: Colors.accent,  endpoint: "export",       filename: "disciplineos.ics" },
        { label: "Active Missions Only",   desc: "All active missions as calendar events",    icon: "flag-outline",         color: Colors.gold,    endpoint: "missions.ics", filename: "missions.ics" },
        { label: "Focus Session History",  desc: "Completed sessions from the last 30 days",  icon: "timer-outline",        color: Colors.green,   endpoint: "sessions.ics", filename: "sessions.ics" },
      ].map((item, i) => (
        <Animated.View key={item.label} entering={FadeInDown.delay(i * 50).duration(300)}>
          <Card style={styles.exportCard}>
            <View style={styles.exportRow}>
              <View style={[styles.exportIcon, { backgroundColor: item.color + "20" }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <View style={styles.exportText}>
                <Text style={styles.exportLabel}>{item.label}</Text>
                <Text style={styles.exportDesc}>{item.desc}</Text>
              </View>
            </View>
            <Pressable
              style={[styles.exportBtn, { borderColor: item.color + "50" }]}
              onPress={() => handleCalExport(item.endpoint, item.filename)}
              disabled={exporting === item.filename}
            >
              {exporting === item.filename
                ? <ActivityIndicator size="small" color={item.color} />
                : <>
                    <Ionicons name="calendar-outline" size={15} color={item.color} />
                    <Text style={[styles.exportBtnText, { color: item.color }]}>Export .ics</Text>
                  </>
              }
            </Pressable>
          </Card>
        </Animated.View>
      ))}

      <SectionHeader title="Create Focus Block" subtitle="Generate a scheduled focus block for your calendar" />
      <Card style={styles.createCard}>
        <TextInput
          style={styles.input}
          placeholder="Block title"
          placeholderTextColor={Colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Duration in minutes (15–240)"
          placeholderTextColor={Colors.textMuted}
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
        />
        <Pressable
          style={[styles.primaryBtn, exporting === "focus-block" && styles.btnDisabled]}
          onPress={handleFocusBlock}
          disabled={exporting === "focus-block"}
        >
          {exporting === "focus-block"
            ? <ActivityIndicator color={Colors.textPrimary} size="small" />
            : <Text style={styles.primaryBtnText}>Generate .ics Block</Text>}
        </Pressable>
      </Card>

      <View style={{ height: 40 }} />
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12 },
  backBtn: { padding: 4, marginRight: 12 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  tabScroll: { maxHeight: 48 },
  tabRow: { paddingHorizontal: 16, gap: 8, alignItems: "center" },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.accent + "20", borderColor: Colors.accent + "60" },
  tabLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textMuted },
  tabLabelActive: { color: Colors.accent },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  sectionHeader: { marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  sectionSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statCard: { flex: 1, alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border, paddingVertical: 14 },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, textAlign: "center" },
  capCard: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  capIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  capText: { flex: 1 },
  capLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  capDesc: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  capBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  capBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  eventGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  tagText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  alertCard: { borderWidth: 1, marginBottom: 12 },
  alertHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  alertTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  alertBody: { fontSize: 12, color: Colors.textSecondary, marginBottom: 10 },
  keyBox: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.bgInput, borderRadius: 8, padding: 10, gap: 8, marginBottom: 10 },
  keyText: { flex: 1, fontSize: 11, fontFamily: "monospace", color: Colors.textPrimary },
  dismissBtn: { alignSelf: "flex-end" },
  dismissText: { fontSize: 12, color: Colors.textMuted },
  createCard: { marginBottom: 12 },
  createTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary, marginBottom: 12 },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 13,
    color: Colors.textPrimary,
    fontFamily: "Inter_400Regular",
    marginBottom: 10,
  },
  scopeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  scopeLabel: { fontSize: 12, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  scopeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  scopeBtnActive: { borderColor: Colors.accent + "60", backgroundColor: Colors.accent + "15" },
  scopeBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  createActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  cancelBtnText: { fontSize: 13, color: Colors.textSecondary, fontFamily: "Inter_500Medium" },
  primaryBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: 10, backgroundColor: Colors.accent, flexDirection: "row", gap: 6 },
  primaryBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  btnDisabled: { opacity: 0.45 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent + "40",
    borderStyle: "dashed",
    marginBottom: 16,
  },
  addBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.accent },
  emptyCard: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  emptySubtext: { fontSize: 12, color: Colors.textMuted, textAlign: "center", maxWidth: 280 },
  keyCard: { marginBottom: 10 },
  keyCardRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  keyIconBox: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  keyCardText: { flex: 1 },
  keyLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  keyPrefix: { fontSize: 11, fontFamily: "monospace", color: Colors.textSecondary, marginTop: 2 },
  keyCardMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  keyMeta: { fontSize: 11, color: Colors.textMuted },
  revokeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: Colors.crimson + "50" },
  revokeBtnText: { fontSize: 11, color: Colors.crimson, fontFamily: "Inter_500Medium" },
  infoCard: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  webhookCard: { marginBottom: 10 },
  webhookHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  webhookLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  webhookUrl: { fontSize: 11, color: Colors.textSecondary, fontFamily: "monospace", marginBottom: 8 },
  webhookMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  webhookActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  testBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: Colors.cyan + "50" },
  testBtnText: { fontSize: 11, color: Colors.cyan, fontFamily: "Inter_500Medium" },
  deleteBtn: { padding: 4 },
  exportCard: { marginBottom: 10 },
  exportRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  exportIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  exportText: { flex: 1 },
  exportLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.textPrimary },
  exportDesc: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  exportBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  formatRow: { flexDirection: "row" },
  importHint: { fontSize: 11, color: Colors.textSecondary, marginBottom: 10, lineHeight: 17 },
});

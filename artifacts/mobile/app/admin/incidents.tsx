import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import {
  useAdminIncidents, useAdminCreateIncident, useAdminUpdateIncident, useAdminDetectIncidents,
} from "../../hooks/useApi";

const STATUSES = ["all", "new", "investigating", "mitigated", "resolved", "ignored"] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;
const AREAS = ["proofs", "economy", "premium", "users", "content", "store", "recommendations", "sessions", "other"] as const;

const SEV_COLORS: Record<string, string> = {
  low:      Colors.green,
  medium:   Colors.amber,
  high:     Colors.gold,
  critical: Colors.crimson,
};
const STATUS_COLORS: Record<string, string> = {
  new:           Colors.accent,
  investigating: Colors.amber,
  mitigated:     Colors.cyan,
  resolved:      Colors.green,
  ignored:       Colors.textMuted,
};

type Tab = "list" | "create" | "detect";

export default function AdminIncidentsScreen() {
  const [tab, setTab]             = useState<Tab>("list");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  // Create form
  const [form, setForm] = useState({
    type: "", severity: "medium", summary: "", affectedArea: "proofs",
    affectedCount: "", notes: "",
  });

  // Update form
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateNotes, setUpdateNotes]   = useState("");

  const incidentsQuery  = useAdminIncidents({ status: filterStatus === "all" ? undefined : filterStatus });
  const createMut       = useAdminCreateIncident();
  const updateMut       = useAdminUpdateIncident();
  const detectMut       = useAdminDetectIncidents();

  const incidents = incidentsQuery.data?.incidents ?? [];
  const selected  = incidents.find((i: any) => i.id === selectedId) ?? null;

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCreate() {
    if (!form.type.trim() || !form.summary.trim()) {
      showToast("Type and summary are required", false); return;
    }
    try {
      await createMut.mutateAsync({
        type: form.type.trim(), severity: form.severity,
        summary: form.summary.trim(), affectedArea: form.affectedArea,
        affectedCount: form.affectedCount ? Number(form.affectedCount) : undefined,
        notes: form.notes.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Incident created");
      setForm({ type: "", severity: "medium", summary: "", affectedArea: "proofs", affectedCount: "", notes: "" });
      setTab("list");
    } catch (e: any) {
      showToast(e?.message ?? "Error", false);
    }
  }

  async function handleUpdateStatus(id: string, status: string) {
    try {
      await updateMut.mutateAsync({ id, status });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Marked as ${status}`);
    } catch (e: any) {
      showToast(e?.message ?? "Error", false);
    }
  }

  async function handleDetect() {
    try {
      const res = await detectMut.mutateAsync(60);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`${res.candidateCount} anomalies detected`);
    } catch (e: any) {
      showToast(e?.message ?? "Error", false);
    }
  }

  return (
    <View style={s.container}>
      {toast && (
        <View style={[s.toast, { backgroundColor: toast.ok ? Colors.green : Colors.crimson }]}>
          <Text style={s.toastText}>{toast.msg}</Text>
        </View>
      )}

      <View style={s.tabRow}>
        {(["list", "create", "detect"] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabActive]} onPress={() => { setTab(t); setSelectedId(null); }}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === "list" ? "Incidents" : t === "create" ? "New" : "Auto-Detect"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "list" && (
        <View style={{ flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 6, padding: 12 }}>
            {STATUSES.map(s_ => (
              <TouchableOpacity key={s_} style={[s.chip, filterStatus === s_ && s.chipActive]} onPress={() => setFilterStatus(s_)}>
                <Text style={[s.chipText, filterStatus === s_ && s.chipTextActive]}>{s_}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {incidentsQuery.isLoading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 12 }}>
              {incidents.length === 0 && (
                <Text style={s.empty}>No incidents found{filterStatus !== "all" ? ` with status "${filterStatus}"` : ""}</Text>
              )}
              {incidents.map((inc: any) => (
                <TouchableOpacity key={inc.id} style={[s.card, selectedId === inc.id && s.cardSelected]}
                  onPress={() => setSelectedId(selectedId === inc.id ? null : inc.id)}>
                  <View style={s.incidentHeader}>
                    <View style={[s.sevDot, { backgroundColor: SEV_COLORS[inc.severity] ?? Colors.textMuted }]} />
                    <Text style={s.incidentType}>{inc.type}</Text>
                    <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[inc.status] ?? Colors.textMuted }]}>
                      <Text style={s.statusBadgeText}>{inc.status}</Text>
                    </View>
                  </View>
                  <Text style={s.incidentSummary} numberOfLines={selectedId === inc.id ? undefined : 2}>{inc.summary}</Text>
                  <View style={s.incidentMeta}>
                    <Text style={s.metaText}>{inc.affectedArea}</Text>
                    {inc.affectedCount != null && <Text style={s.metaText}>· {inc.affectedCount} affected</Text>}
                    <Text style={s.metaText}>· {new Date(inc.lastSeen).toLocaleDateString()}</Text>
                  </View>

                  {selectedId === inc.id && (
                    <View style={s.incidentDetail}>
                      {inc.notes ? <Text style={s.detailNotes}>{inc.notes}</Text> : null}
                      {inc.owner ? <Text style={s.detailOwner}>Owner: {inc.owner}</Text> : null}
                      <Text style={s.detailLabel}>Update status:</Text>
                      <View style={s.statusRow}>
                        {(["investigating", "mitigated", "resolved", "ignored"] as const).map(st => (
                          <TouchableOpacity key={st} style={[s.statusBtn, { borderColor: STATUS_COLORS[st] ?? Colors.border }]}
                            onPress={() => handleUpdateStatus(inc.id, st)} disabled={updateMut.isPending}>
                            <Text style={[s.statusBtnText, { color: STATUS_COLORS[st] ?? Colors.textMuted }]}>{st}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {tab === "create" && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={s.sectionLabel}>Incident Type *</Text>
          <TextInput style={s.input} value={form.type} onChangeText={v => setForm(f => ({ ...f, type: v }))}
            placeholder="e.g. proof_pipeline_failure" placeholderTextColor={Colors.textMuted} />

          <Text style={s.sectionLabel}>Summary *</Text>
          <TextInput style={[s.input, { height: 80 }]} value={form.summary}
            onChangeText={v => setForm(f => ({ ...f, summary: v }))} multiline
            placeholder="What is happening?" placeholderTextColor={Colors.textMuted} />

          <Text style={s.sectionLabel}>Severity</Text>
          <View style={s.chipRow}>
            {SEVERITIES.map(sv => (
              <TouchableOpacity key={sv} style={[s.chip, form.severity === sv && { borderColor: SEV_COLORS[sv], backgroundColor: SEV_COLORS[sv] + "22" }]}
                onPress={() => setForm(f => ({ ...f, severity: sv }))}>
                <Text style={[s.chipText, form.severity === sv && { color: SEV_COLORS[sv] }]}>{sv}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.sectionLabel}>Affected Area</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {AREAS.map(a => (
              <TouchableOpacity key={a} style={[s.chip, form.affectedArea === a && s.chipActive]}
                onPress={() => setForm(f => ({ ...f, affectedArea: a }))}>
                <Text style={[s.chipText, form.affectedArea === a && s.chipTextActive]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.sectionLabel}>Affected Count (optional)</Text>
          <TextInput style={s.input} value={form.affectedCount} onChangeText={v => setForm(f => ({ ...f, affectedCount: v }))}
            keyboardType="numeric" placeholder="0" placeholderTextColor={Colors.textMuted} />

          <Text style={s.sectionLabel}>Notes (optional)</Text>
          <TextInput style={[s.input, { height: 80 }]} value={form.notes}
            onChangeText={v => setForm(f => ({ ...f, notes: v }))} multiline
            placeholder="Additional context..." placeholderTextColor={Colors.textMuted} />

          <TouchableOpacity style={[s.primaryBtn, createMut.isPending && { opacity: 0.5 }]} onPress={handleCreate} disabled={createMut.isPending}>
            <Text style={s.primaryBtnText}>{createMut.isPending ? "Creating..." : "Create Incident"}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {tab === "detect" && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={s.sectionTitle}>Auto-Detect Anomalies</Text>
          <Text style={s.helpText}>
            Scans current system data for anomaly patterns — low approval rates, stuck proofs, reward spikes, premium mismatches, and suspension clusters.
            Returns candidate incidents for your review. Does not auto-create incidents.
          </Text>
          <TouchableOpacity style={[s.primaryBtn, detectMut.isPending && { opacity: 0.5 }]} onPress={handleDetect} disabled={detectMut.isPending}>
            {detectMut.isPending
              ? <ActivityIndicator color={Colors.bg} />
              : <Text style={s.primaryBtnText}>Run Detection (last 60 min)</Text>
            }
          </TouchableOpacity>

          {detectMut.data && (
            <View style={{ marginTop: 16 }}>
              <Text style={s.sectionLabel}>
                {detectMut.data.candidateCount} candidate{detectMut.data.candidateCount !== 1 ? "s" : ""} detected
              </Text>
              {detectMut.data.candidates?.map((c: any, i: number) => (
                <View key={i} style={s.candidateCard}>
                  <View style={s.incidentHeader}>
                    <View style={[s.sevDot, { backgroundColor: SEV_COLORS[c.severity] ?? Colors.textMuted }]} />
                    <Text style={s.incidentType}>{c.type}</Text>
                    <Text style={[s.statusBadgeText, { color: SEV_COLORS[c.severity] }]}>{c.severity}</Text>
                  </View>
                  <Text style={s.incidentSummary}>{c.summary}</Text>
                  <Text style={s.detailNotes}>→ {c.suggestedAction}</Text>
                </View>
              ))}
              {detectMut.data.candidateCount === 0 && (
                <Text style={s.empty}>No anomalies detected in the last 60 minutes.</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.bg },
  toast:            { margin: 12, borderRadius: 8, padding: 12 },
  toastText:        { color: Colors.bg, fontWeight: "600", textAlign: "center" },
  tabRow:           { flexDirection: "row", borderBottomWidth: 1, borderColor: Colors.border },
  tabBtn:           { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive:        { borderBottomWidth: 2, borderColor: Colors.accent },
  tabText:          { color: Colors.textMuted, fontSize: 13 },
  tabTextActive:    { color: Colors.accent, fontWeight: "600" },
  filterRow:        { flexShrink: 0 },
  chip:             { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  chipActive:       { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
  chipText:         { color: Colors.textMuted, fontSize: 12 },
  chipTextActive:   { color: Colors.accent },
  chipRow:          { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  empty:            { color: Colors.textMuted, textAlign: "center", marginTop: 40, fontSize: 14 },
  card:             { backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardSelected:     { borderColor: Colors.accent },
  candidateCard:    { backgroundColor: Colors.bgElevated, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  incidentHeader:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  sevDot:           { width: 8, height: 8, borderRadius: 4 },
  incidentType:     { color: Colors.textPrimary, fontWeight: "600", fontSize: 13, flex: 1 },
  incidentSummary:  { color: Colors.textSecondary, fontSize: 12, marginBottom: 4 },
  incidentMeta:     { flexDirection: "row", gap: 4 },
  metaText:         { color: Colors.textMuted, fontSize: 11 },
  statusBadge:      { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusBadgeText:  { color: Colors.bg, fontSize: 10, fontWeight: "700" },
  incidentDetail:   { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: Colors.border },
  detailNotes:      { color: Colors.textSecondary, fontSize: 12, marginBottom: 6, fontStyle: "italic" },
  detailOwner:      { color: Colors.textMuted, fontSize: 11, marginBottom: 6 },
  detailLabel:      { color: Colors.textMuted, fontSize: 11, marginBottom: 6 },
  statusRow:        { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statusBtn:        { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1 },
  statusBtnText:    { fontSize: 11, fontWeight: "600" },
  sectionLabel:     { color: Colors.textMuted, fontSize: 12, marginBottom: 6, marginTop: 14 },
  sectionTitle:     { color: Colors.textPrimary, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  helpText:         { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  input:            { backgroundColor: Colors.bgCard, borderRadius: 8, padding: 10, color: Colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  primaryBtn:       { backgroundColor: Colors.accent, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 20 },
  primaryBtnText:   { color: Colors.bg, fontWeight: "700", fontSize: 15 },
});

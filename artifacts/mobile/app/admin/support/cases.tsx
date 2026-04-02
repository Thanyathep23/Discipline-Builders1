import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import {
  useAdminSupportCases, useAdminSupportCase, useAdminCreateSupportCase,
  useAdminUpdateSupportCase, useAdminAddCaseNote,
} from "../../../hooks/useApi";

const STATUS_COLORS: Record<string, string> = {
  open:          Colors.crimson,
  investigating: Colors.amber,
  waiting:       Colors.accent,
  resolved:      Colors.green,
};
const PRIORITY_COLORS: Record<string, string> = {
  low:    Colors.textMuted,
  normal: Colors.textSecondary,
  high:   Colors.crimson,
};

type Tab = "list" | "create" | "detail";

export default function AdminSupportCasesScreen() {
  const params  = useLocalSearchParams<{ playerId?: string }>();
  const initPlayer = params.playerId ?? "";

  const [tab, setTab]             = useState<Tab>(initPlayer ? "create" : "list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  // Create form
  const [form, setForm] = useState({
    playerId: initPlayer,
    title: "",
    priority: "normal",
    category: "",
    note: "",
  });

  // Case detail
  const [newNote, setNewNote]       = useState("");
  const [newAction, setNewAction]   = useState("");
  const [newStatus, setNewStatus]   = useState("");

  const casesQ  = useAdminSupportCases({
    status:   filterStatus === "all" ? undefined : filterStatus,
    playerId: undefined,
  });
  const caseQ   = useAdminSupportCase(selectedId);
  const createMut = useAdminCreateSupportCase();
  const updateMut = useAdminUpdateSupportCase();
  const noteMut   = useAdminAddCaseNote();

  const cases   = casesQ.data?.cases ?? [];
  const detail  = caseQ.data;

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleCreate() {
    if (!form.playerId.trim()) { showToast("Player ID is required", false); return; }
    if (!form.title.trim())    { showToast("Title is required", false); return; }
    try {
      const res = await createMut.mutateAsync({
        playerId: form.playerId.trim(),
        title: form.title.trim(),
        priority: form.priority,
        category: form.category.trim() || undefined,
        note: form.note.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Support case created");
      setSelectedId(res.id);
      setTab("detail");
      setForm({ playerId: "", title: "", priority: "normal", category: "", note: "" });
    } catch (e: any) { showToast(e?.message ?? "Error", false); }
  }

  async function handleAddNote() {
    if (!selectedId || !newNote.trim()) { showToast("Note is required", false); return; }
    try {
      await noteMut.mutateAsync({ id: selectedId, note: newNote.trim(), actionTaken: newAction.trim() || undefined });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Note added");
      setNewNote(""); setNewAction("");
    } catch (e: any) { showToast(e?.message ?? "Error", false); }
  }

  async function handleUpdateStatus(status: string) {
    if (!selectedId) return;
    try {
      await updateMut.mutateAsync({ id: selectedId, status });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Status → ${status}`);
    } catch (e: any) { showToast(e?.message ?? "Error", false); }
  }

  return (
    <View style={s.container}>
      {toast && (
        <View style={[s.toast, { backgroundColor: toast.ok ? Colors.green : Colors.crimson }]}>
          <Text style={s.toastText}>{toast.msg}</Text>
        </View>
      )}

      <View style={s.tabRow}>
        {(["list", "create"] as Tab[]).map(t => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabActive]}
            onPress={() => { setTab(t); setSelectedId(null); }}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === "list" ? "Cases" : "New Case"}</Text>
          </TouchableOpacity>
        ))}
        {selectedId && (
          <TouchableOpacity style={[s.tabBtn, tab === "detail" && s.tabActive]} onPress={() => setTab("detail")}>
            <Text style={[s.tabText, tab === "detail" && s.tabTextActive]}>Detail</Text>
          </TouchableOpacity>
        )}
      </View>

      {tab === "list" && (
        <View style={{ flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}
            contentContainerStyle={{ gap: 6, padding: 12 }}>
            {["all", "open", "investigating", "waiting", "resolved"].map(st => (
              <TouchableOpacity key={st} style={[s.chip, filterStatus === st && s.chipActive]}
                onPress={() => setFilterStatus(st)}>
                <Text style={[s.chipText, filterStatus === st && s.chipTextActive]}>{st}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {casesQ.isLoading
            ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
            : (
              <ScrollView contentContainerStyle={{ padding: 12 }}>
                {cases.length === 0 && <Text style={s.empty}>No support cases found</Text>}
                {cases.map((sc: any) => (
                  <TouchableOpacity key={sc.id} style={s.card}
                    onPress={() => { setSelectedId(sc.id); setTab("detail"); }}>
                    <View style={s.caseHeader}>
                      <View style={[s.priorityDot, { backgroundColor: PRIORITY_COLORS[sc.priority] ?? Colors.textMuted }]} />
                      <Text style={s.caseTitle} numberOfLines={1}>{sc.title}</Text>
                      <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[sc.status] ?? Colors.textMuted }]}>
                        <Text style={s.statusText}>{sc.status}</Text>
                      </View>
                    </View>
                    <View style={s.caseMeta}>
                      <Text style={s.metaText}>Player: {sc.playerId.slice(0, 8)}…</Text>
                      {sc.category && <Text style={s.metaText}>· {sc.category}</Text>}
                      <Text style={s.metaText}>· {new Date(sc.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )
          }
        </View>
      )}

      {tab === "create" && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={s.sectionLabel}>Player ID *</Text>
          <TextInput style={s.input} value={form.playerId} onChangeText={v => setForm(f => ({ ...f, playerId: v }))}
            placeholder="Player UUID" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />

          <Text style={s.sectionLabel}>Case Title *</Text>
          <TextInput style={s.input} value={form.title} onChangeText={v => setForm(f => ({ ...f, title: v }))}
            placeholder="Brief description of the issue" placeholderTextColor={Colors.textMuted} />

          <Text style={s.sectionLabel}>Priority</Text>
          <View style={s.chipRow}>
            {["low", "normal", "high"].map(p => (
              <TouchableOpacity key={p} style={[s.chip, form.priority === p && { borderColor: PRIORITY_COLORS[p], backgroundColor: PRIORITY_COLORS[p] + "22" }]}
                onPress={() => setForm(f => ({ ...f, priority: p }))}>
                <Text style={[s.chipText, form.priority === p && { color: PRIORITY_COLORS[p] }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.sectionLabel}>Category (optional)</Text>
          <TextInput style={s.input} value={form.category} onChangeText={v => setForm(f => ({ ...f, category: v }))}
            placeholder="e.g. wallet, premium, proof" placeholderTextColor={Colors.textMuted} />

          <Text style={s.sectionLabel}>Initial Note (optional)</Text>
          <TextInput style={[s.input, { height: 80 }]} value={form.note}
            onChangeText={v => setForm(f => ({ ...f, note: v }))} multiline
            placeholder="What is the player reporting?" placeholderTextColor={Colors.textMuted} />

          <TouchableOpacity style={[s.primaryBtn, createMut.isPending && { opacity: 0.5 }]} onPress={handleCreate} disabled={createMut.isPending}>
            <Text style={s.primaryBtnText}>{createMut.isPending ? "Creating..." : "Open Support Case"}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {tab === "detail" && detail && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={s.detailHeader}>
            <Text style={s.detailTitle}>{detail.title}</Text>
            <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[detail.status] ?? Colors.textMuted }]}>
              <Text style={s.statusText}>{detail.status}</Text>
            </View>
          </View>

          <View style={s.detailMeta}>
            <Text style={s.metaText}>Player: {detail.playerId}</Text>
            <Text style={s.metaText}>Priority: <Text style={{ color: PRIORITY_COLORS[detail.priority] ?? Colors.textMuted }}>{detail.priority}</Text></Text>
            {detail.category && <Text style={s.metaText}>Category: {detail.category}</Text>}
            <Text style={s.metaText}>Opened: {new Date(detail.createdAt).toLocaleDateString()}</Text>
          </View>

          <Text style={s.sectionLabel}>Update Status</Text>
          <View style={s.statusRow}>
            {(["open", "investigating", "waiting", "resolved"] as const).map(st => (
              <TouchableOpacity key={st} style={[s.statusBtn, detail.status === st && { backgroundColor: STATUS_COLORS[st] + "33", borderColor: STATUS_COLORS[st] }]}
                onPress={() => handleUpdateStatus(st)} disabled={updateMut.isPending}>
                <Text style={[s.statusBtnText, { color: STATUS_COLORS[st] }]}>{st}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.sectionLabel}>History ({detail.notes?.length ?? 0} notes)</Text>
          {(detail.notes ?? []).length === 0 && <Text style={s.empty}>No notes yet</Text>}
          {(detail.notes ?? []).map((n: any) => (
            <View key={n.id} style={s.noteCard}>
              <View style={s.noteHeader}>
                <Ionicons name="person-circle" size={14} color={Colors.accent} />
                <Text style={s.noteActor}>{n.actorId.slice(0, 8)}…</Text>
                <Text style={s.noteTime}>{new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
              <Text style={s.noteText}>{n.note}</Text>
              {n.actionTaken && (
                <View style={s.actionTakenBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={Colors.green} />
                  <Text style={s.actionTakenText}>{n.actionTaken}</Text>
                </View>
              )}
            </View>
          ))}

          <Text style={s.sectionLabel}>Add Note</Text>
          <TextInput style={[s.input, { height: 70 }]} value={newNote} onChangeText={setNewNote} multiline
            placeholder="What did you find or do?" placeholderTextColor={Colors.textMuted} />
          <TextInput style={s.input} value={newAction} onChangeText={setNewAction}
            placeholder="Action taken (optional, e.g. 'Wallet reconciled')" placeholderTextColor={Colors.textMuted} />
          <TouchableOpacity style={[s.primaryBtn, (noteMut.isPending || !newNote.trim()) && { opacity: 0.4 }]}
            onPress={handleAddNote} disabled={noteMut.isPending || !newNote.trim()}>
            <Text style={s.primaryBtnText}>{noteMut.isPending ? "Adding..." : "Add Note"}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  toast:           { margin: 12, borderRadius: 8, padding: 12 },
  toastText:       { color: Colors.bg, fontWeight: "600", textAlign: "center" },
  tabRow:          { flexDirection: "row", borderBottomWidth: 1, borderColor: Colors.border },
  tabBtn:          { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive:       { borderBottomWidth: 2, borderColor: Colors.accent },
  tabText:         { color: Colors.textMuted, fontSize: 13 },
  tabTextActive:   { color: Colors.accent, fontWeight: "600" },
  filterRow:       { flexShrink: 0 },
  chip:            { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  chipActive:      { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
  chipText:        { color: Colors.textMuted, fontSize: 12 },
  chipTextActive:  { color: Colors.accent },
  chipRow:         { flexDirection: "row", gap: 8, marginBottom: 8 },
  empty:           { color: Colors.textMuted, textAlign: "center", marginTop: 20, fontSize: 13 },
  card:            { backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  caseHeader:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  priorityDot:     { width: 8, height: 8, borderRadius: 4 },
  caseTitle:       { flex: 1, color: Colors.textPrimary, fontWeight: "600", fontSize: 13 },
  caseMeta:        { flexDirection: "row", gap: 4 },
  metaText:        { color: Colors.textMuted, fontSize: 11 },
  statusBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText:      { color: Colors.bg, fontSize: 10, fontWeight: "700" },
  sectionLabel:    { color: Colors.textMuted, fontSize: 12, marginBottom: 6, marginTop: 14 },
  input:           { backgroundColor: Colors.bgCard, borderRadius: 8, padding: 10, color: Colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 },
  primaryBtn:      { backgroundColor: Colors.accent, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 12 },
  primaryBtnText:  { color: Colors.bg, fontWeight: "700", fontSize: 15 },
  detailHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  detailTitle:     { color: Colors.textPrimary, fontSize: 18, fontWeight: "700", flex: 1, marginRight: 8 },
  detailMeta:      { backgroundColor: Colors.bgCard, borderRadius: 8, padding: 12, gap: 4, marginBottom: 4, borderWidth: 1, borderColor: Colors.border },
  statusRow:       { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  statusBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.border },
  statusBtnText:   { fontSize: 12, fontWeight: "600" },
  noteCard:        { backgroundColor: Colors.bgCard, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  noteHeader:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  noteActor:       { color: Colors.accent, fontSize: 12, fontWeight: "600" },
  noteTime:        { color: Colors.textMuted, fontSize: 11, marginLeft: "auto" },
  noteText:        { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  actionTakenBadge:{ flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: Colors.green + "22", borderRadius: 6, padding: 6, marginTop: 8 },
  actionTakenText: { color: Colors.green, fontSize: 12 },
});

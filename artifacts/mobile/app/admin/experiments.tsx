import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Switch,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import {
  useAdminExperiments, useAdminExperiment, useAdminCreateExperiment,
  useAdminExperimentAction, useAdminExperimentMetrics,
} from "../../hooks/useApi";

const STATUS_COLORS: Record<string, string> = {
  draft:     Colors.textMuted,
  running:   Colors.green,
  paused:    Colors.amber,
  completed: Colors.accent,
};

const SURFACES = [
  "onboarding_copy", "nba_framing", "recommendation_card",
  "store_featured_layout", "premium_upgrade_copy",
  "comeback_mission_framing", "content_event_card", "room_car_showcase_cta",
];

type Tab = "list" | "create" | "detail";

export default function AdminExperimentsScreen() {
  const [tab, setTab]           = useState<Tab>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const [form, setForm] = useState({
    name: "", surface: SURFACES[0], hypothesis: "", rolloutPct: "100",
    variants: [
      { id: "control", name: "Control", description: "Current version", weight: 50 },
      { id: "variant_a", name: "Variant A", description: "New version", weight: 50 },
    ],
  });

  const experimentsQ = useAdminExperiments(filterStatus === "all" ? undefined : filterStatus);
  const selectedQ    = useAdminExperiment(selectedId);
  const metricsQ     = useAdminExperimentMetrics(selectedId);
  const createMut    = useAdminCreateExperiment();
  const actionMut    = useAdminExperimentAction();

  const experiments  = experimentsQ.data?.experiments ?? [];
  const detail       = selectedQ.data;

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleCreate() {
    if (!form.name.trim()) { showToast("Name is required", false); return; }
    try {
      await createMut.mutateAsync({
        name: form.name.trim(),
        surface: form.surface,
        hypothesis: form.hypothesis.trim(),
        rolloutPct: Number(form.rolloutPct) || 100,
        variants: form.variants,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast("Experiment created");
      setForm({ name: "", surface: SURFACES[0], hypothesis: "", rolloutPct: "100", variants: [
        { id: "control", name: "Control", description: "Current version", weight: 50 },
        { id: "variant_a", name: "Variant A", description: "New version", weight: 50 },
      ]});
      setTab("list");
    } catch (e: any) { showToast(e?.message ?? "Error", false); }
  }

  async function handleAction(id: string, action: "start" | "pause" | "stop") {
    try {
      await actionMut.mutateAsync({ id, action });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(`Experiment ${action === "stop" ? "stopped" : action + "ed"}`);
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
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === "list" ? "Experiments" : "New Experiment"}</Text>
          </TouchableOpacity>
        ))}
        {selectedId && (
          <TouchableOpacity style={[s.tabBtn, tab === "detail" && s.tabActive]}
            onPress={() => setTab("detail")}>
            <Text style={[s.tabText, tab === "detail" && s.tabTextActive]}>Detail</Text>
          </TouchableOpacity>
        )}
      </View>

      {tab === "list" && (
        <View style={{ flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}
            contentContainerStyle={{ gap: 6, padding: 12 }}>
            {["all", "draft", "running", "paused", "completed"].map(st => (
              <TouchableOpacity key={st} style={[s.chip, filterStatus === st && s.chipActive]}
                onPress={() => setFilterStatus(st)}>
                <Text style={[s.chipText, filterStatus === st && s.chipTextActive]}>{st}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {experimentsQ.isLoading
            ? <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
            : (
              <ScrollView contentContainerStyle={{ padding: 12 }}>
                {experiments.length === 0 && <Text style={s.empty}>No experiments yet</Text>}
                {experiments.map((exp: any) => (
                  <TouchableOpacity key={exp.id} style={s.card}
                    onPress={() => { setSelectedId(exp.id); setTab("detail"); }}>
                    <View style={s.cardHeader}>
                      <Text style={s.cardTitle}>{exp.name}</Text>
                      <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[exp.status] ?? Colors.textMuted }]}>
                        <Text style={s.statusText}>{exp.status}</Text>
                      </View>
                    </View>
                    <Text style={s.cardSub}>{exp.surface}</Text>
                    <Text style={s.cardHyp} numberOfLines={2}>{exp.hypothesis || "No hypothesis set"}</Text>
                    <View style={s.cardMeta}>
                      <Text style={s.metaText}>{exp.variants?.length ?? 0} variants · {exp.rolloutPct}% rollout</Text>
                      {exp.startedAt && <Text style={s.metaText}>Started {new Date(exp.startedAt).toLocaleDateString()}</Text>}
                    </View>
                    <View style={s.actionRow}>
                      {exp.status === "draft" && (
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.green + "33", borderColor: Colors.green }]}
                          onPress={() => handleAction(exp.id, "start")} disabled={actionMut.isPending}>
                          <Text style={[s.actionBtnText, { color: Colors.green }]}>Start</Text>
                        </TouchableOpacity>
                      )}
                      {exp.status === "running" && (
                        <>
                          <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.amber + "33", borderColor: Colors.amber }]}
                            onPress={() => handleAction(exp.id, "pause")} disabled={actionMut.isPending}>
                            <Text style={[s.actionBtnText, { color: Colors.amber }]}>Pause</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.crimson + "33", borderColor: Colors.crimson }]}
                            onPress={() => handleAction(exp.id, "stop")} disabled={actionMut.isPending}>
                            <Text style={[s.actionBtnText, { color: Colors.crimson }]}>Stop</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {exp.status === "paused" && (
                        <>
                          <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.green + "33", borderColor: Colors.green }]}
                            onPress={() => handleAction(exp.id, "start")} disabled={actionMut.isPending}>
                            <Text style={[s.actionBtnText, { color: Colors.green }]}>Resume</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.crimson + "33", borderColor: Colors.crimson }]}
                            onPress={() => handleAction(exp.id, "stop")} disabled={actionMut.isPending}>
                            <Text style={[s.actionBtnText, { color: Colors.crimson }]}>Stop</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )
          }
        </View>
      )}

      {tab === "detail" && detail && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={s.detailHeader}>
            <Text style={s.detailTitle}>{detail.name}</Text>
            <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[detail.status] ?? Colors.textMuted }]}>
              <Text style={s.statusText}>{detail.status}</Text>
            </View>
          </View>

          <Text style={s.detailSurface}>Surface: {detail.surface}</Text>
          {detail.hypothesis ? <Text style={s.detailHyp}>{detail.hypothesis}</Text> : null}

          <View style={s.infoRow}>
            <View style={s.infoBox}><Text style={s.infoVal}>{detail.rolloutPct}%</Text><Text style={s.infoLbl}>Rollout</Text></View>
            <View style={s.infoBox}><Text style={s.infoVal}>{detail.assignmentMode}</Text><Text style={s.infoLbl}>Assignment</Text></View>
            <View style={s.infoBox}><Text style={s.infoVal}>{detail.variants?.length ?? 0}</Text><Text style={s.infoLbl}>Variants</Text></View>
          </View>

          <Text style={s.sectionLabel}>Variants</Text>
          {detail.variants?.map((v: any) => (
            <View key={v.id} style={s.variantRow}>
              <Text style={s.variantName}>{v.name}</Text>
              <Text style={s.variantWeight}>{v.weight}%</Text>
            </View>
          ))}

          {metricsQ.data && (
            <>
              <Text style={s.sectionLabel}>Window Metrics</Text>
              <View style={s.metricsGrid}>
                {[
                  ["Proof Submissions", metricsQ.data.windowMetrics?.proofSubmissions],
                  ["Proof Approvals", metricsQ.data.windowMetrics?.proofApprovals],
                  ["Approval Rate", metricsQ.data.windowMetrics?.approvalRate != null ? `${metricsQ.data.windowMetrics.approvalRate}%` : "—"],
                  ["Focus Sessions", metricsQ.data.windowMetrics?.focusSessions],
                  ["Reward Tx", metricsQ.data.windowMetrics?.rewardTransactions],
                  ["Coins Granted", metricsQ.data.windowMetrics?.totalCoinsGranted],
                ].map(([label, val]) => (
                  <View key={String(label)} style={s.metricBox}>
                    <Text style={s.metricVal}>{String(val ?? "—")}</Text>
                    <Text style={s.metricLbl}>{String(label)}</Text>
                  </View>
                ))}
              </View>
              {metricsQ.data.note && (
                <Text style={s.metricsNote}>{metricsQ.data.note}</Text>
              )}
            </>
          )}
        </ScrollView>
      )}

      {tab === "create" && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={s.sectionLabel}>Experiment Name *</Text>
          <TextInput style={s.input} value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))}
            placeholder="e.g. Onboarding CTA Test" placeholderTextColor={Colors.textMuted} />

          <Text style={s.sectionLabel}>Surface</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {SURFACES.map(sf => (
              <TouchableOpacity key={sf} style={[s.chip, form.surface === sf && s.chipActive]}
                onPress={() => setForm(f => ({ ...f, surface: sf }))}>
                <Text style={[s.chipText, form.surface === sf && s.chipTextActive]}>{sf}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={s.sectionLabel}>Hypothesis</Text>
          <TextInput style={[s.input, { height: 70 }]} value={form.hypothesis}
            onChangeText={v => setForm(f => ({ ...f, hypothesis: v }))} multiline
            placeholder="We believe that... will result in..." placeholderTextColor={Colors.textMuted} />

          <Text style={s.sectionLabel}>Rollout %</Text>
          <TextInput style={s.input} value={form.rolloutPct}
            onChangeText={v => setForm(f => ({ ...f, rolloutPct: v }))}
            keyboardType="numeric" placeholder="100" placeholderTextColor={Colors.textMuted} />

          <Text style={s.sectionLabel}>Variants (2 default — edit names if needed)</Text>
          {form.variants.map((v, i) => (
            <View key={v.id} style={s.variantEditRow}>
              <TextInput style={[s.input, { flex: 1 }]} value={v.name}
                onChangeText={val => setForm(f => ({ ...f, variants: f.variants.map((vv, j) => j === i ? { ...vv, name: val } : vv) }))}
                placeholder={`Variant ${i + 1} name`} placeholderTextColor={Colors.textMuted} />
              <TextInput style={[s.input, { width: 55, textAlign: "center" }]} value={String(v.weight)}
                onChangeText={val => setForm(f => ({ ...f, variants: f.variants.map((vv, j) => j === i ? { ...vv, weight: Number(val) || 50 } : vv) }))}
                keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
              <Text style={{ color: Colors.textMuted, alignSelf: "center" }}>%</Text>
            </View>
          ))}

          <TouchableOpacity style={[s.primaryBtn, createMut.isPending && { opacity: 0.5 }]} onPress={handleCreate} disabled={createMut.isPending}>
            <Text style={s.primaryBtnText}>{createMut.isPending ? "Creating..." : "Create Experiment"}</Text>
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
  empty:           { color: Colors.textMuted, textAlign: "center", marginTop: 40, fontSize: 14 },
  card:            { backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
  cardHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  cardTitle:       { color: Colors.textPrimary, fontWeight: "700", fontSize: 14, flex: 1, marginRight: 8 },
  cardSub:         { color: Colors.accent, fontSize: 11, marginBottom: 4 },
  cardHyp:         { color: Colors.textSecondary, fontSize: 12, marginBottom: 8 },
  cardMeta:        { flexDirection: "row", gap: 8, marginBottom: 8 },
  metaText:        { color: Colors.textMuted, fontSize: 11 },
  statusBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText:      { color: Colors.bg, fontSize: 10, fontWeight: "700" },
  actionRow:       { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn:       { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  actionBtnText:   { fontSize: 12, fontWeight: "600" },
  detailHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  detailTitle:     { color: Colors.textPrimary, fontSize: 20, fontWeight: "700", flex: 1, marginRight: 8 },
  detailSurface:   { color: Colors.accent, fontSize: 13, marginBottom: 6 },
  detailHyp:       { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 12 },
  infoRow:         { flexDirection: "row", gap: 8, marginBottom: 16 },
  infoBox:         { flex: 1, backgroundColor: Colors.bgCard, borderRadius: 8, padding: 10, alignItems: "center" },
  infoVal:         { color: Colors.textPrimary, fontWeight: "700", fontSize: 13, marginBottom: 2 },
  infoLbl:         { color: Colors.textMuted, fontSize: 10 },
  sectionLabel:    { color: Colors.textMuted, fontSize: 12, marginBottom: 6, marginTop: 14 },
  variantRow:      { flexDirection: "row", justifyContent: "space-between", backgroundColor: Colors.bgCard, borderRadius: 8, padding: 10, marginBottom: 6 },
  variantName:     { color: Colors.textPrimary, fontWeight: "600" },
  variantWeight:   { color: Colors.accent },
  variantEditRow:  { flexDirection: "row", gap: 6, marginBottom: 8, alignItems: "center" },
  metricsGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  metricBox:       { width: "30%", backgroundColor: Colors.bgCard, borderRadius: 8, padding: 10, alignItems: "center" },
  metricVal:       { color: Colors.textPrimary, fontWeight: "700", fontSize: 16 },
  metricLbl:       { color: Colors.textMuted, fontSize: 10, marginTop: 2, textAlign: "center" },
  metricsNote:     { color: Colors.textMuted, fontSize: 11, fontStyle: "italic", marginTop: 4 },
  input:           { backgroundColor: Colors.bgCard, borderRadius: 8, padding: 10, color: Colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  primaryBtn:      { backgroundColor: Colors.accent, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 20 },
  primaryBtnText:  { color: Colors.bg, fontWeight: "700", fontSize: 15 },
});

import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import {
  useAdminRepairWallet, useAdminRepairXp, useAdminRepairSkills,
  useAdminRepairInventory, useAdminRepairPremium,
} from "../../hooks/useApi";

type RepairType = "wallet" | "xp" | "skills" | "inventory" | "premium";

const REPAIR_OPTIONS: { key: RepairType; label: string; desc: string; icon: string; color: string }[] = [
  {
    key: "wallet", label: "Wallet Reconcile", icon: "wallet",
    color: Colors.gold,
    desc: "Computes expected coin balance from all reward transactions. Detects and optionally corrects drift.",
  },
  {
    key: "xp", label: "XP Reconcile", icon: "star",
    color: Colors.accent,
    desc: "Computes expected XP from all reward transactions. Detects and optionally corrects drift.",
  },
  {
    key: "skills", label: "Skills Reconcile", icon: "barbell",
    color: Colors.green,
    desc: "Recomputes skill XP totals and levels from skill XP event history. Fixes per-skill drift.",
  },
  {
    key: "inventory", label: "Inventory Reconcile", icon: "bag",
    color: Colors.cyan,
    desc: "Finds orphaned inventory items (missing shop item) and duplicate equipped slots. Optionally removes/fixes.",
  },
  {
    key: "premium", label: "Premium Reconcile", icon: "shield-checkmark",
    color: Colors.amber,
    desc: "Checks whether isPremium flag matches premiumExpiresAt date. Detects expired-but-flagged and inverse cases.",
  },
];

export default function AdminRepairScreen() {
  const [userId, setUserId]       = useState("");
  const [selectedType, setType]   = useState<RepairType | null>(null);
  const [reason, setReason]       = useState("");
  const [result, setResult]       = useState<any>(null);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  const walletMut    = useAdminRepairWallet();
  const xpMut        = useAdminRepairXp();
  const skillsMut    = useAdminRepairSkills();
  const inventoryMut = useAdminRepairInventory();
  const premiumMut   = useAdminRepairPremium();

  function getMutation(type: RepairType) {
    return { wallet: walletMut, xp: xpMut, skills: skillsMut, inventory: inventoryMut, premium: premiumMut }[type];
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function runRepair(apply: boolean) {
    if (!userId.trim())    { showToast("Enter a player ID", false); return; }
    if (!selectedType)     { showToast("Select a repair type", false); return; }
    if (apply && !reason.trim()) { showToast("Reason is required before applying", false); return; }

    const mut = getMutation(selectedType);
    try {
      const res = await (mut as any).mutateAsync({ userId: userId.trim(), reason: reason.trim() || "dry run", apply });
      setResult(res);
      if (apply && res.applied) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast("Repair applied successfully");
      } else if (!res.hasDrift) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast("No drift detected — state is consistent");
      } else {
        showToast(apply ? "Applied" : "Drift found — review below");
      }
    } catch (e: any) {
      showToast(e?.message ?? "Error", false);
    }
  }

  const isPending = selectedType ? getMutation(selectedType).isPending : false;
  const selected  = REPAIR_OPTIONS.find(o => o.key === selectedType);

  return (
    <View style={s.container}>
      {toast && (
        <View style={[s.toast, { backgroundColor: toast.ok ? Colors.green : Colors.crimson }]}>
          <Text style={s.toastText}>{toast.msg}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={s.pageTitle}>Repair & Reconcile</Text>
        <Text style={s.pageDesc}>
          Run safe recomputation and reconciliation checks on a player's state. Always dry-run first to review the diagnosis before applying.
        </Text>

        <Text style={s.label}>Player ID *</Text>
        <TextInput style={s.input} value={userId} onChangeText={setUserId}
          placeholder="Enter player UUID" placeholderTextColor={Colors.textMuted} autoCapitalize="none" />

        <Text style={s.label}>Repair Type</Text>
        <View style={s.repairGrid}>
          {REPAIR_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.key} style={[s.repairCard, selectedType === opt.key && { borderColor: opt.color, backgroundColor: opt.color + "11" }]}
              onPress={() => { setType(opt.key); setResult(null); }}>
              <Ionicons name={opt.icon as any} size={20} color={selectedType === opt.key ? opt.color : Colors.textMuted} />
              <Text style={[s.repairLabel, selectedType === opt.key && { color: opt.color }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selected && (
          <View style={s.descCard}>
            <Text style={s.descText}>{selected.desc}</Text>
          </View>
        )}

        {selectedType && (
          <>
            <View style={s.dryRunRow}>
              <TouchableOpacity style={[s.dryRunBtn, isPending && { opacity: 0.5 }]} onPress={() => runRepair(false)} disabled={isPending}>
                {isPending ? <ActivityIndicator color={Colors.accent} size="small" /> : <Text style={s.dryRunText}>Dry Run (no changes)</Text>}
              </TouchableOpacity>
            </View>

            <Text style={s.label}>Reason (required to apply)</Text>
            <TextInput style={[s.input, { height: 70 }]} value={reason} onChangeText={setReason} multiline
              placeholder="Why is this repair needed? e.g. 'User reported wrong balance after purchase refund'"
              placeholderTextColor={Colors.textMuted} />

            <TouchableOpacity style={[s.applyBtn, (!reason.trim() || isPending) && { opacity: 0.4 }]}
              onPress={() => runRepair(true)} disabled={!reason.trim() || isPending}>
              <Text style={s.applyBtnText}>Apply Repair</Text>
            </TouchableOpacity>
          </>
        )}

        {result && (
          <View style={s.resultCard}>
            <View style={s.resultHeader}>
              <Ionicons
                name={result.hasDrift ? "warning" : "checkmark-circle"}
                size={20}
                color={result.hasDrift ? Colors.amber : Colors.green}
              />
              <Text style={[s.resultTitle, { color: result.hasDrift ? Colors.amber : Colors.green }]}>
                {result.message}
              </Text>
            </View>

            {result.drift !== undefined && (
              <View style={s.resultRow}>
                <Text style={s.resultKey}>Drift</Text>
                <Text style={[s.resultVal, { color: result.drift !== 0 ? Colors.amber : Colors.green }]}>{result.drift}</Text>
              </View>
            )}
            {result.currentBalance !== undefined && (
              <View style={s.resultRow}>
                <Text style={s.resultKey}>Current Balance</Text>
                <Text style={s.resultVal}>{result.currentBalance}</Text>
              </View>
            )}
            {result.expectedBalance !== undefined && (
              <View style={s.resultRow}>
                <Text style={s.resultKey}>Expected Balance</Text>
                <Text style={s.resultVal}>{result.expectedBalance}</Text>
              </View>
            )}
            {result.currentXp !== undefined && (
              <View style={s.resultRow}>
                <Text style={s.resultKey}>Current XP</Text>
                <Text style={s.resultVal}>{result.currentXp}</Text>
              </View>
            )}
            {result.expectedXp !== undefined && (
              <View style={s.resultRow}>
                <Text style={s.resultKey}>Expected XP</Text>
                <Text style={s.resultVal}>{result.expectedXp}</Text>
              </View>
            )}
            {result.driftSkills?.length > 0 && (
              <View style={s.resultRow}>
                <Text style={s.resultKey}>Skills with drift</Text>
                <Text style={s.resultVal}>{result.driftSkills.join(", ")}</Text>
              </View>
            )}
            {result.repairs?.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={s.resultKey}>Repairs:</Text>
                {result.repairs.map((r: any) => (
                  <Text key={r.skillId} style={s.repairDetail}>
                    {r.skillId}: Lv{r.previousLevel}→{r.newLevel} · XP {r.previousTotalXp}→{r.newTotalXp}
                  </Text>
                ))}
              </View>
            )}
            {result.issues?.length > 0 && (
              <View style={{ marginTop: 6 }}>
                <Text style={s.resultKey}>Issues found ({result.issues.length}):</Text>
                {result.issues.map((iss: any, i: number) => (
                  <Text key={i} style={s.repairDetail}>{iss.type} — {iss.inventoryId || iss.slot || ""}</Text>
                ))}
              </View>
            )}
            {result.applied && (
              <View style={[s.appliedBadge]}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.green} />
                <Text style={s.appliedText}>Repair applied and audit-logged</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  toast:        { margin: 12, borderRadius: 8, padding: 12 },
  toastText:    { color: Colors.bg, fontWeight: "600", textAlign: "center" },
  pageTitle:    { color: Colors.textPrimary, fontSize: 20, fontWeight: "700", marginBottom: 6 },
  pageDesc:     { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  label:        { color: Colors.textMuted, fontSize: 12, marginBottom: 6, marginTop: 14 },
  input:        { backgroundColor: Colors.bgCard, borderRadius: 8, padding: 10, color: Colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  repairGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  repairCard:   { width: "47%", backgroundColor: Colors.bgCard, borderRadius: 10, padding: 12, alignItems: "center", gap: 6, borderWidth: 1, borderColor: Colors.border },
  repairLabel:  { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", textAlign: "center" },
  descCard:     { backgroundColor: Colors.bgElevated, borderRadius: 8, padding: 12, marginBottom: 4 },
  descText:     { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  dryRunRow:    { marginTop: 16, marginBottom: 4 },
  dryRunBtn:    { backgroundColor: Colors.bgCard, borderRadius: 8, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.accent },
  dryRunText:   { color: Colors.accent, fontWeight: "600", fontSize: 14 },
  applyBtn:     { backgroundColor: Colors.amber, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 12 },
  applyBtnText: { color: Colors.bg, fontWeight: "700", fontSize: 15 },
  resultCard:   { backgroundColor: Colors.bgCard, borderRadius: 10, padding: 14, marginTop: 20, borderWidth: 1, borderColor: Colors.border },
  resultHeader: { flexDirection: "row", gap: 8, alignItems: "flex-start", marginBottom: 12 },
  resultTitle:  { flex: 1, fontWeight: "600", fontSize: 13 },
  resultRow:    { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderColor: Colors.borderLight },
  resultKey:    { color: Colors.textMuted, fontSize: 12 },
  resultVal:    { color: Colors.textPrimary, fontSize: 12, fontWeight: "600" },
  repairDetail: { color: Colors.textSecondary, fontSize: 11, marginTop: 3, marginLeft: 8 },
  appliedBadge: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 12, backgroundColor: Colors.green + "22", padding: 8, borderRadius: 6 },
  appliedText:  { color: Colors.green, fontSize: 12, fontWeight: "600" },
});

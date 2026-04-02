import {
  db, usersTable, missionsTable, focusSessionsTable,
  proofSubmissionsTable, rewardTransactionsTable, auditLogTable,
  userInventoryTable, shopItemsTable,
} from "@workspace/db";
import { sql, eq, and, gte, lte, count, sum, avg, inArray } from "drizzle-orm";

type Range = "24h" | "7d" | "30d";

function rangeToMs(range: Range): number {
  const map: Record<Range, number> = { "24h": 86400000, "7d": 604800000, "30d": 2592000000 };
  return map[range];
}

function rangeStart(range: Range): Date {
  return new Date(Date.now() - rangeToMs(range));
}

function safe(fn: () => Promise<unknown>, fallback: unknown = null) {
  return fn().catch((err) => { console.error("[metrics]", err.message); return fallback; });
}

export async function getToplineHealth(range: Range) {
  const since = rangeStart(range);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 604800000);

  const [registrations] = await db
    .select({ value: count() }).from(usersTable)
    .where(gte(usersTable.createdAt, since));

  const [dau] = await db
    .select({ value: count() }).from(usersTable)
    .where(gte(usersTable.lastActiveAt, todayStart));

  const [wau] = await db
    .select({ value: count() }).from(usersTable)
    .where(gte(usersTable.lastActiveAt, weekAgo));

  const [missionsCreated] = await db
    .select({ value: count() }).from(missionsTable)
    .where(gte(missionsTable.createdAt, since));

  const [proofsSubmitted] = await db
    .select({ value: count() }).from(proofSubmissionsTable)
    .where(gte(proofSubmissionsTable.createdAt, since));

  const [proofsApproved] = await db
    .select({ value: count() }).from(proofSubmissionsTable)
    .where(and(gte(proofSubmissionsTable.createdAt, since), eq(proofSubmissionsTable.status, "approved")));

  const [rewardsGranted] = await db
    .select({ value: count() }).from(rewardTransactionsTable)
    .where(and(gte(rewardTransactionsTable.createdAt, since), eq(rewardTransactionsTable.type, "earned")));

  const [coinsMinted] = await db
    .select({ value: sum(rewardTransactionsTable.amount) }).from(rewardTransactionsTable)
    .where(and(gte(rewardTransactionsTable.createdAt, since), inArray(rewardTransactionsTable.type, ["earned", "bonus"])));

  const [coinsSpent] = await db
    .select({ value: sum(rewardTransactionsTable.amount) }).from(rewardTransactionsTable)
    .where(and(gte(rewardTransactionsTable.createdAt, since), eq(rewardTransactionsTable.type, "spent")));

  return {
    registrations: registrations?.value ?? 0,
    dau: dau?.value ?? 0,
    wau: wau?.value ?? 0,
    missionsCreated: missionsCreated?.value ?? 0,
    proofsSubmitted: proofsSubmitted?.value ?? 0,
    proofsApproved: proofsApproved?.value ?? 0,
    rewardsGranted: rewardsGranted?.value ?? 0,
    coinsMinted: Number(coinsMinted?.value ?? 0),
    coinsSpent: Number(coinsSpent?.value ?? 0),
  };
}

export async function getCoreFunnel(range: Range) {
  const since = rangeStart(range);

  const [missions] = await db
    .select({ value: count() }).from(missionsTable)
    .where(gte(missionsTable.createdAt, since));

  const [sessionsStarted] = await db
    .select({ value: count() }).from(focusSessionsTable)
    .where(gte(focusSessionsTable.startedAt, since));

  const [sessionsCompleted] = await db
    .select({ value: count() }).from(focusSessionsTable)
    .where(and(gte(focusSessionsTable.startedAt, since), eq(focusSessionsTable.status, "completed")));

  const [proofsSubmitted] = await db
    .select({ value: count() }).from(proofSubmissionsTable)
    .where(gte(proofSubmissionsTable.createdAt, since));

  const [verdictsReturned] = await db
    .select({ value: count() }).from(proofSubmissionsTable)
    .where(and(
      gte(proofSubmissionsTable.createdAt, since),
      inArray(proofSubmissionsTable.status, ["approved", "rejected", "partial", "flagged", "followup_needed"]),
    ));

  const [rewardsGranted] = await db
    .select({ value: count() }).from(rewardTransactionsTable)
    .where(and(gte(rewardTransactionsTable.createdAt, since), eq(rewardTransactionsTable.type, "earned")));

  const m = missions?.value ?? 0;
  const ss = sessionsStarted?.value ?? 0;
  const sc = sessionsCompleted?.value ?? 0;
  const ps = proofsSubmitted?.value ?? 0;
  const vr = verdictsReturned?.value ?? 0;
  const rg = rewardsGranted?.value ?? 0;

  const steps = [
    { name: "Missions Created", count: m, conversionFromPrevious: null as number | null },
    { name: "Sessions Started", count: ss, conversionFromPrevious: m > 0 ? ss / m : null },
    { name: "Sessions Completed", count: sc, conversionFromPrevious: ss > 0 ? sc / ss : null },
    { name: "Proofs Submitted", count: ps, conversionFromPrevious: sc > 0 ? ps / sc : null },
    { name: "Verdicts Returned", count: vr, conversionFromPrevious: ps > 0 ? vr / ps : null },
    { name: "Rewards Granted", count: rg, conversionFromPrevious: vr > 0 ? rg / vr : null },
  ];

  let biggestDropOff: { from: string; to: string; dropPct: number } | null = null;
  for (let i = 1; i < steps.length; i++) {
    const conv = steps[i].conversionFromPrevious;
    if (conv !== null && (biggestDropOff === null || conv < (1 - biggestDropOff.dropPct))) {
      biggestDropOff = { from: steps[i - 1].name, to: steps[i].name, dropPct: 1 - conv };
    }
  }

  return { steps, biggestDropOff };
}

export async function getTrustJudge(range: Range) {
  const since = rangeStart(range);

  const statusCounts = await db
    .select({ status: proofSubmissionsTable.status, cnt: count() })
    .from(proofSubmissionsTable)
    .where(gte(proofSubmissionsTable.createdAt, since))
    .groupBy(proofSubmissionsTable.status);

  const byStatus: Record<string, number> = {};
  for (const r of statusCounts) byStatus[r.status] = r.cnt;

  const judged = (byStatus["approved"] ?? 0) + (byStatus["rejected"] ?? 0) +
    (byStatus["partial"] ?? 0) + (byStatus["flagged"] ?? 0) + (byStatus["followup_needed"] ?? 0);

  const approvalPct = judged > 0 ? (byStatus["approved"] ?? 0) / judged : null;
  const followupPct = judged > 0 ? (byStatus["followup_needed"] ?? 0) / judged : null;
  const rejectPct = judged > 0 ? (byStatus["rejected"] ?? 0) / judged : null;

  const [judgeFailures] = await db
    .select({ value: count() }).from(auditLogTable)
    .where(and(gte(auditLogTable.createdAt, since), eq(auditLogTable.action, "judge_failed"), eq(auditLogTable.actorRole, "user")));

  const [providerFallbacks] = await db
    .select({ value: count() }).from(auditLogTable)
    .where(and(gte(auditLogTable.createdAt, since), eq(auditLogTable.action, "judge_provider_fallback"), eq(auditLogTable.actorRole, "user")));

  const [duplicateProofs] = await db
    .select({ value: count() }).from(auditLogTable)
    .where(and(gte(auditLogTable.createdAt, since), eq(auditLogTable.action, "proof_duplicate_flagged"), eq(auditLogTable.actorRole, "user")));

  return {
    approvalPct,
    followupPct,
    rejectPct,
    totalJudged: judged,
    judgeFailures: judgeFailures?.value ?? 0,
    providerFallbacks: providerFallbacks?.value ?? 0,
    duplicateProofs: duplicateProofs?.value ?? 0,
  };
}

export async function getEconomy(range: Range) {
  const since = rangeStart(range);

  const [minted] = await db
    .select({ value: sum(rewardTransactionsTable.amount) }).from(rewardTransactionsTable)
    .where(and(gte(rewardTransactionsTable.createdAt, since), inArray(rewardTransactionsTable.type, ["earned", "bonus"])));

  const [spent] = await db
    .select({ value: sum(rewardTransactionsTable.amount) }).from(rewardTransactionsTable)
    .where(and(gte(rewardTransactionsTable.createdAt, since), eq(rewardTransactionsTable.type, "spent")));

  const mintedVal = Number(minted?.value ?? 0);
  const spentVal = Number(spent?.value ?? 0);
  const netDelta = mintedVal - spentVal;
  const mintSpendRatio = spentVal > 0 ? mintedVal / spentVal : null;

  const [avgReward] = await db
    .select({ value: avg(proofSubmissionsTable.coinsAwarded) }).from(proofSubmissionsTable)
    .where(and(
      gte(proofSubmissionsTable.createdAt, since),
      eq(proofSubmissionsTable.status, "approved"),
      sql`${proofSubmissionsTable.coinsAwarded} > 0`,
    ));

  const [purchaseCount] = await db
    .select({ value: count() }).from(rewardTransactionsTable)
    .where(and(gte(rewardTransactionsTable.createdAt, since), eq(rewardTransactionsTable.type, "spent")));

  const [avgPurchase] = await db
    .select({ value: avg(rewardTransactionsTable.amount) }).from(rewardTransactionsTable)
    .where(and(gte(rewardTransactionsTable.createdAt, since), eq(rewardTransactionsTable.type, "spent")));

  const topCategories = await db
    .select({ category: sql<string>`${auditLogTable.details}::json->>'category'`, cnt: count() })
    .from(auditLogTable)
    .where(and(gte(auditLogTable.createdAt, since), eq(auditLogTable.action, "item_purchased"), eq(auditLogTable.actorRole, "user")))
    .groupBy(sql`${auditLogTable.details}::json->>'category'`)
    .orderBy(sql`count(*) DESC`)
    .limit(5);

  const [anomalousRewards] = await db
    .select({ value: count() }).from(rewardTransactionsTable)
    .where(and(
      gte(rewardTransactionsTable.createdAt, since),
      eq(rewardTransactionsTable.type, "earned"),
      gte(rewardTransactionsTable.amount, 500),
    ));

  return {
    coinsMinted: mintedVal,
    coinsSpent: spentVal,
    netDelta,
    mintSpendRatio,
    avgRewardPerApproval: avgReward?.value ? Number(avgReward.value) : null,
    purchaseCount: purchaseCount?.value ?? 0,
    avgPurchaseValue: avgPurchase?.value ? Math.abs(Number(avgPurchase.value)) : null,
    topCategories: topCategories.map(c => ({ category: c.category, count: c.cnt })),
    anomalousRewards: anomalousRewards?.value ?? 0,
  };
}

export async function getStatusEngagement(range: Range) {
  const since = rangeStart(range);

  const [wardrobeOwners] = await db
    .select({ value: sql<number>`COUNT(DISTINCT ${userInventoryTable.userId})` })
    .from(userInventoryTable)
    .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
    .where(sql`${shopItemsTable.wearableSlot} IS NOT NULL`);

  const eventCounts = await db
    .select({ action: auditLogTable.action, cnt: count() })
    .from(auditLogTable)
    .where(and(
      gte(auditLogTable.createdAt, since),
      eq(auditLogTable.actorRole, "user"),
      inArray(auditLogTable.action, [
        "item_equipped", "wardrobe_equipped", "car_featured",
        "room_decor_updated", "room_environment_switched", "level_up",
      ]),
    ))
    .groupBy(auditLogTable.action);

  const byAction: Record<string, number> = {};
  for (const r of eventCounts) byAction[r.action] = r.cnt;

  const [carOwners] = await db
    .select({ value: sql<number>`COUNT(DISTINCT ${userInventoryTable.userId})` })
    .from(userInventoryTable)
    .innerJoin(shopItemsTable, eq(userInventoryTable.itemId, shopItemsTable.id))
    .where(eq(shopItemsTable.category, "vehicle"));

  return {
    wardrobeOwners: wardrobeOwners?.value ?? 0,
    equipEvents: (byAction["item_equipped"] ?? 0) + (byAction["wardrobe_equipped"] ?? 0),
    carOwners: carOwners?.value ?? 0,
    carFeatureEvents: byAction["car_featured"] ?? 0,
    roomUpdates: (byAction["room_decor_updated"] ?? 0) + (byAction["room_environment_switched"] ?? 0),
    levelUps: byAction["level_up"] ?? 0,
  };
}

export async function getAlerts(range: Range) {
  const alerts: { name: string; severity: "critical" | "warning" | "info"; message: string; value: number }[] = [];
  const h24 = new Date(Date.now() - 86400000);
  const h48 = new Date(Date.now() - 172800000);
  const d7 = new Date(Date.now() - 604800000);

  const [judgeFailures24h] = await db
    .select({ value: count() }).from(auditLogTable)
    .where(and(gte(auditLogTable.createdAt, h24), eq(auditLogTable.action, "judge_failed"), eq(auditLogTable.actorRole, "user")));
  if ((judgeFailures24h?.value ?? 0) > 5) {
    alerts.push({ name: "Reward failures", severity: "critical", message: `${judgeFailures24h!.value} judge failures in 24h`, value: judgeFailures24h!.value });
  }

  const approval24h = await db
    .select({ status: proofSubmissionsTable.status, cnt: count() })
    .from(proofSubmissionsTable)
    .where(gte(proofSubmissionsTable.createdAt, h24))
    .groupBy(proofSubmissionsTable.status);
  const ap: Record<string, number> = {};
  for (const r of approval24h) ap[r.status] = r.cnt;
  const totalJudged24h = (ap["approved"] ?? 0) + (ap["rejected"] ?? 0) + (ap["partial"] ?? 0) + (ap["flagged"] ?? 0) + (ap["followup_needed"] ?? 0);
  if (totalJudged24h > 0) {
    const appRate = (ap["approved"] ?? 0) / totalJudged24h;
    if (appRate < 0.4) {
      alerts.push({ name: "Approval collapse", severity: "critical", message: `Approval rate ${(appRate * 100).toFixed(1)}% over 24h`, value: appRate });
    }
  }

  const [proofs7dAvg] = await db
    .select({ value: count() }).from(proofSubmissionsTable)
    .where(gte(proofSubmissionsTable.createdAt, d7));
  const [proofs24h] = await db
    .select({ value: count() }).from(proofSubmissionsTable)
    .where(gte(proofSubmissionsTable.createdAt, h24));
  const dailyAvg7d = (proofs7dAvg?.value ?? 0) / 7;
  if (dailyAvg7d > 0 && (proofs24h?.value ?? 0) < dailyAvg7d * 0.3) {
    alerts.push({ name: "Proof submission drop", severity: "warning", message: `${proofs24h?.value ?? 0} proofs in 24h vs ${dailyAvg7d.toFixed(0)} daily avg`, value: proofs24h?.value ?? 0 });
  }

  const [anomalousWallet] = await db
    .select({ value: count() }).from(rewardTransactionsTable)
    .where(and(gte(rewardTransactionsTable.createdAt, h24), eq(rewardTransactionsTable.type, "earned"), gte(rewardTransactionsTable.amount, 500)));
  if ((anomalousWallet?.value ?? 0) > 5) {
    alerts.push({ name: "Abnormal wallet delta", severity: "warning", message: `${anomalousWallet!.value} rewards ≥500c in 24h`, value: anomalousWallet!.value });
  }

  const [minted7d] = await db
    .select({ value: sum(rewardTransactionsTable.amount) }).from(rewardTransactionsTable)
    .where(and(gte(rewardTransactionsTable.createdAt, d7), inArray(rewardTransactionsTable.type, ["earned", "bonus"])));
  const [spent7d] = await db
    .select({ value: sum(rewardTransactionsTable.amount) }).from(rewardTransactionsTable)
    .where(and(gte(rewardTransactionsTable.createdAt, d7), eq(rewardTransactionsTable.type, "spent")));
  const m7 = Number(minted7d?.value ?? 0);
  const s7 = Number(spent7d?.value ?? 0);
  if (s7 > 0 && m7 / s7 > 5) {
    alerts.push({ name: "Mint/spend imbalance", severity: "warning", message: `Ratio ${(m7 / s7).toFixed(1)}:1 over 7d`, value: m7 / s7 });
  }

  const [dau] = await db.select({ value: count() }).from(usersTable).where(gte(usersTable.lastActiveAt, h48));
  const [purchases48h] = await db
    .select({ value: count() }).from(rewardTransactionsTable)
    .where(and(gte(rewardTransactionsTable.createdAt, h48), eq(rewardTransactionsTable.type, "spent")));
  if ((dau?.value ?? 0) > 0 && (purchases48h?.value ?? 0) === 0) {
    alerts.push({ name: "Purchase stall", severity: "info", message: "0 purchases in 48h with active users", value: 0 });
  }

  return alerts;
}

export async function getDashboard(range: Range) {
  const [topline, funnel, trust, economy, statusEngagement, alerts] = await Promise.all([
    safe(() => getToplineHealth(range), {}),
    safe(() => getCoreFunnel(range), {}),
    safe(() => getTrustJudge(range), {}),
    safe(() => getEconomy(range), {}),
    safe(() => getStatusEngagement(range), {}),
    safe(() => getAlerts(range), []),
  ]);

  return { range, generatedAt: new Date().toISOString(), topline, funnel, trust, economy, statusEngagement, alerts };
}

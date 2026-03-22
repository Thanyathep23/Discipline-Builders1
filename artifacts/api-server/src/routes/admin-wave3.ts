/**
 * Admin Wave 3 Routes
 * A. Incident management
 * B. Advanced repair / reconciliation
 * C. Experiment controls lite
 * D. Enhanced diagnostics
 * E. Operator runbooks (static)
 * F. Support case workflow
 */

import { Router } from "express";
import { and, eq, desc, gte, lt, count, sum, asc, isNull, not } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  adminIncidentsTable,
  adminExperimentsTable,
  supportCasesTable,
  supportCaseNotesTable,
  auditLogTable,
  usersTable,
  rewardTransactionsTable,
  proofSubmissionsTable,
  userInventoryTable,
  shopItemsTable,
  userSkillsTable,
  skillXpEventsTable,
  userPremiumPacksTable,
  focusSessionsTable,
} from "@workspace/db";
import { generateId, requireAdmin } from "../lib/auth.js";

const router = Router();
router.use(requireAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// A. INCIDENT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /admin/incidents
 * List incidents, optionally filtered by status / severity / area.
 */
router.get("/incidents", async (req, res) => {
  try {
    const status    = req.query.status    as string | undefined;
    const severity  = req.query.severity  as string | undefined;
    const area      = req.query.area      as string | undefined;
    const limit     = Math.min(Number(req.query.limit  ?? 50), 100);
    const offset    = Number(req.query.offset ?? 0);

    const conditions: any[] = [];
    if (status)   conditions.push(eq(adminIncidentsTable.status,       status));
    if (severity) conditions.push(eq(adminIncidentsTable.severity,     severity));
    if (area)     conditions.push(eq(adminIncidentsTable.affectedArea, area));

    const [rows, total] = await Promise.all([
      db.select().from(adminIncidentsTable)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(adminIncidentsTable.lastSeen))
        .limit(limit).offset(offset),
      db.select({ n: count() }).from(adminIncidentsTable)
        .where(conditions.length ? and(...conditions) : undefined),
    ]);

    return res.json({
      total:     Number(total[0]?.n ?? 0),
      limit,
      offset,
      incidents: rows.map(r => ({
        ...r,
        firstSeen:  r.firstSeen?.toISOString(),
        lastSeen:   r.lastSeen?.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
        createdAt:  r.createdAt?.toISOString(),
        updatedAt:  r.updatedAt?.toISOString(),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/incidents
 * Manually create an incident.
 */
router.post("/incidents", async (req: any, res) => {
  try {
    const schema = z.object({
      type:              z.string().max(80),
      severity:          z.enum(["low", "medium", "high", "critical"]).default("medium"),
      summary:           z.string().max(500),
      affectedArea:      z.string().max(100),
      affectedCount:     z.number().int().min(0).optional(),
      linkedEntityId:    z.string().optional(),
      linkedEntityType:  z.string().optional(),
      owner:             z.string().optional(),
      notes:             z.string().max(2000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const { type, severity, summary, affectedArea, affectedCount, linkedEntityId, linkedEntityType, owner, notes } = parsed.data;

    const id = generateId();
    const now = new Date();
    await db.insert(adminIncidentsTable).values({
      id, type, severity, summary, affectedArea,
      affectedCount: affectedCount ?? null,
      linkedEntityId: linkedEntityId ?? null,
      linkedEntityType: linkedEntityType ?? null,
      owner: owner ?? null,
      notes: notes ?? null,
      status: "new",
      firstSeen: now, lastSeen: now,
      createdBy: req.user.id,
      createdAt: now, updatedAt: now,
    });

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: req.user.id, actorRole: req.user.role,
      action: "incident_created", targetId: id, targetType: "admin_incident",
      details: JSON.stringify({ type, severity, summary }),
    });

    return res.json({ id, status: "new" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/incidents/:id
 * Get a single incident.
 */
router.get("/incidents/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(adminIncidentsTable)
      .where(eq(adminIncidentsTable.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ error: "Incident not found" });
    return res.json({
      ...row,
      firstSeen:  row.firstSeen?.toISOString(),
      lastSeen:   row.lastSeen?.toISOString(),
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      createdAt:  row.createdAt?.toISOString(),
      updatedAt:  row.updatedAt?.toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /admin/incidents/:id
 * Update incident status, owner, notes, severity.
 */
router.put("/incidents/:id", async (req: any, res) => {
  try {
    const schema = z.object({
      status:    z.enum(["new","investigating","mitigated","resolved","ignored"]).optional(),
      severity:  z.enum(["low","medium","high","critical"]).optional(),
      owner:     z.string().max(100).optional(),
      notes:     z.string().max(2000).optional(),
      lastSeen:  z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const [existing] = await db.select().from(adminIncidentsTable)
      .where(eq(adminIncidentsTable.id, req.params.id)).limit(1);
    if (!existing) return res.status(404).json({ error: "Incident not found" });

    const upd: any = { updatedAt: new Date() };
    if (parsed.data.status !== undefined)   upd.status   = parsed.data.status;
    if (parsed.data.severity !== undefined) upd.severity = parsed.data.severity;
    if (parsed.data.owner !== undefined)    upd.owner    = parsed.data.owner;
    if (parsed.data.notes !== undefined)    upd.notes    = parsed.data.notes;
    if (parsed.data.status === "resolved")  upd.resolvedAt = new Date();
    if (parsed.data.lastSeen)               upd.lastSeen = new Date(parsed.data.lastSeen);

    await db.update(adminIncidentsTable).set(upd)
      .where(eq(adminIncidentsTable.id, req.params.id));

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: req.user.id, actorRole: req.user.role,
      action: "incident_updated", targetId: req.params.id, targetType: "admin_incident",
      details: JSON.stringify({ changes: parsed.data, previousStatus: existing.status }),
    });

    const [updated] = await db.select().from(adminIncidentsTable)
      .where(eq(adminIncidentsTable.id, req.params.id)).limit(1);
    return res.json({
      ...updated,
      firstSeen:  updated?.firstSeen?.toISOString(),
      lastSeen:   updated?.lastSeen?.toISOString(),
      resolvedAt: updated?.resolvedAt?.toISOString() ?? null,
      createdAt:  updated?.createdAt?.toISOString(),
      updatedAt:  updated?.updatedAt?.toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/incidents/detect
 * Auto-detect anomalies from live data and surface them as incident candidates.
 * Does NOT auto-create incidents — returns a list of candidate anomalies for operator review.
 */
router.post("/incidents/detect", async (req: any, res) => {
  try {
    const windowMinutes = Math.min(Number(req.query.windowMinutes ?? 60), 1440);
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const prevSince = new Date(Date.now() - windowMinutes * 2 * 60 * 1000);

    const [
      proofsCurrent, proofsPrev,
      approvedCurrent, approvedPrev,
      stuckProofsResult,
      largeRewards,
      suspendedResult,
      premiumMismatch,
    ] = await Promise.all([
      // proof submissions current vs prev window
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "proof_submitted"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "proof_submitted"), gte(auditLogTable.createdAt, prevSince), lt(auditLogTable.createdAt, since))),
      // approval rate current vs prev
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "proof_approved"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "proof_approved"), gte(auditLogTable.createdAt, prevSince), lt(auditLogTable.createdAt, since))),
      // stuck proofs
      db.select({ n: count() }).from(proofSubmissionsTable)
        .where(and(eq(proofSubmissionsTable.status, "reviewing"), lt(proofSubmissionsTable.updatedAt, new Date(Date.now() - 15 * 60 * 1000)))),
      // large reward transactions (>500 coins)
      db.select({ n: count(), total: sum(rewardTransactionsTable.amount) })
        .from(rewardTransactionsTable)
        .where(and(gte(rewardTransactionsTable.amount, 500), gte(rewardTransactionsTable.createdAt, since))),
      // recently suspended users
      db.select({ n: count() }).from(usersTable)
        .where(and(eq(usersTable.isActive, false), gte(usersTable.updatedAt, since))),
      // premium mismatch: isPremium=true but premiumExpiresAt in past
      db.select({ n: count() }).from(usersTable)
        .where(and(eq(usersTable.isPremium, true), lt(usersTable.premiumExpiresAt as any, new Date()))),
    ]);

    const candidates: any[] = [];

    // Proof submission spike
    const curProofs = Number(proofsCurrent[0]?.n ?? 0);
    const prevProofs = Number(proofsPrev[0]?.n ?? 0);
    if (prevProofs > 0 && curProofs < prevProofs * 0.3 && prevProofs >= 5) {
      candidates.push({
        type: "proof_submission_drop",
        severity: "high",
        summary: `Proof submission volume dropped ${Math.round((1 - curProofs / prevProofs) * 100)}% vs previous window`,
        affectedArea: "proofs",
        affectedCount: curProofs,
        suggestedAction: "Check AI judge service, proof upload pipeline, app availability",
      });
    }

    // Low approval rate spike
    const curApproved = Number(approvedCurrent[0]?.n ?? 0);
    const curApprovalRate = curProofs > 0 ? curApproved / curProofs : null;
    const prevApproved = Number(approvedPrev[0]?.n ?? 0);
    const prevApprovalRate = prevProofs > 0 ? prevApproved / prevProofs : null;
    if (curApprovalRate !== null && curApprovalRate < 0.2 && curProofs >= 5) {
      const change = prevApprovalRate !== null ? ` (was ${Math.round(prevApprovalRate * 100)}%)` : "";
      candidates.push({
        type: "proof_approval_rate_low",
        severity: curApprovalRate < 0.1 ? "critical" : "high",
        summary: `Proof approval rate is ${Math.round(curApprovalRate * 100)}%${change} — significantly below threshold`,
        affectedArea: "proofs",
        affectedCount: curProofs,
        suggestedAction: "Check AI judge, review recent proofs manually, verify prompt/threshold settings",
      });
    }

    // Stuck proofs
    const stuckCount = Number(stuckProofsResult[0]?.n ?? 0);
    if (stuckCount > 0) {
      candidates.push({
        type: "proof_stuck_reviewing",
        severity: stuckCount > 10 ? "high" : "medium",
        summary: `${stuckCount} proof(s) stuck in 'reviewing' for >15 minutes`,
        affectedArea: "proofs",
        affectedCount: stuckCount,
        suggestedAction: "Use stuck-proofs repair tool to reset affected proofs",
      });
    }

    // Large reward anomaly
    const largeCount = Number(largeRewards[0]?.n ?? 0);
    if (largeCount > 0) {
      candidates.push({
        type: "reward_large_transactions",
        severity: largeCount > 5 ? "high" : "medium",
        summary: `${largeCount} reward transaction(s) ≥500 coins in the current window`,
        affectedArea: "economy",
        affectedCount: largeCount,
        suggestedAction: "Review large transactions in Economy Console, check for abuse patterns",
      });
    }

    // Suspensions spike
    const suspCount = Number(suspendedResult[0]?.n ?? 0);
    if (suspCount > 5) {
      candidates.push({
        type: "user_suspension_spike",
        severity: "medium",
        summary: `${suspCount} users suspended in the last ${windowMinutes} minutes`,
        affectedArea: "users",
        affectedCount: suspCount,
        suggestedAction: "Check suspension triggers, review blocked_attempts table, verify automated rules",
      });
    }

    // Premium entitlement mismatch
    const mismatchCount = Number(premiumMismatch[0]?.n ?? 0);
    if (mismatchCount > 0) {
      candidates.push({
        type: "premium_entitlement_mismatch",
        severity: mismatchCount > 10 ? "high" : "medium",
        summary: `${mismatchCount} user(s) have isPremium=true but expired premiumExpiresAt`,
        affectedArea: "premium",
        affectedCount: mismatchCount,
        suggestedAction: "Use premium reconcile repair tool per affected user, or run batch review",
      });
    }

    return res.json({
      windowMinutes,
      generatedAt: new Date().toISOString(),
      candidateCount: candidates.length,
      candidates,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// B. ADVANCED REPAIR / RECONCILIATION
// ─────────────────────────────────────────────────────────────────────────────

function computeSkillLevel(totalXpEarned: number): { level: number; xp: number; xpToNextLevel: number } {
  let level = 1;
  let xpAccum = 0;
  while (true) {
    const threshold = 100 * level;
    if (xpAccum + threshold > totalXpEarned) break;
    xpAccum += threshold;
    level++;
    if (level >= 100) break;
  }
  const xp = totalXpEarned - xpAccum;
  const xpToNextLevel = 100 * level;
  return { level, xp, xpToNextLevel };
}

const repairBodySchema = z.object({
  reason: z.string().min(3).max(300),
  apply:  z.boolean().default(false),
});

/**
 * POST /admin/repair/player/:userId/wallet
 * Reconcile coinBalance vs sum of all reward transactions.
 * apply=true writes the fix; apply=false is a dry-run.
 */
router.post("/repair/player/:userId/wallet", async (req: any, res) => {
  try {
    const { userId } = req.params;
    const parsed = repairBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const { reason, apply } = parsed.data;

    const [user] = await db.select({ id: usersTable.id, coinBalance: usersTable.coinBalance })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const [txSum] = await db.select({ total: sum(rewardTransactionsTable.amount) })
      .from(rewardTransactionsTable).where(eq(rewardTransactionsTable.userId, userId));
    const expectedBalance = Number(txSum?.total ?? 0);
    const currentBalance  = user.coinBalance;
    const drift = currentBalance - expectedBalance;
    const hasDrift = drift !== 0;

    if (!hasDrift) {
      return res.json({ userId, hasDrift: false, currentBalance, expectedBalance, drift: 0, message: "Wallet is consistent — no repair needed." });
    }

    if (!apply) {
      return res.json({ userId, hasDrift: true, currentBalance, expectedBalance, drift, message: `Drift of ${drift} coins detected. Send apply=true to fix.` });
    }

    await db.update(usersTable).set({ coinBalance: Math.max(0, expectedBalance), updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: req.user.id, actorRole: req.user.role,
      action: "repair_wallet_reconciled", targetId: userId, targetType: "user",
      details: JSON.stringify({ previousBalance: currentBalance, newBalance: Math.max(0, expectedBalance), drift }),
      reason, result: "wallet_corrected",
    });

    return res.json({ userId, hasDrift: true, previousBalance: currentBalance, newBalance: Math.max(0, expectedBalance), drift, applied: true, message: "Wallet reconciled successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/repair/player/:userId/xp
 * Reconcile user XP vs sum of xpAmount from all reward transactions.
 */
router.post("/repair/player/:userId/xp", async (req: any, res) => {
  try {
    const { userId } = req.params;
    const parsed = repairBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const { reason, apply } = parsed.data;

    const [user] = await db.select({ id: usersTable.id, xp: usersTable.xp, level: usersTable.level })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const [txXp] = await db.select({ total: sum(rewardTransactionsTable.xpAmount) })
      .from(rewardTransactionsTable).where(eq(rewardTransactionsTable.userId, userId));
    const expectedXp = Number(txXp?.total ?? 0);
    const currentXp  = user.xp;
    const drift      = currentXp - expectedXp;
    const hasDrift   = Math.abs(drift) > 5;

    if (!hasDrift) {
      return res.json({ userId, hasDrift: false, currentXp, expectedXp, drift, message: "XP is consistent — no repair needed." });
    }

    if (!apply) {
      return res.json({ userId, hasDrift: true, currentXp, expectedXp, drift, message: `XP drift of ${drift} detected. Send apply=true to fix.` });
    }

    const newXp = Math.max(0, expectedXp);
    await db.update(usersTable).set({ xp: newXp, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: req.user.id, actorRole: req.user.role,
      action: "repair_xp_reconciled", targetId: userId, targetType: "user",
      details: JSON.stringify({ previousXp: currentXp, newXp, drift }),
      reason, result: "xp_corrected",
    });

    return res.json({ userId, hasDrift: true, previousXp: currentXp, newXp, drift, applied: true, message: "XP reconciled successfully." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/repair/player/:userId/skills
 * Recompute each user skill's XP, level, xpToNextLevel from skill_xp_events.
 */
router.post("/repair/player/:userId/skills", async (req: any, res) => {
  try {
    const { userId } = req.params;
    const parsed = repairBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const { reason, apply } = parsed.data;

    const [user] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Sum XP per skill from events
    const xpEvents = await db.select({
      skillId:      skillXpEventsTable.skillId,
      totalXp:      sum(skillXpEventsTable.xpAmount),
    }).from(skillXpEventsTable)
      .where(eq(skillXpEventsTable.userId, userId))
      .groupBy(skillXpEventsTable.skillId);

    const currentSkills = await db.select().from(userSkillsTable)
      .where(eq(userSkillsTable.userId, userId));

    const repairs: any[] = [];
    const hasDrift: string[] = [];

    for (const evRow of xpEvents) {
      const computed   = computeSkillLevel(Number(evRow.totalXp ?? 0));
      const existing   = currentSkills.find(s => s.skillId === evRow.skillId);
      const totalExpected = Number(evRow.totalXp ?? 0);

      if (!existing) continue;
      const driftXp = Math.abs(existing.totalXpEarned - totalExpected);
      if (driftXp > 5) {
        hasDrift.push(evRow.skillId);
        repairs.push({
          skillId:              evRow.skillId,
          previousTotalXp:     existing.totalXpEarned,
          newTotalXp:          totalExpected,
          previousLevel:       existing.level,
          newLevel:            computed.level,
        });
        if (apply) {
          await db.update(userSkillsTable).set({
            totalXpEarned: totalExpected,
            xp:            computed.xp,
            level:         computed.level,
            xpToNextLevel: computed.xpToNextLevel,
            updatedAt:     new Date(),
          }).where(and(eq(userSkillsTable.userId, userId), eq(userSkillsTable.skillId, evRow.skillId)));
        }
      }
    }

    if (apply && hasDrift.length > 0) {
      await db.insert(auditLogTable).values({
        id: generateId(), actorId: req.user.id, actorRole: req.user.role,
        action: "repair_skills_reconciled", targetId: userId, targetType: "user",
        details: JSON.stringify({ skills: repairs }),
        reason, result: `${repairs.length} skills corrected`,
      });
    }

    return res.json({
      userId,
      hasDrift: hasDrift.length > 0,
      driftSkills: hasDrift,
      repairs,
      applied: apply && hasDrift.length > 0,
      message: hasDrift.length === 0
        ? "Skills are consistent — no repair needed."
        : apply
          ? `${repairs.length} skill(s) reconciled successfully.`
          : `${repairs.length} skill(s) have drift. Send apply=true to fix.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/repair/player/:userId/inventory
 * Check for orphaned inventory items (item_id not in shop_items) and duplicate equipped slots.
 */
router.post("/repair/player/:userId/inventory", async (req: any, res) => {
  try {
    const { userId } = req.params;
    const parsed = repairBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const { reason, apply } = parsed.data;

    const [user] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const inventory = await db.select().from(userInventoryTable)
      .where(eq(userInventoryTable.userId, userId));

    const allItemIds = [...new Set(inventory.map(i => i.itemId))];
    const itemRows = allItemIds.length > 0
      ? await db.select({ id: shopItemsTable.id }).from(shopItemsTable)
          .where(eq(shopItemsTable.id, allItemIds[0]))
      : [];
    // More complete lookup — join all item IDs
    const validItemSet = new Set<string>();
    if (allItemIds.length > 0) {
      const found = await db.select({ id: shopItemsTable.id }).from(shopItemsTable);
      found.forEach(r => validItemSet.add(r.id));
    }

    // Find orphaned items
    const orphaned = inventory.filter(i => !validItemSet.has(i.itemId));

    // Find duplicate equipped slots
    const equippedBySlot: Record<string, typeof inventory> = {};
    for (const item of inventory.filter(i => i.isEquipped && i.displaySlot)) {
      const slot = item.displaySlot!;
      if (!equippedBySlot[slot]) equippedBySlot[slot] = [];
      equippedBySlot[slot].push(item);
    }
    const duplicateSlots = Object.entries(equippedBySlot)
      .filter(([, items]) => items.length > 1)
      .map(([slot, items]) => ({ slot, count: items.length, itemIds: items.map(i => i.id) }));

    const issues: any[] = [
      ...orphaned.map(o => ({ type: "orphaned_item", inventoryId: o.id, itemId: o.itemId })),
      ...duplicateSlots.map(d => ({ type: "duplicate_slot_equip", slot: d.slot, count: d.count, itemIds: d.itemIds })),
    ];

    if (!issues.length) {
      return res.json({ userId, hasDrift: false, issues: [], message: "Inventory is consistent — no repair needed." });
    }

    if (!apply) {
      return res.json({ userId, hasDrift: true, issues, message: `${issues.length} inventory issue(s) found. Send apply=true to fix.` });
    }

    // Apply: remove orphaned, fix duplicate slots (keep first, unequip others)
    for (const o of orphaned) {
      await db.delete(userInventoryTable).where(eq(userInventoryTable.id, o.id));
    }
    for (const [, items] of Object.entries(equippedBySlot).filter(([, i]) => i.length > 1)) {
      const [, ...extras] = items;
      for (const extra of extras) {
        await db.update(userInventoryTable).set({ isEquipped: false, displaySlot: null })
          .where(eq(userInventoryTable.id, extra.id));
      }
    }

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: req.user.id, actorRole: req.user.role,
      action: "repair_inventory_reconciled", targetId: userId, targetType: "user",
      details: JSON.stringify({ orphaned: orphaned.length, duplicateSlots: duplicateSlots.length }),
      reason, result: `${issues.length} issues fixed`,
    });

    return res.json({ userId, hasDrift: true, issues, applied: true, message: `${issues.length} inventory issue(s) fixed.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/repair/player/:userId/premium
 * Check whether user's isPremium flag is consistent with premiumExpiresAt.
 * If isPremium=true but expired, or isPremium=false but valid expiry exists — flag it.
 */
router.post("/repair/player/:userId/premium", async (req: any, res) => {
  try {
    const { userId } = req.params;
    const parsed = repairBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const { reason, apply } = parsed.data;

    const [user] = await db.select({
      id: usersTable.id,
      isPremium: usersTable.isPremium,
      premiumExpiresAt: usersTable.premiumExpiresAt,
    }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    const isExpired = user.premiumExpiresAt && user.premiumExpiresAt < now;
    const hasValidExpiry = user.premiumExpiresAt && user.premiumExpiresAt > now;

    // Case 1: isPremium=true but expiry is in the past
    const shouldBeFalse = user.isPremium && isExpired;
    // Case 2: isPremium=false but expiry is in the future (may still be active)
    const shouldBeTrue = !user.isPremium && hasValidExpiry;

    const hasDrift = !!(shouldBeFalse || shouldBeTrue);
    const expectedIsPremium = shouldBeTrue ? true : shouldBeFalse ? false : user.isPremium;

    if (!hasDrift) {
      return res.json({ userId, hasDrift: false, currentIsPremium: user.isPremium, premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null, message: "Premium state is consistent — no repair needed." });
    }

    if (!apply) {
      return res.json({
        userId, hasDrift: true,
        currentIsPremium: user.isPremium, expectedIsPremium,
        premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null,
        issue: shouldBeFalse ? "isPremium=true but premium has expired" : "isPremium=false but expiry is in the future",
        message: `Premium state mismatch. Send apply=true to fix.`,
      });
    }

    await db.update(usersTable).set({ isPremium: expectedIsPremium, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: req.user.id, actorRole: req.user.role,
      action: "repair_premium_reconciled", targetId: userId, targetType: "user",
      details: JSON.stringify({ previousIsPremium: user.isPremium, newIsPremium: expectedIsPremium, premiumExpiresAt: user.premiumExpiresAt }),
      reason, result: `isPremium set to ${expectedIsPremium}`,
    });

    return res.json({ userId, hasDrift: true, previousIsPremium: user.isPremium, newIsPremium: expectedIsPremium, applied: true, message: `Premium state fixed: isPremium → ${expectedIsPremium}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// C. EXPERIMENT CONTROLS LITE
// ─────────────────────────────────────────────────────────────────────────────

const EXPERIMENT_SURFACES = [
  "onboarding_copy",
  "nba_framing",
  "recommendation_card",
  "store_featured_layout",
  "premium_upgrade_copy",
  "comeback_mission_framing",
  "content_event_card",
  "room_car_showcase_cta",
] as const;

router.get("/experiments", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const conditions = status ? [eq(adminExperimentsTable.status, status)] : [];
    const rows = await db.select().from(adminExperimentsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(adminExperimentsTable.createdAt));
    return res.json({
      experiments: rows.map(r => ({
        ...r,
        variants:  JSON.parse(r.variants),
        startedAt: r.startedAt?.toISOString() ?? null,
        endedAt:   r.endedAt?.toISOString() ?? null,
        createdAt: r.createdAt?.toISOString(),
        updatedAt: r.updatedAt?.toISOString(),
      })),
      surfaces: EXPERIMENT_SURFACES,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/experiments", async (req: any, res) => {
  try {
    const schema = z.object({
      name:           z.string().min(2).max(100),
      surface:        z.string(),
      hypothesis:     z.string().max(500).default(""),
      variants:       z.array(z.object({
        id:           z.string(),
        name:         z.string(),
        description:  z.string().optional(),
        weight:       z.number().min(0).max(100).default(50),
      })).min(2).max(5),
      assignmentMode: z.enum(["user_id_mod", "random_sticky"]).default("user_id_mod"),
      rolloutPct:     z.number().int().min(1).max(100).default(100),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const { name, surface, hypothesis, variants, assignmentMode, rolloutPct } = parsed.data;

    const id = generateId();
    await db.insert(adminExperimentsTable).values({
      id, name, surface, hypothesis,
      variants: JSON.stringify(variants),
      assignmentMode, rolloutPct,
      status: "draft",
      createdBy: req.user.id,
    });

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: req.user.id, actorRole: req.user.role,
      action: "experiment_created", targetId: id, targetType: "admin_experiment",
      details: JSON.stringify({ name, surface, variantCount: variants.length }),
    });

    return res.json({ id, status: "draft" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/experiments/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(adminExperimentsTable)
      .where(eq(adminExperimentsTable.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ error: "Experiment not found" });
    return res.json({
      ...row,
      variants:  JSON.parse(row.variants),
      startedAt: row.startedAt?.toISOString() ?? null,
      endedAt:   row.endedAt?.toISOString() ?? null,
      createdAt: row.createdAt?.toISOString(),
      updatedAt: row.updatedAt?.toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.put("/experiments/:id", async (req: any, res) => {
  try {
    const schema = z.object({
      name:           z.string().min(2).max(100).optional(),
      hypothesis:     z.string().max(500).optional(),
      rolloutPct:     z.number().int().min(1).max(100).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const [row] = await db.select().from(adminExperimentsTable)
      .where(eq(adminExperimentsTable.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ error: "Experiment not found" });
    if (row.status === "completed") return res.status(400).json({ error: "Cannot edit a completed experiment" });

    const upd: any = { updatedAt: new Date() };
    if (parsed.data.name !== undefined)       upd.name       = parsed.data.name;
    if (parsed.data.hypothesis !== undefined) upd.hypothesis = parsed.data.hypothesis;
    if (parsed.data.rolloutPct !== undefined) upd.rolloutPct = parsed.data.rolloutPct;
    await db.update(adminExperimentsTable).set(upd).where(eq(adminExperimentsTable.id, req.params.id));

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: req.user.id, actorRole: req.user.role,
      action: "experiment_updated", targetId: req.params.id, targetType: "admin_experiment",
      details: JSON.stringify(parsed.data),
    });

    return res.json({ updated: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

async function transitionExperiment(id: string, newStatus: string, actorId: string, actorRole: string, action: string, extraFields: any = {}) {
  const now = new Date();
  await db.update(adminExperimentsTable)
    .set({ status: newStatus, updatedAt: now, ...extraFields })
    .where(eq(adminExperimentsTable.id, id));
  await db.insert(auditLogTable).values({
    id: generateId(), actorId, actorRole,
    action, targetId: id, targetType: "admin_experiment",
    details: JSON.stringify({ newStatus }),
  });
}

router.post("/experiments/:id/start", async (req: any, res) => {
  try {
    const [row] = await db.select().from(adminExperimentsTable)
      .where(eq(adminExperimentsTable.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ error: "Experiment not found" });
    if (row.status === "running") return res.status(400).json({ error: "Experiment already running" });
    if (row.status === "completed") return res.status(400).json({ error: "Experiment already completed" });
    await transitionExperiment(req.params.id, "running", req.user.id, req.user.role, "experiment_started", { startedAt: new Date() });
    return res.json({ status: "running" });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/experiments/:id/pause", async (req: any, res) => {
  try {
    const [row] = await db.select().from(adminExperimentsTable)
      .where(eq(adminExperimentsTable.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ error: "Experiment not found" });
    if (row.status !== "running") return res.status(400).json({ error: "Only running experiments can be paused" });
    await transitionExperiment(req.params.id, "paused", req.user.id, req.user.role, "experiment_paused");
    return res.json({ status: "paused" });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

router.post("/experiments/:id/stop", async (req: any, res) => {
  try {
    const [row] = await db.select().from(adminExperimentsTable)
      .where(eq(adminExperimentsTable.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ error: "Experiment not found" });
    if (row.status === "completed") return res.status(400).json({ error: "Experiment already completed" });
    await transitionExperiment(req.params.id, "completed", req.user.id, req.user.role, "experiment_stopped", { endedAt: new Date() });
    return res.json({ status: "completed" });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
});

/**
 * GET /admin/experiments/:id/metrics
 * Basic outcome metrics for a running experiment using existing telemetry.
 */
router.get("/experiments/:id/metrics", async (req, res) => {
  try {
    const [row] = await db.select().from(adminExperimentsTable)
      .where(eq(adminExperimentsTable.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ error: "Experiment not found" });

    const since = row.startedAt ?? new Date(0);
    const until = row.endedAt ?? new Date();

    // Use audit log to approximate engagement in experiment window
    const [proofSubmissions, proofApprovals, focusStarts, rewardTx] = await Promise.all([
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "proof_submitted"), gte(auditLogTable.createdAt, since), lt(auditLogTable.createdAt, until))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "proof_approved"), gte(auditLogTable.createdAt, since), lt(auditLogTable.createdAt, until))),
      db.select({ n: count() }).from(auditLogTable)
        .where(and(eq(auditLogTable.action, "focus_started"), gte(auditLogTable.createdAt, since), lt(auditLogTable.createdAt, until))),
      db.select({ n: count(), total: sum(rewardTransactionsTable.amount) })
        .from(rewardTransactionsTable)
        .where(and(gte(rewardTransactionsTable.createdAt, since), lt(rewardTransactionsTable.createdAt, until))),
    ]);

    const variants = JSON.parse(row.variants);
    const durationDays = (until.getTime() - since.getTime()) / 86400000;

    return res.json({
      experimentId: row.id,
      name:         row.name,
      surface:      row.surface,
      status:       row.status,
      startedAt:    row.startedAt?.toISOString() ?? null,
      endedAt:      row.endedAt?.toISOString() ?? null,
      durationDays: Math.round(durationDays * 10) / 10,
      rolloutPct:   row.rolloutPct,
      variants,
      windowMetrics: {
        proofSubmissions:  Number(proofSubmissions[0]?.n ?? 0),
        proofApprovals:    Number(proofApprovals[0]?.n ?? 0),
        approvalRate:      Number(proofSubmissions[0]?.n ?? 0) > 0
          ? Math.round((Number(proofApprovals[0]?.n ?? 0) / Number(proofSubmissions[0]?.n ?? 0)) * 100)
          : null,
        focusSessions:     Number(focusStarts[0]?.n ?? 0),
        rewardTransactions: Number(rewardTx[0]?.n ?? 0),
        totalCoinsGranted:  Number(rewardTx[0]?.total ?? 0),
      },
      note: "Metrics are system-wide for the experiment window, not per-variant. Per-variant tracking requires instrumentation in user flows.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// D. ENHANCED DIAGNOSTICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /admin/diagnostics
 * Enhanced diagnostics comparing current and previous window with severity flags.
 */
router.get("/diagnostics", async (req, res) => {
  try {
    const windowMinutes = Math.min(Number(req.query.windowMinutes ?? 60), 1440);
    const since     = new Date(Date.now() - windowMinutes * 60 * 1000);
    const prevSince = new Date(Date.now() - windowMinutes * 2 * 60 * 1000);

    const [
      proofsNow, proofsPrev,
      approvalsNow, approvalsPrev,
      signupsNow, signupsPrev,
      loginsNow, loginsPrev,
      focusNow, focusPrev,
      focusCompNow, focusCompPrev,
      stuckProofsResult,
      rewardsNow, rewardsPrev,
      suspendedNow,
      premiumMismatch,
      activeIncidents,
      openCases,
    ] = await Promise.all([
      db.select({ n: count() }).from(auditLogTable).where(and(eq(auditLogTable.action, "proof_submitted"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable).where(and(eq(auditLogTable.action, "proof_submitted"), gte(auditLogTable.createdAt, prevSince), lt(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable).where(and(eq(auditLogTable.action, "proof_approved"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable).where(and(eq(auditLogTable.action, "proof_approved"), gte(auditLogTable.createdAt, prevSince), lt(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable).where(and(eq(auditLogTable.action, "signup_completed"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable).where(and(eq(auditLogTable.action, "signup_completed"), gte(auditLogTable.createdAt, prevSince), lt(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable).where(and(eq(auditLogTable.action, "login_completed"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable).where(and(eq(auditLogTable.action, "login_completed"), gte(auditLogTable.createdAt, prevSince), lt(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable).where(and(eq(auditLogTable.action, "focus_started"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable).where(and(eq(auditLogTable.action, "focus_started"), gte(auditLogTable.createdAt, prevSince), lt(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable).where(and(eq(auditLogTable.action, "focus_completed"), gte(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(auditLogTable).where(and(eq(auditLogTable.action, "focus_completed"), gte(auditLogTable.createdAt, prevSince), lt(auditLogTable.createdAt, since))),
      db.select({ n: count() }).from(proofSubmissionsTable).where(and(eq(proofSubmissionsTable.status, "reviewing"), lt(proofSubmissionsTable.updatedAt, new Date(Date.now() - 15 * 60 * 1000)))),
      db.select({ n: count() }).from(rewardTransactionsTable).where(gte(rewardTransactionsTable.createdAt, since)),
      db.select({ n: count() }).from(rewardTransactionsTable).where(and(gte(rewardTransactionsTable.createdAt, prevSince), lt(rewardTransactionsTable.createdAt, since))),
      db.select({ n: count() }).from(usersTable).where(and(eq(usersTable.isActive, false), gte(usersTable.updatedAt, since))),
      db.select({ n: count() }).from(usersTable).where(and(eq(usersTable.isPremium, true), lt(usersTable.premiumExpiresAt as any, new Date()))),
      db.select({ n: count() }).from(adminIncidentsTable).where(eq(adminIncidentsTable.status, "investigating")),
      db.select({ n: count() }).from(supportCasesTable).where(eq(supportCasesTable.status, "open")),
    ]);

    function trend(now: number, prev: number) {
      if (prev === 0) return null;
      return Math.round(((now - prev) / prev) * 100);
    }

    const pNow  = Number(proofsNow[0]?.n ?? 0);
    const pPrev = Number(proofsPrev[0]?.n ?? 0);
    const aNow  = Number(approvalsNow[0]?.n ?? 0);
    const aPrev = Number(approvalsPrev[0]?.n ?? 0);
    const approvalRateNow  = pNow  > 0 ? Math.round((aNow  / pNow)  * 100) : null;
    const approvalRatePrev = pPrev > 0 ? Math.round((aPrev / pPrev) * 100) : null;
    const fNow  = Number(focusNow[0]?.n ?? 0);
    const fcNow = Number(focusCompNow[0]?.n ?? 0);
    const completionRateNow = fNow > 0 ? Math.round((fcNow / fNow) * 100) : null;
    const fPrev  = Number(focusPrev[0]?.n ?? 0);
    const fcPrev = Number(focusCompPrev[0]?.n ?? 0);
    const completionRatePrev = fPrev > 0 ? Math.round((fcPrev / fPrev) * 100) : null;

    const alerts: { severity: string; message: string; area: string }[] = [];
    if (approvalRateNow !== null && approvalRateNow < 30 && pNow >= 5)
      alerts.push({ severity: "high",   message: `Low proof approval rate: ${approvalRateNow}%`, area: "proofs" });
    const stuck = Number(stuckProofsResult[0]?.n ?? 0);
    if (stuck > 0)
      alerts.push({ severity: "medium", message: `${stuck} proof(s) stuck in reviewing >15m`, area: "proofs" });
    if (completionRateNow !== null && completionRateNow < 40 && fNow >= 5)
      alerts.push({ severity: "medium", message: `Low focus session completion: ${completionRateNow}%`, area: "sessions" });
    const mismatch = Number(premiumMismatch[0]?.n ?? 0);
    if (mismatch > 0)
      alerts.push({ severity: "medium", message: `${mismatch} users with expired premium still flagged isPremium=true`, area: "premium" });

    return res.json({
      windowMinutes,
      generatedAt: new Date().toISOString(),
      activeIncidents:    Number(activeIncidents[0]?.n ?? 0),
      openSupportCases:   Number(openCases[0]?.n ?? 0),
      alerts,
      metrics: {
        proofs: {
          submitted:       pNow,
          submittedTrend:  trend(pNow, pPrev),
          approvalRate:    approvalRateNow,
          approvalRatePrev,
          stuckReviewing:  stuck,
        },
        auth: {
          signups:     Number(signupsNow[0]?.n ?? 0),
          signupTrend: trend(Number(signupsNow[0]?.n ?? 0), Number(signupsPrev[0]?.n ?? 0)),
          logins:      Number(loginsNow[0]?.n ?? 0),
          loginTrend:  trend(Number(loginsNow[0]?.n ?? 0), Number(loginsPrev[0]?.n ?? 0)),
        },
        focus: {
          started:         fNow,
          startedTrend:    trend(fNow, fPrev),
          completionRate:  completionRateNow,
          completionRatePrev,
        },
        rewards: {
          transactions:     Number(rewardsNow[0]?.n ?? 0),
          transactionTrend: trend(Number(rewardsNow[0]?.n ?? 0), Number(rewardsPrev[0]?.n ?? 0)),
        },
        users: {
          suspendedInWindow: Number(suspendedNow[0]?.n ?? 0),
          premiumMismatch:   mismatch,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// E. OPERATOR RUNBOOKS (static — embedded in API for audit trail + discoverability)
// ─────────────────────────────────────────────────────────────────────────────

const RUNBOOKS: Record<string, { key: string; title: string; area: string; severity: string; summary: string; steps: string[]; tools: string[]; escalation?: string }> = {
  proof_pipeline_failure: {
    key: "proof_pipeline_failure", title: "Proof Pipeline Failure Spike",
    area: "proofs", severity: "high",
    summary: "Proof submissions are not being approved — AI judge may be down or timing out.",
    steps: [
      "Check Diagnostics screen: look at proof approval rate and stuck-reviewing count.",
      "Use Repair > Stuck Proofs to view proofs stuck in 'reviewing' for >15min.",
      "Use Support > Stuck Proofs repair to reset affected proofs to 'pending'.",
      "Verify AI judge is responding (check API server logs for OpenAI errors).",
      "If AI is down: activate kill switch 'kill_ai_judge_strict' to fall back to rule-based judge.",
      "Communicate to affected users if the outage lasted more than 30 minutes.",
    ],
    tools: ["Diagnostics screen", "Repair > Stuck Proofs", "Kill Switches screen", "API logs"],
    escalation: "If AI judge is unreachable for >2 hours, escalate to engineering.",
  },
  reward_mismatch: {
    key: "reward_mismatch", title: "Reward / Wallet Mismatch",
    area: "economy", severity: "medium",
    summary: "A user's coin balance does not match the sum of their reward transactions.",
    steps: [
      "Open Player Inspector for the affected user.",
      "Note current coinBalance and any unusual reward transactions in the Rewards tab.",
      "Use Repair > Wallet Reconcile (dry run first) to see the computed expected balance.",
      "Review the discrepancy — check if any transaction looks incorrect.",
      "If confident the sum is correct: apply wallet reconcile with a clear reason.",
      "Log the incident using the Incidents screen.",
    ],
    tools: ["Player Inspector", "Repair > Wallet Reconcile", "Economy Console > Anomalies", "Incidents screen"],
  },
  premium_entitlement_mismatch: {
    key: "premium_entitlement_mismatch", title: "Premium Entitlement Mismatch",
    area: "premium", severity: "medium",
    summary: "User's isPremium flag is out of sync with their premiumExpiresAt timestamp.",
    steps: [
      "Identify affected users — check Diagnostics for premium mismatch count.",
      "Open Player Inspector for each affected user.",
      "Use Repair > Premium Reconcile (dry run) to see the expected state.",
      "If user still has valid subscription: apply with apply=true and note reason.",
      "If user's premium is genuinely expired: apply to set isPremium=false.",
      "Verify with user if there is a billing dispute.",
    ],
    tools: ["Player Inspector", "Repair > Premium Reconcile", "Diagnostics screen"],
    escalation: "If related to billing: escalate to billing support.",
  },
  broken_live_event: {
    key: "broken_live_event", title: "Broken Live Event or Content Pack",
    area: "content", severity: "medium",
    summary: "A live event or content pack is showing errors, incorrect state, or not visible to users.",
    steps: [
      "Open Admin > Content Ops and find the affected event/pack.",
      "Check its status — if 'active' but broken, set to 'paused' immediately to limit exposure.",
      "Review the content/variant config for typos or invalid fields.",
      "If a content pack was incorrectly granted: identify affected users via Player Inspector.",
      "Fix the event config, validate, then re-activate.",
      "If the pack is permanently broken: archive it and create a replacement.",
    ],
    tools: ["Admin > Content Ops screen", "Admin > Live Ops screen", "Player Inspector"],
  },
  broken_catalog_item: {
    key: "broken_catalog_item", title: "Broken Catalog Item Visibility",
    area: "store", severity: "low",
    summary: "A shop item is not appearing correctly, is incorrectly priced, or showing to wrong users.",
    steps: [
      "Open Admin > Catalog and find the affected item.",
      "Check is_available flag, is_premium_only, rarity, and cost.",
      "If item is incorrectly showing: set is_available=false temporarily.",
      "Fix the item's fields and re-enable.",
      "Check Economy Console > Top Items to see if purchases were affected.",
      "If purchases were made at wrong price: log an incident and escalate.",
    ],
    tools: ["Admin > Catalog screen", "Economy Console", "Incidents screen"],
  },
  recommendation_anomaly: {
    key: "recommendation_anomaly", title: "Recommendation System Anomaly",
    area: "recommendations", severity: "medium",
    summary: "Recommendations are not showing, showing wrong content, or causing user complaints.",
    steps: [
      "Open Admin > Recommendations > Controls and check if any surface is disabled.",
      "Use the Rec Inspector tab to debug a specific affected user's recommendations.",
      "Check kill switches: 'kill_recommendations' should be OFF for normal operation.",
      "If a specific surface is broken: disable just that surface toggle.",
      "Review recommendation weights — over-aggressive store push may be causing complaints.",
      "Log an incident and note the affected surface and approximate user count.",
    ],
    tools: ["Admin > Recommendations screen", "Kill Switches screen", "Incidents screen"],
  },
  stuck_player_progression: {
    key: "stuck_player_progression", title: "Stuck Player Progression State",
    area: "players", severity: "low",
    summary: "A player's level, XP, or skill state appears frozen or inconsistent.",
    steps: [
      "Open Player Inspector for the affected player.",
      "Check XP, level, and skill values in the Overview tab.",
      "Use Repair > XP Reconcile to compare expected XP vs current.",
      "Use Repair > Skills Reconcile to check skill XP vs events.",
      "Apply repairs with clear reason notes.",
      "If skills look correct but level is wrong: XP reconcile should fix level computation.",
      "Check audit log for any admin actions that may have caused this.",
    ],
    tools: ["Player Inspector", "Repair > XP Reconcile", "Repair > Skills Reconcile", "Audit Log"],
  },
  store_purchase_inconsistency: {
    key: "store_purchase_inconsistency", title: "Store Purchase Inconsistency",
    area: "store", severity: "medium",
    summary: "User made a purchase but did not receive the item, or item shows as owned but coins were not deducted.",
    steps: [
      "Open Player Inspector > Rewards tab and look for the purchase transaction.",
      "Check Player Inspector > Overview: is the item in their inventory?",
      "If coins were deducted but item missing: use Repair > Inventory Reconcile to check orphaned entries.",
      "If item was granted but coins not deducted: this is a billing gap — log an incident.",
      "Add a support note on the player's record documenting the issue.",
      "Do not re-grant items manually without verifying the original transaction.",
    ],
    tools: ["Player Inspector", "Repair > Inventory Reconcile", "Economy Console", "Incidents screen"],
    escalation: "If coins were deducted without item delivery: may require manual item grant — escalate to engineering.",
  },
};

router.get("/runbooks", async (_req, res) => {
  return res.json({
    runbooks: Object.values(RUNBOOKS).map(r => ({
      key:      r.key,
      title:    r.title,
      area:     r.area,
      severity: r.severity,
      summary:  r.summary,
    })),
  });
});

router.get("/runbooks/:key", async (req, res) => {
  const rb = RUNBOOKS[req.params.key];
  if (!rb) return res.status(404).json({ error: "Runbook not found" });
  return res.json(rb);
});

// ─────────────────────────────────────────────────────────────────────────────
// F. SUPPORT CASE WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /admin/support/cases
 * List support cases with optional filters.
 */
router.get("/support/cases", async (req, res) => {
  try {
    const status   = req.query.status   as string | undefined;
    const priority = req.query.priority as string | undefined;
    const playerId = req.query.playerId as string | undefined;
    const limit    = Math.min(Number(req.query.limit  ?? 50), 100);
    const offset   = Number(req.query.offset ?? 0);

    const conditions: any[] = [];
    if (status)   conditions.push(eq(supportCasesTable.status,   status));
    if (priority) conditions.push(eq(supportCasesTable.priority, priority));
    if (playerId) conditions.push(eq(supportCasesTable.playerId, playerId));

    const [rows, total] = await Promise.all([
      db.select().from(supportCasesTable)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(desc(supportCasesTable.createdAt))
        .limit(limit).offset(offset),
      db.select({ n: count() }).from(supportCasesTable)
        .where(conditions.length ? and(...conditions) : undefined),
    ]);

    return res.json({
      total:  Number(total[0]?.n ?? 0),
      limit, offset,
      cases: rows.map(r => ({
        ...r,
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
        createdAt:  r.createdAt?.toISOString(),
        updatedAt:  r.updatedAt?.toISOString(),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/support/cases
 * Create a new support case for a player.
 */
router.post("/support/cases", async (req: any, res) => {
  try {
    const schema = z.object({
      playerId: z.string(),
      title:    z.string().min(3).max(200),
      priority: z.enum(["low", "normal", "high"]).default("normal"),
      category: z.string().max(80).optional(),
      note:     z.string().max(2000).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const { playerId, title, priority, category, note } = parsed.data;

    const [player] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.id, playerId)).limit(1);
    if (!player) return res.status(404).json({ error: "Player not found" });

    const caseId = generateId();
    const now = new Date();
    await db.insert(supportCasesTable).values({
      id: caseId, playerId, title, priority,
      category: category ?? null,
      status: "open",
      createdBy: req.user.id,
      createdAt: now, updatedAt: now,
    });

    if (note) {
      await db.insert(supportCaseNotesTable).values({
        id: generateId(), caseId, actorId: req.user.id,
        note, actionTaken: null, createdAt: now,
      });
    }

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: req.user.id, actorRole: req.user.role,
      action: "support_case_opened", targetId: caseId, targetType: "support_case",
      details: JSON.stringify({ playerId, title, priority }),
      reason: title, result: "case_created",
    });

    return res.json({ id: caseId, status: "open" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/support/cases/:id
 * Get a single support case with all notes.
 */
router.get("/support/cases/:id", async (req, res) => {
  try {
    const [sc] = await db.select().from(supportCasesTable)
      .where(eq(supportCasesTable.id, req.params.id)).limit(1);
    if (!sc) return res.status(404).json({ error: "Case not found" });

    const notes = await db.select().from(supportCaseNotesTable)
      .where(eq(supportCaseNotesTable.caseId, req.params.id))
      .orderBy(asc(supportCaseNotesTable.createdAt));

    return res.json({
      ...sc,
      resolvedAt: sc.resolvedAt?.toISOString() ?? null,
      createdAt:  sc.createdAt?.toISOString(),
      updatedAt:  sc.updatedAt?.toISOString(),
      notes: notes.map(n => ({ ...n, createdAt: n.createdAt?.toISOString() })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /admin/support/cases/:id
 * Update case status / priority.
 */
router.put("/support/cases/:id", async (req: any, res) => {
  try {
    const schema = z.object({
      status:   z.enum(["open","investigating","waiting","resolved"]).optional(),
      priority: z.enum(["low","normal","high"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const [sc] = await db.select().from(supportCasesTable)
      .where(eq(supportCasesTable.id, req.params.id)).limit(1);
    if (!sc) return res.status(404).json({ error: "Case not found" });

    const upd: any = { updatedAt: new Date() };
    if (parsed.data.status !== undefined)   upd.status   = parsed.data.status;
    if (parsed.data.priority !== undefined) upd.priority = parsed.data.priority;
    if (parsed.data.status === "resolved")  upd.resolvedAt = new Date();

    await db.update(supportCasesTable).set(upd)
      .where(eq(supportCasesTable.id, req.params.id));

    await db.insert(auditLogTable).values({
      id: generateId(), actorId: req.user.id, actorRole: req.user.role,
      action: "support_case_updated", targetId: req.params.id, targetType: "support_case",
      details: JSON.stringify({ changes: parsed.data, previousStatus: sc.status }),
    });

    return res.json({ updated: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/support/cases/:id/notes
 * Add a note to a support case.
 */
router.post("/support/cases/:id/notes", async (req: any, res) => {
  try {
    const schema = z.object({
      note:        z.string().min(1).max(2000),
      actionTaken: z.string().max(200).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });

    const [sc] = await db.select({ id: supportCasesTable.id }).from(supportCasesTable)
      .where(eq(supportCasesTable.id, req.params.id)).limit(1);
    if (!sc) return res.status(404).json({ error: "Case not found" });

    const noteId = generateId();
    await db.insert(supportCaseNotesTable).values({
      id: noteId, caseId: req.params.id, actorId: req.user.id,
      note: parsed.data.note,
      actionTaken: parsed.data.actionTaken ?? null,
      createdAt: new Date(),
    });

    await db.update(supportCasesTable).set({ updatedAt: new Date() })
      .where(eq(supportCasesTable.id, req.params.id));

    return res.json({ noteId, added: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /admin/support/player/:userId/cases
 * All support cases for a specific player (most recent first).
 */
router.get("/support/player/:userId/cases", async (req, res) => {
  try {
    const rows = await db.select().from(supportCasesTable)
      .where(eq(supportCasesTable.playerId, req.params.userId))
      .orderBy(desc(supportCasesTable.createdAt))
      .limit(20);
    return res.json({
      playerId: req.params.userId,
      cases: rows.map(r => ({
        ...r,
        resolvedAt: r.resolvedAt?.toISOString() ?? null,
        createdAt:  r.createdAt?.toISOString(),
        updatedAt:  r.updatedAt?.toISOString(),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

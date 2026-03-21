// Phase 19 — Admin Premium / Offer Controls
import { Router } from "express";
import {
  db, usersTable, premiumPacksTable, userPremiumPacksTable, purchaseRecordsTable,
  shopItemsTable, auditLogTable,
} from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";
import { requireAdmin, generateId } from "../lib/auth.js";
import { z } from "zod";

const router = Router();
router.use(requireAdmin);

// ─── GET /admin/premium/overview — premium system summary ─────────────────────
router.get("/overview", async (req: any, res) => {
  try {
    const [{ premiumCount }] = await db
      .select({ premiumCount: count() })
      .from(usersTable)
      .where(eq(usersTable.isPremium, true));

    const [{ totalPurchases }] = await db
      .select({ totalPurchases: count() })
      .from(purchaseRecordsTable);

    const [{ totalPackGrants }] = await db
      .select({ totalPackGrants: count() })
      .from(userPremiumPacksTable);

    const [{ premiumItemCount }] = await db
      .select({ premiumItemCount: count() })
      .from(shopItemsTable)
      .where(eq(shopItemsTable.isPremiumOnly, true));

    const recentPurchases = await db
      .select()
      .from(purchaseRecordsTable)
      .orderBy(desc(purchaseRecordsTable.createdAt))
      .limit(10);

    const packs = await db.select().from(premiumPacksTable).orderBy(premiumPacksTable.sortOrder);

    return res.json({
      stats: {
        premiumUsers: Number(premiumCount),
        totalPurchases: Number(totalPurchases),
        totalPackGrants: Number(totalPackGrants),
        premiumOnlyItems: Number(premiumItemCount),
      },
      recentPurchases,
      packs,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /admin/premium/users — list premium users ────────────────────────────
router.get("/users", async (req: any, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        email: usersTable.email,
        isPremium: usersTable.isPremium,
        premiumGrantedAt: usersTable.premiumGrantedAt,
        premiumExpiresAt: usersTable.premiumExpiresAt,
        level: usersTable.level,
        prestigeTier: usersTable.prestigeTier,
      })
      .from(usersTable)
      .where(eq(usersTable.isPremium, true))
      .orderBy(desc(usersTable.premiumGrantedAt))
      .limit(100);

    return res.json({ users, total: users.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /admin/premium/grant — grant premium to a user ──────────────────────
router.post("/grant", async (req: any, res) => {
  try {
    const actor = (req as any).user;
    const schema = z.object({
      userId: z.string().min(1),
      durationDays: z.number().int().min(1).max(3650).default(365),
      reason: z.string().max(200).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    }

    const { userId, durationDays, reason } = parsed.data;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const [target] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!target) return res.status(404).json({ error: "User not found" });

    await db.update(usersTable).set({
      isPremium: true,
      premiumGrantedAt: now,
      premiumExpiresAt: expiresAt,
      updatedAt: now,
    }).where(eq(usersTable.id, userId));

    await db.insert(purchaseRecordsTable).values({
      id: generateId(),
      userId,
      productType: "premium_membership",
      productId: "admin_grant",
      amountCents: 0,
      currency: "usd",
      provider: "simulated",
      providerRef: `admin_${generateId()}`,
      status: "completed",
      metadata: JSON.stringify({ durationDays, reason: reason ?? "admin_grant", grantedBy: actor.id }),
    });

    await db.insert(auditLogTable).values({
      id: generateId(),
      userId: actor.id,
      action: "admin_premium_grant",
      details: JSON.stringify({ targetUserId: userId, durationDays, reason, expiresAt: expiresAt.toISOString() }),
      createdAt: now,
    });

    return res.json({ success: true, userId, expiresAt: expiresAt.toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /admin/premium/revoke — revoke premium from a user ──────────────────
router.post("/revoke", async (req: any, res) => {
  try {
    const actor = (req as any).user;
    const schema = z.object({
      userId: z.string().min(1),
      reason: z.string().max(200).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    }

    const { userId, reason } = parsed.data;
    const now = new Date();

    await db.update(usersTable).set({
      isPremium: false,
      premiumExpiresAt: now,
      updatedAt: now,
    }).where(eq(usersTable.id, userId));

    await db.insert(auditLogTable).values({
      id: generateId(),
      userId: actor.id,
      action: "admin_premium_revoke",
      details: JSON.stringify({ targetUserId: userId, reason: reason ?? "admin_revoke" }),
      createdAt: now,
    });

    return res.json({ success: true, userId });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /admin/premium/packs — list all packs with grant counts ───────────────
router.get("/packs", async (req: any, res) => {
  try {
    const packs = await db.select().from(premiumPacksTable).orderBy(premiumPacksTable.sortOrder);

    const grantCounts: Record<string, number> = {};
    for (const pack of packs) {
      const [{ n }] = await db.select({ n: count() }).from(userPremiumPacksTable).where(eq(userPremiumPacksTable.packId, pack.id));
      grantCounts[pack.id] = Number(n);
    }

    return res.json({
      packs: packs.map(p => ({ ...p, grantCount: grantCounts[p.id] ?? 0 })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /admin/premium/packs/:packId — update pack (activate/deactivate/feature) ──
router.patch("/packs/:packId", async (req: any, res) => {
  try {
    const actor = (req as any).user;
    const { packId } = req.params;
    const schema = z.object({
      isActive: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(600).optional(),
      tagline: z.string().max(200).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    }

    const [existing] = await db.select().from(premiumPacksTable).where(eq(premiumPacksTable.id, packId)).limit(1);
    if (!existing) return res.status(404).json({ error: "Pack not found" });

    await db.update(premiumPacksTable).set(parsed.data).where(eq(premiumPacksTable.id, packId));

    await db.insert(auditLogTable).values({
      id: generateId(),
      userId: actor.id,
      action: "admin_premium_pack_update",
      details: JSON.stringify({ packId, changes: parsed.data }),
      createdAt: new Date(),
    });

    const [updated] = await db.select().from(premiumPacksTable).where(eq(premiumPacksTable.id, packId)).limit(1);
    return res.json({ pack: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /admin/premium/items — list shop items with premium-only flag ─────────
router.get("/items", async (req: any, res) => {
  try {
    const items = await db
      .select()
      .from(shopItemsTable)
      .where(eq(shopItemsTable.isAvailable, true));

    return res.json({
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        category: i.category,
        rarity: i.rarity,
        cost: i.cost,
        isPremiumOnly: i.isPremiumOnly,
        isLimited: i.isLimited,
        isExclusive: i.isExclusive,
        isAvailable: i.isAvailable,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /admin/premium/items/:itemId — mark item premium-only or toggle availability ──
router.patch("/items/:itemId", async (req: any, res) => {
  try {
    const actor = (req as any).user;
    const { itemId } = req.params;
    const schema = z.object({
      isPremiumOnly: z.boolean().optional(),
      isAvailable: z.boolean().optional(),
      isLimited: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Validation failed", details: parsed.error.message });
    }

    const [existing] = await db.select().from(shopItemsTable).where(eq(shopItemsTable.id, itemId)).limit(1);
    if (!existing) return res.status(404).json({ error: "Item not found" });

    await db.update(shopItemsTable).set(parsed.data).where(eq(shopItemsTable.id, itemId));

    await db.insert(auditLogTable).values({
      id: generateId(),
      userId: actor.id,
      action: "admin_offer_item_update",
      details: JSON.stringify({ itemId, changes: parsed.data }),
      createdAt: new Date(),
    });

    const [updated] = await db.select().from(shopItemsTable).where(eq(shopItemsTable.id, itemId)).limit(1);
    return res.json({ item: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /admin/premium/purchases — all purchase records ─────────────────────
router.get("/purchases", async (req: any, res) => {
  try {
    const records = await db
      .select()
      .from(purchaseRecordsTable)
      .orderBy(desc(purchaseRecordsTable.createdAt))
      .limit(100);

    return res.json({ purchases: records, total: records.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

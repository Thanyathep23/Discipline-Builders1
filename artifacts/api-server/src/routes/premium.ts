// Phase 19 — Premium / Monetization routes
import { Router } from "express";
import {
  db, usersTable, premiumPacksTable, userPremiumPacksTable, purchaseRecordsTable,
  shopItemsTable, userInventoryTable, auditLogTable,
} from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth, requireAdmin, generateId } from "../lib/auth.js";
import { z } from "zod";
import { isKilled } from "../lib/kill-switches.js";

const router = Router();

// ─── Premium pack seed data ────────────────────────────────────────────────────
const PREMIUM_PACKS = [
  {
    id: "pack-focus-mastery",
    name: "Focus Mastery Pack",
    tagline: "Elite curated deep-work missions and environments",
    description: "A structured 30-day program of advanced deep-work challenges. Unlock curated focus missions, the Focus Shrine premium theme, and the Elite Focus cosmetic reward. Designed for operators who demand more from their concentration.",
    icon: "eye-outline",
    category: "challenge",
    accessModel: "premium_required",
    coinPrice: 0,
    isFeatured: true,
    sortOrder: 10,
  },
  {
    id: "pack-trading-pro",
    name: "Trading Review Pro Pack",
    tagline: "Advanced trading discipline missions and review frameworks",
    description: "Precision trading review missions, journaling challenges, and risk discipline tasks built for serious traders. Includes the Command Terminal theme access and Operator Sigil reward path.",
    icon: "trending-up-outline",
    category: "challenge",
    accessModel: "premium_required",
    coinPrice: 0,
    isFeatured: true,
    sortOrder: 20,
  },
  {
    id: "pack-recovery-rebuild",
    name: "Recovery Rebuild Pack",
    tagline: "Structured comeback arcs and resilience missions",
    description: "A curated set of recovery-focused missions for operators returning after a break or setback. Builds momentum through progressive discipline challenges, with exclusive comeback cosmetics.",
    icon: "refresh-outline",
    category: "challenge",
    accessModel: "premium_required",
    coinPrice: 0,
    isFeatured: false,
    sortOrder: 30,
  },
  {
    id: "pack-prestige-sprint",
    name: "Prestige Sprint Pack",
    tagline: "High-intensity prestige acceleration missions",
    description: "An elite set of high-intensity challenges designed to accelerate your prestige arc. Access exclusive Prestige Seal fast-tracks and the War Room environment. For operators who are ready to compress their growth.",
    icon: "flame-outline",
    category: "prestige",
    accessModel: "premium_required",
    coinPrice: 0,
    isFeatured: true,
    sortOrder: 40,
  },
  {
    id: "pack-deep-work-elite",
    name: "Deep Work Elite Pack",
    tagline: "The definitive operator deep-work program",
    description: "The most advanced focus and discipline program in DisciplineOS. 45 days of curated elite missions, premium environments, and exclusive showcase cosmetics. Reserved for operators who have proven baseline consistency.",
    icon: "shield-checkmark-outline",
    category: "challenge",
    accessModel: "premium_required",
    coinPrice: 0,
    isFeatured: false,
    sortOrder: 50,
  },
];

async function seedPremiumPacks() {
  for (const pack of PREMIUM_PACKS) {
    await db.insert(premiumPacksTable).values({
      ...pack,
      isActive: true,
    }).onConflictDoNothing();
  }
}

// ─── Helper: check active premium (server-side) ────────────────────────────────
export async function checkUserPremium(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ isPremium: usersTable.isPremium, premiumExpiresAt: usersTable.premiumExpiresAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) return false;
  if (!user.isPremium) return false;
  if (user.premiumExpiresAt && user.premiumExpiresAt < new Date()) return false;
  return true;
}

// ─── GET /premium/status — current user's premium state ──────────────────────
router.get("/status", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const [user] = await db
      .select({
        isPremium: usersTable.isPremium,
        premiumGrantedAt: usersTable.premiumGrantedAt,
        premiumExpiresAt: usersTable.premiumExpiresAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) return res.status(404).json({ error: "User not found" });

    const isActive =
      user.isPremium &&
      (!user.premiumExpiresAt || user.premiumExpiresAt > new Date());

    // Owned packs
    const ownedPacks = await db
      .select({ packId: userPremiumPacksTable.packId, grantedAt: userPremiumPacksTable.grantedAt })
      .from(userPremiumPacksTable)
      .where(eq(userPremiumPacksTable.userId, userId));

    return res.json({
      isPremium: isActive,
      premiumGrantedAt: user.premiumGrantedAt?.toISOString() ?? null,
      premiumExpiresAt: user.premiumExpiresAt?.toISOString() ?? null,
      ownedPackIds: ownedPacks.map(p => p.packId),
      benefits: isActive ? [
        "premium_cosmetics",
        "premium_themes",
        "premium_packs",
        "premium_share_cards",
        "premium_export_formats",
        "expanded_circle_tools",
        "advanced_insights",
      ] : [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /premium/offers — public offer listing ────────────────────────────────
router.get("/offers", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const isPremium = await checkUserPremium(userId);

    await seedPremiumPacks();
    const packs = await db
      .select()
      .from(premiumPacksTable)
      .where(eq(premiumPacksTable.isActive, true))
      .orderBy(asc(premiumPacksTable.sortOrder));

    const ownedPacks = await db
      .select({ packId: userPremiumPacksTable.packId })
      .from(userPremiumPacksTable)
      .where(eq(userPremiumPacksTable.userId, userId));
    const ownedSet = new Set(ownedPacks.map(p => p.packId));

    // Premium-only shop items
    const premiumItems = await db
      .select()
      .from(shopItemsTable)
      .where(and(eq(shopItemsTable.isPremiumOnly, true), eq(shopItemsTable.isAvailable, true)));

    return res.json({
      membershipTier: isPremium ? "premium" : "free",
      membershipBenefits: {
        free: [
          "Full core mission loop",
          "All 6 skill disciplines",
          "Standard marketplace items",
          "Proof submission & validation",
          "Quest chains & prestige",
          "Circles & community basics",
        ],
        premium: [
          "All free tier features",
          "Exclusive premium room themes",
          "Premium prestige cosmetics & titles",
          "All premium content packs",
          "Premium share card styles",
          "Enhanced analytics insights",
          "Advanced circle & community tools",
          "Priority access to limited drops",
          "Premium export formats",
        ],
      },
      packs: packs.map(p => ({
        ...p,
        owned: ownedSet.has(p.id),
        accessible: isPremium || p.accessModel === "free",
      })),
      premiumOnlyItems: premiumItems.map(i => ({
        id: i.id,
        name: i.name,
        description: i.description,
        icon: i.icon,
        rarity: i.rarity,
        category: i.category,
        cost: i.cost,
        accessible: isPremium,
      })),
      pricingHint: {
        monthly: { label: "$9.99/mo", description: "Full premium access, cancel anytime" },
        annual: { label: "$79.99/yr", description: "Best value — 2 months free" },
        note: "Billing is a simulation in this build. Real payment integration is a TODO boundary.",
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /premium/activate — purchase simulation (billing TODO) ──────────────
router.post("/activate", requireAuth, async (req: any, res) => {
  try {
    // Kill-switch: block premium purchases if disabled
    if (await isKilled("kill_premium_purchases")) {
      return res.status(503).json({ error: "Premium purchases are temporarily unavailable. Please try again later." });
    }
    const userId = req.user.id;
    const schema = z.object({
      plan: z.enum(["monthly", "annual"]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid plan. Use 'monthly' or 'annual'." });
    }

    const { plan } = parsed.data;
    const now = new Date();
    const expiresAt = new Date(now);
    if (plan === "annual") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    }

    await db.update(usersTable).set({
      isPremium: true,
      premiumGrantedAt: now,
      premiumExpiresAt: expiresAt,
      updatedAt: now,
    }).where(eq(usersTable.id, userId));

    // Record purchase (simulated)
    await db.insert(purchaseRecordsTable).values({
      id: generateId(),
      userId,
      productType: "premium_membership",
      productId: `premium_${plan}`,
      amountCents: plan === "annual" ? 7999 : 999,
      currency: "usd",
      provider: "simulated",
      providerRef: `sim_${generateId()}`,
      status: "completed",
      metadata: JSON.stringify({ plan, simulatedAt: now.toISOString() }),
    });

    // Auto-grant all premium packs
    await seedPremiumPacks();
    const allPacks = await db.select({ id: premiumPacksTable.id }).from(premiumPacksTable)
      .where(eq(premiumPacksTable.isActive, true));

    const existingPacks = await db.select({ packId: userPremiumPacksTable.packId })
      .from(userPremiumPacksTable)
      .where(eq(userPremiumPacksTable.userId, userId));
    const existingSet = new Set(existingPacks.map(p => p.packId));

    for (const pack of allPacks) {
      if (!existingSet.has(pack.id)) {
        await db.insert(userPremiumPacksTable).values({
          id: generateId(),
          userId,
          packId: pack.id,
          grantedBy: "premium_membership",
        }).onConflictDoNothing();
      }
    }

    // Audit
    await db.insert(auditLogTable).values({
      id: generateId(),
      actorId: userId,
      actorRole: "user",
      action: "premium_activated",
      targetId: userId,
      targetType: "user",
      details: JSON.stringify({ plan, expiresAt: expiresAt.toISOString() }),
    });

    return res.json({
      success: true,
      isPremium: true,
      plan,
      premiumGrantedAt: now.toISOString(),
      premiumExpiresAt: expiresAt.toISOString(),
      message: "Premium activated (simulated). Real billing integration is a TODO boundary.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /premium/packs — browse all packs with access state ──────────────────
router.get("/packs", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    await seedPremiumPacks();

    const isPremium = await checkUserPremium(userId);

    const packs = await db
      .select()
      .from(premiumPacksTable)
      .where(eq(premiumPacksTable.isActive, true))
      .orderBy(asc(premiumPacksTable.sortOrder));

    const ownedPacks = await db
      .select({ packId: userPremiumPacksTable.packId, grantedAt: userPremiumPacksTable.grantedAt })
      .from(userPremiumPacksTable)
      .where(eq(userPremiumPacksTable.userId, userId));
    const ownedMap = new Map(ownedPacks.map(p => [p.packId, p]));

    return res.json({
      isPremium,
      packs: packs.map(p => ({
        ...p,
        owned: ownedMap.has(p.id),
        accessible: isPremium || p.accessModel === "free",
        grantedAt: ownedMap.get(p.id)?.grantedAt?.toISOString() ?? null,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /premium/entitlement/:feature — single entitlement check ─────────────
router.get("/entitlement/:feature", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { feature } = req.params;
    const isPremium = await checkUserPremium(userId);

    const PREMIUM_FEATURES = new Set([
      "premium_cosmetics",
      "premium_themes",
      "premium_packs",
      "premium_share_cards",
      "premium_export_formats",
      "expanded_circle_tools",
      "advanced_insights",
      "premium_room_themes",
      "premium_prestige_markers",
    ]);

    const allowed = !PREMIUM_FEATURES.has(feature) || isPremium;

    return res.json({
      feature,
      allowed,
      isPremium,
      reason: allowed ? "access_granted" : "premium_required",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /premium/purchases — current user purchase history ───────────────────
router.get("/purchases", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const records = await db
      .select()
      .from(purchaseRecordsTable)
      .where(eq(purchaseRecordsTable.userId, userId))
      .orderBy(desc(purchaseRecordsTable.createdAt))
      .limit(50);

    return res.json({ purchases: records });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

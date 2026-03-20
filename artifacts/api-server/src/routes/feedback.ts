import { Router } from "express";
import { db, userFeedbackTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, generateId } from "../lib/auth.js";
import { trackEvent, Events } from "../lib/telemetry.js";

const router = Router();

const VALID_CATEGORIES = [
  "confusing",
  "too_hard",
  "too_easy",
  "proof_annoying",
  "reward_unfair",
  "bug",
  "favorite_part",
  "other",
] as const;

const feedbackSchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  note: z.string().max(1000).optional(),
  context: z.string().max(200).optional(), // e.g. "proof_screen", "mission_screen"
});

/**
 * POST /api/feedback
 * Submit lightweight in-app feedback.
 */
router.post("/", requireAuth, async (req: any, res) => {
  try {
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid feedback", details: parsed.error.message });
    }

    const userId = req.user.id;
    const { category, note, context } = parsed.data;

    await db.insert(userFeedbackTable).values({
      id: generateId(),
      userId,
      category,
      note: note ?? null,
      context: context ?? null,
    });

    await trackEvent(Events.FEEDBACK_SUBMITTED, userId, { category, context });

    return res.json({ status: "received", message: "Thanks for your feedback." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

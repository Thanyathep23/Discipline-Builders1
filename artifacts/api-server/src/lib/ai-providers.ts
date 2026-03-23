import crypto from "crypto";
import { db, proofSubmissionsTable } from "@workspace/db";
import { eq, and, gt, ne } from "drizzle-orm";

export interface ProviderConfig {
  model: string;
  apiKey: string | undefined;
  costPer1MTokens: number;
  freeTierPerDay?: number;
  supportsVision: boolean;
  available: boolean;
}

export const AI_PROVIDERS: Record<string, ProviderConfig> = {
  gemini_flash: {
    model: "gemini-1.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    costPer1MTokens: 0.075,
    freeTierPerDay: 1500,
    supportsVision: true,
    available: !!process.env.GEMINI_API_KEY,
  },
  groq: {
    model: "llama-3.1-8b-instant",
    apiKey: process.env.GROQ_API_KEY,
    costPer1MTokens: 0.05,
    freeTierPerDay: 14400,
    supportsVision: false,
    available: !!process.env.GROQ_API_KEY,
  },
  openai_mini: {
    model: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
    costPer1MTokens: 0.15,
    supportsVision: true,
    available: !!process.env.OPENAI_API_KEY,
  },
  openai_full: {
    model: "gpt-4o",
    apiKey: process.env.OPENAI_API_KEY,
    costPer1MTokens: 2.5,
    supportsVision: true,
    available: !!process.env.OPENAI_API_KEY,
  },
};

export interface ProofSubmission {
  summary: string | null;
  files?: Array<{ name: string; type: string; sizeKb: number; extractedText?: string; mimeType?: string }>;
  linkUrl?: string;
  links?: string[];
  userId: string;
}

export interface PreScreenResult {
  verdict?: "rejected" | "followup_required";
  reason?: string;
  skipAI: boolean;
  trustScoreDelta?: number;
  feedback?: string;
}

export function hashText(text: string): string {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex");
}

const GENERIC_PHRASES = [
  "done", "finished", "completed", "did it",
  "task done", "i did this", "complete",
  "i finished", "done!", "finished!", "ok done",
  "i completed the task", "yes", "all done",
  "task complete",
];

export async function preScreen(proof: ProofSubmission, categoryMinTextLength?: number, excludeProofId?: string, isFollowupRejudge?: boolean): Promise<PreScreenResult> {
  const hasText = (proof.summary ?? "").trim().length > 0;
  const hasFiles = (proof.files?.length ?? 0) > 0;
  const hasLinks = (proof.links?.length ?? 0) > 0 || !!proof.linkUrl;

  if (!hasText && !hasFiles && !hasLinks && !isFollowupRejudge) {
    return {
      verdict: "rejected",
      reason: "no_proof_submitted",
      skipAI: true,
      feedback: "Please provide evidence of your work before submitting.",
    };
  }

  const trimmed = (proof.summary ?? "").trim();

  if (!isFollowupRejudge && trimmed.length > 0 && trimmed.length < 15) {
    return {
      verdict: "followup_required",
      reason: "too_short",
      skipAI: true,
      feedback: "Your summary is too brief. Please describe what you actually did.",
    };
  }

  const normalized = trimmed.toLowerCase();
  if (!isFollowupRejudge && normalized && GENERIC_PHRASES.includes(normalized)) {
    return {
      verdict: "followup_required",
      reason: "too_generic",
      skipAI: true,
      feedback: "This doesn't tell us what you actually did. Please be specific.",
    };
  }

  if (trimmed.length > 0) {
    const textHash = hashText(trimmed);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    try {
      const conditions = [
        eq(proofSubmissionsTable.userId, proof.userId),
        eq(proofSubmissionsTable.textHash, textHash),
        gt(proofSubmissionsTable.createdAt, thirtyDaysAgo),
      ];
      if (excludeProofId) {
        conditions.push(ne(proofSubmissionsTable.id, excludeProofId));
      }
      const duplicates = await db
        .select({ id: proofSubmissionsTable.id })
        .from(proofSubmissionsTable)
        .where(and(...conditions))
        .limit(1);

      if (duplicates.length > 0) {
        return {
          verdict: "rejected",
          reason: "duplicate_submission",
          skipAI: true,
          trustScoreDelta: -0.15,
          feedback: "This is identical to a previous submission.",
        };
      }
    } catch (err) {
      console.error("[PreScreen] Duplicate check DB error:", err);
    }
  }

  if (categoryMinTextLength && categoryMinTextLength > 0 && trimmed.length < categoryMinTextLength) {
    return {
      verdict: "followup_required",
      reason: "below_category_minimum",
      skipAI: true,
      feedback: `This category expects more detail. Please provide at least ${categoryMinTextLength} characters describing your work.`,
    };
  }

  return { skipAI: false };
}

export function selectProvider(proof: ProofSubmission): string {
  const hasImage = proof.files?.some((f) =>
    f.mimeType?.startsWith("image/") || f.type?.startsWith("image/"),
  );

  if (hasImage) {
    if (AI_PROVIDERS.gemini_flash.available) return "gemini_flash";
    if (AI_PROVIDERS.openai_mini.available) return "openai_mini";
    return "rules";
  }

  if (AI_PROVIDERS.groq.available) return "groq";
  if (AI_PROVIDERS.gemini_flash.available) return "gemini_flash";
  if (AI_PROVIDERS.openai_mini.available) return "openai_mini";

  return "rules";
}

interface CostEntry {
  provider: string;
  estimatedTokens: number;
  estimatedCost: number;
  timestamp: number;
}

const dailyCosts: CostEntry[] = [];
let lastSummaryDate = "";

export function trackCost(provider: string, estimatedTokens: number) {
  const config = AI_PROVIDERS[provider];
  const cost = config ? (estimatedTokens / 1_000_000) * config.costPer1MTokens : 0;
  dailyCosts.push({ provider, estimatedTokens, estimatedCost: cost, timestamp: Date.now() });

  const today = new Date().toISOString().slice(0, 10);
  if (lastSummaryDate !== today) {
    lastSummaryDate = today;
    const oldEntries = dailyCosts.filter(
      (e) => new Date(e.timestamp).toISOString().slice(0, 10) !== today,
    );
    for (const e of oldEntries) {
      const idx = dailyCosts.indexOf(e);
      if (idx !== -1) dailyCosts.splice(idx, 1);
    }
  }
}

export function getDailySummary(): Record<string, { requests: number; estimatedCost: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const todayEntries = dailyCosts.filter(
    (e) => new Date(e.timestamp).toISOString().slice(0, 10) === today,
  );

  const summary: Record<string, { requests: number; estimatedCost: number }> = {};
  for (const entry of todayEntries) {
    if (!summary[entry.provider]) {
      summary[entry.provider] = { requests: 0, estimatedCost: 0 };
    }
    summary[entry.provider].requests++;
    summary[entry.provider].estimatedCost += entry.estimatedCost;
  }
  return summary;
}

export function logDailySummary(rulesCount: number) {
  const summary = getDailySummary();
  const lines = ["AI Judge Daily Summary:"];
  lines.push(` - Rule-based: ${rulesCount} requests (free)`);
  let total = 0;
  for (const [provider, data] of Object.entries(summary)) {
    lines.push(` - ${provider}: ${data.requests} requests (~$${data.estimatedCost.toFixed(4)})`);
    total += data.estimatedCost;
  }
  lines.push(` - Total estimated: $${total.toFixed(4)}`);
  console.log(lines.join("\n"));
}

export function getAvailableProviders(): string[] {
  return Object.entries(AI_PROVIDERS)
    .filter(([_, cfg]) => cfg.available)
    .map(([name]) => name);
}

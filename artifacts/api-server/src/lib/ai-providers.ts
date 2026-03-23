import crypto from "crypto";
import { db } from "@workspace/db";

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
}

const recentHashes = new Map<string, Set<string>>();

function hashText(text: string): string {
  return crypto.createHash("sha256").update(text.trim().toLowerCase()).digest("hex").slice(0, 16);
}

function checkDuplicateHash(userId: string, textHash: string): boolean {
  const userHashes = recentHashes.get(userId);
  if (!userHashes) {
    recentHashes.set(userId, new Set([textHash]));
    return false;
  }
  if (userHashes.has(textHash)) return true;
  userHashes.add(textHash);
  if (userHashes.size > 100) {
    const first = userHashes.values().next().value;
    if (first) userHashes.delete(first);
  }
  return false;
}

const GENERIC_PHRASES = [
  "i completed the task",
  "done",
  "finished",
  "i did it",
  "task complete",
  "completed",
  "yes",
  "did it",
  "all done",
];

export function preScreen(proof: ProofSubmission): PreScreenResult {
  if (!proof.summary && (!proof.files || proof.files.length === 0) && !proof.linkUrl && (!proof.links || proof.links.length === 0)) {
    return { verdict: "rejected", reason: "no_proof", skipAI: true };
  }

  if (proof.summary && proof.summary.trim().length < 20 && (!proof.files || proof.files.length === 0)) {
    return { verdict: "rejected", reason: "too_short", skipAI: true };
  }

  if (proof.summary) {
    const textHash = hashText(proof.summary);
    const isDuplicate = checkDuplicateHash(proof.userId, textHash);
    if (isDuplicate) {
      return { verdict: "rejected", reason: "duplicate", skipAI: true };
    }
  }

  const normalized = proof.summary?.toLowerCase().trim();
  if (normalized && GENERIC_PHRASES.includes(normalized)) {
    return { verdict: "followup_required", reason: "too_generic", skipAI: true };
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

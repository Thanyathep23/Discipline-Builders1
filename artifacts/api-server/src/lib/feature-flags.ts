import { db, featureFlagsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const DEFAULT_FLAGS: Record<string, { value: string; description: string }> = {
  ai_missions_per_day:           { value: "5",   description: "Max AI missions generated per user per day" },
  comeback_threshold_days:       { value: "3",   description: "Days of inactivity before comeback state triggers" },
  proof_strictness_multiplier:   { value: "1.0", description: "Global multiplier for proof strictness (0.5 = lenient, 2.0 = strict)" },
  rarity_frequency_multiplier:   { value: "1.0", description: "Multiplier for how often rare missions appear (1.0 = default)" },
  streak_bonus_max_pct:          { value: "20",  description: "Max streak bonus percentage added to rewards" },
  chain_max_depth:               { value: "5",   description: "Max number of steps in a quest chain" },
  share_cards_enabled:           { value: "true", description: "Whether share card feature is visible to users" },
};

let flagCache: Record<string, string> | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60_000;

async function loadFlags(): Promise<Record<string, string>> {
  if (flagCache && Date.now() < cacheExpiry) return flagCache;

  // Seed defaults if missing
  for (const [key, meta] of Object.entries(DEFAULT_FLAGS)) {
    await db
      .insert(featureFlagsTable)
      .values({ key, value: meta.value, description: meta.description })
      .onConflictDoNothing();
  }

  const rows = await db.select().from(featureFlagsTable);
  flagCache = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  cacheExpiry = Date.now() + CACHE_TTL_MS;
  return flagCache;
}

export async function getFlag(key: string, defaultValue: string): Promise<string> {
  const flags = await loadFlags();
  return flags[key] ?? DEFAULT_FLAGS[key]?.value ?? defaultValue;
}

export async function getFlagNum(key: string, defaultValue: number): Promise<number> {
  const val = await getFlag(key, String(defaultValue));
  const num = parseFloat(val);
  return isNaN(num) ? defaultValue : num;
}

export async function getFlagBool(key: string, defaultValue: boolean): Promise<boolean> {
  const val = await getFlag(key, String(defaultValue));
  return val === "true" || val === "1";
}

export async function setFlag(key: string, value: string, updatedBy: string): Promise<void> {
  await db
    .insert(featureFlagsTable)
    .values({ key, value, description: DEFAULT_FLAGS[key]?.description, updatedBy })
    .onConflictDoUpdate({ target: featureFlagsTable.key, set: { value, updatedBy, updatedAt: new Date() } });
  flagCache = null; // invalidate cache
}

export async function getAllFlags() {
  await loadFlags();
  const rows = await db.select().from(featureFlagsTable);
  return rows.map((r) => ({
    key: r.key,
    value: r.value,
    description: r.description ?? DEFAULT_FLAGS[r.key]?.description ?? "",
    updatedBy: r.updatedBy,
    updatedAt: r.updatedAt?.toISOString() ?? null,
    isDefault: r.value === (DEFAULT_FLAGS[r.key]?.value ?? r.value),
  }));
}

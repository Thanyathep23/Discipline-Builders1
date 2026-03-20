import {
  db,
  userCyclesTable,
  CYCLE_DEFINITIONS,
  type CycleType,
  type UserCycle,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface CycleState {
  activeCycle: UserCycle | null;
  cycleDefinition: typeof CYCLE_DEFINITIONS[CycleType] | null;
  progressPct: number;
  daysRemaining: number | null;
  isComplete: boolean;
  recentCompletedCycles: UserCycle[];
}

export async function getActiveCycle(userId: string): Promise<UserCycle | null> {
  const rows = await db
    .select()
    .from(userCyclesTable)
    .where(and(eq(userCyclesTable.userId, userId), eq(userCyclesTable.status, "active")))
    .orderBy(desc(userCyclesTable.startedAt))
    .limit(1);

  if (rows.length === 0) return null;

  const cycle = rows[0];
  if (new Date() > cycle.endsAt) {
    await db
      .update(userCyclesTable)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(userCyclesTable.id, cycle.id));
    return null;
  }

  return cycle;
}

export async function getCycleState(userId: string): Promise<CycleState> {
  const activeCycle = await getActiveCycle(userId);

  const recentCompleted = await db
    .select()
    .from(userCyclesTable)
    .where(and(eq(userCyclesTable.userId, userId), eq(userCyclesTable.status, "completed")))
    .orderBy(desc(userCyclesTable.completedAt))
    .limit(3);

  if (!activeCycle) {
    return {
      activeCycle: null,
      cycleDefinition: null,
      progressPct: 0,
      daysRemaining: null,
      isComplete: false,
      recentCompletedCycles: recentCompleted,
    };
  }

  const def = CYCLE_DEFINITIONS[activeCycle.cycleType as CycleType] ?? null;
  const progressPct = Math.min(100, Math.round((activeCycle.progressCount / activeCycle.targetCount) * 100));
  const msRemaining = activeCycle.endsAt.getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  const isComplete = activeCycle.progressCount >= activeCycle.targetCount;

  return {
    activeCycle,
    cycleDefinition: def,
    progressPct,
    daysRemaining,
    isComplete,
    recentCompletedCycles: recentCompleted,
  };
}

export async function startCycleForUser(userId: string, cycleType: CycleType): Promise<UserCycle> {
  const existing = await getActiveCycle(userId);
  if (existing) throw new Error("A cycle is already active. Complete or expire it first.");

  const def = CYCLE_DEFINITIONS[cycleType];
  const now = new Date();
  const endsAt = new Date(now.getTime() + def.durationDays * 24 * 60 * 60 * 1000);

  const id = randomUUID();
  await db.insert(userCyclesTable).values({
    id,
    userId,
    cycleType,
    status: "active",
    progressCount: 0,
    targetCount: def.targetCount,
    startedAt: now,
    endsAt,
    rewardClaimed: "false",
  });

  const [row] = await db.select().from(userCyclesTable).where(eq(userCyclesTable.id, id)).limit(1);
  return row;
}

export async function incrementCycleProgress(
  userId: string,
  skillId: string,
): Promise<{ progressed: boolean; completed: boolean; cycleId: string | null }> {
  const cycle = await getActiveCycle(userId);
  if (!cycle) return { progressed: false, completed: false, cycleId: null };

  const def = CYCLE_DEFINITIONS[cycle.cycleType as CycleType];
  if (!def || def.skillId !== skillId) return { progressed: false, completed: false, cycleId: cycle.id };

  const newCount = cycle.progressCount + 1;
  const isNowComplete = newCount >= cycle.targetCount;

  await db
    .update(userCyclesTable)
    .set({
      progressCount: newCount,
      status: isNowComplete ? "completed" : "active",
      completedAt: isNowComplete ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(userCyclesTable.id, cycle.id));

  return { progressed: true, completed: isNowComplete, cycleId: cycle.id };
}

export function suggestCycleType(weakSkillId: string): CycleType {
  const map: Record<string, CycleType> = {
    focus:      "focus_season",
    discipline: "focus_season",
    sleep:      "recovery_sprint",
    fitness:    "recovery_sprint",
    trading:    "trading_cycle",
    learning:   "learning_sprint",
  };
  return map[weakSkillId] ?? "focus_season";
}

import { db, circleMembersTable, circleActivityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * Emit a meaningful moment to all circles the user is an active member of.
 * Only call this for high-signal events (badge, title, chain, milestone).
 * Never breaks the main flow.
 */
export async function emitActivityForUser(
  userId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const memberships = await db
      .select({ circleId: circleMembersTable.circleId })
      .from(circleMembersTable)
      .where(
        and(
          eq(circleMembersTable.userId, userId),
          eq(circleMembersTable.status, "active"),
        )
      );

    if (memberships.length === 0) return;

    await db.insert(circleActivityTable).values(
      memberships.map((m) => ({
        id: randomUUID(),
        circleId: m.circleId,
        userId,
        eventType,
        payload: JSON.stringify(payload),
      }))
    );
  } catch {
    // Never break main flow
  }
}

import { db, proofFilesTable } from "@workspace/db";
import { eq, and, gte, count } from "drizzle-orm";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_UPLOADS_PER_WINDOW = 20;

export async function checkUploadRateLimit(
  userId: string,
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const windowStart = new Date(Date.now() - WINDOW_MS);

  const [{ uploadCount }] = await db
    .select({ uploadCount: count() })
    .from(proofFilesTable)
    .where(and(eq(proofFilesTable.userId, userId), gte(proofFilesTable.createdAt, windowStart)));

  const current = Number(uploadCount);
  const resetInSeconds = Math.round(WINDOW_MS / 1000);

  if (current >= MAX_UPLOADS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  return {
    allowed: true,
    remaining: MAX_UPLOADS_PER_WINDOW - current - 1,
    resetInSeconds,
  };
}

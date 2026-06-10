import { eq, count } from "drizzle-orm";
import { trails, userProgress } from "../../drizzle/schema";
import { getDb } from "../_core/db";

/** Sincroniza totalTrailsAnalyzed com a quantidade real de trilhas do usuário. */
export async function syncTrailCount(userId: number): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: count() })
    .from(trails)
    .where(eq(trails.userId, userId));

  const trailCount = Number(row?.count ?? 0);

  const [progress] = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .limit(1);

  if (progress && progress.totalTrailsAnalyzed !== trailCount) {
    await db
      .update(userProgress)
      .set({ totalTrailsAnalyzed: trailCount })
      .where(eq(userProgress.userId, userId));
  }

  return trailCount;
}

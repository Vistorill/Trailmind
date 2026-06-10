import { eq } from "drizzle-orm";
import { users, userProgress } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../_core/db";
import { getGamificationSummary, getLeaderboard } from "../services/gamification";

export const gamificationRouter = router({
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, ctx.user.id))
      .limit(1);

    const gamification = await getGamificationSummary(ctx.user.id);
    return {
      ...gamification,
      streakDays: progress?.streakDays ?? 0,
    };
  }),

  leaderboard: protectedProcedure.query(async () => {
    const db = getDb();
    const top = await getLeaderboard(20);
    const enriched = [];
    for (const entry of top) {
      const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, entry.userId)).limit(1);
      enriched.push({ ...entry, name: user?.name ?? "Anônimo" });
    }
    return enriched;
  }),
});

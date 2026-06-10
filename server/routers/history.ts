import { z } from "zod";
import { eq, desc, and, gte } from "drizzle-orm";
import { studyHistory } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../_core/db";

export const historyRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        type: z
          .enum(["trail_analyzed", "chat_message", "quiz_completed", "flashcard_review"])
          .optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(studyHistory.userId, ctx.user.id)];
      if (input.type) conditions.push(eq(studyHistory.type, input.type));

      return db
        .select()
        .from(studyHistory)
        .where(and(...conditions))
        .orderBy(desc(studyHistory.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  weeklyStats: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const rows = await db
      .select()
      .from(studyHistory)
      .where(and(eq(studyHistory.userId, ctx.user.id), gte(studyHistory.createdAt, weekAgo)));

    const byDay: Record<string, number> = {};
    for (const row of rows) {
      const day = row.createdAt.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] ?? 0) + (row.durationMinutes ?? 0);
    }

    return Object.entries(byDay).map(([date, minutes]) => ({ date, minutes }));
  }),
});

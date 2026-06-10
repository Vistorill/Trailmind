import { z } from "zod";
import { eq, and, gte } from "drizzle-orm";
import { studyHistory, userProgress, studyPlans } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../_core/db";
import { invokeLLM } from "../_core/llm";
import { syncTrailCount } from "../services/syncProgress";

export const analyticsRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const trailCount = await syncTrailCount(ctx.user.id);

    const [progress] = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, ctx.user.id))
      .limit(1);

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const history = await db
      .select()
      .from(studyHistory)
      .where(and(eq(studyHistory.userId, ctx.user.id), gte(studyHistory.createdAt, monthAgo)));

    const byType: Record<string, number> = {};
    const byWeek: Record<string, number> = {};

    for (const h of history) {
      byType[h.type] = (byType[h.type] ?? 0) + 1;
      const week = getWeekKey(h.createdAt);
      byWeek[week] = (byWeek[week] ?? 0) + (h.durationMinutes ?? 0);
    }

    return {
      progress: progress ? { ...progress, totalTrailsAnalyzed: trailCount } : null,
      trailCount,
      activityByType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      studyMinutesByWeek: Object.entries(byWeek).map(([week, minutes]) => ({ week, minutes })),
      quizScore: parseFloat(progress?.averageQuizScore ?? "0"),
    };
  }),

  generateStudyPlan: protectedProcedure
    .input(
      z.object({
        goal: z.string().min(3),
        durationMonths: z.number().min(1).max(12),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const level = ctx.user.learningLevel ?? "beginner";
      const prompt = `Crie um plano de estudo Salesforce em português brasileiro.
Meta: ${input.goal}
Duração: ${input.durationMonths} meses
Nível: ${level}

Retorne JSON: { "milestones": [{ "month": 1, "title": "...", "topics": ["..."], "hours": 20 }] }`;

      const result = await invokeLLM([{ role: "user", content: prompt }], true);
      const parsed = JSON.parse(result) as { milestones: unknown[] };

      const db = getDb();
      const [res] = await db.insert(studyPlans).values({
        userId: ctx.user.id,
        goal: input.goal,
        durationMonths: input.durationMonths,
        milestones: parsed.milestones,
      });

      return { id: res.insertId, milestones: parsed.milestones };
    }),

  myStudyPlans: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(studyPlans).where(eq(studyPlans.userId, ctx.user.id));
  }),
});

function getWeekKey(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const weekStart = new Date(d.setDate(diff));
  return weekStart.toISOString().slice(0, 10);
}

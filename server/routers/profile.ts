import { z } from "zod";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../_core/db";

export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  learningLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  studyGoalCertification: z.string().max(100).nullable().optional(),
  dailyStudyMinutes: z.number().min(5).max(480).optional(),
  preferredLanguage: z.string().max(10).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!user) throw new Error("Usuário não encontrado");
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      learningLevel: user.learningLevel,
      studyGoalCertification: user.studyGoalCertification,
      dailyStudyMinutes: user.dailyStudyMinutes,
      preferredLanguage: user.preferredLanguage,
      onboardingCompleted: user.onboardingCompleted,
    };
  }),

  update: protectedProcedure.input(profileUpdateSchema).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.update(users).set(input).where(eq(users.id, ctx.user.id));
    const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    return {
      id: user!.id,
      name: user!.name,
      email: user!.email,
      learningLevel: user!.learningLevel,
      studyGoalCertification: user!.studyGoalCertification,
      dailyStudyMinutes: user!.dailyStudyMinutes,
      preferredLanguage: user!.preferredLanguage,
      onboardingCompleted: user!.onboardingCompleted,
    };
  }),
});

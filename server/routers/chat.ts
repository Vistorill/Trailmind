import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { chatMessages, trails, studyHistory } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../_core/db";
import { invokeLLM } from "../_core/llm";
import { assertQuota, incrementQuota } from "../services/usageQuota";
import { awardPoints } from "../services/gamification";

export const chatRouter = router({
  history: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, ctx.user.id))
        .orderBy(desc(chatMessages.createdAt))
        .limit(input.limit);
    }),

  send: protectedProcedure
    .input(z.object({ message: z.string().min(1).max(4000), trailId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertQuota(ctx.user.id, "chat_message");

      const db = getDb();
      let trailContext = "";
      if (input.trailId) {
        const [trail] = await db
          .select()
          .from(trails)
          .where(and(eq(trails.id, input.trailId), eq(trails.userId, ctx.user.id)))
          .limit(1);
        if (trail?.summary) trailContext = `\nContexto da trilha "${trail.title}": ${trail.summary}`;
      }

      const level = ctx.user.learningLevel ?? "beginner";
      const goal = ctx.user.studyGoalCertification ?? "certificação Salesforce";

      const systemPrompt = `Você é o Mentor TrailMind, um professor particular de Salesforce em português brasileiro.
Nível do aluno: ${level}. Meta: ${goal}.${trailContext}
Seja didático, use exemplos práticos e incentive o aluno.`;

      await db.insert(chatMessages).values({
        userId: ctx.user.id,
        role: "user",
        content: input.message,
        trailId: input.trailId ?? null,
      });

      const recentMessages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, ctx.user.id))
        .orderBy(desc(chatMessages.createdAt))
        .limit(10);

      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        ...recentMessages.reverse().map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      const response = await invokeLLM(llmMessages);

      await db.insert(chatMessages).values({
        userId: ctx.user.id,
        role: "assistant",
        content: response,
        trailId: input.trailId ?? null,
      });

      await db.insert(studyHistory).values({
        userId: ctx.user.id,
        trailId: input.trailId ?? null,
        type: "chat_message",
        durationMinutes: 2,
      });

      await incrementQuota(ctx.user.id, "chat_message");
      await awardPoints(ctx.user.id, "chat_message");

      return { response };
    }),
});

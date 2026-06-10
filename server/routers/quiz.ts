import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { quizzes, quizResponses, weakTopics, userProgress, studyHistory, trails } from "../../drizzle/schema";
import { updateNodeMastery, type AnalysisMeta } from "../../shared/analyzer";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../_core/db";
import { assertQuota, incrementQuota } from "../services/usageQuota";
import { awardPoints } from "../services/gamification";

export const quizRouter = router({
  getForTrail: protectedProcedure
    .input(z.object({ trailId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const rows = await db
        .select({
          id: quizzes.id,
          question: quizzes.question,
          options: quizzes.options,
          difficulty: quizzes.difficulty,
        })
        .from(quizzes)
        .where(and(eq(quizzes.trailId, input.trailId), eq(quizzes.userId, ctx.user.id)));

      return rows;
    }),

  submitBatch: protectedProcedure
    .input(
      z.object({
        answers: z.array(
          z.object({ quizId: z.number(), selectedAnswer: z.string().length(1) })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertQuota(ctx.user.id, "quiz_answer");

      const db = getDb();
      let correct = 0;
      const results: Array<{
        quizId: number;
        isCorrect: boolean;
        correctAnswer: string;
        explanation: string | null;
      }> = [];

      for (const answer of input.answers) {
        const [quiz] = await db
          .select()
          .from(quizzes)
          .where(and(eq(quizzes.id, answer.quizId), eq(quizzes.userId, ctx.user.id)))
          .limit(1);

        if (!quiz) continue;

        const isCorrect = quiz.correctAnswer === answer.selectedAnswer;
        if (isCorrect) correct++;

        await db.insert(quizResponses).values({
          userId: ctx.user.id,
          quizId: answer.quizId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect,
        });

        const opts = quiz.options as Record<string, string> & { _topicId?: string; _topic?: string };
        const graphTopicId = opts._topicId ?? opts._topic ?? "";

        if (!isCorrect && graphTopicId && quiz.trailId) {
          const [trail] = await db.select().from(trails).where(eq(trails.id, quiz.trailId)).limit(1);
          if (trail?.analysisMeta) {
            const meta = trail.analysisMeta as AnalysisMeta;
            const updatedGraph = updateNodeMastery(meta.knowledgeGraph, graphTopicId, -15);
            await db.update(trails).set({ analysisMeta: { ...meta, knowledgeGraph: updatedGraph } }).where(eq(trails.id, quiz.trailId));
          }
        } else if (isCorrect && graphTopicId && quiz.trailId) {
          const [trail] = await db.select().from(trails).where(eq(trails.id, quiz.trailId)).limit(1);
          if (trail?.analysisMeta) {
            const meta = trail.analysisMeta as AnalysisMeta;
            const updatedGraph = updateNodeMastery(meta.knowledgeGraph, graphTopicId, 10);
            await db.update(trails).set({ analysisMeta: { ...meta, knowledgeGraph: updatedGraph } }).where(eq(trails.id, quiz.trailId));
          }
        }

        if (!isCorrect) {
          const topicId = `quiz_${quiz.id}`;
          const [existing] = await db
            .select()
            .from(weakTopics)
            .where(
              and(
                eq(weakTopics.userId, ctx.user.id),
                eq(weakTopics.topicId, topicId)
              )
            )
            .limit(1);

          if (existing) {
            await db
              .update(weakTopics)
              .set({
                errorCount: existing.errorCount + 1,
                lastErrorAt: new Date(),
                isResolved: false,
              })
              .where(eq(weakTopics.id, existing.id));
          } else {
            await db.insert(weakTopics).values({
              userId: ctx.user.id,
              trailId: quiz.trailId,
              topicId,
              topicName: quiz.question.slice(0, 100),
              errorCount: 1,
              lastErrorAt: new Date(),
            });
          }
        } else {
          const topicId = `quiz_${quiz.id}`;
          const [existing] = await db
            .select()
            .from(weakTopics)
            .where(
              and(eq(weakTopics.userId, ctx.user.id), eq(weakTopics.topicId, topicId))
            )
            .limit(1);

          if (existing) {
            const newCorrect = existing.correctCount + 1;
            await db
              .update(weakTopics)
              .set({
                correctCount: newCorrect,
                masteryLevel: String(Math.min(100, newCorrect * 20)),
                isResolved: newCorrect >= 3,
              })
              .where(eq(weakTopics.id, existing.id));
          }
        }

        results.push({
          quizId: answer.quizId,
          isCorrect,
          correctAnswer: quiz.correctAnswer,
          explanation: quiz.explanation,
        });

        await incrementQuota(ctx.user.id, "quiz_answer");
      }

      const score = input.answers.length > 0 ? Math.round((correct / input.answers.length) * 100) : 0;

      const [progress] = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, ctx.user.id))
        .limit(1);

      if (progress) {
        const totalTaken = progress.totalQuizzesTaken + 1;
        const totalCorrect = progress.totalCorrectAnswers + correct;
        const avgScore =
          totalTaken > 0
            ? ((parseFloat(progress.averageQuizScore ?? "0") * progress.totalQuizzesTaken + score) / totalTaken).toFixed(2)
            : String(score);

        await db
          .update(userProgress)
          .set({
            totalQuizzesTaken: totalTaken,
            totalCorrectAnswers: totalCorrect,
            averageQuizScore: avgScore,
            lastActivityAt: new Date(),
          })
          .where(eq(userProgress.userId, ctx.user.id));
      }

      await db.insert(studyHistory).values({
        userId: ctx.user.id,
        type: "quiz_completed",
        durationMinutes: input.answers.length * 2,
        metadata: { score, total: input.answers.length },
      });

      if (score === 100) await awardPoints(ctx.user.id, "quiz_perfect");
      else await awardPoints(ctx.user.id, "quiz_completed");

      return { score, correct, total: input.answers.length, results };
    }),
});

import { z } from "zod";
import { eq, and, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { flashcards, studyHistory } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../_core/db";
import { calculateFSRS, stateFromLegacy, type FSRSRating } from "../lib/fsrs";
import { assertQuota, incrementQuota } from "../services/usageQuota";
import { awardPoints } from "../services/gamification";

export const flashcardsRouter = router({
  listDue: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(flashcards)
      .where(and(eq(flashcards.userId, ctx.user.id), lte(flashcards.nextReview, new Date())));
  }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db.select().from(flashcards).where(eq(flashcards.userId, ctx.user.id));
  }),

  listForTrail: protectedProcedure
    .input(z.object({ trailId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db
        .select()
        .from(flashcards)
        .where(and(eq(flashcards.userId, ctx.user.id), eq(flashcards.trailId, input.trailId)));
    }),

  review: protectedProcedure
    .input(z.object({ id: z.number(), rating: z.number().min(1).max(4) }))
    .mutation(async ({ ctx, input }) => {
      await assertQuota(ctx.user.id, "flashcard_review");

      const db = getDb();
      const [card] = await db
        .select()
        .from(flashcards)
        .where(and(eq(flashcards.id, input.id), eq(flashcards.userId, ctx.user.id)))
        .limit(1);

      if (!card) throw new TRPCError({ code: "NOT_FOUND", message: "Flashcard não encontrado" });

      const state = stateFromLegacy(card.interval, parseFloat(card.easeFactor), card.reviewCount);
      const fsrs = calculateFSRS(state, input.rating as FSRSRating);

      await db
        .update(flashcards)
        .set({
          interval: fsrs.interval,
          easeFactor: String(fsrs.difficulty),
          nextReview: fsrs.nextReview,
          reviewCount: fsrs.reps,
          lastReviewed: new Date(),
        })
        .where(eq(flashcards.id, input.id));

      await db.insert(studyHistory).values({
        userId: ctx.user.id,
        trailId: card.trailId,
        type: "flashcard_review",
        durationMinutes: 1,
      });

      await incrementQuota(ctx.user.id, "flashcard_review");
      await awardPoints(ctx.user.id, "flashcard_review");

      return { ok: true, nextReview: fsrs.nextReview, interval: fsrs.interval };
    }),
});

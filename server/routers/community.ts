import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  forumTopics,
  forumPosts,
  studyGroups,
  studyGroupMembers,
  users,
} from "../../drizzle/schema";
import { protectedProcedure, router, publicProcedure } from "../_core/trpc";
import { getDb } from "../_core/db";

const SPAM_PATTERNS = [/https?:\/\/[^\s]{50,}/i, /(.)\1{10,}/];

function isSpam(content: string): boolean {
  return SPAM_PATTERNS.some((p) => p.test(content));
}

export const communityRouter = router({
  listTopics: publicProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = getDb();
      const topics = await db
        .select()
        .from(forumTopics)
        .orderBy(desc(forumTopics.createdAt))
        .limit(input.limit);

      const enriched = [];
      for (const topic of topics) {
        const [author] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, topic.userId))
          .limit(1);
        enriched.push({ ...topic, authorName: author?.name ?? "Anônimo" });
      }
      return enriched;
    }),

  getTopic: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [topic] = await db.select().from(forumTopics).where(eq(forumTopics.id, input.id)).limit(1);
      if (!topic) throw new TRPCError({ code: "NOT_FOUND" });

      const posts = await db
        .select()
        .from(forumPosts)
        .where(eq(forumPosts.topicId, input.id))
        .orderBy(forumPosts.createdAt);

      const enriched = [];
      for (const post of posts) {
        const [author] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, post.userId))
          .limit(1);
        enriched.push({ ...post, authorName: author?.name ?? "Anônimo" });
      }

      return { topic, posts: enriched };
    }),

  createTopic: protectedProcedure
    .input(z.object({ title: z.string().min(3).max(255), content: z.string().min(10).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      if (isSpam(input.content)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Conteúdo detectado como spam" });
      }

      const db = getDb();
      const [result] = await db.insert(forumTopics).values({
        userId: ctx.user.id,
        title: input.title,
        content: input.content,
      });
      return { id: result.insertId };
    }),

  replyToTopic: protectedProcedure
    .input(z.object({ topicId: z.number(), content: z.string().min(1).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      if (isSpam(input.content)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Conteúdo detectado como spam" });
      }

      const db = getDb();
      const [result] = await db.insert(forumPosts).values({
        topicId: input.topicId,
        userId: ctx.user.id,
        content: input.content,
      });

      const [topic] = await db
        .select()
        .from(forumTopics)
        .where(eq(forumTopics.id, input.topicId))
        .limit(1);

      if (topic) {
        await db
          .update(forumTopics)
          .set({ replyCount: topic.replyCount + 1 })
          .where(eq(forumTopics.id, input.topicId));
      }

      return { id: result.insertId };
    }),

  listGroups: publicProcedure.query(async () => {
    const db = getDb();
    return db.select().from(studyGroups).orderBy(desc(studyGroups.createdAt));
  }),

  createGroup: protectedProcedure
    .input(z.object({ name: z.string().min(3).max(100), description: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [result] = await db.insert(studyGroups).values({
        name: input.name,
        description: input.description ?? null,
        creatorId: ctx.user.id,
      });

      await db.insert(studyGroupMembers).values({
        groupId: result.insertId,
        userId: ctx.user.id,
      });

      return { id: result.insertId };
    }),

  joinGroup: protectedProcedure
    .input(z.object({ groupId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(studyGroupMembers)
        .where(
          and(
            eq(studyGroupMembers.groupId, input.groupId),
            eq(studyGroupMembers.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing) return { ok: true };

      await db.insert(studyGroupMembers).values({
        groupId: input.groupId,
        userId: ctx.user.id,
      });

      const [group] = await db
        .select()
        .from(studyGroups)
        .where(eq(studyGroups.id, input.groupId))
        .limit(1);

      if (group) {
        await db
          .update(studyGroups)
          .set({ memberCount: group.memberCount + 1 })
          .where(eq(studyGroups.id, input.groupId));
      }

      return { ok: true };
    }),

  getGroup: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [group] = await db.select().from(studyGroups).where(eq(studyGroups.id, input.id)).limit(1);
      if (!group) throw new TRPCError({ code: "NOT_FOUND" });

      const members = await db
        .select()
        .from(studyGroupMembers)
        .where(eq(studyGroupMembers.groupId, input.id));

      return { group, members };
    }),
});

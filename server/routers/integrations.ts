import { z } from "zod";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { apiKeys } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../_core/db";

export const integrationsRouter = router({
  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        lastUsedAt: apiKeys.lastUsedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, ctx.user.id));
  }),

  createApiKey: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100).default("Default") }))
    .mutation(async ({ ctx, input }) => {
      const rawKey = `tm_${randomBytes(24).toString("hex")}`;
      const keyHash = createHash("sha256").update(rawKey).digest("hex");
      const keyPrefix = rawKey.slice(0, 12);

      const db = getDb();
      await db.insert(apiKeys).values({
        userId: ctx.user.id,
        keyHash,
        keyPrefix,
        name: input.name,
      });

      return { key: rawKey, prefix: keyPrefix };
    }),

  deleteApiKey: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(apiKeys)
        .where(eq(apiKeys.id, input.id));
      return { ok: true };
    }),
});

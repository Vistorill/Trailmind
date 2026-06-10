import { eq, and, desc } from "drizzle-orm";
import { weakTopics } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../_core/db";

export const weakTopicsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(weakTopics)
      .where(and(eq(weakTopics.userId, ctx.user.id), eq(weakTopics.isResolved, false)))
      .orderBy(desc(weakTopics.errorCount));
  }),
});

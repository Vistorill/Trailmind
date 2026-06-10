import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { usageQuotas, subscriptions } from "../../drizzle/schema";
import { PLAN_LIMITS, type PlanTier, type QuotaFeature } from "../../shared/plans";
import { getDb } from "../_core/db";
import { isAdminUser } from "./adminAccess";

function currentMonthYear(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getUserPlanTier(userId: number): Promise<PlanTier> {
  const db = getDb();
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .limit(1);

  if (!sub) return "free";
  return sub.planName === "enterprise" ? "enterprise" : "pro";
}

export async function getQuotaUsage(userId: number, feature: QuotaFeature) {
  const db = getDb();
  const monthYear = currentMonthYear();
  const [row] = await db
    .select()
    .from(usageQuotas)
    .where(
      and(
        eq(usageQuotas.userId, userId),
        eq(usageQuotas.feature, feature),
        eq(usageQuotas.monthYear, monthYear)
      )
    )
    .limit(1);

  return row?.usedCount ?? 0;
}

export async function assertQuota(userId: number, feature: QuotaFeature) {
  if (await isAdminUser(userId)) return;

  const tier = await getUserPlanTier(userId);
  const limit = PLAN_LIMITS[tier][feature];
  if (limit === -1) return;

  const used = await getQuotaUsage(userId, feature);
  if (used >= limit) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "QUOTA_EXCEEDED",
      cause: { feature, limit, used, tier },
    });
  }
}

export async function incrementQuota(userId: number, feature: QuotaFeature) {
  if (await isAdminUser(userId)) return;

  const db = getDb();
  const monthYear = currentMonthYear();
  const [existing] = await db
    .select()
    .from(usageQuotas)
    .where(
      and(
        eq(usageQuotas.userId, userId),
        eq(usageQuotas.feature, feature),
        eq(usageQuotas.monthYear, monthYear)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(usageQuotas)
      .set({ usedCount: existing.usedCount + 1 })
      .where(eq(usageQuotas.id, existing.id));
  } else {
    await db.insert(usageQuotas).values({ userId, feature, usedCount: 1, monthYear });
  }
}

export async function getAllQuotaUsage(userId: number) {
  const features = Object.keys(PLAN_LIMITS.free) as QuotaFeature[];
  const usage: Record<string, { used: number; limit: number }> = {};

  if (await isAdminUser(userId)) {
    for (const feature of features) {
      usage[feature] = {
        used: await getQuotaUsage(userId, feature),
        limit: -1,
      };
    }
    return { tier: "enterprise" as PlanTier, usage, isAdmin: true };
  }

  const tier = await getUserPlanTier(userId);

  for (const feature of features) {
    usage[feature] = {
      used: await getQuotaUsage(userId, feature),
      limit: PLAN_LIMITS[tier][feature],
    };
  }

  return { tier, usage, isAdmin: false };
}

import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { subscriptions, users } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../_core/db";
import { getAllQuotaUsage } from "../services/usageQuota";
import { getStripe } from "../_core/stripe";
import { env } from "../_core/env";

export const billingRouter = router({
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    const quota = await getAllQuotaUsage(ctx.user.id);
    return { subscription: sub ?? null, ...quota };
  }),

  createCheckout: protectedProcedure
    .input(z.object({ plan: z.enum(["pro", "enterprise"]), interval: z.enum(["monthly", "yearly"]) }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      if (!stripe) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe não configurado. Adicione STRIPE_SECRET_KEY no .env",
        });
      }

      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);

      let customerId: string | undefined;
      const [existingSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      if (existingSub?.stripeCustomerId) {
        customerId = existingSub.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email: user?.email ?? undefined,
          metadata: { userId: String(ctx.user.id) },
        });
        customerId = customer.id;
      }

      const priceId =
        input.interval === "monthly"
          ? env.STRIPE_PRICE_PRO_MONTHLY
          : env.STRIPE_PRICE_PRO_YEARLY;

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: priceId ? [{ price: priceId, quantity: 1 }] : undefined,
        success_url: `${ctx.req.headers.origin ?? "http://localhost:5173"}/billing?success=true`,
        cancel_url: `${ctx.req.headers.origin ?? "http://localhost:5173"}/billing?canceled=true`,
        metadata: { userId: String(ctx.user.id), plan: input.plan },
      });

      return { url: session.url };
    }),

  createPortal: protectedProcedure.mutation(async ({ ctx }) => {
    const stripe = getStripe();
    if (!stripe) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Stripe não configurado" });
    }

    const db = getDb();
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (!sub?.stripeCustomerId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma assinatura encontrada" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${ctx.req.headers.origin ?? "http://localhost:5173"}/billing`,
    });

    return { url: session.url };
  }),
});

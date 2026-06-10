import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { eq } from "drizzle-orm";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { createContext } from "./_core/context";
import { mountAuthRoutes } from "./_core/auth";
import { env } from "./_core/env";
import { getDb } from "./_core/db";
import { appRouter } from "./routers";
import { certificates } from "../drizzle/schema";
import { getStripe } from "./_core/stripe";
import { subscriptions } from "../drizzle/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = getStripe();
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).send("Stripe não configurado");
    }

    const sig = req.headers["stripe-signature"] as string;
    try {
      const event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);

      if (
        event.type === "checkout.session.completed" ||
        event.type === "customer.subscription.updated"
      ) {
        const session = event.data.object as {
          metadata?: { userId?: string; plan?: string };
          customer?: string;
          subscription?: string;
          current_period_end?: number;
        };

        const userId = parseInt(session.metadata?.userId ?? "0", 10);
        if (userId) {
          const db = getDb();
          const plan = (session.metadata?.plan as "pro" | "enterprise") ?? "pro";
          const [existing] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.userId, userId))
            .limit(1);

          const data = {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            planName: plan,
            status: "active",
            currentPeriodEnd: session.current_period_end
              ? new Date(session.current_period_end * 1000)
              : null,
          };

          if (existing) {
            await db.update(subscriptions).set(data).where(eq(subscriptions.userId, userId));
          } else {
            await db.insert(subscriptions).values({ userId, ...data });
          }
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const sub = event.data.object as { metadata?: { userId?: string } };
        const userId = parseInt(sub.metadata?.userId ?? "0", 10);
        if (userId) {
          const db = getDb();
          await db
            .update(subscriptions)
            .set({ status: "canceled" })
            .where(eq(subscriptions.userId, userId));
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(400).send("Webhook error");
    }
  }
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

mountAuthRoutes(app);

app.get("/api/certificates/verify/:code", async (req, res) => {
  try {
    const db = getDb();
    const [cert] = await db
      .select()
      .from(certificates)
      .where(eq(certificates.verifyCode, req.params.code))
      .limit(1);

    if (!cert) return res.status(404).json({ valid: false });
    return res.json({
      valid: true,
      studentName: cert.studentName,
      courseTitle: cert.courseTitle,
      issuedAt: cert.issuedAt,
    });
  } catch {
    return res.status(500).json({ error: "Erro interno" });
  }
});

app.get("/api/certificates/:code/pdf", async (req, res) => {
  try {
    const db = getDb();
    const [cert] = await db
      .select()
      .from(certificates)
      .where(eq(certificates.verifyCode, req.params.code))
      .limit(1);

    if (!cert) return res.status(404).send("Certificado não encontrado");

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { width, height } = page.getSize();

    page.drawText("TrailMind Certificate", {
      x: width / 2 - 120,
      y: height - 80,
      size: 28,
      font,
      color: rgb(0.059, 0.855, 0.082),
    });

    page.drawText("Certificado de Conclusão", {
      x: width / 2 - 100,
      y: height - 120,
      size: 18,
      font: regular,
      color: rgb(0.9, 0.9, 0.9),
    });

    page.drawText(cert.studentName, {
      x: width / 2 - cert.studentName.length * 6,
      y: height / 2 + 20,
      size: 24,
      font,
      color: rgb(1, 1, 1),
    });

    page.drawText(`concluiu o curso: ${cert.courseTitle}`, {
      x: 100,
      y: height / 2 - 30,
      size: 14,
      font: regular,
      color: rgb(0.8, 0.8, 0.8),
    });

    page.drawText(`Código de verificação: ${cert.verifyCode}`, {
      x: 100,
      y: 60,
      size: 10,
      font: regular,
      color: rgb(0.6, 0.6, 0.6),
    });

    page.drawText(`Emitido em: ${cert.issuedAt.toLocaleDateString("pt-BR")}`, {
      x: 100,
      y: 45,
      size: 10,
      font: regular,
      color: rgb(0.6, 0.6, 0.6),
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=certificado-${cert.verifyCode}.pdf`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("PDF error:", err);
    res.status(500).send("Erro ao gerar PDF");
  }
});

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

if (env.isProduction) {
  const clientDist = path.join(__dirname, "../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(env.PORT, () => {
  console.log(`TrailMind server running on http://localhost:${env.PORT}`);
});

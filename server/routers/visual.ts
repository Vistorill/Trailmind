import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { visualAnalyses } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../_core/db";
import { invokeLLM } from "../_core/llm";
import { assertQuota, incrementQuota } from "../services/usageQuota";

export const visualRouter = router({
  analyze: protectedProcedure
    .input(
      z.object({
        imageBase64: z.string().min(100),
        prompt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertQuota(ctx.user.id, "visual_analysis");

      const userPrompt =
        input.prompt ??
        "Analise esta imagem relacionada a Salesforce/Trailhead. Explique os conceitos em português brasileiro.";

      try {
        const analysis = await invokeLLM([
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${input.imageBase64}` },
              },
            ],
          },
        ]);

        const db = getDb();
        const [result] = await db.insert(visualAnalyses).values({
          userId: ctx.user.id,
          analysis,
        });

        await incrementQuota(ctx.user.id, "visual_analysis");
        return { id: result.insertId, analysis };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Erro na análise visual",
        });
      }
    }),
});

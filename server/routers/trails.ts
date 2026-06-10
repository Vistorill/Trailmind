import { z } from "zod";
import { eq, desc, and, isNotNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { trails, studyHistory, userProgress, flashcards, quizzes } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../_core/db";
import {
  fetchTrailheadContent,
  isTrailheadUrl,
  normalizeTrailUrl,
  extractChallengeFromHtml,
  challengeToTestSections,
} from "../services/fetchTrailhead";
import {
  attachCorrectAnswersToSections,
  generateGabaritoExplanation,
} from "../services/resolveTestAnswers";
import { analyzeCognitiveContent } from "../services/analyzeCognitive";
import { assertQuota, incrementQuota } from "../services/usageQuota";
import { awardPoints } from "../services/gamification";
import { syncTrailCount } from "../services/syncProgress";
import { invokeLLM, parseLLMJson } from "../_core/llm";
import { env } from "../_core/env";
import type { AnalysisMeta, TrailTestSection } from "../../shared/analyzer";
import { updateNodeMastery, extractTestsFromContent } from "../../shared/analyzer";

const trailTestSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.enum(["desafio", "conteudo", "gabarito"]),
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.record(z.string(), z.string()),
      correctAnswer: z.string().optional(),
    })
  ),
  rawText: z.string().optional(),
});

const analyzeInputSchema = z.object({
  url: z.string().url().optional(),
  title: z.string().min(1),
  content: z.string().min(50).optional(),
  bloomLevel: z.number().min(1).max(6).default(3),
  studentLevel: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  focusAreas: z.array(z.string()).default([]),
  isDemo: z.boolean().optional(),
});

async function findExistingTrailByUrl(userId: number, url: string) {
  const db = getDb();
  const normalized = normalizeTrailUrl(url);
  const rows = await db
    .select({ id: trails.id, title: trails.title, url: trails.url })
    .from(trails)
    .where(and(eq(trails.userId, userId), isNotNull(trails.url)));

  return rows.find((row) => row.url && normalizeTrailUrl(row.url) === normalized);
}

async function assertNoDuplicateTrailUrl(userId: number, url: string | undefined) {
  if (!url) return;

  const existing = await findExistingTrailByUrl(userId, url);
  if (!existing) return;

  throw new TRPCError({
    code: "CONFLICT",
    message: `Esta trilha já foi analisada: "${existing.title}". Acesse-a no histórico de trilhas.`,
  });
}

async function saveTrailAnalysis(
  userId: number,
  data: {
    title: string;
    url?: string;
    content: string;
    contentHash: string;
    quality: "full" | "partial" | "failed";
    summary: string;
    explanation: string;
    examples: string;
    tips: string;
    analysisMeta: AnalysisMeta;
  }
) {
  const db = getDb();
  const [result] = await db.insert(trails).values({
    userId,
    title: data.title,
    url: data.url ? normalizeTrailUrl(data.url) : null,
    content: data.content,
    contentHash: data.contentHash,
    summary: data.summary,
    explanation: data.explanation,
    examples: data.examples,
    tips: data.tips,
    analysisMeta: data.analysisMeta,
    importQuality: data.quality,
    fetchedAt: new Date(),
  });

  const trailId = result.insertId;

  await db.insert(studyHistory).values({
    userId,
    trailId,
    type: "trail_analyzed",
    durationMinutes: data.analysisMeta.cirpPlan?.totalMinutes ?? 5,
    metadata: { bloomLevel: data.analysisMeta.bloomLevel },
  });

  await syncTrailCount(userId);

  const [progress] = await db.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1);
  if (progress) {
    await db
      .update(userProgress)
      .set({ lastActivityAt: new Date() })
      .where(eq(userProgress.userId, userId));
  }

  await awardPoints(userId, "trail_completed", { trailId });
  return trailId;
}

export const trailsRouter = router({
  fetchQuiz: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ input }) => {
      if (!isTrailheadUrl(input.url)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "URL inválida do Trailhead" });
      }
      try {
        const fetched = await fetchTrailheadContent(input.url);
        let sections = extractTestsFromContent(fetched.content).filter((s) => s.questions.length > 0);

        if (!sections.length) {
          const response = await fetch(input.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; TrailMind/1.0; Educational)",
              Accept: "text/html,application/xhtml+xml",
              "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(env.TRAILHEAD_FETCH_TIMEOUT_MS),
          });
          if (response.ok) {
            const html = await response.text();
            const challenge = extractChallengeFromHtml(html);
            if (challenge) sections = challengeToTestSections(challenge);
          }
        }

        const withAnswers = await attachCorrectAnswersToSections(fetched.content, sections);
        return { sections: withAnswers };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Erro ao buscar teste",
        });
      }
    }),

  resolveTestAnswers: protectedProcedure
    .input(
      z.object({
        content: z.string().min(50),
        sections: z.array(trailTestSectionSchema),
      })
    )
    .query(async ({ input }) => {
      const sections = await attachCorrectAnswersToSections(
        input.content,
        input.sections as TrailTestSection[]
      );
      return { sections };
    }),

  analyzeTestGabarito: protectedProcedure
    .input(
      z.object({
        content: z.string().min(50),
        sections: z.array(trailTestSectionSchema),
      })
    )
    .mutation(async ({ input }) => {
      const sections = await attachCorrectAnswersToSections(
        input.content,
        input.sections as TrailTestSection[]
      );
      const explanation = await generateGabaritoExplanation(input.content, sections);
      return { sections, explanation };
    }),

  previewUrl: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ input }) => {
      try {
        const fetched = await fetchTrailheadContent(input.url);
        return {
          title: fetched.title,
          content: fetched.content,
          quality: fetched.quality,
          contentLength: fetched.content.length,
        };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Erro ao buscar URL",
        });
      }
    }),

  analyze: protectedProcedure.input(analyzeInputSchema).mutation(async ({ ctx, input }) => {
    await assertQuota(ctx.user.id, "trail_analyze");

    try {
      let title = input.title;
      let content = input.content ?? "";
      let quality: "full" | "partial" | "failed" = "full";
      let contentHash: string;

      if (input.url && !input.isDemo) {
        await assertNoDuplicateTrailUrl(ctx.user.id, input.url);
        const fetched = await fetchTrailheadContent(input.url);
        title = fetched.title;
        content = fetched.content;
        quality = fetched.quality;
        contentHash = fetched.contentHash;
      } else {
        const { createHash } = await import("crypto");
        contentHash = createHash("sha256").update(content).digest("hex");
      }

      const analysis = await analyzeCognitiveContent(content, title, {
        bloomLevel: input.bloomLevel as 1 | 2 | 3 | 4 | 5 | 6,
        studentLevel: input.studentLevel,
        focusAreas: input.focusAreas,
        isDemo: input.isDemo,
      });

      const trailId = await saveTrailAnalysis(ctx.user.id, {
        title,
        url: input.url,
        content,
        contentHash: contentHash!,
        quality,
        summary: analysis.summary,
        explanation: analysis.explanation,
        examples: analysis.examples,
        tips: analysis.tips,
        analysisMeta: {
          bloomLevel: analysis.bloomLevel,
          studentLevel: analysis.studentLevel,
          focusAreas: analysis.focusAreas,
          knowledgeGraph: analysis.knowledgeGraph,
          cirpPlan: analysis.cirpPlan,
          bloomCalibration: analysis.bloomCalibration,
          extractedTests: extractTestsFromContent(content, analysis.tips),
        },
      });

      await incrementQuota(ctx.user.id, "trail_analyze");
      return { trailId, title, ...analysis };
    } catch (err) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "Erro ao analisar",
      });
    }
  }),

  analyzeUrl: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      await assertQuota(ctx.user.id, "trail_analyze");
      try {
        await assertNoDuplicateTrailUrl(ctx.user.id, input.url);

        const fetched = await fetchTrailheadContent(input.url);
        const analysis = await analyzeCognitiveContent(fetched.content, fetched.title, {
          bloomLevel: 3,
          studentLevel: (ctx.user.learningLevel as "beginner" | "intermediate" | "advanced") ?? "beginner",
          focusAreas: [],
        });
        const trailId = await saveTrailAnalysis(ctx.user.id, {
          title: fetched.title,
          url: input.url,
          content: fetched.content,
          contentHash: fetched.contentHash,
          quality: fetched.quality,
          summary: analysis.summary,
          explanation: analysis.explanation,
          examples: analysis.examples,
          tips: analysis.tips,
          analysisMeta: {
            bloomLevel: analysis.bloomLevel,
            studentLevel: analysis.studentLevel,
            focusAreas: analysis.focusAreas,
            knowledgeGraph: analysis.knowledgeGraph,
            cirpPlan: analysis.cirpPlan,
            bloomCalibration: analysis.bloomCalibration,
            extractedTests: extractTestsFromContent(fetched.content, analysis.tips),
          },
        });
        await incrementQuota(ctx.user.id, "trail_analyze");
        return { trailId, ...analysis, title: fetched.title };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Erro ao analisar URL",
        });
      }
    }),

  analyzeContent: protectedProcedure
    .input(z.object({ title: z.string().min(1), content: z.string().min(50) }))
    .mutation(async ({ ctx, input }) => {
      await assertQuota(ctx.user.id, "trail_analyze");
      const analysis = await analyzeCognitiveContent(input.content, input.title, {
        bloomLevel: 3,
        studentLevel: (ctx.user.learningLevel as "beginner" | "intermediate" | "advanced") ?? "beginner",
        focusAreas: [],
      });
      const { createHash } = await import("crypto");
      const contentHash = createHash("sha256").update(input.content).digest("hex");
      const trailId = await saveTrailAnalysis(ctx.user.id, {
        title: input.title,
        content: input.content,
        contentHash,
        quality: "full",
        summary: analysis.summary,
        explanation: analysis.explanation,
        examples: analysis.examples,
        tips: analysis.tips,
        analysisMeta: {
          bloomLevel: analysis.bloomLevel,
          studentLevel: analysis.studentLevel,
          focusAreas: analysis.focusAreas,
          knowledgeGraph: analysis.knowledgeGraph,
          cirpPlan: analysis.cirpPlan,
          bloomCalibration: analysis.bloomCalibration,
          extractedTests: extractTestsFromContent(input.content, analysis.tips),
        },
      });
      await incrementQuota(ctx.user.id, "trail_analyze");
      return { trailId, ...analysis, title: input.title };
    }),

  updateMastery: protectedProcedure
    .input(z.object({ trailId: z.number(), topicId: z.string(), delta: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [trail] = await db
        .select()
        .from(trails)
        .where(and(eq(trails.id, input.trailId), eq(trails.userId, ctx.user.id)))
        .limit(1);
      if (!trail?.analysisMeta) throw new TRPCError({ code: "NOT_FOUND" });

      const meta = trail.analysisMeta as AnalysisMeta;
      const updatedGraph = updateNodeMastery(meta.knowledgeGraph, input.topicId, input.delta);
      await db
        .update(trails)
        .set({ analysisMeta: { ...meta, knowledgeGraph: updatedGraph } })
        .where(eq(trails.id, input.trailId));

      return updatedGraph;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    await syncTrailCount(ctx.user.id);

    const db = getDb();
    const rows = await db
      .select({
        id: trails.id,
        title: trails.title,
        createdAt: trails.createdAt,
        summary: trails.summary,
        importQuality: trails.importQuality,
        analysisMeta: trails.analysisMeta,
      })
      .from(trails)
      .where(eq(trails.userId, ctx.user.id))
      .orderBy(desc(trails.createdAt));

    return rows.map((r) => ({
      ...r,
      summaryPreview: r.summary?.slice(0, 150) ?? "",
      bloomLevel: (r.analysisMeta as AnalysisMeta | null)?.bloomLevel ?? null,
    }));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const [trail] = await db
        .select()
        .from(trails)
        .where(and(eq(trails.id, input.id), eq(trails.userId, ctx.user.id)))
        .limit(1);
      if (!trail) throw new TRPCError({ code: "NOT_FOUND", message: "Trilha não encontrada" });
      return trail;
    }),

  generateQuiz: protectedProcedure
    .input(
      z.object({
        trailId: z.number(),
        count: z.number().min(1).max(20).default(5),
        bloomLevel: z.number().min(1).max(6).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [trail] = await db
        .select()
        .from(trails)
        .where(and(eq(trails.id, input.trailId), eq(trails.userId, ctx.user.id)))
        .limit(1);
      if (!trail) throw new TRPCError({ code: "NOT_FOUND" });

      const meta = trail.analysisMeta as AnalysisMeta | null;
      const bloom = input.bloomLevel ?? meta?.bloomLevel ?? 3;

      try {
      const prompt = `Gere ${input.count} questões de múltipla escolha (A-D) em português brasileiro, calibradas para Bloom L${bloom}.
Retrieval Practice: questões exigem recuperação ativa, não reconhecimento passivo.
Retorne APENAS JSON válido: { "questions": [{ "question": "...", "options": {"A":"...","B":"...","C":"...","D":"..."}, "correctAnswer": "A", "explanation": "...", "difficulty": "easy|medium|hard", "topic": "nome do tópico", "topicId": "n1" }] }
Conteúdo: ${trail.content.slice(0, 8000)}`;

      const result = await invokeLLM(
        [{ role: "user", content: prompt }],
        { jsonMode: true, model: env.OPENAI_MODEL_GABARITO, maxTokens: 3000 }
      );
      const parsed = parseLLMJson<{
        questions: Array<{
          question: string;
          options: Record<string, string>;
          correctAnswer: string;
          explanation: string;
          difficulty: string;
          topic: string;
          topicId?: string;
        }>;
      }>(result);

      if (!parsed.questions?.length) {
        throw new Error("IA não retornou questões válidas");
      }

      const inserted = [];
      for (const q of parsed.questions) {
        const [res] = await db.insert(quizzes).values({
          userId: ctx.user.id,
          trailId: input.trailId,
          question: q.question,
          options: { ...q.options, _topicId: q.topicId ?? q.topic, _topic: q.topic },
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: (q.difficulty as "easy" | "medium" | "hard") ?? "medium",
        });
        inserted.push({ id: res.insertId, question: q.question, options: q.options, topicId: q.topicId, topic: q.topic });
      }
      return inserted;
      } catch (err) {
        console.error("[generateQuiz]", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Erro ao gerar quiz",
        });
      }
    }),

  generateFlashcards: protectedProcedure
    .input(
      z.object({
        trailId: z.number(),
        count: z.number().min(1).max(30).default(10),
        bloomLevel: z.number().min(1).max(6).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [trail] = await db
        .select()
        .from(trails)
        .where(and(eq(trails.id, input.trailId), eq(trails.userId, ctx.user.id)))
        .limit(1);
      if (!trail) throw new TRPCError({ code: "NOT_FOUND" });

      const meta = trail.analysisMeta as AnalysisMeta | null;
      const bloom = input.bloomLevel ?? meta?.bloomLevel ?? 3;

      try {
      const prompt = `Gere ${input.count} flashcards FSRS em português brasileiro, Bloom L${bloom}.
Retorne APENAS JSON válido: { "cards": [{ "front": "...", "back": "...", "difficulty": "easy|medium|hard" }] }
Conteúdo: ${trail.content.slice(0, 8000)}`;

      const result = await invokeLLM([{ role: "user", content: prompt }], { jsonMode: true });
      const parsed = parseLLMJson<{
        cards: Array<{ front: string; back: string; difficulty: string }>;
      }>(result);

      if (!parsed.cards?.length) {
        throw new Error("IA não retornou flashcards válidos");
      }

      const inserted = [];
      for (const card of parsed.cards) {
        const [res] = await db.insert(flashcards).values({
          userId: ctx.user.id,
          trailId: input.trailId,
          front: card.front,
          back: card.back,
          difficulty: (card.difficulty as "easy" | "medium" | "hard") ?? "medium",
          nextReview: new Date(),
        });
        inserted.push({ id: res.insertId, ...card });
      }
      return inserted;
      } catch (err) {
        console.error("[generateFlashcards]", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Erro ao gerar flashcards",
        });
      }
    }),
});

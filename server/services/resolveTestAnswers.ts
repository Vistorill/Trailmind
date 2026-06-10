import { env } from "../_core/env";
import { invokeLLM, parseLLMJson } from "../_core/llm";
import type { TrailTestSection } from "../../shared/analyzer";

function resolveWithHeuristic(content: string, sections: TrailTestSection[]): Record<string, string> {
  const answers: Record<string, string> = {};
  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);

  for (const section of sections) {
    section.questions.forEach((q, qi) => {
      if (q.correctAnswer) return;

      const key = `${section.id}_${qi}`;
      const qTerms = q.question
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4);

      let bestLetter = "";
      let bestScore = -1;

      for (const [letter, option] of Object.entries(q.options)) {
        let score = 0;
        const optLower = option.toLowerCase();

        for (const paragraph of paragraphs) {
          const pLower = paragraph.toLowerCase();
          const qHits = qTerms.filter((t) => pLower.includes(t)).length;
          if (qHits < 2) continue;

          if (pLower.includes(optLower)) {
            score += 12 + qHits;
          } else {
            const optWords = optLower.split(/\s+/).filter((w) => w.length > 4);
            score += optWords.filter((w) => pLower.includes(w)).length * 2;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestLetter = letter;
        }
      }

      if (bestScore >= 6) answers[key] = bestLetter;
    });
  }

  return answers;
}

async function resolveWithLLM(
  content: string,
  sections: TrailTestSection[]
): Promise<Record<string, string>> {
  const items = sections.flatMap((section) =>
    section.questions.map((q, qi) => ({
      key: `${section.id}_${qi}`,
      question: q.question,
      options: q.options,
    }))
  );

  const raw = await invokeLLM(
    [
      {
        role: "system",
        content:
          "Você é um especialista em trilhas Salesforce Trailhead. Responda apenas com JSON válido.",
      },
      {
        role: "user",
        content: `Com base APENAS no conteúdo da trilha abaixo, indique a letra correta (A, B, C ou D) de cada pergunta.

CONTEÚDO:
${content.slice(0, 14000)}

PERGUNTAS:
${JSON.stringify(items, null, 2)}

Retorne JSON: { "answers": { "sectionId_index": "B" } }`,
      },
    ],
    { jsonMode: true, model: env.OPENAI_MODEL, maxTokens: 600 }
  );

  const parsed = parseLLMJson<{ answers?: Record<string, string> }>(raw);
  return parsed.answers ?? {};
}

export async function attachCorrectAnswersToSections(
  content: string,
  sections: TrailTestSection[]
): Promise<TrailTestSection[]> {
  if (!sections.some((s) => s.questions.length > 0)) return sections;

  const needsAnswer = sections.some((s) => s.questions.some((q) => !q.correctAnswer));
  if (!needsAnswer) return sections;

  let answers: Record<string, string> = {};

  if (env.OPENAI_API_KEY) {
    try {
      answers = await resolveWithLLM(content, sections);
    } catch (err) {
      console.warn("[resolveTestAnswers] LLM falhou, usando heurística:", err);
    }
  }

  if (Object.keys(answers).length === 0) {
    answers = resolveWithHeuristic(content, sections);
  }

  return sections.map((section) => ({
    ...section,
    questions: section.questions.map((q, qi) => ({
      ...q,
      correctAnswer: q.correctAnswer ?? answers[`${section.id}_${qi}`],
    })),
  }));
}

export async function generateGabaritoExplanation(
  content: string,
  sections: TrailTestSection[]
): Promise<string> {
  const items = sections.flatMap((section) =>
    section.questions
      .filter((q) => q.correctAnswer)
      .map((q, qi) => ({
        num: qi + 1,
        question: q.question,
        correctAnswer: q.correctAnswer!,
        correctText: q.options[q.correctAnswer!] ?? "",
      }))
  );

  if (!items.length) {
    return "Não foi possível determinar o gabarito com base no conteúdo importado.";
  }

  if (env.OPENAI_API_KEY) {
    try {
      const raw = await invokeLLM(
        [
          {
            role: "system",
            content:
              "Você explica gabaritos de testes Trailhead de forma didática em português. Responda apenas JSON válido.",
          },
          {
            role: "user",
            content: `Com base no conteúdo da trilha, explique brevemente por que cada resposta está correta.

CONTEÚDO:
${content.slice(0, 12000)}

GABARITO:
${JSON.stringify(items, null, 2)}

Retorne JSON: { "explanation": "texto em markdown com uma explicação por pergunta" }`,
          },
        ],
        { jsonMode: true, model: env.OPENAI_MODEL, maxTokens: 1200 }
      );
      const parsed = parseLLMJson<{ explanation?: string }>(raw);
      if (parsed.explanation?.trim()) return parsed.explanation.trim();
    } catch (err) {
      console.warn("[generateGabaritoExplanation] LLM falhou:", err);
    }
  }

  return items
    .map(
      (item) =>
        `**${item.num}. ${item.question}**\nResposta correta: **${item.correctAnswer}** — ${item.correctText}`
    )
    .join("\n\n");
}

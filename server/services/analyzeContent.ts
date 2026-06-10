import { invokeLLM } from "../_core/llm";

interface AnalysisResult {
  summary: string;
  explanation: string;
  examples: string;
  tips: string;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "iniciante",
  intermediate: "intermediário",
  advanced: "avançado",
};

export async function analyzeStudyContent(
  content: string,
  title: string,
  level: string
): Promise<AnalysisResult> {
  const levelLabel = LEVEL_LABELS[level] ?? "iniciante";

  const prompt = `Você é um professor especialista em Salesforce Trailhead, ensinando em português brasileiro.
Analise o conteúdo abaixo e retorne um JSON com as chaves: summary, explanation, examples, tips.
Adapte a explicação para um aluno de nível ${levelLabel}.

Título: ${title}

Conteúdo:
${content.slice(0, 12000)}

Retorne APENAS JSON válido com:
- summary: resumo conciso (2-3 parágrafos)
- explanation: explicação didática detalhada
- examples: exemplos práticos com cenários Salesforce
- tips: dicas de estudo e pontos de atenção para certificação`;

  const result = await invokeLLM(
    [
      { role: "system", content: "Você é um tutor Salesforce. Responda sempre em português brasileiro." },
      { role: "user", content: prompt },
    ],
    true
  );

  try {
    const parsed = JSON.parse(result) as AnalysisResult;
    return {
      summary: parsed.summary ?? "",
      explanation: parsed.explanation ?? "",
      examples: parsed.examples ?? "",
      tips: parsed.tips ?? "",
    };
  } catch {
    return {
      summary: result.slice(0, 500),
      explanation: result,
      examples: "",
      tips: "",
    };
  }
}

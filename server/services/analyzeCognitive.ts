import { invokeLLM, parseLLMJson } from "../_core/llm";
import { env } from "../_core/env";
import {
  buildDemoAnalysis,
  type BloomLevel,
  type StudentLevel,
  type CognitiveAnalysis,
} from "../../shared/analyzer";

const STUDENT_LABELS: Record<StudentLevel, string> = {
  beginner: "iniciante — use analogias e linguagem simples",
  intermediate: "intermediário — equilibre teoria e prática",
  advanced: "avançado — edge cases, arquitetura e trade-offs",
};

const BLOOM_LABELS: Record<BloomLevel, string> = {
  1: "L1 Lembrar — definições e fatos",
  2: "L2 Entender — explicações e comparações",
  3: "L3 Aplicar — cenários práticos",
  4: "L4 Analisar — decomposição e relações",
  5: "L5 Avaliar — julgamento e criticidade",
  6: "L6 Criar — design e soluções originais",
};

export async function analyzeCognitiveContent(
  content: string,
  title: string,
  options: {
    bloomLevel: BloomLevel;
    studentLevel: StudentLevel;
    focusAreas: string[];
    isDemo?: boolean;
  }
): Promise<CognitiveAnalysis> {
  if (options.isDemo || !env.OPENAI_API_KEY) {
    return buildDemoAnalysis(options.bloomLevel, options.studentLevel, options.focusAreas);
  }

  const focus = options.focusAreas.length > 0 ? options.focusAreas.join(", ") : "todos os focos";
  const prompt = `Você é um motor cognitivo de estudo Salesforce em português brasileiro.
Use Bloom's Taxonomy, Chain-of-Thought, Knowledge Graph e Retrieval Practice.

Título: ${title}
Nível Bloom alvo: ${BLOOM_LABELS[options.bloomLevel]}
Estudante: ${STUDENT_LABELS[options.studentLevel]}
Focos: ${focus}

Conteúdo:
${content.slice(0, 10000)}

Retorne APENAS JSON válido:
{
  "summary": "resumo L1 até L${options.bloomLevel}",
  "explanation": "explicação didática calibrada",
  "examples": "exemplos práticos Salesforce",
  "tips": "dicas e armadilhas de certificação",
  "bloomCalibration": "nota sobre calibração",
  "knowledgeGraph": {
    "nodes": [{ "id": "n1", "label": "...", "type": "conceito|api|padrao|limitacao|armadilha", "mastery": 0, "codeExample": "opcional", "description": "..." }],
    "edges": [{ "from": "n1", "to": "n2", "relation": "..." }]
  },
  "cirpPlan": {
    "totalMinutes": 45,
    "dailyGoalMinutes": 30,
    "phases": [
      { "name": "Capturar", "key": "capturar", "minutes": 10, "tasks": ["..."] },
      { "name": "Internalizar", "key": "internalizar", "minutes": 15, "tasks": ["..."] },
      { "name": "Recuperar", "key": "recuperar", "minutes": 10, "tasks": ["..."] },
      { "name": "Praticar", "key": "praticar", "minutes": 10, "tasks": ["..."] }
    ]
  }
}`;

  try {
    const result = await invokeLLM(
      [{ role: "system", content: "Tutor Salesforce. JSON válido apenas." }, { role: "user", content: prompt }],
      { jsonMode: true }
    );
    const parsed = parseLLMJson<Partial<CognitiveAnalysis>>(result);
    return {
      bloomLevel: options.bloomLevel,
      studentLevel: options.studentLevel,
      focusAreas: options.focusAreas,
      summary: parsed.summary ?? "",
      explanation: parsed.explanation ?? "",
      examples: parsed.examples ?? "",
      tips: parsed.tips ?? "",
      bloomCalibration: parsed.bloomCalibration ?? BLOOM_LABELS[options.bloomLevel],
      knowledgeGraph: parsed.knowledgeGraph ?? buildDemoAnalysis().knowledgeGraph,
      cirpPlan: parsed.cirpPlan ?? buildDemoAnalysis().cirpPlan,
    };
  } catch {
    return buildDemoAnalysis(options.bloomLevel, options.studentLevel, options.focusAreas);
  }
}

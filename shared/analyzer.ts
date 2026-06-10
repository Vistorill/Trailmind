export type BloomLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type StudentLevel = "beginner" | "intermediate" | "advanced";
export type NodeType = "conceito" | "api" | "padrao" | "limitacao" | "armadilha";
export type FSRSRating = 1 | 2 | 3 | 4;

export const BLOOM_LEVELS = [
  { level: 1 as BloomLevel, name: "Lembrar", color: "bg-sky-500/20 border-sky-500/40 text-sky-300" },
  { level: 2 as BloomLevel, name: "Entender", color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
  { level: 3 as BloomLevel, name: "Aplicar", color: "bg-violet-500/20 border-violet-500/40 text-violet-300" },
  { level: 4 as BloomLevel, name: "Analisar", color: "bg-amber-500/20 border-amber-500/40 text-amber-300" },
  { level: 5 as BloomLevel, name: "Avaliar", color: "bg-rose-500/20 border-rose-500/40 text-rose-300" },
  { level: 6 as BloomLevel, name: "Criar", color: "bg-lime-500/20 border-lime-500/40 text-lime-300" },
] as const;

export const FOCUS_AREAS = [
  { id: "conceitos-chave", label: "Conceitos-chave" },
  { id: "gabarito", label: "Gabarito do teste" },
  { id: "casos-uso", label: "Casos de uso" },
  { id: "armadilhas", label: "Armadilhas comuns" },
  { id: "comparacoes", label: "Comparações" },
  { id: "boas-praticas", label: "Boas práticas" },
  { id: "limitacoes", label: "Limitações técnicas" },
  { id: "relacoes", label: "Relações com outros tópicos" },
] as const;

export const FSRS_RATINGS = [
  { rating: 1 as FSRSRating, label: "Não lembrei", color: "text-red-400 border-red-500/40" },
  { rating: 2 as FSRSRating, label: "Difícil", color: "text-orange-400 border-orange-500/40" },
  { rating: 3 as FSRSRating, label: "Bom", color: "text-green-400 border-green-500/40" },
  { rating: 4 as FSRSRating, label: "Fácil", color: "text-brand border-brand/40" },
] as const;

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  conceito: "Conceito",
  api: "API",
  padrao: "Padrão",
  limitacao: "Limitação",
  armadilha: "Armadilha",
};

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  conceito: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  api: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  padrao: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  limitacao: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  armadilha: "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

export interface KnowledgeNode {
  id: string;
  label: string;
  type: NodeType;
  mastery: number;
  codeExample?: string;
  description?: string;
}

export interface KnowledgeEdge {
  from: string;
  to: string;
  relation: string;
}

export interface CIRPPhase {
  name: string;
  key: "capturar" | "internalizar" | "recuperar" | "praticar";
  minutes: number;
  tasks: string[];
}

export interface TrailTestQuestion {
  question: string;
  options: Record<string, string>;
  correctAnswer?: string;
}

export interface TrailTestSection {
  id: string;
  title: string;
  source: "desafio" | "conteudo" | "gabarito";
  questions: TrailTestQuestion[];
  rawText?: string;
}

export interface AnalysisMeta {
  bloomLevel: BloomLevel;
  studentLevel: StudentLevel;
  focusAreas: string[];
  knowledgeGraph: { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] };
  cirpPlan: { phases: CIRPPhase[]; totalMinutes: number; dailyGoalMinutes: number };
  bloomCalibration?: string;
  extractedTests?: TrailTestSection[];
}

const TEST_SECTION_HEADER =
  /^(#{1,3}\s*|--\s*)?(desafio|challenge|teste|quiz|assessment|verificar|perguntas?)\b/im;

/** Extrai testes/desafios do conteúdo importado da trilha */
export function extractTestsFromContent(content: string, tips?: string): TrailTestSection[] {
  const sections: TrailTestSection[] = [];
  const fullText = `${content}\n\n${tips ?? ""}`;

  const blocks = fullText.split(
    /\n(?=#{1,3}\s|--\s*(?:teste|desafio|challenge|quiz)\b|\n(?:desafio|challenge|teste|quiz)\b)/i
  );

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(TEST_SECTION_HEADER);
    const hasPoints = /\+?\d+\s*pontos/i.test(trimmed);
    const hasTrailheadQuestions = hasTrailheadQuestionPattern(trimmed);
    const isTestSection =
      headerMatch ||
      (hasPoints && /\b(desafio|challenge|teste|quiz)\b/i.test(trimmed)) ||
      hasTrailheadQuestions ||
      (trimmed.includes("?") && /\b[A-D][\.\)]\s/.test(trimmed));

    if (!isTestSection && !/\?\s*\n.*[A-D][\.\)]/s.test(trimmed)) continue;

    const titleLine =
      trimmed
        .split("\n")
        .find(
          (l) =>
            TEST_SECTION_HEADER.test(l) ||
            /^desafio/i.test(l) ||
            /^--\s*teste/i.test(l) ||
            /^teste$/i.test(l.trim())
        ) ?? "Teste do conteúdo";

    const title =
      titleLine
        .replace(/^#+\s*/, "")
        .replace(/^--\s*/, "")
        .trim()
        .slice(0, 80) || "Teste do conteúdo";
    const questions = parseQuestionsFromBlock(trimmed);

    const source: TrailTestSection["source"] =
      /desafio|challenge/i.test(title) || (/teste/i.test(title) && hasPoints)
        ? "desafio"
        : /gabarito/i.test(title)
          ? "gabarito"
          : hasPoints
            ? "desafio"
            : "conteudo";

    sections.push({
      id: `test_${sections.length + 1}`,
      title,
      source,
      questions,
      rawText: questions.length === 0 ? trimmed.slice(0, 2000) : undefined,
    });
  }

  // Fallback: varre todo o texto por perguntas
  if (sections.length === 0) {
    const globalQuestions = parseQuestionsFromBlock(fullText);
    if (globalQuestions.length > 0) {
      sections.push({
        id: "test_1",
        title: /\bteste\b/i.test(fullText) ? "Teste" : "Teste do conteúdo",
        source: /\+?\d+\s*pontos/i.test(fullText) ? "desafio" : "conteudo",
        questions: globalQuestions,
      });
    }
  }

  // Indicador de desafio Trailhead sem questões extraídas
  if (
    sections.length === 0 &&
    (/\b(desafio|challenge)\b/i.test(fullText) || (/\bteste\b/i.test(fullText) && /\+?\d+\s*pontos/i.test(fullText)))
  ) {
    sections.push({
      id: "test_desafio",
      title: /\bteste\b/i.test(fullText) ? "Teste" : "Desafio Trailhead",
      source: "desafio",
      questions: [],
      rawText:
        "Esta unidade possui um teste/desafio interativo no Trailhead. As questões não estão no texto importado — acesse a unidade original para realizar o teste e ganhar pontos.",
    });
  }

  return sections;
}

/** Usa testes salvos ou reextrai do conteúdo quando o cache está vazio */
export function resolveExtractedTests(
  content: string,
  tips: string | undefined,
  stored?: TrailTestSection[],
  remote?: TrailTestSection[]
): TrailTestSection[] {
  const fresh = extractTestsFromContent(content, tips);
  const freshHasQuestions = fresh.some((s) => s.questions.length > 0);
  const remoteHasQuestions = remote?.some((s) => s.questions.length > 0) ?? false;
  const storedHasQuestions = stored?.some((s) => s.questions.length > 0) ?? false;

  if (freshHasQuestions) return fresh;
  if (remoteHasQuestions) return remote!;
  if (storedHasQuestions) return stored!;
  if (remote && remote.length > 0) return remote;
  if (fresh.length > 0) return fresh;
  return stored ?? remote ?? fresh;
}

function hasTrailheadQuestionPattern(text: string): boolean {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length - 2; i++) {
    if (!/^\d+$/.test(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length && !/^[A-D]$/i.test(lines[j]) && !/^\d+$/.test(lines[j])) j++;
    if (j >= lines.length || !/^[A-D]$/i.test(lines[j])) continue;
    let letters = 0;
    while (j < lines.length && /^[A-D]$/i.test(lines[j])) {
      letters++;
      j++;
      if (j < lines.length && lines[j] && !/^[A-D]$/i.test(lines[j]) && !/^\d+$/.test(lines[j])) j++;
    }
    if (letters >= 2) return true;
  }
  return false;
}

function parseQuestionsFromBlock(text: string): TrailTestQuestion[] {
  const trailhead = parseTrailheadVerticalQuestions(text);
  if (trailhead.length > 0) return trailhead;

  const questions: TrailTestQuestion[] = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const isQuestion =
      line.endsWith("?") || /^(qual|quais|como|o que|what|which|how)\b/i.test(line);

    if (isQuestion && line.length > 15) {
      const options: Record<string, string> = {};
      let j = i + 1;
      while (j < lines.length) {
        const inline = lines[j].match(/^([A-D])[\.\)]\s*(.+)/i);
        const letterOnly = lines[j].match(/^([A-D])$/i);
        if (inline) {
          options[inline[1].toUpperCase()] = inline[2].trim();
          j++;
        } else if (letterOnly && j + 1 < lines.length) {
          const letter = letterOnly[1].toUpperCase();
          options[letter] = lines[j + 1].trim();
          j += 2;
        } else if (lines[j].endsWith("?") || lines[j].startsWith("#") || lines[j].startsWith("--")) {
          break;
        } else if (Object.keys(options).length > 0) {
          break;
        } else {
          j++;
        }
      }
      if (Object.keys(options).length >= 2) {
        questions.push({ question: line.replace(/^#+\s*/, ""), options });
        i = j;
        continue;
      }
    }
    i++;
  }

  return questions;
}

/** Formato Trailhead: número em linha separada, opções A/B/C/D em linhas separadas */
function parseTrailheadVerticalQuestions(text: string): TrailTestQuestion[] {
  const questions: TrailTestQuestion[] = [];
  const lines = text.split("\n").map((l) => l.trim());

  let i = 0;
  while (i < lines.length) {
    while (i < lines.length && !lines[i]) i++;
    if (i >= lines.length) break;

    const isNumbered = /^\d+$/.test(lines[i]);
    if (!isNumbered) {
      i++;
      continue;
    }

    i++;
    const questionParts: string[] = [];
    while (
      i < lines.length &&
      lines[i] &&
      !/^[A-D]$/i.test(lines[i]) &&
      !/^\d+$/.test(lines[i]) &&
      !TEST_SECTION_HEADER.test(lines[i])
    ) {
      questionParts.push(lines[i]);
      i++;
    }

    const question = questionParts.join(" ").trim();
    if (!question || question.length < 10) continue;

    const options: Record<string, string> = {};
    while (i < lines.length && /^[A-D]$/i.test(lines[i])) {
      const letter = lines[i].toUpperCase();
      i++;
      const optParts: string[] = [];
      while (
        i < lines.length &&
        lines[i] &&
        !/^[A-D]$/i.test(lines[i]) &&
        !/^\d+$/.test(lines[i]) &&
        !TEST_SECTION_HEADER.test(lines[i])
      ) {
        optParts.push(lines[i]);
        i++;
      }
      if (optParts.length > 0) options[letter] = optParts.join(" ").trim();
    }

    if (Object.keys(options).length >= 2) {
      questions.push({ question, options });
    }
  }

  return questions;
}

export interface CognitiveAnalysis extends AnalysisMeta {
  summary: string;
  explanation: string;
  examples: string;
  tips: string;
}

export const DEMO_CONTENT = {
  title: "Triggers e Order of Execution",
  url: "https://trailhead.salesforce.com/content/learn/modules/apex_triggers",
  content: `Triggers Apex são blocos de código que executam antes ou depois de operações DML (insert, update, delete, undelete) em registros Salesforce.

Order of Execution no Salesforce:
1. Validações de nível de sistema
2. Before triggers
3. Validações customizadas
4. Duplicação rules
5. Salvar registro (mas não commitado)
6. After triggers
7. Assignment rules
8. Processos de aprovação
9. Workflow rules
10. Process Builder / Flow (record-triggered)
11. Entitlement rules
12. Commit da transação

Bulkificação: triggers devem processar até 200 registros por contexto. Use Map<Id, SObject> para evitar SOQL em loops.

Governor Limits: máximo 100 SOQL queries e 150 DML statements por transação.

Trigger Handler Pattern: separar lógica em classes handler para testabilidade e manutenção.

Testes: todo trigger precisa de pelo menos 75% de cobertura de código para deploy em produção.`,
};

export function buildDemoAnalysis(
  bloomLevel: BloomLevel = 3,
  studentLevel: StudentLevel = "intermediate",
  focusAreas: string[] = ["conceitos-chave", "gabarito", "armadilhas"]
): CognitiveAnalysis {
  return {
    bloomLevel,
    studentLevel,
    focusAreas,
    summary:
      "Triggers Apex executam código customizado antes ou depois de operações DML. A Order of Execution define a sequência exata de validações, triggers, flows e regras — essencial para certificação Platform Developer.",
    explanation:
      "Um trigger é acionado por eventos DML em um objeto. O contexto Trigger.new (before insert/update) permite modificar registros antes do commit; Trigger.old acessa valores anteriores em update/delete.\n\nA Order of Execution é frequentemente cobrada em provas: before triggers rodam ANTES do save, after triggers DEPOIS. Flows record-triggered executam após after triggers.\n\nBulkificação obrigatória: nunca faça SOQL ou DML dentro de loops sobre Trigger.new — colete IDs primeiro, consulte uma vez, processe em Map.",
    examples:
      "Cenário: ao criar Opportunity, atualizar Account.TotalRevenue.\n\n1. Collect accountIds de Trigger.new\n2. SOQL único: SELECT Id, TotalRevenue FROM Account WHERE Id IN :accountIds\n3. Atualizar em lista e DML único\n\nTrigger Handler: OpportunityTrigger → OpportunityTriggerHandler.onAfterInsert()",
    tips:
      "Armadilha #1: esquecer que before trigger pode modificar Trigger.new mas after trigger não.\nArmadilha #2: recursive triggers — use static boolean flag.\nArmadilha #3: Flow + Trigger na mesma transação — conheça a ordem.\nGabarito: memorize os 12 passos da Order of Execution.",
    knowledgeGraph: {
      nodes: [
        { id: "n1", label: "Trigger Apex", type: "conceito", mastery: 0, description: "Bloco de código DML-driven" },
        { id: "n2", label: "Order of Execution", type: "padrao", mastery: 0, description: "Sequência de 12 etapas" },
        { id: "n3", label: "Trigger.new / Trigger.old", type: "api", mastery: 0, codeExample: "for (Opportunity o : Trigger.new) { ... }" },
        { id: "n4", label: "Bulkificação", type: "padrao", mastery: 0, description: "Processar 200 registros sem SOQL em loop" },
        { id: "n5", label: "Governor Limits", type: "limitacao", mastery: 0, description: "100 SOQL / 150 DML por transação" },
        { id: "n6", label: "SOQL em loop", type: "armadilha", mastery: 0, description: "Causa LimitException" },
        { id: "n7", label: "Trigger Handler Pattern", type: "padrao", mastery: 0, description: "Separação de responsabilidades" },
      ],
      edges: [
        { from: "n1", to: "n2", relation: "segue" },
        { from: "n1", to: "n3", relation: "usa" },
        { from: "n1", to: "n4", relation: "exige" },
        { from: "n4", to: "n5", relation: "respeita" },
        { from: "n6", to: "n5", relation: "viola" },
        { from: "n1", to: "n7", relation: "implementa" },
      ],
    },
    cirpPlan: {
      totalMinutes: 45,
      dailyGoalMinutes: 30,
      phases: [
        { name: "Capturar", key: "capturar", minutes: 10, tasks: ["Ler unidade Trailhead", "Importar conteúdo no analisador", "Identificar conceitos-chave"] },
        { name: "Internalizar", key: "internalizar", minutes: 15, tasks: ["Estudar resumo L1–L3", "Revisar mapa de conhecimento", "Ler exemplos de código"] },
        { name: "Recuperar", key: "recuperar", minutes: 10, tasks: ["Quiz adaptativo (sem gabarito antecipado)", "Flashcards FSRS"] },
        { name: "Praticar", key: "praticar", minutes: 10, tasks: ["Resolver cenários práticos", "Revisar armadilhas e lacunas"] },
      ],
    },
    bloomCalibration: `Conteúdo calibrado de L1 (definições) até L${bloomLevel} (${BLOOM_LEVELS[bloomLevel - 1].name}). Nível do estudante: ${studentLevel}.`,
  };
}

export function updateNodeMastery(
  graph: AnalysisMeta["knowledgeGraph"],
  topicId: string,
  delta: number
): AnalysisMeta["knowledgeGraph"] {
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === topicId || n.label.toLowerCase().includes(topicId.toLowerCase())
        ? { ...n, mastery: Math.max(0, Math.min(100, n.mastery + delta)) }
        : n
    ),
  };
}

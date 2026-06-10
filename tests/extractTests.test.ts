import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { extractTestsFromContent, resolveExtractedTests } from "../shared/analyzer";
import { extractChallengeFromHtml, challengeToTestSections } from "../server/services/fetchTrailhead";

const TRAILHEAD_TEST = `-- Teste
Para concluir esta unidade, você precisa responder corretamente a todas as perguntas do teste.
+100 pontos

1
O que permite que o Agentforce chame diferentes subagentes e ações à medida que uma conversa muda?

A
A Camada de confiança

B
O Atlas Reasoning Engine

C
Os canais usados na conversa

D
As proteções existentes

2
Quais são as tarefas individuais para as quais um agente está configurado?

A
Subagentes

B
O grande modelo de linguagem (LLM)

C
Ações

D
O tipo de agente`;

describe("extractTestsFromContent", () => {
  it("extrai teste Trailhead com perguntas numeradas e opções em linhas separadas", () => {
    const sections = extractTestsFromContent(TRAILHEAD_TEST);
    expect(sections.length).toBeGreaterThan(0);

    const section = sections[0];
    expect(section.title.toLowerCase()).toContain("teste");
    expect(section.source).toBe("desafio");
    expect(section.questions).toHaveLength(2);

    expect(section.questions[0].question).toContain("Agentforce");
    expect(section.questions[0].options.A).toContain("Camada de confiança");
    expect(section.questions[0].options.B).toContain("Atlas Reasoning Engine");

    expect(section.questions[1].question).toContain("tarefas individuais");
    expect(section.questions[1].options.C).toBe("Ações");
  });

  it("extrai perguntas mesmo quando embutidas no meio do conteúdo", () => {
    const content = `## Introdução ao Agentforce

Conteúdo da unidade sobre agentes.

${TRAILHEAD_TEST}`;
    const sections = extractTestsFromContent(content);
    const allQuestions = sections.flatMap((s) => s.questions);
    expect(allQuestions.length).toBe(2);
  });

  it("prefere reextração quando cache salvo só tem rawText vazio", () => {
    const stored = [
      {
        id: "test_1",
        title: "Desafio +100 pontos",
        source: "desafio" as const,
        questions: [],
        rawText: "Desafio +100 pontos",
      },
    ];
    const resolved = resolveExtractedTests(TRAILHEAD_TEST, undefined, stored);
    expect(resolved[0].questions).toHaveLength(2);
  });
});

describe("extractChallengeFromHtml", () => {
  it("extrai quiz do componente challenge/Challenge do Trailhead", () => {
    const html = readFileSync("/tmp/th2.html", "utf8");
    const challenge = extractChallengeFromHtml(html);
    expect(challenge).not.toBeNull();
    expect(challenge!.questions).toHaveLength(2);
    expect(challenge!.questions[0].question).toContain("Agentforce chame");

    const sections = challengeToTestSections(challenge!);
    expect(sections[0].questions).toHaveLength(2);
    expect(sections[0].questions[0].options.B).toContain("Atlas Reasoning Engine");
  });
});

import { describe, it, expect } from "vitest";
import { attachCorrectAnswersToSections } from "../server/services/resolveTestAnswers";

const AGENTFORCE_CONTENT = `
## Raciocínio
Esse é o cérebro por trás de cada agente. O mecanismo de raciocínio permite que os agentes processem e entendam a intenção humana e tomem medidas durante uma conversa para chamar diferentes subagentes e ações à medida que a conversa muda. O Salesforce conta com o Atlas Reasoning Engine para fazer esse trabalho.

## Como os agentes funcionam
Com o Agentforce, você pode configurá-lo para fazer qualquer coisa, e as tarefas que cada agente faz determinam de que forma os usuários interagem com ele. Os agentes usam ações para executar tarefas específicas configuradas para cada tipo de agente.
`;

describe("attachCorrectAnswersToSections", () => {
  it("infere gabarito pelo conteúdo da trilha (heurística)", async () => {
    const sections = [
      {
        id: "test_1",
        title: "Teste",
        source: "desafio" as const,
        questions: [
          {
            question:
              "O que permite que o Agentforce chame diferentes subagentes e ações à medida que uma conversa muda?",
            options: {
              A: "A Camada de confiança",
              B: "O Atlas Reasoning Engine",
              C: "Os canais usados na conversa",
              D: "As proteções existentes",
            },
          },
          {
            question: "Quais são as tarefas individuais para as quais um agente está configurado?",
            options: {
              A: "Subagentes",
              B: "O grande modelo de linguagem (LLM)",
              C: "Ações",
              D: "O tipo de agente",
            },
          },
        ],
      },
    ];

    const result = await attachCorrectAnswersToSections(AGENTFORCE_CONTENT, sections);
    expect(result[0].questions[0].correctAnswer).toBe("B");
    expect(result[0].questions[1].correctAnswer).toBe("C");
  });
});

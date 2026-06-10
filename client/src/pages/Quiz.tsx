import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { UpgradeModal } from "@/components/UpgradeModal";

export function Quiz() {
  const [trailId, setTrailId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Array<{
    id: number;
    question: string;
    options: Record<string, string>;
    difficulty: string;
  }>>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{
    score: number;
    correct: number;
    total: number;
    results: Array<{ quizId: number; isCorrect: boolean; correctAnswer: string; explanation: string | null }>;
  } | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data: trails } = trpc.trails.list.useQuery();
  const { data: weakTopics } = trpc.weakTopics.list.useQuery();

  const generate = trpc.trails.generateQuiz.useMutation({
    onSuccess: (data) => {
      setQuestions(data.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options as Record<string, string>,
        difficulty: q.difficulty,
      })));
      setResult(null);
      setAnswers({});
      toast.success("Quiz gerado!");
    },
    onError: (e) => {
      if (e.message === "QUOTA_EXCEEDED") setShowUpgrade(true);
      else toast.error(e.message);
    },
  });

  const submit = trpc.quiz.submitBatch.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Score: ${data.score}%`);
    },
    onError: (e) => {
      if (e.message === "QUOTA_EXCEEDED") setShowUpgrade(true);
      else toast.error(e.message);
    },
  });

  const handleSubmit = () => {
    const batch = Object.entries(answers).map(([quizId, selectedAnswer]) => ({
      quizId: Number(quizId),
      selectedAnswer,
    }));
    if (batch.length === 0) return toast.error("Responda pelo menos uma questão");
    submit.mutate({ answers: batch });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Quiz</h1>

      <Card className="space-y-4">
        <select
          value={trailId ?? ""}
          onChange={(e) => setTrailId(Number(e.target.value) || null)}
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm"
        >
          <option value="">Selecione uma trilha...</option>
          {trails?.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
        <Button
          onClick={() => trailId && generate.mutate({ trailId, count: 5 })}
          disabled={!trailId || generate.isPending}
        >
          {generate.isPending ? "Gerando..." : "Gerar quiz (5 questões)"}
        </Button>
      </Card>

      {questions.length > 0 && !result && (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <Card key={q.id}>
              <p className="font-medium mb-3">{i + 1}. {q.question}</p>
              <div className="space-y-2">
                {Object.entries(q.options).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: key }))}
                    className={cn(
                      "w-full text-left rounded-xl border px-4 py-2 text-sm transition-colors",
                      answers[q.id] === key ? "border-brand bg-brand/10" : "border-slate-700 hover:border-slate-600"
                    )}
                  >
                    <span className="font-medium mr-2">{key}.</span>{val}
                  </button>
                ))}
              </div>
            </Card>
          ))}
          <Button onClick={handleSubmit} disabled={submit.isPending}>
            {submit.isPending ? "Corrigindo..." : "Enviar respostas"}
          </Button>
        </div>
      )}

      {result && (
        <Card>
          <h2 className="text-xl font-bold text-brand mb-4">
            Score: {result.score}% ({result.correct}/{result.total})
          </h2>
          {result.results.filter((r) => !r.isCorrect).map((r) => (
            <div key={r.quizId} className="mb-4 pb-4 border-b border-slate-800">
              <p className="text-red-400 text-sm">Resposta correta: {r.correctAnswer}</p>
              <p className="text-slate-400 text-sm mt-1">{r.explanation}</p>
            </div>
          ))}
          <Button variant="secondary" onClick={() => { setResult(null); setQuestions([]); }}>Novo quiz</Button>
        </Card>
      )}

      {weakTopics && weakTopics.length > 0 && (
        <Card>
          <h2 className="font-semibold mb-3">Lacunas de conhecimento</h2>
          <ul className="space-y-2">
            {weakTopics.map((t) => (
              <li key={t.id} className="flex justify-between text-sm">
                <span>{t.topicName}</span>
                <span className="text-red-400">{t.errorCount} erros</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}

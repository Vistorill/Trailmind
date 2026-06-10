import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Brain, Sparkles, Star, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { UpgradeModal } from "@/components/UpgradeModal";
import { cn } from "@/lib/utils";
import {
  BLOOM_LEVELS,
  FOCUS_AREAS,
  FSRS_RATINGS,
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  DEMO_CONTENT,
  extractTestsFromContent,
  resolveExtractedTests,
  type CognitiveAnalysis,
  type BloomLevel,
  type StudentLevel,
  type FSRSRating,
  type AnalysisMeta,
  type TrailTestSection,
} from "@shared/analyzer";

type MainTab = "importar" | "analise" | "mapa" | "quiz" | "flashcards" | "teste";

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: "importar", label: "Importar" },
  { id: "analise", label: "Análise" },
  { id: "mapa", label: "Mapa do conhecimento" },
  { id: "quiz", label: "Quiz adaptativo" },
  { id: "flashcards", label: "Flashcards FSRS" },
  { id: "teste", label: "Teste" },
];

const STUDENT_LEVELS = [
  { value: "beginner" as StudentLevel, label: "Iniciante" },
  { value: "intermediate" as StudentLevel, label: "Intermediário" },
  { value: "advanced" as StudentLevel, label: "Avançado" },
];

export function Analyze() {
  const [mainTab, setMainTab] = useState<MainTab>("importar");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [bloomLevel, setBloomLevel] = useState<BloomLevel>(3);
  const [studentLevel, setStudentLevel] = useState<StudentLevel>("intermediate");
  const [focusAreas, setFocusAreas] = useState<string[]>(["conceitos-chave", "gabarito", "casos-uso", "armadilhas"]);
  const [result, setResult] = useState<(CognitiveAnalysis & { trailId: number; title: string }) | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [progress, setProgress] = useState(0);
  const [debouncedUrl, setDebouncedUrl] = useState("");
  const lastFetchedUrl = useRef("");

  const isTrailheadUrl = (u: string) =>
    /^https?:\/\/([\w-]+\.)?trailhead\.salesforce\.com\//i.test(u);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUrl(url.trim()), 600);
    return () => clearTimeout(timer);
  }, [url]);

  const {
    data: urlPreview,
    isFetching: fetchingUrl,
    error: urlPreviewError,
  } = trpc.trails.previewUrl.useQuery(
    { url: debouncedUrl },
    { enabled: isTrailheadUrl(debouncedUrl), retry: false, staleTime: 60_000 }
  );

  useEffect(() => {
    if (!urlPreview || debouncedUrl === lastFetchedUrl.current) return;
    lastFetchedUrl.current = debouncedUrl;
    setTitle(urlPreview.title);
    setContent(urlPreview.content);
    toast.success(`"${urlPreview.title}" importado (${urlPreview.contentLength.toLocaleString()} caracteres)`);
  }, [urlPreview, debouncedUrl]);

  useEffect(() => {
    if (urlPreviewError) {
      toast.error(urlPreviewError.message);
    }
  }, [urlPreviewError]);

  // Quiz state (retrieval practice)
  const [quizQuestions, setQuizQuestions] = useState<Array<{
    id: number;
    question: string;
    options: Record<string, string>;
    topicId?: string;
  }>>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<Array<{
    quizId: number;
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string | null;
  }> | null>(null);

  // Flashcards FSRS state
  const [fcIndex, setFcIndex] = useState(0);
  const [fcFlipped, setFcFlipped] = useState(false);
  const [fcCards, setFcCards] = useState<Array<{ id: number; front: string; back: string }>>([]);
  const [testeAnswers, setTesteAnswers] = useState<Record<string, string>>({});
  const [gabaritoSections, setGabaritoSections] = useState<TrailTestSection[] | null>(null);
  const [gabaritoAnalyzed, setGabaritoAnalyzed] = useState(false);
  const [gabaritoExplanation, setGabaritoExplanation] = useState<string | null>(null);
  const [loadingTrailId, setLoadingTrailId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: trails, refetch } = trpc.trails.list.useQuery(undefined, {
    refetchOnMount: "always",
  });
  const { data: trailDetail, refetch: refetchTrail } = trpc.trails.getById.useQuery(
    { id: result?.trailId ?? 0 },
    { enabled: !!result?.trailId }
  );

  const analyze = trpc.trails.analyze.useMutation({
    onMutate: () => {
      setProgress(10);
      const iv = setInterval(() => setProgress((p) => Math.min(p + 8, 90)), 400);
      return () => clearInterval(iv);
    },
    onSuccess: (data) => {
      setProgress(100);
      const analysis = data as CognitiveAnalysis & { trailId: number; title: string };
      setResult({
        ...analysis,
        extractedTests: extractTestsFromContent(content, analysis.tips),
      });
      setTesteAnswers({});
      setGabaritoSections(null);
      setGabaritoAnalyzed(false);
      setGabaritoExplanation(null);
      refetch();
      setMainTab("analise");
      toast.success("Análise cognitiva concluída!");
      setTimeout(() => setProgress(0), 600);
    },
    onError: (e) => {
      setProgress(0);
      if (e.message === "QUOTA_EXCEEDED") setShowUpgrade(true);
      else toast.error(e.message);
    },
  });

  const generateQuiz = trpc.trails.generateQuiz.useMutation({
    onSuccess: (data) => {
      setQuizQuestions(data.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options as Record<string, string>,
        topicId: (q as { topicId?: string }).topicId,
      })));
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizResults(null);
      setMainTab("quiz");
      toast.success("Quiz adaptativo gerado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const submitQuiz = trpc.quiz.submitBatch.useMutation({
    onSuccess: (data) => {
      setQuizSubmitted(true);
      setQuizResults(data.results);
      refetchTrail();
      toast.success(`Score: ${data.score}%`);
    },
    onError: (e) => toast.error(e.message),
  });

  const generateFc = trpc.trails.generateFlashcards.useMutation({
    onSuccess: (data) => {
      setFcCards(data.map((c) => ({ id: c.id, front: c.front, back: c.back })));
      setFcIndex(0);
      setFcFlipped(false);
      setMainTab("flashcards");
      toast.success("Flashcards FSRS gerados!");
    },
    onError: (e) => toast.error(e.message),
  });

  const reviewFc = trpc.flashcards.review.useMutation({
    onSuccess: () => {
      setFcFlipped(false);
      setFcIndex((i) => i + 1);
      toast.success("Card agendado pelo FSRS");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleFocus = (id: string) => {
    setFocusAreas((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  const loadDemo = () => {
    lastFetchedUrl.current = DEMO_CONTENT.url;
    setUrl(DEMO_CONTENT.url);
    setDebouncedUrl(DEMO_CONTENT.url);
    setTitle(DEMO_CONTENT.title);
    setContent(DEMO_CONTENT.content);
    toast.success("Demo carregada! Clique em Analisar com IA.");
  };

  const loadTrailAnalysis = async (trailId: number) => {
    setLoadingTrailId(trailId);
    try {
      const trail = await utils.trails.getById.fetch({ id: trailId });
      const meta = (trail.analysisMeta ?? {}) as AnalysisMeta;
      setResult({
        trailId: trail.id,
        title: trail.title,
        summary: trail.summary ?? "",
        explanation: trail.explanation ?? "",
        examples: trail.examples ?? "",
        tips: trail.tips ?? "",
        bloomLevel: meta.bloomLevel ?? 3,
        studentLevel: meta.studentLevel ?? "intermediate",
        focusAreas: meta.focusAreas ?? [],
        knowledgeGraph: meta.knowledgeGraph ?? { nodes: [], edges: [] },
        cirpPlan: meta.cirpPlan ?? { phases: [], totalMinutes: 30, dailyGoalMinutes: 30 },
        bloomCalibration: meta.bloomCalibration,
        extractedTests: resolveExtractedTests(
          trail.content,
          trail.tips ?? undefined,
          meta.extractedTests
        ),
      });
      setBloomLevel(meta.bloomLevel ?? 3);
      setStudentLevel(meta.studentLevel ?? "intermediate");
      setTitle(trail.title);
      setContent(trail.content);
      if (trail.url) {
        setUrl(trail.url);
        setDebouncedUrl(trail.url);
        lastFetchedUrl.current = trail.url;
      }
      setQuizQuestions([]);
      setQuizSubmitted(false);
      setFcCards([]);
      setTesteAnswers({});
      setGabaritoSections(null);
      setGabaritoAnalyzed(false);
      setGabaritoExplanation(null);
      setMainTab("analise");
      toast.success(`Análise "${trail.title}" restaurada`);
    } catch {
      toast.error("Erro ao carregar trilha");
    } finally {
      setLoadingTrailId(null);
    }
  };

  const handleAnalyze = (isDemo = false) => {
    if (!content || content.length < 50) {
      toast.error("Cole o conteúdo da unidade (mín. 50 caracteres)");
      return;
    }
    analyze.mutate({
      url: url || undefined,
      title: title || "Unidade Trailhead",
      content,
      bloomLevel,
      studentLevel,
      focusAreas,
      isDemo,
    });
  };

  const graph = (trailDetail?.analysisMeta as CognitiveAnalysis | undefined)?.knowledgeGraph
    ?? result?.knowledgeGraph;

  const cirp = (trailDetail?.analysisMeta as CognitiveAnalysis | undefined)?.cirpPlan
    ?? result?.cirpPlan;

  const currentFc = fcCards[fcIndex];

  const effectiveTrailUrl = (url.trim() || trailDetail?.url || "").trim();

  const localTests: TrailTestSection[] = result
    ? resolveExtractedTests(
        content,
        result.tips,
        (trailDetail?.analysisMeta as AnalysisMeta | undefined)?.extractedTests ??
          result.extractedTests
      )
    : [];

  const localHasQuestions = localTests.some((s) => s.questions.length > 0);

  const needsRemoteQuiz =
    !!result &&
    !!effectiveTrailUrl &&
    isTrailheadUrl(effectiveTrailUrl) &&
    !localHasQuestions;

  const { data: remoteQuiz, isFetching: loadingRemoteQuiz } = trpc.trails.fetchQuiz.useQuery(
    { url: effectiveTrailUrl },
    { enabled: needsRemoteQuiz && mainTab === "teste" }
  );

  const extractedTests: TrailTestSection[] = resolveExtractedTests(
    content,
    result?.tips,
    (trailDetail?.analysisMeta as AnalysisMeta | undefined)?.extractedTests ??
      result?.extractedTests,
    remoteQuiz?.sections
  );

  const baseTests = extractedTests;
  const displayTests = gabaritoSections ?? baseTests;
  const hasQuestions = displayTests.some((s) => s.questions.length > 0);

  const hasTesteContent =
    hasQuestions ||
    baseTests.some((s) => s.rawText) ||
    loadingRemoteQuiz ||
    (!!result && !!effectiveTrailUrl && isTrailheadUrl(effectiveTrailUrl));

  const analyzeGabarito = trpc.trails.analyzeTestGabarito.useMutation({
    onSuccess: (data) => {
      setGabaritoSections(data.sections);
      setGabaritoExplanation(data.explanation);
      setGabaritoAnalyzed(true);
      toast.success("Gabarito analisado!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAnalyzeGabarito = async () => {
    let sections = baseTests.filter((s) => s.questions.length > 0);
    if (!sections.length && effectiveTrailUrl && isTrailheadUrl(effectiveTrailUrl)) {
      try {
        const quiz = await utils.trails.fetchQuiz.fetch({ url: effectiveTrailUrl });
        sections = quiz.sections.filter((s) => s.questions.length > 0);
      } catch {
        toast.error("Erro ao buscar perguntas do Trailhead");
        return;
      }
    }
    if (!sections.length) {
      toast.error("Nenhuma pergunta encontrada neste teste.");
      return;
    }
    if (content.length < 50) {
      toast.error("Conteúdo da trilha insuficiente para analisar o gabarito.");
      return;
    }
    analyzeGabarito.mutate({ content, sections });
  };

  const getTesteOptionClass = (
    letter: string,
    correct?: string,
    selected?: string
  ) => {
    const base =
      "w-full text-left text-sm px-3 py-2.5 rounded-lg border transition-colors cursor-pointer";

    if (!gabaritoAnalyzed) {
      return cn(
        base,
        selected === letter
          ? "bg-brand/15 border-brand text-brand"
          : "bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
      );
    }

    if (!correct) {
      return cn(base, "bg-slate-800/50 border-slate-700 text-slate-300");
    }
    if (letter === correct) {
      return cn(base, "bg-green-500/20 border-green-500 text-green-300");
    }
    if (letter === selected) {
      return cn(base, "bg-red-500/20 border-red-500 text-red-300");
    }
    return cn(base, "bg-slate-800/30 border-slate-800 text-slate-500 opacity-50");
  };

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="text-brand" size={28} />
          Analisador de trilhas
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Motor cognitivo com FSRS, Bloom's Taxonomy, Retrieval Practice e Knowledge Graph
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-slate-800 pb-0">
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setMainTab(t.id)}
            disabled={t.id !== "importar" && !result}
            className={cn(
              "px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors",
              mainTab === t.id
                ? "bg-slate-800 text-brand border border-slate-700 border-b-transparent -mb-px"
                : "text-slate-500 hover:text-slate-300 disabled:opacity-30"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Progress */}
      {progress > 0 && (
        <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* ── TAB: Importar ── */}
      {mainTab === "importar" && (
        <div className="space-y-5">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">URL da unidade Trailhead</label>
            <div className="relative mt-1.5">
              <Input
                placeholder="https://trailhead.salesforce.com/pt-BR/content/learn/..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (!isTrailheadUrl(e.target.value.trim())) {
                    lastFetchedUrl.current = "";
                  }
                }}
                onPaste={() => {
                  lastFetchedUrl.current = "";
                }}
              />
              {fetchingUrl && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand animate-pulse">
                  Buscando...
                </span>
              )}
            </div>
            {urlPreview && !fetchingUrl && isTrailheadUrl(url) && (
              <p className="text-xs text-brand mt-1.5">
                ✓ {urlPreview.title} — {urlPreview.contentLength.toLocaleString()} caracteres importados
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 text-slate-600 text-xs">
            <div className="flex-1 h-px bg-slate-800" />
            ou cole o conteúdo
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conteúdo da unidade</label>
            <textarea
              className={cn("input-field mt-1.5 min-h-[160px] resize-y", fetchingUrl && "opacity-60")}
              placeholder={fetchingUrl ? "Importando conteúdo da URL..." : "Cole aqui o texto da unidade Trailhead ou cole uma URL acima para importar automaticamente"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              readOnly={fetchingUrl}
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Título da unidade</label>
              <Input className="mt-1.5" placeholder="Ex: Triggers e Order of Execution" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nível Bloom's</label>
              <select
                className="input-field mt-1.5"
                value={bloomLevel}
                onChange={(e) => setBloomLevel(Number(e.target.value) as BloomLevel)}
              >
                {BLOOM_LEVELS.map((b) => (
                  <option key={b.level} value={b.level}>{b.level} — {b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nível do estudante</label>
              <select
                className="input-field mt-1.5"
                value={studentLevel}
                onChange={(e) => setStudentLevel(e.target.value as StudentLevel)}
              >
                {STUDENT_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Focos da análise</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {FOCUS_AREAS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFocus(f.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                    focusAreas.includes(f.id)
                      ? "bg-white text-slate-900 border-white"
                      : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={() => handleAnalyze(false)} disabled={analyze.isPending} className="gap-2">
              <Sparkles size={16} />
              {analyze.isPending ? "Analisando..." : "Analisar com IA"}
            </Button>
            <Button variant="secondary" onClick={loadDemo}>Carregar demo</Button>
          </div>

          {/* Bloom Schema */}
          <Card className="!p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Schema de Análise Ativo</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {BLOOM_LEVELS.map((b) => (
                <div
                  key={b.level}
                  className={cn(
                    "rounded-xl border p-3 text-center text-xs relative",
                    b.color,
                    bloomLevel === b.level && "ring-2 ring-brand"
                  )}
                >
                  <p className="font-bold">L{b.level}</p>
                  <p className="mt-0.5 opacity-80">{b.name}</p>
                  {bloomLevel === b.level && (
                    <Star size={10} className="absolute top-1.5 right-1.5 text-brand fill-brand" />
                  )}
                  {bloomLevel === b.level && (
                    <span className="block text-[10px] text-brand mt-1">(alvo)</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              O analisador gera conteúdo de L1 ao seu nível-alvo. Quiz e flashcards são calibrados para o nível de Bloom selecionado.
            </p>
          </Card>
        </div>
      )}

      {/* ── TAB: Análise ── */}
      {mainTab === "analise" && result && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{result.title}</h2>
          {result.bloomCalibration && (
            <p className="text-xs text-brand bg-brand/10 border border-brand/20 rounded-lg px-3 py-2">{result.bloomCalibration}</p>
          )}

          {([
            { key: "summary", label: "Resumo" },
            { key: "explanation", label: "Explicação" },
            { key: "examples", label: "Exemplos" },
            { key: "tips", label: "Dicas & Armadilhas" },
          ] as const).map(({ key, label }) => (
            <Card key={key}>
              <h3 className="font-medium text-brand mb-2">{label}</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{result[key]}</p>
            </Card>
          ))}

          {/* CIRP Framework */}
          {cirp && (
            <Card>
              <h3 className="font-medium text-brand mb-4">Framework CIRP — Plano de Estudo</h3>
              <div className="flex items-center gap-1 flex-wrap mb-4">
                {cirp.phases.map((phase, i) => (
                  <div key={phase.key} className="flex items-center gap-1">
                    <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 min-w-[120px]">
                      <p className="text-xs text-brand font-semibold">{phase.name}</p>
                      <p className="text-lg font-bold">{phase.minutes}min</p>
                      <ul className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                        {phase.tasks.slice(0, 2).map((t) => <li key={t}>• {t}</li>)}
                      </ul>
                    </div>
                    {i < cirp.phases.length - 1 && <ChevronRight size={16} className="text-slate-600" />}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Total estimado: {cirp.totalMinutes} min · Meta diária: {cirp.dailyGoalMinutes} min
              </p>
            </Card>
          )}

          <div className="flex gap-3">
            <Button onClick={() => result.trailId && generateQuiz.mutate({ trailId: result.trailId, count: 5, bloomLevel })} disabled={generateQuiz.isPending}>
              Gerar Quiz Adaptativo
            </Button>
            <Button variant="secondary" onClick={() => result.trailId && generateFc.mutate({ trailId: result.trailId, count: 8, bloomLevel })} disabled={generateFc.isPending}>
              Gerar Flashcards FSRS
            </Button>
          </div>
        </div>
      )}

      {/* ── TAB: Mapa do conhecimento ── */}
      {mainTab === "mapa" && graph && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            {graph.nodes.length} nós · {graph.edges.length} relações · domínio atualizado em tempo real pelo quiz
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {graph.nodes.map((node) => (
              <Card key={node.id} className="!p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded border", NODE_TYPE_COLORS[node.type])}>
                      {NODE_TYPE_LABELS[node.type]}
                    </span>
                    <p className="font-medium mt-2 text-sm">{node.label}</p>
                    {node.description && <p className="text-xs text-slate-500 mt-1">{node.description}</p>}
                    {node.codeExample && (
                      <code className="block mt-2 text-[10px]">{node.codeExample}</code>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-lg font-bold", node.mastery >= 70 ? "text-brand" : node.mastery >= 40 ? "text-amber-400" : "text-red-400")}>
                      {node.mastery}%
                    </p>
                    <p className="text-[10px] text-slate-500">domínio</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 mt-3">
                  <div
                    className={cn("h-full rounded-full transition-all", node.mastery >= 70 ? "bg-brand" : node.mastery >= 40 ? "bg-amber-400" : "bg-red-400")}
                    style={{ width: `${node.mastery}%` }}
                  />
                </div>
              </Card>
            ))}
          </div>
          {graph.edges.length > 0 && (
            <Card className="!p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Relações</h3>
              <ul className="space-y-1">
                {graph.edges.map((e, i) => {
                  const from = graph.nodes.find((n) => n.id === e.from);
                  const to = graph.nodes.find((n) => n.id === e.to);
                  return (
                    <li key={i} className="text-xs text-slate-500">
                      <span className="text-slate-300">{from?.label}</span>
                      <span className="text-brand mx-1">—{e.relation}→</span>
                      <span className="text-slate-300">{to?.label}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB: Quiz adaptativo (Retrieval Practice) ── */}
      {mainTab === "quiz" && (
        <div className="space-y-4">
          {!result ? (
            <Card className="text-center py-12 text-slate-400">Analise uma trilha primeiro.</Card>
          ) : quizQuestions.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-slate-400 mb-4">Retrieval Practice: responda antes de ver o gabarito.</p>
              <Button onClick={() => generateQuiz.mutate({ trailId: result.trailId, count: 5, bloomLevel })} disabled={generateQuiz.isPending}>
                {generateQuiz.isPending ? "Gerando..." : "Gerar Quiz Adaptativo"}
              </Button>
            </Card>
          ) : (
            <>
              {!quizSubmitted ? (
                <>
                  {quizQuestions.map((q, i) => (
                    <Card key={q.id}>
                      <p className="font-medium mb-3">{i + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {Object.entries(q.options).filter(([k]) => !k.startsWith("_")).map(([key, val]) => (
                          <button
                            key={key}
                            onClick={() => setQuizAnswers((a) => ({ ...a, [q.id]: key }))}
                            className={cn(
                              "w-full text-left rounded-xl border px-4 py-2.5 text-sm transition-colors",
                              quizAnswers[q.id] === key ? "border-brand bg-brand/10" : "border-slate-700 hover:border-slate-600"
                            )}
                          >
                            <span className="font-medium mr-2">{key}.</span>{val}
                          </button>
                        ))}
                      </div>
                    </Card>
                  ))}
                  <Button
                    onClick={() => submitQuiz.mutate({
                      answers: Object.entries(quizAnswers).map(([quizId, selectedAnswer]) => ({
                        quizId: Number(quizId),
                        selectedAnswer,
                      })),
                    })}
                    disabled={submitQuiz.isPending || Object.keys(quizAnswers).length === 0}
                  >
                    {submitQuiz.isPending ? "Corrigindo..." : "Verificar respostas"}
                  </Button>
                </>
              ) : (
                <Card>
                  <h2 className="text-xl font-bold text-brand mb-4">
                    Resultado — {quizResults?.filter((r) => r.isCorrect).length}/{quizResults?.length} corretas
                  </h2>
                  {quizResults?.map((r) => {
                    const q = quizQuestions.find((q) => q.id === r.quizId);
                    return (
                      <div key={r.quizId} className="mb-4 pb-4 border-b border-slate-800 last:border-0">
                        <p className="text-sm mb-1">{q?.question}</p>
                        <p className={cn("text-sm font-medium", r.isCorrect ? "text-brand" : "text-red-400")}>
                          {r.isCorrect ? "✓ Correto" : `✗ Correto: ${r.correctAnswer}`}
                        </p>
                        {r.explanation && <p className="text-xs text-slate-400 mt-1">{r.explanation}</p>}
                      </div>
                    );
                  })}
                  <Button variant="secondary" onClick={() => { setQuizSubmitted(false); setQuizQuestions([]); }}>
                    Novo quiz
                  </Button>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: Flashcards FSRS ── */}
      {mainTab === "flashcards" && (
        <div className="space-y-4">
          {!result ? (
            <Card className="text-center py-12 text-slate-400">Analise uma trilha primeiro.</Card>
          ) : fcCards.length === 0 ? (
            <Card className="text-center py-12">
              <p className="text-slate-400 mb-4">FSRS agenda revisões com 20-30% menos repetições que SM-2.</p>
              <Button onClick={() => generateFc.mutate({ trailId: result.trailId, count: 8, bloomLevel })} disabled={generateFc.isPending}>
                {generateFc.isPending ? "Gerando..." : "Gerar Flashcards FSRS"}
              </Button>
            </Card>
          ) : currentFc ? (
            <Card className="min-h-[280px] flex flex-col items-center justify-center text-center">
              <p className="text-xs text-slate-500 mb-4">
                Card {fcIndex + 1}/{fcCards.length} — {fcFlipped ? "Resposta" : "Pergunta"} (clique para virar)
              </p>
              <div className="cursor-pointer w-full" onClick={() => setFcFlipped(!fcFlipped)}>
                <p className="text-lg px-4">{fcFlipped ? currentFc.back : currentFc.front}</p>
              </div>
              {fcFlipped && (
                <div className="flex gap-2 mt-8 flex-wrap justify-center">
                  {FSRS_RATINGS.map((r) => (
                    <button
                      key={r.rating}
                      onClick={() => reviewFc.mutate({ id: currentFc.id, rating: r.rating as FSRSRating })}
                      disabled={reviewFc.isPending}
                      className={cn("px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:bg-slate-800", r.color)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            <Card className="text-center py-12 text-brand">
              Todos os cards revisados! O FSRS agendou as próximas revisões.
              <Button className="mt-4" variant="secondary" onClick={() => { setFcIndex(0); setFcFlipped(false); }}>
                Revisar novamente
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* ── TAB: Teste (do conteúdo da trilha) ── */}
      {mainTab === "teste" && (
        <div className="space-y-4">
          {result && (
            <Card className="!p-4 flex flex-wrap items-center gap-3">
              <Button
                onClick={handleAnalyzeGabarito}
                disabled={analyzeGabarito.isPending || loadingRemoteQuiz}
                className="gap-2"
              >
                <Brain className="w-4 h-4" />
                {analyzeGabarito.isPending
                  ? "Analisando gabarito..."
                  : loadingRemoteQuiz
                    ? "Carregando teste..."
                    : "Analisar gabarito"}
              </Button>
              {gabaritoAnalyzed && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setGabaritoAnalyzed(false);
                    setGabaritoSections(null);
                    setGabaritoExplanation(null);
                    setTesteAnswers({});
                  }}
                >
                  Tentar novamente
                </Button>
              )}
              {!gabaritoAnalyzed && (
                <p className="text-xs text-slate-500">
                  Selecione suas respostas e clique em Analisar gabarito para verificar.
                </p>
              )}
            </Card>
          )}

          {!result ? (
            <Card className="text-center py-12 text-slate-400">
              Analise uma trilha ou carregue uma trilha analisada para ver os testes.
            </Card>
          ) : loadingRemoteQuiz ? (
            <Card className="text-center py-12 text-slate-400">
              Carregando teste do Trailhead...
            </Card>
          ) : !hasTesteContent ? (
            <Card className="text-center py-12 text-slate-400">
              Nenhum teste encontrado no conteúdo desta trilha.
            </Card>
          ) : (
            <>

              {gabaritoAnalyzed && gabaritoExplanation && (
                <Card className="!p-4 border-brand/20 bg-brand/5">
                  <h3 className="text-sm font-semibold text-brand mb-2">Análise do gabarito</h3>
                  <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {gabaritoExplanation}
                  </div>
                </Card>
              )}

              {displayTests.map((section) => (
              <Card key={section.id} className="!p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-brand">{section.title}</h3>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 px-2 py-0.5 rounded border border-slate-700">
                    {section.source}
                  </span>
                </div>

                {section.questions.length > 0 ? (
                  <div className="space-y-4">
                    {section.questions.map((q, qi) => {
                      const key = `${section.id}_${qi}`;
                      const selected = testeAnswers[key];
                      const answered = !!selected;
                      const isCorrect =
                        gabaritoAnalyzed && answered && selected === q.correctAnswer;
                      return (
                        <div key={key} className="border-t border-slate-800 pt-3">
                          <p className="text-sm font-medium mb-2">{qi + 1}. {q.question}</p>
                          <div className="space-y-1.5">
                            {Object.entries(q.options).map(([letter, opt]) => (
                              <button
                                key={letter}
                                type="button"
                                disabled={gabaritoAnalyzed}
                                onClick={() =>
                                  setTesteAnswers((prev) => ({ ...prev, [key]: letter }))
                                }
                                className={getTesteOptionClass(letter, q.correctAnswer, selected)}
                              >
                                <span className="font-medium mr-2">{letter}.</span>
                                {opt}
                              </button>
                            ))}
                          </div>
                          {gabaritoAnalyzed && q.correctAnswer && (
                            <p
                              className={cn(
                                "text-xs mt-2 rounded-lg px-3 py-2 border",
                                !answered
                                  ? "text-slate-400 bg-slate-800/50 border-slate-700"
                                  : isCorrect
                                    ? "text-green-300 bg-green-500/10 border-green-500/30"
                                    : "text-red-300 bg-red-500/10 border-red-500/30"
                              )}
                            >
                              {!answered
                                ? `Gabarito: ${q.correctAnswer} — ${q.options[q.correctAnswer]}`
                                : isCorrect
                                  ? "✓ Resposta correta!"
                                  : `✗ Incorreto. A resposta certa é ${q.correctAnswer} — ${q.options[q.correctAnswer]}`}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  section.rawText && (
                    <p className="text-sm text-slate-400 whitespace-pre-wrap">{section.rawText}</p>
                  )
                )}
              </Card>
            ))}
            </>
          )}
        </div>
      )}

      {/* Trilhas analisadas */}
      {trails && trails.length > 0 && (
        <Card className="!p-4">
          <h2 className="text-sm font-semibold text-slate-400 mb-3">Trilhas analisadas</h2>
          <ul className="space-y-2">
            {trails.map((t) => (
              <li
                key={t.id}
                className="text-sm flex items-center justify-between gap-3 border-b border-slate-800 pb-2 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate">{t.title}</span>
                  {t.bloomLevel && (
                    <span className="text-xs text-brand">Bloom L{t.bloomLevel}</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={result?.trailId === t.id ? "primary" : "secondary"}
                  onClick={() => loadTrailAnalysis(t.id)}
                  disabled={loadingTrailId === t.id}
                >
                  {loadingTrailId === t.id
                    ? "Carregando..."
                    : result?.trailId === t.id
                      ? "Atual"
                      : "Ver análise"}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}

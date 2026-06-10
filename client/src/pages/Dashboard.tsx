import { Link } from "wouter";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { ScanSearch, Brain, Flame, AlertTriangle } from "lucide-react";

export function Dashboard() {
  const { user } = useAuth();
  const { data: trails } = trpc.trails.list.useQuery(undefined, {
    refetchOnMount: "always",
  });
  const { data: weakTopics } = trpc.weakTopics.list.useQuery();
  const { data: gamification } = trpc.gamification.getSummary.useQuery();
  const { data: analytics } = trpc.analytics.dashboard.useQuery();

  const trailCount = trails?.length ?? 0;
  const quizScore = analytics?.quizScore ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {user?.name ?? "estudante"} 👋</h1>
        {!user?.onboardingCompleted ? (
          <p className="text-slate-400 mt-1">
            <Link href="/onboarding" className="text-brand hover:underline">
              Complete seu onboarding
            </Link>{" "}
            para personalizar sua experiência.
          </p>
        ) : user.studyGoalCertification ? (
          <p className="text-slate-400 mt-1">
            Continue firme rumo à certificação <span className="text-brand">{user.studyGoalCertification}</span>! 
            Você estuda {user.dailyStudyMinutes} min/dia.
          </p>
        ) : (
          <p className="text-slate-400 mt-1">Bem-vindo ao TrailMind. Configure seu perfil para começar.</p>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <ScanSearch className="text-brand" size={24} />
            <div>
              <p className="text-2xl font-bold">{trailCount}</p>
              <p className="text-sm text-slate-400">Trilhas analisadas</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Brain className="text-brand" size={24} />
            <div>
              <p className="text-2xl font-bold">{quizScore.toFixed(0)}%</p>
              <p className="text-sm text-slate-400">Score médio quiz</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Flame className="text-orange-400" size={24} />
            <div>
              <p className="text-2xl font-bold">{gamification?.streakDays ?? 0}</p>
              <p className="text-sm text-slate-400">Dias de sequência</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-2xl font-bold">{gamification?.totalPoints ?? 0}</p>
              <p className="text-sm text-slate-400">Pontos</p>
            </div>
          </div>
        </Card>
      </div>

      {trailCount === 0 ? (
        <Card className="text-center py-12">
          <ScanSearch className="mx-auto text-slate-600 mb-4" size={48} />
          <h2 className="font-semibold mb-2">Nenhuma trilha analisada ainda</h2>
          <p className="text-slate-400 text-sm mb-4">Importe conteúdo do Trailhead para começar a estudar com IA.</p>
          <Link href="/analyze"><Button>Analisar primeira trilha</Button></Link>
        </Card>
      ) : (
        <Card>
          <Link href="/settings" className="text-brand hover:underline text-sm">
            Complete suas configurações →
          </Link>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="text-yellow-400" size={20} />
          <h2 className="font-semibold">Lacunas de conhecimento</h2>
        </div>
        {weakTopics && weakTopics.length > 0 ? (
          <ul className="space-y-2">
            {weakTopics.slice(0, 3).map((t) => (
              <li key={t.id} className="flex justify-between text-sm border-b border-slate-800 pb-2">
                <span className="truncate">{t.topicName}</span>
                <span className="text-red-400">{t.errorCount} erros</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-400 text-sm">Nenhuma lacuna detectada. Faça um quiz!</p>
        )}
        <Link href="/quiz" className="text-brand text-sm mt-3 inline-block hover:underline">Ir para Quiz →</Link>
      </Card>

      {gamification?.badges && gamification.badges.length > 0 && (
        <Card>
          <h2 className="font-semibold mb-3">Badges</h2>
          <div className="flex flex-wrap gap-2">
            {gamification.badges.map((b) => (
              <span key={b.badge.id} className="px-3 py-1 rounded-full bg-brand/10 text-brand text-sm">
                🏅 {b.badge.name}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

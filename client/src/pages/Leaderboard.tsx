import { Card } from "@/components/ui/Card";
import { trpc } from "@/lib/trpc";
import { Trophy } from "lucide-react";

export function Leaderboard() {
  const { data: board, isLoading } = trpc.gamification.leaderboard.useQuery();

  if (isLoading) return <div className="animate-pulse text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="text-brand" /> Leaderboard
      </h1>

      <Card>
        <div className="space-y-2">
          {board?.map((entry, i) => (
            <div
              key={entry.userId}
              className="flex items-center gap-4 py-3 border-b border-slate-800 last:border-0"
            >
              <span className={`w-8 text-center font-bold ${i < 3 ? "text-brand" : "text-slate-500"}`}>
                {i + 1}
              </span>
              <span className="flex-1 font-medium">{entry.name}</span>
              <span className="text-brand font-semibold">{entry.totalPoints} pts</span>
            </div>
          ))}
          {(!board || board.length === 0) && (
            <p className="text-slate-400 text-center py-8">Nenhum ponto registrado ainda.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

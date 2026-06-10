import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { UpgradeModal } from "@/components/UpgradeModal";

import { FSRS_RATINGS, type FSRSRating } from "@shared/analyzer";

export function Flashcards() {
  const [trailId, setTrailId] = useState<number | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { data: trails } = trpc.trails.list.useQuery();
  const { data: dueCards, refetch } = trpc.flashcards.listDue.useQuery();

  const generate = trpc.trails.generateFlashcards.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Flashcards gerados!");
    },
    onError: (e) => {
      if (e.message === "QUOTA_EXCEEDED") setShowUpgrade(true);
      else toast.error(e.message);
    },
  });

  const review = trpc.flashcards.review.useMutation({
    onSuccess: () => {
      refetch();
      setFlipped(false);
      toast.success("Card revisado!");
    },
    onError: (e) => {
      if (e.message === "QUOTA_EXCEEDED") setShowUpgrade(true);
      else toast.error(e.message);
    },
  });

  const currentCard = dueCards?.[0];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Flashcards</h1>
      <p className="text-slate-400">
        {dueCards?.length ?? 0} cards para revisar hoje
      </p>

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
          onClick={() => trailId && generate.mutate({ trailId, count: 10 })}
          disabled={!trailId || generate.isPending}
        >
          {generate.isPending ? "Gerando..." : "Gerar flashcards (10)"}
        </Button>
      </Card>

      {currentCard ? (
        <Card className="min-h-[300px] flex flex-col items-center justify-center text-center">
          <div
            className="cursor-pointer w-full"
            onClick={() => setFlipped(!flipped)}
          >
            <p className="text-xs text-slate-500 mb-4">{flipped ? "Resposta" : "Pergunta"} — clique para virar</p>
            <p className="text-lg">{flipped ? currentCard.back : currentCard.front}</p>
          </div>

          {flipped && (
            <div className="flex gap-2 mt-8 flex-wrap justify-center">
              {FSRS_RATINGS.map((b) => (
                <Button
                  key={b.rating}
                  variant="secondary"
                  size="sm"
                  className={b.color}
                  onClick={() => review.mutate({ id: currentCard.id, rating: b.rating as FSRSRating })}
                  disabled={review.isPending}
                >
                  {b.label}
                </Button>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card className="text-center py-12 text-slate-400">
          Nenhum card para revisar. Gere flashcards de uma trilha!
        </Card>
      )}

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}

import { Card } from "@/components/ui/Card";
import { trpc } from "@/lib/trpc";
import { ScanSearch, Brain, MessageCircle, Layers } from "lucide-react";

const TYPE_LABELS: Record<string, { label: string; icon: typeof ScanSearch }> = {
  trail_analyzed: { label: "Trilha analisada", icon: ScanSearch },
  quiz_completed: { label: "Quiz completado", icon: Brain },
  chat_message: { label: "Mensagem no chat", icon: MessageCircle },
  flashcard_review: { label: "Flashcard revisado", icon: Layers },
};

export function History() {
  const { data: history, isLoading } = trpc.history.list.useQuery({ limit: 50 });

  if (isLoading) return <div className="animate-pulse text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Histórico</h1>

      {history && history.length > 0 ? (
        <div className="space-y-3">
          {history.map((item) => {
            const meta = TYPE_LABELS[item.type] ?? { label: item.type, icon: ScanSearch };
            const Icon = meta.icon;
            return (
              <Card key={item.id} className="flex items-center gap-4 py-4">
                <div className="p-2 rounded-xl bg-slate-800">
                  <Icon size={20} className="text-brand" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{meta.label}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleString("pt-BR")}
                    {item.durationMinutes ? ` · ${item.durationMinutes} min` : ""}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12 text-slate-400">
          Nenhuma atividade registrada ainda.
        </Card>
      )}
    </div>
  );
}

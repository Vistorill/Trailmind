import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { UpgradeModal } from "@/components/UpgradeModal";

export function Chat() {
  const [message, setMessage] = useState("");
  const [trailId, setTrailId] = useState<number | undefined>();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: trails } = trpc.trails.list.useQuery();
  const { data: history, refetch } = trpc.chat.history.useQuery({ limit: 50 });

  const send = trpc.chat.send.useMutation({
    onSuccess: () => {
      setMessage("");
      refetch();
    },
    onError: (e) => {
      if (e.message === "QUOTA_EXCEEDED") setShowUpgrade(true);
      else toast.error(e.message);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const messages = [...(history ?? [])].reverse();

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-8rem)]">
      <h1 className="text-2xl font-bold">Chat Mentor</h1>

      <select
        value={trailId ?? ""}
        onChange={(e) => setTrailId(e.target.value ? Number(e.target.value) : undefined)}
        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm max-w-md"
      >
        <option value="">Sem contexto de trilha</option>
        {trails?.map((t) => (
          <option key={t.id} value={t.id}>{t.title}</option>
        ))}
      </select>

      <Card className="flex-1 overflow-y-auto space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-slate-500 text-center py-8">Pergunte qualquer coisa sobre Salesforce!</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
              m.role === "user"
                ? "ml-auto bg-brand text-brand-foreground"
                : "bg-slate-800 text-slate-200"
            )}
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </Card>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!message.trim()) return;
          send.mutate({ message, trailId });
        }}
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Digite sua pergunta..."
          disabled={send.isPending}
        />
        <Button type="submit" disabled={send.isPending || !message.trim()}>
          {send.isPending ? "..." : "Enviar"}
        </Button>
      </form>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}

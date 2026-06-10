import { useRoute } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";

export function TopicDetail() {
  const [, params] = useRoute("/community/topic/:id");
  const topicId = Number(params?.id);
  const [reply, setReply] = useState("");

  const { data, refetch } = trpc.community.getTopic.useQuery({ id: topicId }, { enabled: !!topicId });
  const replyMutation = trpc.community.replyToTopic.useMutation({
    onSuccess: () => {
      refetch();
      setReply("");
      toast.success("Resposta publicada!");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!data) return <div className="animate-pulse text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-xl font-bold">{data.topic.title}</h1>
        <p className="text-slate-300 mt-3 whitespace-pre-wrap">{data.topic.content}</p>
      </Card>

      <h2 className="font-semibold">{data.posts.length} respostas</h2>
      {data.posts.map((post) => (
        <Card key={post.id} className="py-4">
          <p className="text-xs text-slate-500 mb-2">{post.authorName}</p>
          <p className="text-sm whitespace-pre-wrap">{post.content}</p>
        </Card>
      ))}

      <Card className="space-y-3">
        <textarea
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm min-h-[80px]"
          placeholder="Sua resposta..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <Button onClick={() => replyMutation.mutate({ topicId, content: reply })} disabled={replyMutation.isPending}>
          Responder
        </Button>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";

export function Community() {
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [groupName, setGroupName] = useState("");

  const { data: topics, refetch: refetchTopics } = trpc.community.listTopics.useQuery({});
  const { data: groups, refetch: refetchGroups } = trpc.community.listGroups.useQuery();

  const createTopic = trpc.community.createTopic.useMutation({
    onSuccess: () => {
      refetchTopics();
      setShowTopicForm(false);
      setTitle("");
      setContent("");
      toast.success("Tópico criado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const createGroup = trpc.community.createGroup.useMutation({
    onSuccess: () => {
      refetchGroups();
      setShowGroupForm(false);
      setGroupName("");
      toast.success("Grupo criado!");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Comunidade</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Fórum</h2>
            <Button size="sm" onClick={() => setShowTopicForm(!showTopicForm)}>Novo tópico</Button>
          </div>

          {showTopicForm && (
            <Card className="mb-4 space-y-3">
              <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
              <textarea
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm min-h-[100px]"
                placeholder="Conteúdo"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <Button onClick={() => createTopic.mutate({ title, content })} disabled={createTopic.isPending}>
                Publicar
              </Button>
            </Card>
          )}

          <div className="space-y-2">
            {topics?.map((t) => (
              <Link key={t.id} href={`/community/topic/${t.id}`}>
                <Card className="py-4 hover:border-slate-600 cursor-pointer transition-colors">
                  <p className="font-medium text-sm">{t.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {t.authorName} · {t.replyCount} respostas
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Grupos de Estudo</h2>
            <Button size="sm" onClick={() => setShowGroupForm(!showGroupForm)}>Criar grupo</Button>
          </div>

          {showGroupForm && (
            <Card className="mb-4 space-y-3">
              <Input placeholder="Nome do grupo" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              <Button onClick={() => createGroup.mutate({ name: groupName })} disabled={createGroup.isPending}>
                Criar
              </Button>
            </Card>
          )}

          <div className="space-y-2">
            {groups?.map((g) => (
              <Link key={g.id} href={`/community/groups/${g.id}`}>
                <Card className="py-4 hover:border-slate-600 cursor-pointer transition-colors">
                  <p className="font-medium text-sm">{g.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{g.memberCount} membros</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

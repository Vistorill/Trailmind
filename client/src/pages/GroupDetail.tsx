import { useRoute } from "wouter";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";

export function GroupDetail() {
  const [, params] = useRoute("/community/groups/:id");
  const groupId = Number(params?.id);

  const { data, refetch } = trpc.community.getGroup.useQuery({ id: groupId }, { enabled: !!groupId });
  const join = trpc.community.joinGroup.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Você entrou no grupo!");
    },
    onError: (e) => toast.error(e.message),
  });

  if (!data) return <div className="animate-pulse text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-xl font-bold">{data.group.name}</h1>
        <p className="text-slate-400 mt-2">{data.group.description ?? "Sem descrição"}</p>
        <p className="text-sm text-slate-500 mt-2">{data.group.memberCount} membros</p>
        <Button className="mt-4" onClick={() => join.mutate({ groupId })} disabled={join.isPending}>
          Entrar no grupo
        </Button>
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">Membros</h2>
        <p className="text-sm text-slate-400">{data.members.length} membros registrados</p>
      </Card>
    </div>
  );
}

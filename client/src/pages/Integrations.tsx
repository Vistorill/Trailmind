import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";

export function Integrations() {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("Default");

  const { data: keys, refetch } = trpc.integrations.listApiKeys.useQuery();
  const createKey = trpc.integrations.createApiKey.useMutation({
    onSuccess: (data) => {
      setNewKey(data.key);
      refetch();
      toast.success("API key criada!");
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteKey = trpc.integrations.deleteApiKey.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("API key removida");
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Integrações</h1>

      <Card>
        <h2 className="font-semibold mb-2">API Keys</h2>
        <p className="text-sm text-slate-400 mb-4">
          Use para autenticar requests externos em <code className="text-brand">/api/v1/trails</code>
        </p>

        <div className="flex gap-2 mb-4">
          <Input placeholder="Nome da key" value={keyName} onChange={(e) => setKeyName(e.target.value)} />
          <Button onClick={() => createKey.mutate({ name: keyName })} disabled={createKey.isPending}>
            Criar key
          </Button>
        </div>

        {newKey && (
          <div className="rounded-xl bg-brand/10 border border-brand/30 p-4 mb-4">
            <p className="text-sm text-brand mb-1">Copie sua key agora (não será exibida novamente):</p>
            <code className="text-xs break-all">{newKey}</code>
          </div>
        )}

        <ul className="space-y-2">
          {keys?.map((k) => (
            <li key={k.id} className="flex justify-between items-center text-sm border-b border-slate-800 py-2">
              <span>{k.name} ({k.keyPrefix}...)</span>
              <Button size="sm" variant="danger" onClick={() => deleteKey.mutate({ id: k.id })}>
                Remover
              </Button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-semibold mb-2">Salesforce OAuth</h2>
        <p className="text-sm text-slate-400">
          Conecte sua conta Salesforce para importar trilhas automaticamente. (Em breve)
        </p>
      </Card>
    </div>
  );
}

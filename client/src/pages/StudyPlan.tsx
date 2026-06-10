import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";

export function StudyPlan() {
  const [goal, setGoal] = useState("");
  const [months, setMonths] = useState(3);

  const { data: plans, refetch } = trpc.analytics.myStudyPlans.useQuery();
  const generate = trpc.analytics.generateStudyPlan.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Plano gerado!");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Plano de Estudo IA</h1>
      <p className="text-slate-400">Gere um roadmap personalizado para sua certificação Salesforce.</p>

      <Card className="space-y-4 max-w-lg">
        <Input
          placeholder='Ex: "Quero ser Administrator em 3 meses"'
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
        <div>
          <label className="text-sm text-slate-400">Duração (meses): {months}</label>
          <input
            type="range"
            min={1}
            max={12}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="w-full accent-brand mt-2"
          />
        </div>
        <Button
          onClick={() => generate.mutate({ goal, durationMonths: months })}
          disabled={!goal || generate.isPending}
        >
          {generate.isPending ? "Gerando plano..." : "Gerar plano com IA"}
        </Button>
      </Card>

      {plans?.map((plan) => {
        const milestones = plan.milestones as Array<{
          month: number;
          title: string;
          topics: string[];
          hours: number;
        }>;
        return (
          <Card key={plan.id}>
            <h2 className="font-semibold text-brand">{plan.goal}</h2>
            <p className="text-sm text-slate-500 mb-4">{plan.durationMonths} meses</p>
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={i} className="border-l-2 border-brand pl-4">
                  <p className="font-medium text-sm">Mês {m.month}: {m.title}</p>
                  <p className="text-xs text-slate-500">{m.hours}h · {m.topics?.join(", ")}</p>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

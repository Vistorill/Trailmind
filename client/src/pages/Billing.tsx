import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { PLAN_LIMITS } from "@shared/plans";
import { Check } from "lucide-react";

const PLANS = [
  { tier: "free" as const, name: "Free", price: "R$ 0", desc: "Para começar" },
  { tier: "pro" as const, name: "Pro", price: "R$ 29,90/mês", desc: "Estudante dedicado", highlight: true },
  { tier: "enterprise" as const, name: "Enterprise", price: "R$ 99,90/mês", desc: "Ilimitado" },
];

const FEATURE_LABELS: Record<string, string> = {
  trail_analyze: "Análises de trilha",
  quiz_answer: "Respostas de quiz",
  chat_message: "Mensagens no chat",
  flashcard_review: "Revisões de flashcard",
  visual_analysis: "Análises visuais",
};

export function Billing() {
  const { data: summary } = trpc.billing.getSummary.useQuery();
  const checkout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
      else toast.error("Stripe não configurado");
    },
    onError: (e) => toast.error(e.message),
  });
  const portal = trpc.billing.createPortal.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (e) => toast.error(e.message),
  });

  const tier = summary?.tier ?? "free";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="text-slate-400">
        Plano atual:{" "}
        <span className="text-brand font-medium capitalize">
          {summary?.isAdmin ? "Administrador" : tier}
        </span>
        {summary?.isAdmin && (
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-brand/15 text-brand">
            Uso ilimitado
          </span>
        )}
      </p>

      {summary?.usage && (
        <Card>
          <h2 className="font-semibold mb-4">Uso deste mês</h2>
          <div className="space-y-3">
            {Object.entries(summary.usage).map(([feature, { used, limit }]) => (
              <div key={feature}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{FEATURE_LABELS[feature] ?? feature}</span>
                  <span className="text-slate-400">
                    {used} / {limit === -1 ? "∞" : limit}
                  </span>
                </div>
                {limit > 0 && (
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-brand transition-all"
                      style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <Card key={plan.tier} className={plan.highlight ? "border-brand" : ""}>
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="text-2xl font-bold text-brand my-2">{plan.price}</p>
            <p className="text-sm text-slate-400 mb-4">{plan.desc}</p>
            <ul className="space-y-1 mb-4">
              {Object.entries(PLAN_LIMITS[plan.tier]).map(([f, limit]) => (
                <li key={f} className="text-xs flex items-center gap-1 text-slate-300">
                  <Check size={12} className="text-brand" />
                  {FEATURE_LABELS[f]}: {limit === -1 ? "∞" : limit}/mês
                </li>
              ))}
            </ul>
            {plan.tier !== "free" && tier !== plan.tier && (
              <Button
                className="w-full"
                onClick={() => checkout.mutate({ plan: plan.tier === "enterprise" ? "enterprise" : "pro", interval: "monthly" })}
                disabled={checkout.isPending}
              >
                Assinar
              </Button>
            )}
            {tier === plan.tier && plan.tier !== "free" && (
              <Button variant="secondary" className="w-full" onClick={() => portal.mutate()} disabled={portal.isPending}>
                Gerenciar assinatura
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

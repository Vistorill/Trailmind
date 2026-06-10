import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { trpc } from "@/lib/trpc";
import { CERTIFICATIONS } from "@shared/const";
import { cn } from "@/lib/utils";

const LEVELS = [
  { value: "beginner" as const, label: "Iniciante", desc: "Estou começando no Salesforce" },
  { value: "intermediate" as const, label: "Intermediário", desc: "Já tenho experiência básica" },
  { value: "advanced" as const, label: "Avançado", desc: "Busco certificações avançadas" },
];

export function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [cert, setCert] = useState("");
  const [minutes, setMinutes] = useState(30);

  const update = trpc.profile.update.useMutation({
    onSuccess: () => {
      toast.success("Perfil configurado!");
      setLocation("/dashboard");
    },
    onError: (e) => toast.error(e.message),
  });

  const finish = () => {
    update.mutate({
      learningLevel: level,
      studyGoalCertification: cert || null,
      dailyStudyMinutes: minutes,
      onboardingCompleted: true,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="text-2xl mb-2">🎯</div>
          <h1 className="text-xl font-bold">Bem-vindo ao TrailMind</h1>
          <p className="text-slate-400 text-sm">Passo {step + 1} de 3</p>
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold mb-4">Qual seu nível?</h2>
            {LEVELS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLevel(l.value)}
                className={cn(
                  "w-full text-left rounded-xl border p-4 transition-colors",
                  level === l.value ? "border-brand bg-brand/10" : "border-slate-700 hover:border-slate-600"
                )}
              >
                <p className="font-medium">{l.label}</p>
                <p className="text-sm text-slate-400">{l.desc}</p>
              </button>
            ))}
            <Button className="w-full mt-4" onClick={() => setStep(1)}>Próximo</Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Qual certificação você busca?</h2>
            <select
              value={cert}
              onChange={(e) => setCert(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm"
            >
              <option value="">Selecione...</option>
              {CERTIFICATIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Input
              placeholder="Ou digite outra certificação"
              value={cert}
              onChange={(e) => setCert(e.target.value)}
            />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(0)}>Voltar</Button>
              <Button className="flex-1" onClick={() => setStep(2)}>Próximo</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Minutos de estudo por dia</h2>
            <input
              type="range"
              min={5}
              max={120}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-full accent-brand"
            />
            <p className="text-center text-2xl font-bold text-brand">{minutes} min/dia</p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(1)}>Voltar</Button>
              <Button className="flex-1" onClick={finish} disabled={update.isPending}>
                {update.isPending ? "Salvando..." : "Começar"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

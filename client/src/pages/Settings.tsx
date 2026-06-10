import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { LEARNING_LEVELS, LANGUAGES, CERTIFICATIONS } from "@shared/const";

export function Settings() {
  const { data: profile, isLoading } = trpc.profile.get.useQuery();
  const update = trpc.profile.update.useMutation({
    onSuccess: () => toast.success("Perfil salvo!"),
    onError: (e) => toast.error(e.message),
  });

  const [name, setName] = useState("");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [cert, setCert] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [language, setLanguage] = useState("pt-BR");

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setLevel(profile.learningLevel);
      setCert(profile.studyGoalCertification ?? "");
      setMinutes(profile.dailyStudyMinutes);
      setLanguage(profile.preferredLanguage);
    }
  }, [profile]);

  const handleSave = () => {
    update.mutate({
      name,
      learningLevel: level,
      studyGoalCertification: cert || null,
      dailyStudyMinutes: minutes,
      preferredLanguage: language,
    });
  };

  if (isLoading) return <div className="animate-pulse text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>
      <Card className="space-y-4 max-w-lg">
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Nome</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">E-mail</label>
          <Input value={profile?.email ?? ""} readOnly className="opacity-60 cursor-not-allowed" />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Nível de aprendizado</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as typeof level)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm"
          >
            {LEARNING_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Meta de certificação</label>
          <select
            value={cert}
            onChange={(e) => setCert(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm mb-2"
          >
            <option value="">Selecione...</option>
            {CERTIFICATIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Input value={cert} onChange={(e) => setCert(e.target.value)} placeholder="Ou digite outra" />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Minutos de estudo/dia</label>
          <Input type="number" min={5} max={480} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Idioma preferido</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </Card>
    </div>
  );
}

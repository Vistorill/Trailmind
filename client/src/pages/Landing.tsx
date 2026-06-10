import { Link } from "wouter";
import { Button } from "@/components/ui/Button";
import { Check, Zap, Brain, Layers, MessageCircle, Trophy } from "lucide-react";

const FEATURES = [
  { icon: Zap, title: "Análise com IA", desc: "Importe trilhas Trailhead e receba resumos personalizados" },
  { icon: Brain, title: "Quiz Inteligente", desc: "Questões geradas por IA com detecção de lacunas" },
  { icon: Layers, title: "Flashcards SM-2", desc: "Repetição espaçada para memorização eficiente" },
  { icon: MessageCircle, title: "Chat Mentor", desc: "Professor particular de Salesforce 24/7" },
  { icon: Trophy, title: "Gamificação", desc: "Pontos, badges e leaderboard para motivar" },
];

const PLANS = [
  { name: "Free", price: "R$ 0", features: ["5 análises/mês", "20 quizzes/mês", "10 mensagens chat"] },
  { name: "Pro", price: "R$ 29,90/mês", features: ["50 análises/mês", "200 quizzes/mês", "100 mensagens chat"], highlight: true },
  { name: "Enterprise", price: "R$ 99,90/mês", features: ["Ilimitado", "Suporte prioritário", "API access"] },
];

const FAQ = [
  { q: "Preciso de conta Salesforce?", a: "Não! Você pode colar conteúdo manualmente ou importar URLs do Trailhead." },
  { q: "Funciona em português?", a: "Sim, toda a interface e respostas da IA são em português brasileiro." },
  { q: "Posso cancelar a qualquer momento?", a: "Sim, sem fidelidade. Cancele pelo portal de billing." },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-brand text-xl">
          <span>🎯</span> TrailMind
        </div>
        <div className="flex gap-3">
          <Link href="/auth"><Button variant="ghost">Entrar</Button></Link>
          <Link href="/auth?mode=signup"><Button>Criar conta</Button></Link>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Estude Salesforce Trailhead<br />
          <span className="text-brand">com IA</span>
        </h1>
        <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
          Seu professor particular para certificação Salesforce. Método 5C: Capturar, Compreender, Consolidar, Corrigir e Certificar.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/auth?mode=signup"><Button size="lg">Começar grátis</Button></Link>
          <Link href="/auth"><Button size="lg" variant="secondary">Já tenho conta</Button></Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Recursos</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <Icon className="text-brand mb-4" size={28} />
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-slate-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Planos</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 ${plan.highlight ? "border-brand bg-brand/5" : "border-slate-800 bg-slate-900"}`}
            >
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <p className="text-2xl font-bold text-brand mb-4">{plan.price}</p>
              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check size={16} className="text-brand" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">FAQ</h2>
        <div className="space-y-4">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h3 className="font-semibold mb-2">{q}</h3>
              <p className="text-slate-400 text-sm">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-slate-500 text-sm">
        © 2026 TrailMind. Todos os direitos reservados.
      </footer>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/_core/hooks/useAuth";

export function Auth() {
  const { user, loading, login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsSignup(params.get("mode") === "signup");
  }, []);

  useEffect(() => {
    if (!loading && user) {
      setLocation(user.onboardingCompleted ? "/dashboard" : "/onboarding", { replace: true });
    }
  }, [user, loading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isSignup) {
        const u = await register(email, password, name || undefined);
        toast.success("Conta criada com sucesso!");
        setLocation(u.onboardingCompleted ? "/dashboard" : "/onboarding", { replace: true });
      } else {
        const u = await login(email, password);
        toast.success("Bem-vindo de volta!");
        setLocation(u.onboardingCompleted ? "/dashboard" : "/onboarding", { replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">🎯</div>
          <h1 className="text-2xl font-bold text-brand">TrailMind</h1>
          <p className="text-slate-400 text-sm mt-1">
            {isSignup ? "Crie sua conta" : "Entre na sua conta"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Nome (opcional)</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>
          )}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">E-mail</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Senha</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Aguarde..." : isSignup ? "Criar conta" : "Entrar"}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          {isSignup ? "Já tem conta?" : "Não tem conta?"}{" "}
          <Link
            href={isSignup ? "/auth" : "/auth?mode=signup"}
            className="text-brand hover:underline"
          >
            {isSignup ? "Entrar" : "Criar conta"}
          </Link>
        </p>
      </div>
    </div>
  );
}

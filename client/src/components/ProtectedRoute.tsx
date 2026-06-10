import { useEffect } from "react";
import { useLocation } from "wouter";
import type { PublicUser } from "@shared/types";

interface ProtectedRouteProps {
  user: PublicUser | null;
  loading: boolean;
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ user, loading, children, requireOnboarding = true }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setLocation("/auth", { replace: true });
    } else if (requireOnboarding && !user.onboardingCompleted) {
      setLocation("/onboarding", { replace: true });
    }
  }, [user, loading, setLocation, requireOnboarding]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-pulse text-slate-400">Carregando...</div>
      </div>
    );
  }

  if (!user) return null;
  if (requireOnboarding && !user.onboardingCompleted) return null;

  return <>{children}</>;
}

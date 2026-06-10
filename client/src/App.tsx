import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { trpc, createTrpcClient } from "@/lib/trpc";
import { AuthProvider, useAuth } from "@/_core/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Landing } from "@/pages/Landing";
import { Auth } from "@/pages/Auth";
import { Onboarding } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { Settings } from "@/pages/Settings";
import { Analyze } from "@/pages/Analyze";
import { Quiz } from "@/pages/Quiz";
import { Flashcards } from "@/pages/Flashcards";
import { Chat } from "@/pages/Chat";
import { History } from "@/pages/History";
import { Billing } from "@/pages/Billing";
import { Courses } from "@/pages/Courses";
import { CourseDetail } from "@/pages/CourseDetail";
import { Certificates } from "@/pages/Certificates";
import { CertificateVerify } from "@/pages/CertificateVerify";
import { Leaderboard } from "@/pages/Leaderboard";
import { Community } from "@/pages/Community";
import { TopicDetail } from "@/pages/TopicDetail";
import { GroupDetail } from "@/pages/GroupDetail";
import { Analytics } from "@/pages/Analytics";
import { StudyPlan } from "@/pages/StudyPlan";
import { Integrations } from "@/pages/Integrations";
import { Visual } from "@/pages/Visual";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5000, retry: 1 } },
});
const trpcClient = createTrpcClient();

function OnboardingRoute() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!user) setLocation("/auth", { replace: true });
    else if (user.onboardingCompleted) setLocation("/dashboard", { replace: true });
  }, [user, loading, setLocation]);

  if (loading || !user) return null;
  return <Onboarding />;
}

function AppRoutes() {
  const { user, loading, logout } = useAuth();

  const shell = (page: React.ReactNode) => (
    <ProtectedRoute user={user} loading={loading}>
      <AppShell user={user!} onLogout={async () => { await logout(); window.location.href = "/auth"; }}>
        {page}
      </AppShell>
    </ProtectedRoute>
  );

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={Auth} />
      <Route path="/onboarding" component={OnboardingRoute} />
      <Route path="/certificates/verify/:code" component={CertificateVerify} />
      <Route path="/dashboard">{() => shell(<Dashboard />)}</Route>
      <Route path="/settings">{() => shell(<Settings />)}</Route>
      <Route path="/analyze">{() => shell(<Analyze />)}</Route>
      <Route path="/quiz">{() => shell(<Quiz />)}</Route>
      <Route path="/flashcards">{() => shell(<Flashcards />)}</Route>
      <Route path="/chat">{() => shell(<Chat />)}</Route>
      <Route path="/history">{() => shell(<History />)}</Route>
      <Route path="/billing">{() => shell(<Billing />)}</Route>
      <Route path="/courses">{() => shell(<Courses />)}</Route>
      <Route path="/courses/:slug">{() => shell(<CourseDetail />)}</Route>
      <Route path="/certificates">{() => shell(<Certificates />)}</Route>
      <Route path="/leaderboard">{() => shell(<Leaderboard />)}</Route>
      <Route path="/community">{() => shell(<Community />)}</Route>
      <Route path="/community/topic/:id">{() => shell(<TopicDetail />)}</Route>
      <Route path="/community/groups/:id">{() => shell(<GroupDetail />)}</Route>
      <Route path="/analytics">{() => shell(<Analytics />)}</Route>
      <Route path="/study-plan">{() => shell(<StudyPlan />)}</Route>
      <Route path="/integrations">{() => shell(<Integrations />)}</Route>
      <Route path="/visual">{() => shell(<Visual />)}</Route>
      <Route>
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <p className="text-slate-400">Página não encontrada</p>
        </div>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <AppRoutes />
            <Toaster theme="dark" position="top-right" richColors />
          </QueryClientProvider>
        </trpc.Provider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

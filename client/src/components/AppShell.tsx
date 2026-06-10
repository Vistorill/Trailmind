import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import type { PublicUser } from "@shared/types";

interface AppShellProps {
  user: PublicUser;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AppShell({ user, onLogout, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      <AppSidebar
        user={user}
        onLogout={onLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen((v) => !v)}
      />
      <main className="lg:pl-64 min-h-screen">
        <div className="p-6 lg:p-8 pt-16 lg:pt-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

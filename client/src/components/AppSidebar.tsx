import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Settings,
  ScanSearch,
  Brain,
  Layers,
  MessageCircle,
  History,
  CreditCard,
  GraduationCap,
  Trophy,
  Users,
  BarChart3,
  Map,
  Plug,
  Image,
  LogOut,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/Button";
import type { PublicUser } from "@shared/types";
import { isAdminRole } from "@shared/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyze", label: "Analisador de trilhas", icon: ScanSearch },
  { href: "/quiz", label: "Quiz", icon: Brain },
  { href: "/flashcards", label: "Flashcards", icon: Layers },
  { href: "/chat", label: "Chat Mentor", icon: MessageCircle },
  { href: "/history", label: "Histórico", icon: History },
  { href: "/courses", label: "Cursos", icon: GraduationCap },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/study-plan", label: "Plano IA", icon: Map },
  { href: "/integrations", label: "Integrações", icon: Plug },
  { href: "/visual", label: "Análise Visual", icon: Image },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/community", label: "Comunidade", icon: Users },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Configurações", icon: Settings },
];

interface AppSidebarProps {
  user: PublicUser;
  onLogout: () => void;
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ user, onLogout, open, onClose }: AppSidebarProps) {
  const [location] = useLocation();
  const initial = user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?";

  const sidebar = (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-brand">
          <span className="text-xl">🎯</span>
          TrailMind
        </Link>
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              "nav-link",
              location === href ? "nav-link-active" : "nav-link-inactive"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/20 text-brand font-semibold text-sm">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user.name ?? "Usuário"}
              {isAdminRole(user.role) && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-brand/20 text-brand font-semibold">
                  ADMIN
                </span>
              )}
            </p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={onLogout}>
          <LogOut size={16} />
          Sair
        </Button>
      </div>
    </aside>
  );

  return (
    <>
      <button
        onClick={() => onClose()}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-xl bg-slate-800 border border-slate-700"
      >
        <Menu size={20} />
      </button>

      <div className="hidden lg:block fixed inset-y-0 left-0 z-30">{sidebar}</div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <div className="absolute inset-y-0 left-0">{sidebar}</div>
        </div>
      )}
    </>
  );
}

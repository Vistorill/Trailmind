import { Link } from "wouter";
import { X, Zap } from "lucide-react";
import { Button } from "./ui/Button";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative rounded-2xl border border-slate-700 bg-slate-900 p-6 max-w-md w-full shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-brand/20">
            <Zap className="text-brand" size={24} />
          </div>
          <h2 className="text-xl font-bold">Limite atingido</h2>
        </div>
        <p className="text-slate-400 mb-6">
          Você atingiu o limite do plano gratuito para este recurso. Faça upgrade para continuar estudando sem limites.
        </p>
        <Link href="/billing">
          <Button className="w-full" onClick={onClose}>
            Ver planos e fazer upgrade
          </Button>
        </Link>
      </div>
    </div>
  );
}

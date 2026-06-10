import { useState, useRef } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Image } from "lucide-react";

export function Visual() {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyze = trpc.visual.analyze.useMutation({
    onSuccess: (data) => {
      setAnalysis(data.analysis);
      toast.success("Análise concluída!");
    },
    onError: (e) => {
      if (e.message === "QUOTA_EXCEEDED") setShowUpgrade(true);
      else toast.error(e.message);
    },
  });

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      if (base64) analyze.mutate({ imageBase64: base64 });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Análise Visual</h1>
      <p className="text-slate-400">Envie screenshots ou diagramas Salesforce para análise com IA.</p>

      <Card className="text-center py-12">
        <Image className="mx-auto text-slate-600 mb-4" size={48} />
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button onClick={() => fileRef.current?.click()} disabled={analyze.isPending}>
          {analyze.isPending ? "Analisando..." : "Selecionar imagem"}
        </Button>
      </Card>

      {analysis && (
        <Card>
          <h2 className="font-semibold text-brand mb-3">Resultado da análise</h2>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{analysis}</p>
        </Card>
      )}

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  );
}

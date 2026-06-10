import { useRoute } from "wouter";
import { Card } from "@/components/ui/Card";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

export function CertificateVerify() {
  const [, params] = useRoute("/certificates/verify/:code");
  const code = params?.code ?? "";
  const [data, setData] = useState<{
    valid: boolean;
    studentName?: string;
    courseTitle?: string;
    issuedAt?: string;
  } | null>(null);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/certificates/verify/${code}`)
      .then((r) => r.json())
      .then(setData);
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <Card className="max-w-md w-full text-center">
        <div className="text-3xl mb-4">🎯</div>
        <h1 className="text-xl font-bold mb-4">Verificação de Certificado</h1>

        {!data ? (
          <p className="text-slate-400">Verificando...</p>
        ) : data.valid ? (
          <>
            <Check className="mx-auto text-brand mb-4" size={48} />
            <p className="text-brand font-semibold mb-4">Certificado válido</p>
            <p className="font-medium">{data.studentName}</p>
            <p className="text-slate-400 text-sm">{data.courseTitle}</p>
            <p className="text-xs text-slate-500 mt-2">
              Emitido em {data.issuedAt ? new Date(data.issuedAt).toLocaleDateString("pt-BR") : "—"}
            </p>
            <p className="text-xs text-slate-600 mt-4">Código: {code}</p>
          </>
        ) : (
          <>
            <X className="mx-auto text-red-400 mb-4" size={48} />
            <p className="text-red-400">Certificado não encontrado ou inválido</p>
          </>
        )}
      </Card>
    </div>
  );
}

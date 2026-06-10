import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";

export function Certificates() {
  const { data: certs, isLoading } = trpc.courses.myCertificates.useQuery();

  if (isLoading) return <div className="animate-pulse text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meus Certificados</h1>

      {certs && certs.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {certs.map((cert) => (
            <Card key={cert.id}>
              <h2 className="font-semibold">{cert.courseTitle}</h2>
              <p className="text-sm text-slate-400 mt-1">{cert.studentName}</p>
              <p className="text-xs text-slate-500 mt-2">
                Emitido em {new Date(cert.issuedAt).toLocaleDateString("pt-BR")}
              </p>
              <p className="text-xs text-brand mt-1">Código: {cert.verifyCode}</p>
              <div className="flex gap-2 mt-4">
                <a href={`/api/certificates/${cert.verifyCode}/pdf`} target="_blank" rel="noreferrer">
                  <Button size="sm">Baixar PDF</Button>
                </a>
                <a href={`/certificates/verify/${cert.verifyCode}`}>
                  <Button size="sm" variant="secondary">Verificar</Button>
                </a>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12 text-slate-400">
          Complete um curso para receber seu certificado.
        </Card>
      )}
    </div>
  );
}

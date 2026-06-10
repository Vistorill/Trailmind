import { useRoute } from "wouter";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { Check } from "lucide-react";

export function CourseDetail() {
  const [, params] = useRoute("/courses/:slug");
  const slug = params?.slug ?? "";

  const { data: course } = trpc.courses.getBySlug.useQuery({ slug }, { enabled: !!slug });
  const { data: enrollments, refetch } = trpc.courses.myEnrollments.useQuery();
  const complete = trpc.courses.markModuleComplete.useMutation({
    onSuccess: (data) => {
      refetch();
      if (data.progress >= 100) toast.success("Parabéns! Certificado gerado!");
      else toast.success("Módulo concluído!");
    },
    onError: (e) => toast.error(e.message),
  });

  const enrollment = enrollments?.find((e) => e.course.slug === slug);
  const modules = (course?.modules ?? []) as Array<{ id: string; title: string; duration: number }>;
  const completed = (enrollment?.enrollment.completedModules as string[]) ?? [];

  if (!course) return <div className="animate-pulse text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{course.title}</h1>
      <p className="text-slate-400">{course.description}</p>

      {enrollment && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-slate-800 max-w-xs">
            <div className="h-3 rounded-full bg-brand" style={{ width: `${enrollment.enrollment.progress}%` }} />
          </div>
          <span className="text-brand font-medium">{enrollment.enrollment.progress}%</span>
        </div>
      )}

      <div className="space-y-3">
        {modules.map((mod, i) => {
          const done = completed.includes(mod.id);
          return (
            <Card key={mod.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                {done ? <Check className="text-brand" size={20} /> : <span className="text-slate-500 w-5 text-center">{i + 1}</span>}
                <div>
                  <p className="font-medium">{mod.title}</p>
                  <p className="text-xs text-slate-500">{mod.duration} min</p>
                </div>
              </div>
              {!done && enrollment && (
                <Button
                  size="sm"
                  onClick={() => complete.mutate({ courseId: course.id, moduleId: mod.id })}
                  disabled={complete.isPending}
                >
                  Concluir
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

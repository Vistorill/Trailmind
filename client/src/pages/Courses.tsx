import { Link } from "wouter";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function Courses() {
  const { data: courses, isLoading } = trpc.courses.list.useQuery();
  const { data: enrollments, refetch } = trpc.courses.myEnrollments.useQuery();
  const enroll = trpc.courses.enroll.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Matriculado com sucesso!");
    },
    onError: (e) => toast.error(e.message),
  });

  const enrolledIds = new Set(enrollments?.map((e) => e.course.id));

  if (isLoading) return <div className="animate-pulse text-slate-400">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cursos</h1>
        <Link href="/certificates" className="text-brand text-sm hover:underline">Meus certificados →</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {courses?.map((course) => {
          const modules = course.modules as Array<{ id: string; title: string }>;
          const enrolled = enrollments?.find((e) => e.course.id === course.id);
          return (
            <Card key={course.id}>
              <h2 className="font-semibold text-lg mb-2">{course.title}</h2>
              <p className="text-sm text-slate-400 mb-3">{course.description}</p>
              <p className="text-xs text-slate-500 mb-4">{modules.length} módulos</p>
              {enrolled ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-brand" style={{ width: `${enrolled.enrollment.progress}%` }} />
                  </div>
                  <span className="text-sm text-brand">{enrolled.enrollment.progress}%</span>
                  <Link href={`/courses/${course.slug}`}><Button size="sm">Continuar</Button></Link>
                </div>
              ) : (
                <Button size="sm" onClick={() => enroll.mutate({ courseId: course.id })} disabled={enroll.isPending}>
                  Matricular
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

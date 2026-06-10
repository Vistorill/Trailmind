import { Card } from "@/components/ui/Card";
import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#0fda15", "#38bdf8", "#a78bfa", "#fb923c"];

export function Analytics() {
  const { data, isLoading } = trpc.analytics.dashboard.useQuery();

  if (isLoading) return <div className="animate-pulse text-slate-400">Carregando...</div>;

  const activityData = data?.activityByType ?? [];
  const weekData = data?.studyMinutesByWeek ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-2xl font-bold text-brand">{data?.trailCount ?? data?.progress?.totalTrailsAnalyzed ?? 0}</p>
          <p className="text-sm text-slate-400">Trilhas analisadas</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-brand">{data?.progress?.totalQuizzesTaken ?? 0}</p>
          <p className="text-sm text-slate-400">Quizzes feitos</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-brand">{(data?.quizScore ?? 0).toFixed(0)}%</p>
          <p className="text-sm text-slate-400">Score médio</p>
        </Card>
      </div>

      {weekData.length > 0 && (
        <Card>
          <h2 className="font-semibold mb-4">Minutos de estudo por semana</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weekData}>
              <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155" }} />
              <Bar dataKey="minutes" fill="#0fda15" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {activityData.length > 0 && (
        <Card>
          <h2 className="font-semibold mb-4">Atividades por tipo</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={activityData} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>
                {activityData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}

      {weekData.length === 0 && activityData.length === 0 && (
        <Card className="text-center py-12 text-slate-400">
          Estude mais para ver seus gráficos aqui!
        </Card>
      )}
    </div>
  );
}

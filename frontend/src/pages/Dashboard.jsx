import { AlertTriangle, CheckCircle2, Clock3, FolderKanban, ListTodo, TrendingUp } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { dashboardService } from '../services/dashboardService.js';
import { BRAG_STATUSES, statusMeta } from '../utils/constants.js';

const Dashboard = () => {
  const { data, loading, error } = useAsync(() => dashboardService.summary(), []);
  const summary = data?.summary;

  if (loading) return <p className="text-sm text-slate-500">Loading dashboard...</p>;
  if (error) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>;

  const taskStats = [
    { label: 'Total Projects', value: summary.totalProjects, icon: FolderKanban, tone: 'bg-slate-100 text-slate-700' },
    { label: 'Total Tasks', value: summary.totalTasks, icon: ListTodo, tone: 'bg-indigo-100 text-indigo-700' },
    { label: 'Completed Tasks', value: summary.completedTasks, icon: CheckCircle2, tone: 'bg-blue-100 text-blue-700' },
    { label: 'Delayed Tasks', value: summary.delayedTasks, icon: AlertTriangle, tone: 'bg-red-100 text-red-700' },
    { label: 'Threatened Tasks', value: summary.threatenedTasks, icon: TrendingUp, tone: 'bg-amber-100 text-amber-700' },
    { label: 'Overdue Tasks', value: summary.overdueTasks, icon: Clock3, tone: 'bg-rose-100 text-rose-700' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-slate-500">A quick read on project and task delivery health.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {taskStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          ['Project status summary', summary.projectStatus],
          ['Task status summary', summary.taskStatus]
        ].map(([title, values]) => (
          <section className="panel p-5" key={title}>
            <h2 className="text-base font-bold text-ink">{title}</h2>
            <div className="mt-4 space-y-4">
              {BRAG_STATUSES.map((status) => {
                const total = Object.values(values).reduce((sum, count) => sum + count, 0) || 1;
                const percent = Math.round((values[status] / total) * 100);
                return (
                  <div key={status}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <StatusBadge status={status} />
                      <span className="text-sm font-semibold text-slate-600">{values[status]}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${statusMeta[status].classes.split(' ')[0]}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;

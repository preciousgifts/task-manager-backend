import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { updateService } from '../services/updateService.js';
import { money } from '../utils/constants.js';

const Updates = () => {
  const { data, loading, error } = useAsync(() => updateService.list(), []);
  const updates = data?.updates || [];

  if (loading) return <p className="text-sm text-slate-500">Loading updates...</p>;
  if (error) return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Updates</h1>
        <p className="text-sm text-slate-500">Threatened and delayed work across regular tasks and project plans.</p>
      </div>
      {updates.length === 0 ? <EmptyState title="No threatened or delayed items" description="Everything currently visible to you is on track or completed." /> : (
        <div className="grid gap-3">
          {updates.map(({ source, item }) => (
            <article className="panel p-4" key={`${source}-${item._id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">{source} - {item.project?.name}</p>
                  <h2 className="text-base font-bold text-ink">{item.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{item.description || item.parent?.title || 'No description'}</p>
                </div>
                <StatusBadge status={item.bragStatus} />
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-4">
                <span>Assignee: <b>{item.assignedTo?.name || 'Unassigned'}</b></span>
                <span>Due: <b>{new Date(item.dueDate).toLocaleDateString()}</b></span>
                <span>Priority: <b>{item.priority}</b></span>
                {'actualCost' in item && <span>Cost: <b>{money(item.actualCost)} / {money(item.plannedCost)}</b></span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Updates;

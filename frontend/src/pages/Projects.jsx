import { Edit3, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import ProjectForm from '../components/ProjectForm.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { projectService } from '../services/projectService.js';
import { BRAG_STATUSES, money } from '../utils/constants.js';

const Projects = () => {
  const { user } = useAuth();
  const canManage = ['Admin', 'Project Manager'].includes(user?.role);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadProjects = async () => {
    setLoading(true);
    try {
      const response = await projectService.list(filters);
      setProjects(response.data.projects);
    } catch (err) {
      setError(err.message || 'Could not load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProjects(); }, [filters.search, filters.status]);

  const saveProject = async (payload) => {
    setSaving(true);
    try {
      if (editing) await projectService.update(editing._id, payload);
      else await projectService.create(payload);
      setShowForm(false);
      setEditing(null);
      await loadProjects();
    } catch (err) {
      setError(err.message || 'Could not save project');
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm('Delete this project, its tasks, plan, and RAIDS log?')) return;
    await projectService.remove(id);
    await loadProjects();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Projects</h1>
          <p className="text-sm text-slate-500">Search, filter, and manage project delivery status.</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={18} /> New project
          </button>
        )}
      </div>
      <div className="panel grid gap-3 p-4 md:grid-cols-[1fr_220px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
          <input className="input pl-10" placeholder="Search projects" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        </label>
        <select className="input" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">All statuses</option>
          {BRAG_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </div>
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {showForm && <ProjectForm project={editing} saving={saving} onSubmit={saveProject} onCancel={() => { setShowForm(false); setEditing(null); }} />}
      {loading ? <p className="text-sm text-slate-500">Loading projects...</p> : projects.length === 0 ? (
        <EmptyState title="No projects found" description="Create a project or adjust your filters." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {projects.map((project) => (
            <article className="panel p-5" key={project._id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ink">{project.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">{project.description || 'No description provided.'}</p>
                </div>
                <StatusBadge status={project.bragStatus} />
              </div>
              <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                <span>Owner: <b>{project.owner?.name || 'Unassigned'}</b></span>
                <span>Start: <b>{new Date(project.startDate).toLocaleDateString()}</b></span>
                <span>End: <b>{new Date(project.endDate).toLocaleDateString()}</b></span>
              </div>
              {project.planConfig?.showCost && (
                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                  <span>Planned: <b>{money(project.costSummary?.plannedCost)}</b></span>
                  <span>Actual: <b>{money(project.costSummary?.actualCost)}</b></span>
                  <span>Variance: <b>{money(project.costSummary?.variance)}</b></span>
                </div>
              )}
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500">
                  <span>Progress</span><span>{project.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${project.progress}%` }} />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link className="btn-secondary" to={`/projects/${project._id}`}>Open workspace</Link>
                {canManage && (
                  <>
                    <button className="btn-secondary" onClick={() => { setEditing(project); setShowForm(true); }}><Edit3 size={16} /> Edit</button>
                    <button className="btn-secondary text-red-600" onClick={() => deleteProject(project._id)}><Trash2 size={16} /> Delete</button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;

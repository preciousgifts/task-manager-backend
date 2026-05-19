import { MessageCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import TaskForm from '../components/TaskForm.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { projectService } from '../services/projectService.js';
import { taskService } from '../services/taskService.js';
import { userService } from '../services/userService.js';
import { BRAG_STATUSES, isOverdue } from '../utils/constants.js';

const Tasks = () => {
  const { user } = useAuth();
  const canManage = ['Admin', 'Project Manager'].includes(user?.role);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', project: '' });
  const [editing, setEditing] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadReferenceData = async () => {
    const [projectResponse, userResponse] = await Promise.all([projectService.list(), userService.list()]);
    setProjects(projectResponse.data.projects);
    setUsers(userResponse.data.users);
  };

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await taskService.list(filters);
      setTasks(response.data.tasks);
    } catch (err) {
      setError(err.message || 'Could not load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReferenceData(); }, []);
  useEffect(() => { loadTasks(); }, [filters.search, filters.status, filters.project]);

  const saveTask = async (payload) => {
    setSaving(true);
    try {
      if (editing) await taskService.update(editing._id, payload);
      else await taskService.create(payload);
      setShowForm(false);
      setEditing(null);
      await loadTasks();
    } catch (err) {
      setError(err.message || 'Could not save task');
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    await taskService.remove(id);
    await loadTasks();
  };

  const openTask = async (task) => {
    const response = await taskService.get(task._id);
    setActiveTask(response.data.task);
  };

  const addComment = async (event) => {
    event.preventDefault();
    if (!comment.trim() || !activeTask) return;
    const response = await taskService.comment(activeTask._id, comment);
    setActiveTask(response.data.task);
    setComment('');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Tasks</h1>
          <p className="text-sm text-slate-500">Manage task assignments, due dates, comments, and BRAG status.</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus size={18} /> New task
          </button>
        )}
      </div>
      <div className="panel grid gap-3 p-4 lg:grid-cols-[1fr_180px_220px]">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
          <input className="input pl-10" placeholder="Search tasks" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        </label>
        <select className="input" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">All statuses</option>
          {BRAG_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
        <select className="input" value={filters.project} onChange={(event) => setFilters({ ...filters, project: event.target.value })}>
          <option value="">All projects</option>
          {projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
        </select>
      </div>
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {showForm && <TaskForm task={editing} projects={projects} users={users} saving={saving} onSubmit={saveTask} onCancel={() => { setShowForm(false); setEditing(null); }} />}
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <section>
          {loading ? <p className="text-sm text-slate-500">Loading tasks...</p> : tasks.length === 0 ? (
            <EmptyState title="No tasks found" description="Create a task or adjust the filters." />
          ) : (
            <div className="panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Task</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Assignee</th>
                      <th className="px-4 py-3">Due</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tasks.map((task) => (
                      <tr key={task._id} className={isOverdue(task) ? 'bg-red-50/70' : 'bg-white'}>
                        <td className="px-4 py-3">
                          <button className="text-left font-semibold text-ink hover:underline" onClick={() => openTask(task)}>{task.title}</button>
                          <p className="mt-1 line-clamp-1 max-w-xs text-xs text-slate-500">{task.description || 'No description'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{task.project?.name}</td>
                        <td className="px-4 py-3 text-slate-600">{task.assignedTo?.name || 'Unassigned'}</td>
                        <td className="px-4 py-3">
                          <span className={isOverdue(task) ? 'font-bold text-red-700' : 'text-slate-600'}>{new Date(task.dueDate).toLocaleDateString()}</span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={task.bragStatus} /></td>
                        <td className="px-4 py-3 text-slate-600">{task.priority}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" onClick={() => openTask(task)} aria-label="View comments"><MessageCircle size={16} /></button>
                            {canManage && (
                              <>
                                <button className="rounded-md border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" onClick={() => { setEditing(task); setShowForm(true); }} aria-label="Edit task"><Pencil size={16} /></button>
                                <button className="rounded-md border border-slate-200 p-2 text-red-600 hover:bg-red-50" onClick={() => deleteTask(task._id)} aria-label="Delete task"><Trash2 size={16} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
        <aside className="panel h-fit p-5">
          {activeTask ? (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-ink">{activeTask.title}</h2>
                  <p className="text-sm text-slate-500">{activeTask.project?.name}</p>
                </div>
                <StatusBadge status={activeTask.bragStatus} />
              </div>
              <p className="mt-4 text-sm text-slate-600">{activeTask.description || 'No description provided.'}</p>
              <h3 className="mt-6 text-sm font-bold text-ink">Comments</h3>
              <div className="mt-3 max-h-72 space-y-3 overflow-auto pr-1">
                {activeTask.comments?.length ? activeTask.comments.map((item) => (
                  <div className="rounded-md bg-slate-50 p-3" key={item._id}>
                    <p className="text-sm text-slate-700">{item.text}</p>
                    <p className="mt-2 text-xs text-slate-500">{item.author?.name || 'Unknown'} · {new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">No comments yet.</p>}
              </div>
              <form className="mt-4 space-y-3" onSubmit={addComment}>
                <textarea className="input min-h-24" placeholder="Add a comment" value={comment} onChange={(event) => setComment(event.target.value)} />
                <button className="btn-primary w-full">Add comment</button>
              </form>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold text-ink">Task details</h2>
              <p className="mt-2 text-sm text-slate-500">Select a task to view its comment history and add updates.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default Tasks;

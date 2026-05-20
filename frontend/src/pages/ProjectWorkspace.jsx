import { Edit3, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { planService } from '../services/planService.js';
import { projectService } from '../services/projectService.js';
import { raidService } from '../services/raidService.js';
import { userService } from '../services/userService.js';
import {
  BRAG_STATUSES,
  PLAN_ITEM_TYPES,
  PRIORITIES,
  RACI_ROLES,
  RAID_STATUSES,
  RAID_TYPES,
  money,
  toDateInput
} from '../utils/constants.js';

const blankPlan = {
  type: 'Milestone',
  parent: '',
  title: '',
  description: '',
  assignedTo: '',
  startDate: '',
  dueDate: '',
  bragStatus: 'Green',
  priority: 'Medium',
  progress: 0,
  plannedCost: 0,
  actualCost: 0,
  raci: []
};

const blankRaid = {
  type: 'Risk',
  title: '',
  description: '',
  owner: '',
  dueDate: '',
  status: 'Open',
  priority: 'Medium',
  impact: 'Medium',
  mitigation: ''
};

const configLabels = {
  showDescription: 'Description',
  showAssignee: 'Assignee',
  showDates: 'Dates',
  showBragStatus: 'BRAG status',
  showPriority: 'Priority',
  showProgress: 'Progress',
  showCost: 'Cost tracking',
  showRaci: 'RACI on tasks'
};

const ProjectWorkspace = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = ['Admin', 'Project Manager'].includes(user?.role);
  const [tab, setTab] = useState('plan');
  const [project, setProject] = useState(null);
  const [planItems, setPlanItems] = useState([]);
  const [raidItems, setRaidItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [planForm, setPlanForm] = useState(blankPlan);
  const [raidForm, setRaidForm] = useState(blankRaid);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingRaid, setEditingRaid] = useState(null);
  const [error, setError] = useState('');

  const planConfig = project?.planConfig || {};
  const milestones = useMemo(() => planItems.filter((item) => item.type === 'Milestone'), [planItems]);
  const workTasks = useMemo(() => planItems.filter((item) => item.type === 'Work Task'), [planItems]);

  const loadWorkspace = async () => {
    try {
      const [projectResponse, planResponse, raidResponse, userResponse] = await Promise.all([
        projectService.get(id),
        planService.list({ project: id }),
        raidService.list({ project: id }),
        userService.list()
      ]);
      setProject(projectResponse.data.project);
      setPlanItems(planResponse.data.items);
      setRaidItems(raidResponse.data.items);
      setUsers(userResponse.data.users);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load project workspace');
    }
  };

  useEffect(() => { loadWorkspace(); }, [id]);

  const editPlan = (item) => {
    setEditingPlan(item);
    setPlanForm({
      type: item.type,
      parent: item.parent?._id || item.parent || '',
      title: item.title,
      description: item.description || '',
      assignedTo: item.assignedTo?._id || '',
      startDate: toDateInput(item.startDate),
      dueDate: toDateInput(item.dueDate),
      bragStatus: item.bragStatus,
      priority: item.priority,
      progress: item.progress || 0,
      plannedCost: item.plannedCost || 0,
      actualCost: item.actualCost || 0,
      raci: (item.raci || []).map((assignment) => ({
        user: assignment.user?._id || assignment.user,
        responsibility: assignment.responsibility
      }))
    });
  };

  const savePlan = async (event) => {
    event.preventDefault();
    const payload = {
      ...planForm,
      project: id,
      parent: planForm.parent || undefined,
      assignedTo: planForm.assignedTo || undefined,
      plannedCost: planConfig.showCost ? Number(planForm.plannedCost) : 0,
      actualCost: planConfig.showCost ? Number(planForm.actualCost) : 0,
      raci: planConfig.showRaci ? planForm.raci : []
    };
    try {
      if (editingPlan) await planService.update(editingPlan._id, payload);
      else await planService.create(payload);
      setPlanForm(blankPlan);
      setEditingPlan(null);
      await loadWorkspace();
    } catch (err) {
      setError(err.message || 'Could not save plan item');
    }
  };

  const deletePlan = async (item) => {
    if (!window.confirm('Delete this plan item and its children?')) return;
    await planService.remove(item._id);
    await loadWorkspace();
  };

  const saveRaid = async (event) => {
    event.preventDefault();
    const payload = { ...raidForm, project: id, owner: raidForm.owner || undefined, dueDate: raidForm.dueDate || undefined };
    try {
      if (editingRaid) await raidService.update(editingRaid._id, payload);
      else await raidService.create(payload);
      setRaidForm(blankRaid);
      setEditingRaid(null);
      await loadWorkspace();
    } catch (err) {
      setError(err.message || 'Could not save RAIDS item');
    }
  };

  const editRaid = (item) => {
    setEditingRaid(item);
    setRaidForm({ ...item, owner: item.owner?._id || '', dueDate: toDateInput(item.dueDate) });
  };

  const deleteRaid = async (item) => {
    if (!window.confirm('Delete this RAIDS item?')) return;
    await raidService.remove(item._id);
    await loadWorkspace();
  };

  const saveConfig = async () => {
    try {
      await projectService.update(id, { planConfig });
      await loadWorkspace();
    } catch (err) {
      setError(err.message || 'Could not save configuration');
    }
  };

  const toggleConfig = (key) => setProject((current) => ({
    ...current,
    planConfig: { ...current.planConfig, [key]: !current.planConfig?.[key] }
  }));

  const parentOptions = planForm.type === 'Work Task' ? milestones : planForm.type === 'Subtask' ? workTasks : [];
  const tabs = ['plan', 'raids', 'raci', 'config'];

  if (!project) return <p className="text-sm text-slate-500">Loading project workspace...</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <Link className="text-sm font-semibold text-slate-500" to="/projects">Back to projects</Link>
          <h1 className="mt-1 text-2xl font-bold text-ink">{project.name}</h1>
          <p className="text-sm text-slate-500">Project plan, RAIDS log, optional RACI, and cost tracking.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={project.bragStatus} />
          {planConfig.showCost && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Variance {money(project.costSummary?.variance)}</span>}
        </div>
      </div>
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map((item) => (
          <button key={item} className={`px-4 py-2 text-sm font-bold capitalize ${tab === item ? 'border-b-2 border-ink text-ink' : 'text-slate-500'}`} onClick={() => setTab(item)}>
            {item === 'raids' ? 'RAIDS Log' : item}
          </button>
        ))}
      </div>

      {tab === 'plan' && (
        <div className="space-y-5">
          {(canManage || editingPlan) && (
            <form className="panel grid gap-4 p-5 lg:grid-cols-4" onSubmit={savePlan}>
              <select className="input" value={planForm.type} onChange={(event) => setPlanForm({ ...planForm, type: event.target.value, parent: '' })} disabled={!canManage}>
                {PLAN_ITEM_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
              {planForm.type !== 'Milestone' && (
                <select className="input" value={planForm.parent} onChange={(event) => setPlanForm({ ...planForm, parent: event.target.value })} required disabled={!canManage}>
                  <option value="">Select parent</option>
                  {parentOptions.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}
                </select>
              )}
              <input className="input" placeholder="Title" value={planForm.title} onChange={(event) => setPlanForm({ ...planForm, title: event.target.value })} required disabled={!canManage} />
              {planConfig.showAssignee && (
                <select className="input" value={planForm.assignedTo} onChange={(event) => setPlanForm({ ...planForm, assignedTo: event.target.value })} disabled={!canManage}>
                  <option value="">Unassigned</option>
                  {users.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
                </select>
              )}
              {planConfig.showDates && (
                <>
                  <input className="input" type="date" value={planForm.startDate} onChange={(event) => setPlanForm({ ...planForm, startDate: event.target.value })} required disabled={!canManage} />
                  <input className="input" type="date" value={planForm.dueDate} onChange={(event) => setPlanForm({ ...planForm, dueDate: event.target.value })} required disabled={!canManage} />
                </>
              )}
              {planConfig.showBragStatus && <select className="input" value={planForm.bragStatus} onChange={(event) => setPlanForm({ ...planForm, bragStatus: event.target.value })}>{BRAG_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>}
              {planConfig.showPriority && <select className="input" value={planForm.priority} onChange={(event) => setPlanForm({ ...planForm, priority: event.target.value })} disabled={!canManage}>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select>}
              {planConfig.showProgress && <input className="input" type="number" min="0" max="100" value={planForm.progress} onChange={(event) => setPlanForm({ ...planForm, progress: Number(event.target.value) })} placeholder="Progress %" />}
              {planConfig.showCost && (
                <>
                  <input className="input" type="number" min="0" value={planForm.plannedCost} onChange={(event) => setPlanForm({ ...planForm, plannedCost: Number(event.target.value) })} placeholder="Planned cost" disabled={!canManage} />
                  <input className="input" type="number" min="0" value={planForm.actualCost} onChange={(event) => setPlanForm({ ...planForm, actualCost: Number(event.target.value) })} placeholder="Actual cost" disabled={!canManage} />
                </>
              )}
              {planConfig.showRaci && canManage && (
                <div className="grid gap-2 lg:col-span-4 lg:grid-cols-[1fr_1fr_auto]">
                  <select className="input" id="raci-user"><option value="">RACI user</option>{users.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
                  <select className="input" id="raci-role">{RACI_ROLES.map((role) => <option key={role}>{role}</option>)}</select>
                  <button type="button" className="btn-secondary" onClick={() => {
                    const selectedUser = document.getElementById('raci-user').value;
                    const responsibility = document.getElementById('raci-role').value;
                    if (selectedUser) setPlanForm({ ...planForm, raci: [...planForm.raci, { user: selectedUser, responsibility }] });
                  }}>Add RACI</button>
                </div>
              )}
              {planConfig.showDescription && <textarea className="input min-h-20 lg:col-span-4" placeholder="Description" value={planForm.description} onChange={(event) => setPlanForm({ ...planForm, description: event.target.value })} disabled={!canManage} />}
              <div className="flex gap-2 lg:col-span-4">
                <button className="btn-primary"><Plus size={16} /> {editingPlan ? 'Update item' : 'Add item'}</button>
                {editingPlan && <button type="button" className="btn-secondary" onClick={() => { setEditingPlan(null); setPlanForm(blankPlan); }}>Cancel</button>}
              </div>
            </form>
          )}
          {planItems.length === 0 ? <EmptyState title="No project plan yet" description="Add milestones, then work tasks, then subtasks." /> : (
            <div className="panel overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    {planConfig.showAssignee && <th className="px-4 py-3">Assignee</th>}
                    {planConfig.showDates && <th className="px-4 py-3">Due</th>}
                    {planConfig.showBragStatus && <th className="px-4 py-3">Status</th>}
                    {planConfig.showProgress && <th className="px-4 py-3">Progress</th>}
                    {planConfig.showCost && <th className="px-4 py-3">Cost</th>}
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {planItems.map((item) => (
                    <tr key={item._id}>
                      <td className="px-4 py-3">
                        <span className="font-bold text-ink">{item.type === 'Subtask' ? '   - ' : item.type === 'Work Task' ? '- ' : ''}{item.title}</span>
                        <p className="text-xs text-slate-500">{item.type}{item.parent?.title ? ` under ${item.parent.title}` : ''}</p>
                      </td>
                      {planConfig.showAssignee && <td className="px-4 py-3">{item.assignedTo?.name || 'Unassigned'}</td>}
                      {planConfig.showDates && <td className="px-4 py-3">{new Date(item.dueDate).toLocaleDateString()}</td>}
                      {planConfig.showBragStatus && <td className="px-4 py-3"><StatusBadge status={item.bragStatus} /></td>}
                      {planConfig.showProgress && <td className="px-4 py-3">{item.progress}%</td>}
                      {planConfig.showCost && <td className="px-4 py-3">{money(item.actualCost)} / {money(item.plannedCost)}</td>}
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="rounded-md border border-slate-200 p-2" onClick={() => editPlan(item)}><Edit3 size={16} /></button>
                          {canManage && <button className="rounded-md border border-slate-200 p-2 text-red-600" onClick={() => deletePlan(item)}><Trash2 size={16} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'raids' && (
        <div className="space-y-5">
          {canManage && (
            <form className="panel grid gap-4 p-5 lg:grid-cols-4" onSubmit={saveRaid}>
              <select className="input" value={raidForm.type} onChange={(event) => setRaidForm({ ...raidForm, type: event.target.value })}>{RAID_TYPES.map((type) => <option key={type}>{type}</option>)}</select>
              <input className="input" placeholder="Title" value={raidForm.title} onChange={(event) => setRaidForm({ ...raidForm, title: event.target.value })} required />
              <select className="input" value={raidForm.owner} onChange={(event) => setRaidForm({ ...raidForm, owner: event.target.value })}><option value="">Owner</option>{users.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select>
              <input className="input" type="date" value={raidForm.dueDate} onChange={(event) => setRaidForm({ ...raidForm, dueDate: event.target.value })} />
              <select className="input" value={raidForm.status} onChange={(event) => setRaidForm({ ...raidForm, status: event.target.value })}>{RAID_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
              <select className="input" value={raidForm.priority} onChange={(event) => setRaidForm({ ...raidForm, priority: event.target.value })}>{PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}</select>
              <select className="input" value={raidForm.impact} onChange={(event) => setRaidForm({ ...raidForm, impact: event.target.value })}>{['Low', 'Medium', 'High'].map((impact) => <option key={impact}>{impact}</option>)}</select>
              <input className="input" placeholder="Mitigation / action" value={raidForm.mitigation} onChange={(event) => setRaidForm({ ...raidForm, mitigation: event.target.value })} />
              <textarea className="input min-h-20 lg:col-span-4" placeholder="Description" value={raidForm.description} onChange={(event) => setRaidForm({ ...raidForm, description: event.target.value })} />
              <div className="flex gap-2 lg:col-span-4">
                <button className="btn-primary"><Save size={16} /> {editingRaid ? 'Update RAIDS item' : 'Add RAIDS item'}</button>
                {editingRaid && <button type="button" className="btn-secondary" onClick={() => { setEditingRaid(null); setRaidForm(blankRaid); }}>Cancel</button>}
              </div>
            </form>
          )}
          {raidItems.length === 0 ? <EmptyState title="No RAIDS items" description="Track risks, assumptions, issues, dependencies, and decisions here." /> : (
            <div className="grid gap-3">
              {raidItems.map((item) => (
                <article className="panel p-4" key={item._id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase text-slate-500">{item.type} - {item.status}</p>
                      <h3 className="text-base font-bold text-ink">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{item.description || item.mitigation}</p>
                    </div>
                    {canManage && <div className="flex gap-2"><button className="btn-secondary" onClick={() => editRaid(item)}>Edit</button><button className="btn-secondary text-red-600" onClick={() => deleteRaid(item)}>Delete</button></div>}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-4">
                    <span>Owner: <b>{item.owner?.name || 'Unassigned'}</b></span>
                    <span>Due: <b>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'None'}</b></span>
                    <span>Priority: <b>{item.priority}</b></span>
                    <span>Impact: <b>{item.impact}</b></span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'raci' && (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Plan item</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Responsibility</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {planItems.flatMap((item) => (item.raci || []).map((assignment, index) => (
                <tr key={`${item._id}-${index}`}><td className="px-4 py-3 font-semibold">{item.title}</td><td className="px-4 py-3">{assignment.user?.name || users.find((u) => u._id === assignment.user)?.name || 'User'}</td><td className="px-4 py-3">{assignment.responsibility}</td></tr>
              )))}
            </tbody>
          </table>
          {!planItems.some((item) => item.raci?.length) && <div className="p-5"><EmptyState title="No RACI assignments" description="Enable RACI in configuration and add assignments to plan items." /></div>}
        </div>
      )}

      {tab === 'config' && (
        <section className="panel p-5">
          <h2 className="text-lg font-bold text-ink">Project plan configuration</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(configLabels).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={Boolean(planConfig[key])} onChange={() => toggleConfig(key)} disabled={!canManage} />
                {label}
              </label>
            ))}
          </div>
          {canManage && <button className="btn-primary mt-5" onClick={saveConfig}><Save size={16} /> Save configuration</button>}
        </section>
      )}
    </div>
  );
};

export default ProjectWorkspace;

import { useEffect, useState } from 'react';
import { BRAG_STATUSES, PRIORITIES, toDateInput } from '../utils/constants.js';

const initialState = {
  project: '',
  title: '',
  description: '',
  assignedTo: '',
  startDate: '',
  dueDate: '',
  bragStatus: 'Green',
  priority: 'Medium'
};

const TaskForm = ({ task, projects, users, onSubmit, onCancel, saving }) => {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (task) {
      setForm({
        project: task.project?._id || task.project || '',
        title: task.title || '',
        description: task.description || '',
        assignedTo: task.assignedTo?._id || task.assignedTo || '',
        startDate: toDateInput(task.startDate),
        dueDate: toDateInput(task.dueDate),
        bragStatus: task.bragStatus || 'Green',
        priority: task.priority || 'Medium'
      });
    } else {
      setForm((current) => ({ ...initialState, project: projects[0]?._id || current.project }));
    }
  }, [task, projects]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form className="panel space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); onSubmit({ ...form, assignedTo: form.assignedTo || undefined }); }}>
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="label">Project</span>
          <select className="input mt-1" value={form.project} onChange={(event) => update('project', event.target.value)} required>
            <option value="">Select project</option>
            {projects.map((project) => <option key={project._id} value={project._id}>{project.name}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Assigned user</span>
          <select className="input mt-1" value={form.assignedTo} onChange={(event) => update('assignedTo', event.target.value)}>
            <option value="">Unassigned</option>
            {users.map((user) => <option key={user._id} value={user._id}>{user.name} · {user.role}</option>)}
          </select>
        </label>
        <label className="md:col-span-2">
          <span className="label">Task title</span>
          <input className="input mt-1" value={form.title} onChange={(event) => update('title', event.target.value)} required />
        </label>
        <label>
          <span className="label">Start date</span>
          <input className="input mt-1" type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} required />
        </label>
        <label>
          <span className="label">Due date</span>
          <input className="input mt-1" type="date" value={form.dueDate} onChange={(event) => update('dueDate', event.target.value)} required />
        </label>
        <label>
          <span className="label">BRAG status</span>
          <select className="input mt-1" value={form.bragStatus} onChange={(event) => update('bragStatus', event.target.value)}>
            {BRAG_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Priority</span>
          <select className="input mt-1" value={form.priority} onChange={(event) => update('priority', event.target.value)}>
            {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
          </select>
        </label>
        <label className="md:col-span-2">
          <span className="label">Description</span>
          <textarea className="input mt-1 min-h-24" value={form.description} onChange={(event) => update('description', event.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save task'}</button>
      </div>
    </form>
  );
};

export default TaskForm;

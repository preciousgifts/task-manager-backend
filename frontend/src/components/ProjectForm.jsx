import { useEffect, useState } from 'react';
import { BRAG_STATUSES, toDateInput } from '../utils/constants.js';

const initialState = {
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  bragStatus: 'Green',
  progress: 0
};

const ProjectForm = ({ project, onSubmit, onCancel, saving }) => {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        description: project.description || '',
        startDate: toDateInput(project.startDate),
        endDate: toDateInput(project.endDate),
        bragStatus: project.bragStatus || 'Green',
        progress: project.progress || 0
      });
    } else {
      setForm(initialState);
    }
  }, [project]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form className="panel space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); onSubmit(form); }}>
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="label">Project name</span>
          <input className="input mt-1" value={form.name} onChange={(event) => update('name', event.target.value)} required />
        </label>
        <label>
          <span className="label">BRAG status</span>
          <select className="input mt-1" value={form.bragStatus} onChange={(event) => update('bragStatus', event.target.value)}>
            {BRAG_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Start date</span>
          <input className="input mt-1" type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} required />
        </label>
        <label>
          <span className="label">End date</span>
          <input className="input mt-1" type="date" value={form.endDate} onChange={(event) => update('endDate', event.target.value)} required />
        </label>
        <label className="md:col-span-2">
          <span className="label">Progress: {form.progress}%</span>
          <input className="mt-3 w-full accent-slate-900" type="range" min="0" max="100" value={form.progress} onChange={(event) => update('progress', Number(event.target.value))} />
        </label>
        <label className="md:col-span-2">
          <span className="label">Description</span>
          <textarea className="input mt-1 min-h-24" value={form.description} onChange={(event) => update('description', event.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save project'}</button>
      </div>
    </form>
  );
};

export default ProjectForm;

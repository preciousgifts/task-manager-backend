export const ROLES = ['Admin', 'Project Manager', 'Team Member'];
export const BRAG_STATUSES = ['Blue', 'Red', 'Amber', 'Green'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export const statusMeta = {
  Blue: { label: 'Completed', classes: 'bg-blue-100 text-blue-700 ring-blue-200' },
  Red: { label: 'Delayed', classes: 'bg-red-100 text-red-700 ring-red-200' },
  Amber: { label: 'Threatened', classes: 'bg-amber-100 text-amber-800 ring-amber-200' },
  Green: { label: 'On Track', classes: 'bg-emerald-100 text-emerald-700 ring-emerald-200' }
};

export const toDateInput = (date) => (date ? new Date(date).toISOString().slice(0, 10) : '');

export const isOverdue = (task) =>
  task?.dueDate && new Date(task.dueDate) < new Date() && task.bragStatus !== 'Blue';

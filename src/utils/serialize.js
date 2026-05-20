const projectShape = (item) => {
  if (!item) return item;
  const shaped = { ...item };
  if ('ownerId' in shaped && shaped.ownerId) shaped.owner = shaped.owner || shaped.ownerId;
  shaped.planConfig = {
    showDescription: shaped.showDescription,
    showAssignee: shaped.showAssignee,
    showDates: shaped.showDates,
    showBragStatus: shaped.showBragStatus,
    showPriority: shaped.showPriority,
    showProgress: shaped.showProgress,
    showCost: shaped.showCost,
    showRaci: shaped.showRaci
  };
  shaped.costSummary = {
    plannedCost: shaped.plannedCost || 0,
    actualCost: shaped.actualCost || 0,
    variance: shaped.costVariance || 0
  };
  return shaped;
};

const normalizeOne = (value) => {
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(normalizeOne);

  const shaped = value.name !== undefined && 'ownerId' in value ? projectShape(value) : { ...value };
  if (shaped.id && !shaped._id) shaped._id = shaped.id;
  if (shaped.projectId && !shaped.project) shaped.project = shaped.projectId;
  if (shaped.parentId && !shaped.parent) shaped.parent = shaped.parentId;
  if (shaped.assignedToId && !shaped.assignedTo) shaped.assignedTo = shaped.assignedToId;
  if (shaped.ownerId && !shaped.owner) shaped.owner = shaped.ownerId;
  if (shaped.authorId && !shaped.author) shaped.author = shaped.authorId;
  if (shaped.userId && !shaped.user) shaped.user = shaped.userId;

  Object.keys(shaped).forEach((key) => {
    shaped[key] = normalizeOne(shaped[key]);
  });
  return shaped;
};

export const toApi = (value) => normalizeOne(value);

export const projectData = (payload) => ({
  name: payload.name,
  description: payload.description,
  ownerId: payload.owner || payload.ownerId,
  startDate: payload.startDate ? new Date(payload.startDate) : undefined,
  endDate: payload.endDate ? new Date(payload.endDate) : undefined,
  bragStatus: payload.bragStatus,
  progress: payload.progress === undefined ? undefined : Number(payload.progress),
  showDescription: payload.planConfig?.showDescription ?? payload.showDescription,
  showAssignee: payload.planConfig?.showAssignee ?? payload.showAssignee,
  showDates: payload.planConfig?.showDates ?? payload.showDates,
  showBragStatus: payload.planConfig?.showBragStatus ?? payload.showBragStatus,
  showPriority: payload.planConfig?.showPriority ?? payload.showPriority,
  showProgress: payload.planConfig?.showProgress ?? payload.showProgress,
  showCost: payload.planConfig?.showCost ?? payload.showCost,
  showRaci: payload.planConfig?.showRaci ?? payload.showRaci
});

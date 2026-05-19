import { statusMeta } from '../utils/constants.js';

const StatusBadge = ({ status }) => {
  const meta = statusMeta[status] || statusMeta.Green;

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${meta.classes}`}>
      {status} · {meta.label}
    </span>
  );
};

export default StatusBadge;

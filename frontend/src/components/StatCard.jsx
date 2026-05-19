const StatCard = ({ label, value, icon: Icon, tone = 'bg-slate-100 text-slate-700' }) => (
  <div className="panel p-5">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-ink">{value ?? 0}</p>
      </div>
      {Icon && (
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>
          <Icon size={22} />
        </div>
      )}
    </div>
  </div>
);

export default StatCard;

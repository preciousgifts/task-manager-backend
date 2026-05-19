const EmptyState = ({ title, description }) => (
  <div className="panel flex min-h-48 flex-col items-center justify-center p-8 text-center">
    <h3 className="text-base font-semibold text-ink">{title}</h3>
    <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
  </div>
);

export default EmptyState;

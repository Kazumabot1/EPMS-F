type EmptyStateProps = {
  title: string;
  description: string;
};

const EmptyState = ({ title, description }: EmptyStateProps) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
    <i className="bi bi-inbox text-3xl text-slate-400" />
    <h3 className="mt-2 text-lg font-semibold text-slate-700">{title}</h3>
    <p className="mt-1 text-sm text-slate-500">{description}</p>
  </div>
);

export default EmptyState;

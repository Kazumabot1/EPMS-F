const LoadingSpinner = ({ label = 'Loading...' }: { label?: string }) => (
  <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-slate-600">
    <i className="bi bi-arrow-repeat mr-2 animate-spin" />
    {label}
  </div>
);

export default LoadingSpinner;

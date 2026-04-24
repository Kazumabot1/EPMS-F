type FormTextareaProps = {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  rows?: number;
  error?: string;
};

const FormTextarea = ({ label, name, value, onChange, rows = 4, error }: FormTextareaProps) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium text-slate-700">{label}</span>
    <textarea
      value={value}
      rows={rows}
      onChange={(event) => onChange(name, event.target.value)}
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-blue-400 ${
        error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
      }`}
    />
    {error ? <span className="mt-1 block text-xs text-red-500">{error}</span> : null}
  </label>
);

export default FormTextarea;

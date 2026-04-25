type SelectOption = {
  value: string;
  label: string;
};

type FormSelectProps = {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  options: SelectOption[];
  required?: boolean;
  error?: string;
};

const FormSelect = ({ label, name, value, onChange, options, required, error }: FormSelectProps) => (
  <label className="block text-sm">
    <span className="mb-1 block font-medium text-slate-700">
      {label}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(name, event.target.value)}
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-blue-400 ${
        error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'
      }`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error ? <span className="mt-1 block text-xs text-red-500">{error}</span> : null}
  </label>
);

export default FormSelect;

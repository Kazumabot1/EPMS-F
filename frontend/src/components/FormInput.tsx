type FormInputProps = {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  type?: 'text' | 'date' | 'email' | 'number';
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
};

const FormInput = ({
  label,
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  error,
  disabled,
}: FormInputProps) => (
  <div className="flex flex-col">
    <label htmlFor={name} className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
    <input
      id={name}
      type={type}
      value={value}
      onChange={(e) => onChange(name, e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full rounded border px-3 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
        error
          ? 'border-red-400 bg-red-50'
          : 'border-slate-300 bg-white hover:border-slate-400'
      } ${disabled ? 'cursor-not-allowed bg-slate-100' : ''}`}
    />
    {error && <span className="mt-1 text-xs text-red-500">{error}</span>}
  </div>
);

export default FormInput;
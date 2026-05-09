import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';

type SignatureUploadProps = {
  disabled?: boolean;
  onChange: (imageBase64: string | null, imageType: string | null, error?: string) => void;
};

const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpg', 'image/jpeg'];

const SignatureUpload = ({ disabled = false, onChange }: SignatureUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const acceptedText = useMemo(() => 'PNG, JPG, JPEG up to 2MB', []);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPreview(null);
      setError('');
      onChange(null, null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type.toLowerCase())) {
      const message = 'Only png, jpg and jpeg files are allowed.';
      setError(message);
      setPreview(null);
      onChange(null, null, message);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      const message = 'File size exceeds 2MB.';
      setError(message);
      setPreview(null);
      onChange(null, null, message);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      setPreview(result);
      setError('');
      onChange(result.split(',')[1] ?? null, file.type.toLowerCase());
    };
    reader.onerror = () => {
      const message = 'Could not read selected image.';
      setError(message);
      setPreview(null);
      onChange(null, null, message);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs text-slate-600">{acceptedText}</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          disabled={disabled}
          onChange={onFileChange}
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {preview ? (
        <div className="rounded-md border border-slate-200 p-2">
          <img src={preview} alt="Signature preview" className="max-h-36 w-auto object-contain" />
        </div>
      ) : null}
    </div>
  );
};

export default SignatureUpload;

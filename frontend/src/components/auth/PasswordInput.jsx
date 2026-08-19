import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder = 'Enter password',
  error,
  autoComplete = 'current-password',
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </label>

      <div className="relative">
        <input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          className={[
            'h-11 w-full rounded-xl border bg-white px-4 pr-12 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-2 dark:bg-slate-950 dark:text-slate-50',
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-900'
              : 'border-slate-200 focus:border-slate-400 focus:ring-slate-900/10 dark:border-slate-800 dark:focus:border-slate-600',
          ].join(' ')}
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-slate-500 transition hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-inset"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>

      {error ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{error}</p> : null}
    </div>
  );
}

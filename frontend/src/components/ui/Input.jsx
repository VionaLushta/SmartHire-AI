import { forwardRef } from 'react';
import { classNames } from '../../utils/classNames';

const Input = forwardRef(function Input({ className, label, helperText, error, ...props }, ref) {
  const hasError = Boolean(error || props['aria-invalid']);

  return (
    <label className="flex w-full flex-col">
      {label ? <span className="field-label">{label}</span> : null}
      <input
        ref={ref}
        className={classNames(
          'h-11 w-full rounded-xl border bg-white/80 px-4 text-sm text-slate-900 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5',
          hasError
            ? 'border-rose-300 bg-rose-50 text-rose-900'
            : 'border-slate-200 hover:border-slate-300',
          className,
        )}
        aria-invalid={hasError}
        {...props}
      />
      {helperText ? <span className={classNames('field-help', hasError && 'text-rose-600')}>{helperText}</span> : null}
    </label>
  );
});

export default Input;

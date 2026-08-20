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
          'h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition duration-150 ease-out placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10',
          hasError
            ? 'border-[#ef4444]/30 bg-[#fff5f5] text-slate-900'
            : 'hover:border-[rgba(15,23,42,0.12)]',
          className,
        )}
        aria-invalid={hasError}
        {...props}
      />
      {helperText ? <span className={classNames('field-help', hasError && 'text-[#dc2626]')}>{helperText}</span> : null}
    </label>
  );
});

export default Input;

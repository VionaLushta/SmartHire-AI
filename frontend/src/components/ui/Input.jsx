import { forwardRef, useId } from 'react';
import { classNames } from '../../utils/classNames';

const Input = forwardRef(function Input(
  { className, label, helperText, error, id, required, ...props },
  ref,
) {
  const hasError = Boolean(error || props['aria-invalid']);
  const generatedId = useId();
  const inputId = id || props.name || generatedId;
  const helperId = helperText ? `${inputId}-help` : undefined;
  const errorId = hasError ? `${inputId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex w-full flex-col">
      {label ? (
        <label htmlFor={inputId} className="field-label">
          {label}
          {required ? <span className="ml-1 text-rose-500">*</span> : null}
        </label>
      ) : null}
      <input
        id={inputId}
        ref={ref}
        className={classNames(
          'h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition duration-150 ease-out placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10',
          hasError
            ? 'border-[#ef4444]/30 bg-[#fff5f5] text-slate-900'
          : 'hover:border-[rgba(15,23,42,0.12)]',
          className,
        )}
        aria-invalid={hasError}
        aria-describedby={describedBy}
        required={required}
        {...props}
      />
      {helperText ? (
        <span id={helperId} className={classNames('field-help', hasError && 'text-[#dc2626]')}>
          {helperText}
        </span>
      ) : null}
      {hasError ? (
        <span id={errorId} className="mt-1.5 text-xs font-medium text-[#dc2626]">
          {error || 'This field is required.'}
        </span>
      ) : null}
    </div>
  );
});

export default Input;

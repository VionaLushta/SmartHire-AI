import { forwardRef } from 'react';
import { classNames } from '../../utils/classNames';

const variants = {
  primary:
    'border border-[#1d4ed8] bg-[#2563eb] text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)] hover:border-[#1d4ed8] hover:bg-[#1d4ed8] focus:ring-[#2563eb]',
  secondary:
    'border border-[rgba(15,23,42,0.08)] bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[rgba(15,23,42,0.12)] hover:bg-slate-50 focus:ring-[#2563eb]',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-[#2563eb]',
  danger:
    'border border-[#dc2626] bg-[#ef4444] text-white shadow-[0_8px_20px_rgba(239,68,68,0.18)] hover:bg-[#dc2626] focus:ring-[#ef4444]',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-[15px]',
  lg: 'h-12 px-5 text-[15px]',
  icon: 'h-11 w-11 justify-center p-0',
};

const Button = forwardRef(function Button(
  {
    className,
    variant = 'secondary',
    size = 'md',
    type = 'button',
    as: Component = 'button',
    loading = false,
    disabled,
    children,
    ...props
  },
  ref,
 ) {
  const isDisabled = disabled || loading;

  const resolvedVariant =
    variant === 'outline'
      ? 'secondary'
      : variant === 'success'
        ? 'primary'
        : variant === 'loading'
          ? 'primary'
          : variant;

  const sharedProps = {
    className: classNames(
      'inline-flex items-center justify-center gap-2 rounded-[14px] font-semibold tracking-[-0.02em] transition duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
      variants[resolvedVariant] || variants.secondary,
      sizes[size] || sizes.md,
      isDisabled && 'cursor-not-allowed',
      className,
    ),
    disabled: isDisabled,
    'aria-busy': loading || undefined,
    ...props,
  };

  const content = loading ? (
    <>
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
        aria-hidden="true"
      />
      <span>{children}</span>
    </>
  ) : (
    children
  );

  if (Component === 'button') {
    return (
      <button ref={ref} type={type} {...sharedProps}>
        {content}
      </button>
    );
  }

  return (
    <Component ref={ref} {...sharedProps}>
      {content}
    </Component>
  );
});

export default Button;

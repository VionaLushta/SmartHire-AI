import { forwardRef } from 'react';
import { classNames } from '../../utils/classNames';

const variants = {
  primary:
    'bg-slate-950 text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)] hover:-translate-y-0.5 hover:bg-slate-800 focus:ring-slate-900',
  secondary:
    'border border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 focus:ring-slate-800',
  outline:
    'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-950 focus:ring-slate-800',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus:ring-slate-800',
  danger:
    'bg-rose-600 text-white shadow-[0_12px_28px_rgba(225,29,72,0.18)] hover:-translate-y-0.5 hover:bg-rose-500 focus:ring-rose-600',
  success:
    'bg-emerald-600 text-white shadow-[0_12px_28px_rgba(5,150,105,0.18)] hover:-translate-y-0.5 hover:bg-emerald-500 focus:ring-emerald-600',
  loading:
    'cursor-wait bg-slate-900 text-white opacity-90 focus:ring-slate-900',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-sm',
  icon: 'h-10 w-10 justify-center p-0',
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

  const sharedProps = {
    className: classNames(
      'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      variants[variant] || variants.secondary,
      sizes[size],
      className,
    ),
    disabled: isDisabled,
    ...props,
  };

  const content = loading ? (
    <>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
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

import { classNames } from '../../utils/classNames';

export default function Badge({ className, children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border border-slate-200 bg-slate-100 text-slate-700',
    primary: 'border border-blue-200 bg-blue-50 text-blue-700',
    success: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border border-rose-200 bg-rose-50 text-rose-700',
    info: 'border border-violet-200 bg-violet-50 text-violet-700',
  };

  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

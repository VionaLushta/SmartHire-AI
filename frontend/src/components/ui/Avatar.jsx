import { classNames } from '../../utils/classNames';

export default function Avatar({ initials = 'SH', size = 'md', className }) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div
      className={classNames(
        'inline-flex items-center justify-center rounded-full bg-slate-950 font-semibold text-white shadow-sm ring-2 ring-slate-100',
        sizes[size],
        className,
      )}
      aria-label="Profile avatar"
    >
      {initials}
    </div>
  );
}

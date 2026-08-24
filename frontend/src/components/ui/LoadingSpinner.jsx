export default function LoadingSpinner({ label = 'Loading', size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-10 w-10 border-[3px]',
  };

  return (
    <div role="status" aria-live="polite" className={['flex items-center justify-center gap-3', className].join(' ')}>
      <div
        className={[
          'animate-spin rounded-full border-[rgba(15,23,42,0.12)] border-t-[#2563eb]',
          sizes[size] || sizes.md,
        ].join(' ')}
        aria-hidden="true"
      />
      <span className="text-sm font-medium text-slate-500">{label}</span>
    </div>
  );
}

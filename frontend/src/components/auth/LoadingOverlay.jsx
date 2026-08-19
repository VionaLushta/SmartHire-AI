import LoadingSpinner from '../ui/LoadingSpinner';

export default function LoadingOverlay({ label = 'Loading' }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/70 backdrop-blur-sm dark:bg-slate-950/70">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <LoadingSpinner />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
      </div>
    </div>
  );
}

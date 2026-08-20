import LoadingSpinner from '../ui/LoadingSpinner';

export default function LoadingOverlay({ label = 'Loading' }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/72">
      <div className="flex flex-col items-center gap-3 rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white px-5 py-4 text-slate-900 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
        <LoadingSpinner />
        <p className="text-sm font-medium text-slate-600">{label}</p>
      </div>
    </div>
  );
}

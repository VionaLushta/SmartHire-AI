import LoadingSpinner from '../ui/LoadingSpinner';

export default function LoadingState({ title = 'Loading jobs...' }) {
  return (
    <div className="flex min-h-[30vh] items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-sm font-medium text-slate-600">{title}</p>
      </div>
    </div>
  );
}

import LoadingSpinner from '../ui/LoadingSpinner';

export default function LoadingState({ title = 'Loading jobs...' }) {
  return (
    <div className="flex min-h-[30vh] items-center justify-center rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-sm font-medium text-slate-500">{title}</p>
      </div>
    </div>
  );
}

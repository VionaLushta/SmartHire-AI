export default function LoadingSpinner() {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-950" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

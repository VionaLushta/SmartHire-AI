export default function LoadingSpinner() {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(15,23,42,0.12)] border-t-[#2563eb]" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

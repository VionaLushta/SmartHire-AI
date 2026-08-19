export default function FormError({ children }) {
  if (!children) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
    >
      {children}
    </div>
  );
}

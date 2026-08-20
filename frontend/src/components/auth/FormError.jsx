export default function FormError({ children }) {
  if (!children) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700"
    >
      {children}
    </div>
  );
}

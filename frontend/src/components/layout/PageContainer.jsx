export default function PageContainer({ children, className = '' }) {
  return (
    <main
      className={[
        'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="animate-[fadeIn_0.35s_ease-out]">{children}</div>
    </main>
  );
}

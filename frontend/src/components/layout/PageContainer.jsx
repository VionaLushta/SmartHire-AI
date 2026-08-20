export default function PageContainer({ children, className = '' }) {
  return (
    <main
      className={[
        'mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="animate-[fadeIn_0.25s_ease-out]">{children}</div>
    </main>
  );
}

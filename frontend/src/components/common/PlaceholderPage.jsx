export default function PlaceholderPage({ title, subtitle }) {
  return (
    <section className="mx-auto flex min-h-[40vh] max-w-2xl flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-slate-500 sm:text-base">
        {subtitle}
      </p>
    </section>
  );
}

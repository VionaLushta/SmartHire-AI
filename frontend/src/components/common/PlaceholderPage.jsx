export default function PlaceholderPage({ title, subtitle }) {
  return (
    <section className="mx-auto flex min-h-[40vh] max-w-2xl flex-col items-center justify-center text-center">
      <h1 className="text-[48px] font-extrabold tracking-[-0.05em] text-slate-950">
        {title}
      </h1>
      <p className="mt-3 text-[16px] font-medium leading-7 text-slate-500">
        {subtitle}
      </p>
    </section>
  );
}

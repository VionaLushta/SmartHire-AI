export default function SectionHeading({ eyebrow, title, description, centered = false }) {
  return (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-3 text-[32px] font-bold tracking-[-0.04em] text-slate-950">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-[16px] font-medium leading-7 text-slate-600">
          {description}
        </p>
      ) : null}
    </div>
  );
}

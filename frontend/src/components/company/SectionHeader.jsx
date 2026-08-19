export default function SectionHeader({ eyebrow, title, description }) {
  return (
    <div className="space-y-2">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-500">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
      {description ? <p className="max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
    </div>
  );
}

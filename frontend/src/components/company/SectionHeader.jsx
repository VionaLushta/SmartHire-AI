export default function SectionHeader({ eyebrow, title, description }) {
  return (
    <div className="space-y-2">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-[32px] font-bold tracking-[-0.04em] text-slate-900">{title}</h2>
      {description ? <p className="max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}

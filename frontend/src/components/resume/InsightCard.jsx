export default function InsightCard({ title, description, value }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-lg font-semibold text-slate-900">{value}</p>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </div>
  );
}

export default function EmptyState({ title = 'No records found', description = 'There are no rows to display yet.' }) {
  return (
    <div className="rounded-[16px] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
      <h3 className="text-[20px] font-semibold tracking-[-0.03em] text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

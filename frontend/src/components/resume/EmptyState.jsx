export default function EmptyState({ title = 'Nothing here yet', description = 'No items available.' }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}

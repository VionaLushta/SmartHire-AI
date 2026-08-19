export default function StatusBadge({ status = 'active' }) {
  const normalized = String(status).toLowerCase();
  const tone = {
    active: 'bg-emerald-100 text-emerald-700',
    draft: 'bg-amber-100 text-amber-700',
    paused: 'bg-orange-100 text-orange-700',
    archived: 'bg-slate-200 text-slate-700',
    verified: 'bg-emerald-100 text-emerald-700',
    suspended: 'bg-rose-100 text-rose-700',
    pending: 'bg-amber-100 text-amber-700',
    rejected: 'bg-rose-100 text-rose-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    interview: 'bg-violet-100 text-violet-700',
  }[normalized] || 'bg-slate-100 text-slate-700';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {status}
    </span>
  );
}

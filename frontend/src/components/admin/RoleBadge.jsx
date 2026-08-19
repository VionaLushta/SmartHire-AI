export default function RoleBadge({ role = 'Candidate' }) {
  const tone = {
    admin: 'bg-slate-900 text-white',
    company: 'bg-sky-100 text-sky-700',
    candidate: 'bg-emerald-100 text-emerald-700',
  }[String(role).toLowerCase()] || 'bg-slate-100 text-slate-700';

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {role}
    </span>
  );
}

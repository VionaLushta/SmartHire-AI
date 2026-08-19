export default function SuggestionCard({ title, detail, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    primary: 'border-sky-200 bg-sky-50 text-sky-700',
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.neutral}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6 opacity-80">{detail}</p>
    </div>
  );
}

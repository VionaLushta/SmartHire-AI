import { classNames } from '../../utils/classNames';

const tones = {
  slate: 'bg-slate-100 text-slate-950',
  sky: 'bg-sky-100 text-sky-950',
  emerald: 'bg-emerald-100 text-emerald-950',
  amber: 'bg-amber-100 text-amber-950',
  rose: 'bg-rose-100 text-rose-950',
};

export default function StatCard({ icon: Icon, label, value, hint, tone = 'slate' }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
          {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={classNames('flex h-11 w-11 items-center justify-center rounded-2xl', tones[tone])}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </article>
  );
}

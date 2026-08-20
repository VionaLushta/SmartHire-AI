import { classNames } from '../../utils/classNames';

const tones = {
  slate: 'bg-slate-100 text-slate-700',
  sky: 'bg-sky-50 text-sky-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
};

export default function StatCard({ icon: Icon, label, value, hint, tone = 'slate', className = '' }) {
  return (
    <article className={['rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-150 ease-out hover:border-[rgba(15,23,42,0.12)]', className].join(' ')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-3 text-[30px] font-bold tracking-[-0.04em] text-slate-900">{value}</p>
          {hint ? <p className="mt-2 max-w-[14rem] text-sm leading-6 text-slate-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={classNames('flex h-10 w-10 items-center justify-center rounded-[12px]', tones[tone])}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </article>
  );
}

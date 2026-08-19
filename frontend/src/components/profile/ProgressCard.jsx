import { classNames } from '../../utils/classNames';

export default function ProgressCard({ title, items = [], className }) {
  return (
    <section className={classNames('rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm', className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Profile completeness</p>
      <h3 className="mt-2 text-xl font-semibold text-slate-950">{title}</h3>

      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">{item.label}</span>
              <span className="font-semibold text-slate-900">{item.value}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={classNames('h-full rounded-full transition-all', item.tone || 'bg-slate-900')}
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

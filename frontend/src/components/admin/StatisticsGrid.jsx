import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatisticsGrid({ items = [] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        const positive = item.trendDirection !== 'down';

        return (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              {item.trend ? (
                <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {item.trend}
                </div>
              ) : null}
            </div>

            <div className="mt-5">
              <p className="text-sm text-slate-500">{item.label}</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <p className="text-3xl font-semibold tracking-tight text-slate-950">{item.value}</p>
                {item.caption ? <span className="text-xs text-slate-500">{item.caption}</span> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

import { BrandMark } from '../brand/BrandLockup';

const highlights = [
  { value: '94%', label: 'match accuracy' },
  { value: '24h', label: 'shortlist turnaround' },
  { value: '3x', label: 'faster screening' },
];

export default function AuthIllustration({
  title,
  description,
  accent = 'Operations view',
  subtitle = 'The premium recruiting cockpit',
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white px-6 py-8 text-slate-900 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
      <div className="relative flex min-h-[28rem] flex-col justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50">
              <BrandMark className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                {subtitle}
              </p>
              <p className="text-sm text-slate-500">Built for structured hiring teams</p>
            </div>
          </div>
          <h2 className="max-w-lg text-[48px] font-extrabold tracking-[-0.05em] leading-[0.96]">{title}</h2>
          <p className="max-w-xl text-[16px] font-medium leading-7 text-slate-500">{description}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.label}
              className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4"
            >
              <p className="text-2xl font-bold text-slate-900">{item.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-5">
          <div className="relative grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{accent}</p>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Live
                </span>
              </div>
              <p className="mt-4 text-lg font-semibold tracking-[-0.02em] text-slate-900">
                Hiring operations, organized like a premium product.
              </p>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Pipeline health</span>
                  <span>86%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-[86%] rounded-full bg-[#2563eb]" />
                </div>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Review momentum</span>
                  <span>+18%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-[72%] rounded-full bg-[#10b981]" />
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Review queue</p>
                <p className="mt-2 text-xl font-bold text-slate-900">12 candidates</p>
                <p className="mt-1 text-sm text-slate-500">Ready for final review.</p>
              </div>
              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Team sync</p>
                <p className="mt-2 text-xl font-bold text-slate-900">Decision ready</p>
                <p className="mt-1 text-sm text-slate-500">Structured for fast approvals.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

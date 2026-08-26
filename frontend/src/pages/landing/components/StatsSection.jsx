import SectionHeading from './SectionHeading';
import AnimatedCounter from './AnimatedCounter';
import { stats } from './section-data';

export default function StatsSection() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <SectionHeading
          eyebrow="Statistics"
          title="Momentum looks better when the numbers are easy to trust."
          description="Animated counters help this section feel alive without relying on any external libraries."
        />

        <div className="rounded-[20px] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={[
                  'rounded-[16px] border border-slate-200 bg-slate-50 p-6 shadow-sm transition duration-150 ease-out hover:border-slate-300',
                  'xl:col-span-2',
                ].join(' ')}
              >
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{stat.label}</p>
                <p className="mt-4 text-[32px] font-bold tracking-[-0.04em] text-slate-950">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

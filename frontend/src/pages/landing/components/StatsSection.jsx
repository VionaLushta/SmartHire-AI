import SectionHeading from './SectionHeading';
import AnimatedCounter from './AnimatedCounter';
import { stats } from './section-data';

export default function StatsSection() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl rounded-[2rem] border border-slate-200 bg-slate-950 px-6 py-12 text-white shadow-2xl shadow-slate-950/10 sm:px-8 lg:px-10">
        <SectionHeading
          eyebrow="Statistics"
          title="Momentum looks better when the numbers are easy to trust."
          description="Animated counters help this section feel alive without relying on any external libraries."
          centered
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-sm transition duration-300 hover:-translate-y-1"
            >
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{stat.label}</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight text-white">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

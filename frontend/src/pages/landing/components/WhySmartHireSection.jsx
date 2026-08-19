import SectionHeading from './SectionHeading';
import { comparisons } from './section-data';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function WhySmartHireSection() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Why SmartHire"
          title="A clearer hiring experience than traditional workflows."
          description="A polished comparison section that helps the product value land quickly."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {comparisons.map((item) => {
            const Icon = item.icon;
            const isHighlight = item.tone === 'highlight';

            return (
              <article
                key={item.title}
                className={[
                  'rounded-2xl border p-6 shadow-sm transition duration-300 hover:-translate-y-1',
                  isHighlight
                    ? 'border-slate-950 bg-slate-950 text-white shadow-slate-950/15'
                    : 'border-slate-200 bg-white/80 text-slate-950',
                ].join(' ')}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      'flex h-11 w-11 items-center justify-center rounded-2xl',
                      isHighlight ? 'bg-white/10 text-white' : 'bg-slate-950 text-white',
                    ].join(' ')}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                </div>

                <ul className="mt-6 space-y-3">
                  {item.points.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm leading-6">
                      {isHighlight ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                      )}
                      <span className={isHighlight ? 'text-slate-200' : 'text-slate-600'}>{point}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

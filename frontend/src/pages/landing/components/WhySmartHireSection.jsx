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

        <div className="mt-10 grid gap-5 lg:grid-cols-12">
          {comparisons.map((item) => {
            const Icon = item.icon;
            const isHighlight = item.tone === 'highlight';

            return (
            <article
              key={item.title}
              className={[
                  'rounded-[16px] border p-6 shadow-sm transition duration-150 ease-out',
                  isHighlight ? 'lg:col-span-7' : 'lg:col-span-5',
                  isHighlight
                    ? 'border-[#2563eb]/20 bg-slate-50 text-slate-950'
                    : 'border-slate-200 bg-white text-slate-950',
                ].join(' ')}
            >
                <div className="flex items-center gap-3">
                  <div
                    className={[
                      'flex h-11 w-11 items-center justify-center rounded-[14px]',
                      isHighlight ? 'bg-[#2563eb]/10 text-[#1d4ed8]' : 'bg-[#2563eb] text-white',
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
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />
                      )}
                      <span className="text-slate-600">{point}</span>
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

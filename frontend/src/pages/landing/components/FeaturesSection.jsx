import SectionHeading from './SectionHeading';
import { joinBenefits } from './section-data';

const toneStyles = {
  sky: 'bg-sky-500/10 text-sky-600 ring-sky-500/10',
  violet: 'bg-violet-500/10 text-violet-600 ring-violet-500/10',
  emerald: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/10',
  amber: 'bg-amber-500/10 text-amber-600 ring-amber-500/10',
  rose: 'bg-rose-500/10 text-rose-600 ring-rose-500/10',
};

export default function FeaturesSection() {
  return (
    <section id="why-join-us" className="scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <span id="features" className="sr-only" aria-hidden="true">
          features anchor
        </span>
        <SectionHeading
          eyebrow="Why Join Us"
          title="Why SmartHire Teams Thrive"
          description="We&apos;re building the future of recruitment with people who want to grow, learn, and make an impact."
          centered
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {joinBenefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article
                key={benefit.title}
                className="group rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition duration-200 ease-out hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_44px_rgba(15,23,42,0.09)]"
              >
                <div
                  className={[
                    'flex h-11 w-11 items-center justify-center rounded-[16px] ring-1',
                    toneStyles[benefit.tone],
                  ].join(' ')}
                >
                  <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.03em] text-slate-950">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{benefit.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { BriefcaseBusiness } from 'lucide-react';

const aboutHighlights = [
  'Modern Workplace',
  'Career Growth',
  'Collaborative Culture',
];

export default function FinalCtaSection() {
  return (
    <section id="about-us" className="px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20">
      <div className="mx-auto w-full max-w-7xl">
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.34em] text-slate-500">
                Join SmartHire Technologies
              </p>
              <h2 className="mt-4 text-[clamp(2.15rem,3.5vw,3.4rem)] font-bold tracking-[-0.05em] text-slate-950">
                Building the future of hiring, together.
              </h2>
              <p className="mt-4 max-w-2xl text-[16px] leading-7 text-slate-600">
                At SmartHire Technologies, we believe hiring should be simple, transparent, and
                people-first. Our mission is to connect talented people with meaningful career
                opportunities while helping organizations build stronger teams through modern
                recruitment technology.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {aboutHighlights.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-200 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
              <img
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80"
                alt="Software engineers and recruiters collaborating around laptops in a bright modern office"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>

          <div className="mt-8 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-3">
            {[
              'Enterprise hiring with a human feel',
              'Simple workflows for candidates and recruiters',
              'Designed for clarity, scale, and trust',
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
              >
                <BriefcaseBusiness className="mt-0.5 h-4 w-4 shrink-0 text-[#2563eb]" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import SectionHeading from './SectionHeading';
import { features } from './section-data';

export default function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Built for modern recruiting"
          title="Everything you need to hire smarter"
          centered
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-6">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={[
                'flex h-full flex-col rounded-[16px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition duration-150 ease-out hover:border-slate-300',
                index === 0 ? 'lg:col-span-1' : 'lg:col-span-1',
              ].join(' ')}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eff4ff] text-[#2563eb]">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </div>

              <div className="mt-5 flex flex-1 flex-col">
                <h3 className="text-[18px] font-semibold tracking-[-0.03em] text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-3 text-[14px] leading-6 text-slate-600">
                  {feature.description}
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <Link
                  to={feature.to}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eff4ff] text-[#2563eb] transition duration-150 ease-out hover:bg-[#dfe8ff] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-white"
                  aria-label={`Open ${feature.title}`}
                >
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

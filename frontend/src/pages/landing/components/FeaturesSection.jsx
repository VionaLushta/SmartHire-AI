import SectionHeading from './SectionHeading';
import { features } from './section-data';

export default function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Product"
          title="Editorial feature blocks built around actual hiring value."
          description="Each module is presented as a business outcome rather than a generic capability list."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={[
                'rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm transition duration-150 ease-out hover:border-slate-300',
                index % 3 === 0 ? 'lg:col-span-2' : '',
                index % 2 === 1 ? 'lg:mt-6' : '',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-6">
                <div className="max-w-lg">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-3 text-[24px] font-bold tracking-[-0.04em] text-slate-950">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-[16px] font-medium leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </div>

                <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-slate-200 bg-slate-50 text-slate-950 lg:flex">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

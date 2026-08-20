import SectionHeading from './SectionHeading';
import { pricing } from './section-data';
import { Check } from 'lucide-react';
import Button from '../../../components/ui/Button';

export default function PricingSection() {
  return (
    <section id="pricing" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Pricing"
          title="A simple pricing story that feels easy to trust."
          description="The plans stay intentionally compact so the page reads like a premium product site, not a sales funnel."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-12">
          {pricing.map((plan, index) => (
            <article
              key={plan.name}
              className={[
                'rounded-[16px] border p-6 shadow-sm transition duration-150 ease-out',
                index === 1 ? 'lg:col-span-6' : 'lg:col-span-3 lg:mt-6',
                plan.highlighted
                  ? 'border-[#2563eb]/20 bg-white text-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.08)]'
                  : 'border-slate-200 bg-white text-slate-950',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span
                    className={[
                      'inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]',
                      plan.highlighted
                        ? 'border border-[#2563eb]/20 bg-[#2563eb]/10 text-[#1d4ed8]'
                        : 'border border-slate-200 bg-slate-50 text-slate-500',
                    ].join(' ')}
                  >
                    {plan.highlighted ? 'Most Popular' : 'Plan'}
                  </span>
                  <h3 className="mt-5 text-[24px] font-bold tracking-[-0.04em]">{plan.name}</h3>
                </div>
                <p className="text-right text-[32px] font-bold tracking-[-0.04em]">
                  {plan.price}
                  {plan.price === 'Custom' || plan.price === '$0' ? '' : '/mo'}
                </p>
              </div>

              <p className="mt-4 text-[16px] font-medium leading-7 text-slate-600">
                {plan.description}
              </p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button variant={plan.highlighted ? 'primary' : 'secondary'} className="w-full">
                  {plan.highlighted ? 'Choose plan' : 'Select'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

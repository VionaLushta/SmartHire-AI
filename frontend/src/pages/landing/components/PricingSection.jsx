import SectionHeading from './SectionHeading';
import { pricing } from './section-data';
import { Check } from 'lucide-react';
import Button from '../../../components/ui/Button';

export default function PricingSection() {
  return (
    <section id="pricing" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Pricing Preview"
          title="Simple pricing cards that frame the next conversation."
          description="No payment logic, just a clean product story that helps users imagine the value."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {pricing.map((plan) => (
            <article
              key={plan.name}
              className={[
                'rounded-2xl border p-6 shadow-sm transition duration-300 hover:-translate-y-1',
                plan.highlighted
                  ? 'border-slate-950 bg-slate-950 text-white shadow-slate-950/15'
                  : 'border-slate-200 bg-white/80 text-slate-950',
              ].join(' ')}
            >
              {plan.highlighted ? (
                <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200">
                  Most Popular
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Pricing
                </span>
              )}

              <h3 className="mt-5 text-2xl font-semibold">{plan.name}</h3>
              <p className={['mt-2 text-sm leading-6', plan.highlighted ? 'text-slate-300' : 'text-slate-600'].join(' ')}>
                {plan.description}
              </p>

              <p className="mt-6 text-4xl font-semibold tracking-tight">
                {plan.price}
                {plan.price === '$0' ? '' : plan.price === 'Custom' ? '' : '/mo'}
              </p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm leading-6">
                    <Check className={plan.highlighted ? 'mt-0.5 h-4 w-4 text-emerald-300' : 'mt-0.5 h-4 w-4 text-emerald-600'} aria-hidden="true" />
                    <span className={plan.highlighted ? 'text-slate-200' : 'text-slate-600'}>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button variant={plan.highlighted ? 'primary' : 'secondary'} className="w-full">
                  {plan.highlighted ? 'Choose Plan' : 'Select'}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

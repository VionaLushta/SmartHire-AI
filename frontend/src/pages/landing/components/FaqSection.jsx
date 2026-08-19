import SectionHeading from './SectionHeading';
import { faqs } from './section-data';
import { ChevronDown } from 'lucide-react';

export default function FaqSection() {
  return (
    <section id="faq" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions answered with clarity and no clutter."
          description="An accordion built with semantic HTML so it remains accessible and simple."
        />

        <div className="mt-10 space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm transition duration-300 open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2">
                <span>{faq.question}</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition duration-300 group-open:rotate-180 group-open:text-slate-900" aria-hidden="true" />
              </summary>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

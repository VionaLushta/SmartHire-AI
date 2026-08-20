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
              className="group rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm transition duration-150 ease-out open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-lg font-semibold text-slate-950 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-transparent">
                <span>{faq.question}</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition duration-150 ease-out group-open:rotate-180 group-open:text-slate-700" aria-hidden="true" />
              </summary>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

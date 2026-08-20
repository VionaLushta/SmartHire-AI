import SectionHeading from './SectionHeading';
import { steps } from './section-data';

export default function HowItWorksSection() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="How It Works"
          title="A four-step hiring flow that feels intuitive from the first click."
          description="A timeline-style layout that makes the workflow easy to scan on desktop and mobile."
        />

        <ol className="mt-10 grid gap-5 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className={[
                'relative rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm transition duration-150 ease-out hover:border-slate-300',
                index % 2 === 1 ? 'lg:mt-6' : '',
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2563eb] text-sm font-semibold text-white">
                  0{index + 1}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent lg:hidden" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-950">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

import { Quote } from 'lucide-react';
import SectionHeading from './SectionHeading';
import { employeeTestimonials } from './section-data';

export default function EmployeeTestimonialsSection() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Stories"
          title="Employee Testimonials"
          description="A few words from the people building SmartHire every day."
          centered
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {employeeTestimonials.map((testimonial, index) => (
            <article
              key={testimonial.name}
              className={[
                'group flex h-full flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition duration-200 ease-out hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_44px_rgba(15,23,42,0.09)]',
                index === 1 ? 'lg:mt-6' : '',
              ].join(' ')}
            >
              <div className="relative h-52 overflow-hidden">
                <img
                  src={testimonial.image}
                  alt={`${testimonial.name}, ${testimonial.role}`}
                  className="h-full w-full object-cover object-center transition duration-300 ease-out group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.28)_100%)]" />
                <div className="absolute left-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-[#2563eb] shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                  <Quote className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6">
                <blockquote className="text-[16px] leading-7 text-slate-600">
                  "{testimonial.quote}"
                </blockquote>

                <div className="mt-6 border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-slate-950">{testimonial.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{testimonial.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

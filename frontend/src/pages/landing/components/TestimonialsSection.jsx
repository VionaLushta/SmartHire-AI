import SectionHeading from './SectionHeading';
import { testimonials } from './section-data';
import { Quote } from 'lucide-react';

export default function TestimonialsSection() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Testimonials"
          title="Trusted by teams that care about polish and speed."
          description="Three premium testimonial cards with a clean startup tone."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article
              key={testimonial.name}
              className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <Quote className="h-7 w-7 text-slate-950" aria-hidden="true" />
              <p className="mt-5 text-base leading-7 text-slate-600">“{testimonial.quote}”</p>
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-950">{testimonial.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{testimonial.role}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

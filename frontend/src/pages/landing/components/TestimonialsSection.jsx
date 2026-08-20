import { Quote } from 'lucide-react';
import SectionHeading from './SectionHeading';
import { testimonials } from './section-data';

export default function TestimonialsSection() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Teams"
          title="Built for teams who want the product to look as good as it works."
          description="A restrained testimonial layout that keeps the focus on trust, not decoration."
        />

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <article
              key={testimonial.name}
              className={[
                'rounded-[16px] border border-slate-200 bg-white p-6 shadow-sm transition duration-150 ease-out hover:border-slate-300',
                index === 0 ? 'lg:col-span-2' : 'lg:mt-6',
              ].join(' ')}
            >
              <Quote className="h-7 w-7 text-[#2563eb]" aria-hidden="true" />
              <blockquote className="mt-5 text-[16px] font-medium leading-7 text-slate-600">
                "{testimonial.quote}"
              </blockquote>
              <div className="mt-6 border-t border-slate-200 pt-4">
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

import { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

const contactCards = [
  {
    title: 'Office',
    value: 'Prishtina, Kosovo',
    icon: MapPin,
    href: 'https://www.google.com/maps?q=Prishtina,+Kosovo',
  },
  {
    title: 'General Email',
    value: 'smarthireaii@proton.me',
    icon: Mail,
    href: 'mailto:smarthireaii@proton.me',
  },
  {
    title: 'Careers',
    value: 'careers@smarthire.ai',
    icon: Users,
    href: 'mailto:careers@smarthire.ai',
  },
  {
    title: 'Phone',
    value: '+383 49 123 456',
    icon: Phone,
    href: 'tel:+38349123456',
  },
];

const faqs = [
  {
    question: 'How can I apply?',
    answer:
      'Visit our Jobs page to explore open positions, then use the application flow on the role that best matches your background and goals.',
  },
  {
    question: 'How long does recruitment take?',
    answer:
      'Timelines vary by role, but most interview processes are designed to move efficiently while still giving both sides enough time to evaluate fit.',
  },
  {
    question: 'Do you offer internships?',
    answer:
      'Yes. SmartHire Technologies offers internship opportunities across engineering, design, data, product, and business operations.',
  },
  {
    question: 'How can companies contact SmartHire?',
    answer:
      'Use the form below or email our general inbox. Partnerships, enterprise inquiries, and media requests are all welcome.',
  },
];

export default function ContactPage() {
  const [activeFaq, setActiveFaq] = useState(0);

  return (
    <div className="space-y-24 pb-12 pt-4">
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            Contact
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-6xl">
            Contact SmartHire Technologies
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Have a question, partnership idea, or career inquiry? Our team is ready to help.
          </p>
        </div>

        <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <img
            src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80"
            alt="Modern SmartHire Technologies office interior"
            className="h-[320px] w-full object-cover sm:h-[380px]"
            loading="lazy"
          />
        </div>
      </section>

      <section>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {contactCards.map((card) => {
            const Icon = card.icon;

            return (
              <a
                key={card.title}
                href={card.href}
                className="group rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(15,23,42,0.07)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-slate-200 bg-slate-50 text-slate-600 transition-colors duration-300 group-hover:bg-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-[18px] font-semibold tracking-[-0.04em] text-slate-950">
                  {card.title}
                </h2>
                <p className="mt-2 text-[15px] leading-7 text-slate-600">{card.value}</p>
              </a>
            );
          })}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.07)] sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-600 ring-1 ring-slate-200">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                Contact Form
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                Send us a message
              </h2>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={(event) => event.preventDefault()}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Full Name</span>
                <input
                  type="text"
                  className="h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-950 outline-none transition focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="Your full name"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Email Address</span>
                <input
                  type="email"
                  className="h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-950 outline-none transition focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="you@example.com"
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Company (optional)</span>
                <input
                  type="text"
                  className="h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-950 outline-none transition focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="Company name"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Subject</span>
                <input
                  type="text"
                  className="h-12 w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-[15px] text-slate-950 outline-none transition focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-blue-100"
                  placeholder="How can we help?"
                />
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">Message</span>
              <textarea
                rows="6"
                className="w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-950 outline-none transition focus:border-[#2563eb] focus:bg-white focus:ring-4 focus:ring-blue-100"
                placeholder="Tell us a little more about your request."
              />
            </label>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#2563eb] px-6 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)] transition duration-150 ease-out hover:bg-[#1d4ed8]"
            >
              Send Message
              <Send className="ml-2 h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>

        <div className="space-y-5">
          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80"
              alt="SmartHire Technologies office collaboration space"
              className="h-[330px] w-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                <Clock3 className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Office Hours
                </p>
                <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-slate-950">
                  Monday - Friday
                </h3>
              </div>
            </div>

            <p className="mt-5 text-[17px] font-medium text-slate-900">09:00 - 17:00</p>
            <p className="mt-2 text-[15px] leading-7 text-slate-600">
              We respond during business hours and will get back to you as soon as possible.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            Frequently Asked Questions
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mt-8 space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;

            return (
              <article
                key={faq.question}
                className="rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq((current) => (current === index ? -1 : index))}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                  aria-expanded={isOpen}
                >
                  <span className="text-[17px] font-semibold tracking-[-0.03em] text-slate-950">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={[
                      'h-5 w-5 shrink-0 text-slate-500 transition-transform duration-300 ease-out',
                      isOpen ? 'rotate-180' : '',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                </button>

                <div
                  className={[
                    'grid overflow-hidden transition-all duration-300 ease-out',
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                  ].join(' ')}
                >
                  <div className="min-h-0 px-5 pb-5 sm:px-6">
                    <p className="max-w-3xl text-[15px] leading-7 text-slate-600">{faq.answer}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,1),rgba(255,255,255,1))] px-6 py-10 shadow-[0_18px_48px_rgba(15,23,42,0.07)] sm:px-10 sm:py-12">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
              Final CTA
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Ready to build the future with us?
            </h2>
          </div>

          <Link
            to={ROUTES.jobs}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2563eb] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)] transition duration-150 ease-out hover:bg-[#1d4ed8]"
          >
            Explore Careers
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </div>
  );
}

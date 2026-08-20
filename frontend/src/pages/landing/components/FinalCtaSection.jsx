import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';

export default function FinalCtaSection() {
  return (
    <section id="contact" className="px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20">
      <div className="mx-auto w-full max-w-7xl">
        <div className="rounded-[20px] border border-slate-200 bg-white px-6 py-12 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.34em] text-slate-500">
                Start hiring
              </p>
              <h2 className="mt-4 text-[32px] font-bold tracking-[-0.04em] text-slate-950">
                Bring a premium hiring experience to your team.
              </h2>
              <p className="mt-4 max-w-2xl text-[16px] font-medium leading-7 text-slate-600">
                SmartHire AI helps companies move from scattered screening to a polished workflow
                that feels clear, fast, and credible at every touchpoint.
              </p>
            </div>

            <div className="space-y-3 lg:justify-self-end">
              <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  For teams that hire often
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Start with the workflow, then expand into reporting and automation as your team
                  grows.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  to="/register"
                  className="inline-flex h-12 items-center justify-center rounded-[14px] border border-[#1d4ed8] bg-[#2563eb] px-6 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)] transition duration-150 ease-out hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-transparent"
                >
                  Start hiring
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="mailto:hello@smarthire.ai"
                  className="inline-flex h-12 items-center justify-center rounded-[14px] border border-slate-200 bg-white px-6 text-[15px] font-semibold text-slate-700 transition duration-150 ease-out hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-transparent"
                >
                  <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                  Contact sales
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

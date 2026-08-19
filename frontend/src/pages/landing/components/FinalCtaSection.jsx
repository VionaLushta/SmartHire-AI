import { Link } from 'react-router-dom';
import { Mail, Rocket } from 'lucide-react';

export default function FinalCtaSection() {
  return (
    <section className="px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-20">
      <div className="mx-auto w-full max-w-7xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 px-6 py-14 text-white shadow-2xl shadow-slate-950/15 sm:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.2),transparent_28%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-300">
                Ready to hire smarter?
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Make hiring feel premium from the very first touchpoint.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Create a standout recruiting experience with a landing page that feels modern,
                elegant, and ready for product growth.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <Link
                to="/register"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                <Rocket className="mr-2 h-4 w-4" aria-hidden="true" />
                Get Started
              </Link>
              <a
                href="mailto:hello@smarthire.ai"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

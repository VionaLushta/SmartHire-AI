import { Link } from 'react-router-dom';
import { ArrowRight, PlayCircle, Sparkles, Target, TrendingUp } from 'lucide-react';

const floatingCards = [
  {
    title: '48h shortlist',
    subtitle: 'AI prepares the strongest candidates fast.',
    icon: TrendingUp,
  },
  {
    title: 'Smart scoring',
    subtitle: 'Quality signals distilled into one view.',
    icon: Target,
  },
];

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.08),transparent_24%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]" />
      <div className="mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4 text-slate-950" aria-hidden="true" />
            AI powered recruitment for modern teams
          </div>

          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            AI-powered hiring for modern companies.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
            SmartHire AI turns hiring into a premium, intelligent workflow that helps teams review
            resumes, rank candidates, and move faster with clarity.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-6 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Learn More
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <span>Trusted by ambitious teams</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>Premium SaaS experience</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span>Built for scale</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -left-10 top-8 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute -bottom-6 right-0 h-44 w-44 rounded-full bg-slate-950/10 blur-3xl" />

          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/70 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur-xl">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Smart Hire</p>
                  <h2 className="mt-2 text-2xl font-semibold">Hiring intelligence, beautifully packaged.</h2>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">
                  Live
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Shortlist</p>
                  <p className="mt-3 text-3xl font-semibold">24</p>
                  <p className="mt-2 text-sm text-slate-300">Candidates ready for review.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Match rate</p>
                  <p className="mt-3 text-3xl font-semibold">92%</p>
                  <p className="mt-2 text-sm text-slate-300">AI match confidence score.</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Review momentum</span>
                  <span>+18% this week</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-sky-400 to-white/80" />
                </div>
              </div>
            </div>

            <div className="relative mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                {floatingCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.title}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-slate-950">{card.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{card.subtitle}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

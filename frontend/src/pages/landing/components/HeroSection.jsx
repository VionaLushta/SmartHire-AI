import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '../../../constants/routes';

export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative isolate overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-20 lg:pt-14"
    >
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(248,250,255,0.98)_0%,rgba(241,245,255,0.92)_38%,rgba(255,255,255,1)_100%)]" />
      <div className="absolute left-[-8rem] top-[-6rem] -z-10 h-80 w-80 rounded-full bg-[#2563eb]/8 blur-3xl" />
      <div className="absolute right-[-6rem] top-[10rem] -z-10 h-96 w-96 rounded-full bg-[#7c3aed]/8 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-white/70" />

      <div className="mx-auto grid w-full max-w-7xl gap-12 lg:min-h-[70vh] lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start">
        <div className="max-w-2xl lg:pt-10">
          <div className="inline-flex items-center rounded-full bg-[#e9ebff] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.24em] text-[#3656ff] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
            AI-powered hiring platform
          </div>

          <h1 className="mt-6 max-w-3xl text-[clamp(2.75rem,5vw,4.8rem)] font-extrabold leading-[0.96] tracking-[-0.06em] text-slate-950">
            Hiring software that feels{' '}
            <span className="bg-gradient-to-r from-[#2563eb] via-[#4f46e5] to-[#7c3aed] bg-clip-text text-transparent">
              calm, credible,
            </span>{' '}
            and built for serious teams.
          </h1>

          <p className="mt-6 max-w-xl text-[17px] leading-8 text-slate-600">
            SmartHire AI gives recruiting teams a cleaner way to screen resumes, rank candidates,
            and report hiring progress without the clutter of a generic SaaS template.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={ROUTES.jobs}
              className="inline-flex h-12 items-center justify-center rounded-[14px] border border-[#1d4ed8] bg-[#2563eb] px-6 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.18)] transition duration-150 ease-out hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-transparent"
            >
              Explore Careers
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="relative hidden lg:block">
          <div className="absolute inset-0 rounded-[40px] border border-dashed border-slate-200/80 bg-white/20" />
          <div className="absolute left-14 top-14 h-48 w-48 rounded-full bg-[#2563eb]/6 blur-3xl" />
          <div className="absolute right-20 bottom-10 h-56 w-56 rounded-full bg-[#7c3aed]/6 blur-3xl" />
          <div className="absolute left-10 top-28 h-24 w-24 rounded-[28px] border border-slate-200/70 bg-white/70 shadow-[0_18px_50px_rgba(15,23,42,0.05)]" />
          <div className="absolute right-24 top-20 h-16 w-16 rounded-[22px] border border-slate-200/70 bg-white/80 shadow-[0_18px_50px_rgba(15,23,42,0.05)]" />
        </div>
      </div>
    </section>
  );
}

import { ArrowRight, Building2, MapPin, BriefcaseBusiness } from 'lucide-react';
import SectionHeading from './SectionHeading';
import { openPositions } from './section-data';
import { Link } from 'react-router-dom';

export default function OpenPositionsSection() {
  return (
    <section id="open-positions" className="scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Jobs"
          title="Open Positions"
          description="Beautiful roles for people who want to help shape modern recruitment."
          centered
        />

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {openPositions.map((job) => (
            <article
              key={job.title}
              className="group flex h-full flex-col rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition duration-200 ease-out hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_44px_rgba(15,23,42,0.09)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center rounded-full bg-[#eff4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#2563eb]">
                  {job.department}
                </span>
                <BriefcaseBusiness className="h-5 w-5 text-slate-400 transition group-hover:text-[#2563eb]" />
              </div>

              <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                {job.title}
              </h3>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span>SmartHire Technologies</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <span>{job.location}</span>
                </div>
                <div className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                  {job.type}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
                <p className="text-sm text-slate-500">Competitive package and modern tools.</p>
                <Link
                  to="/jobs"
                  className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#1d4ed8] bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)] transition duration-150 ease-out hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-white"
                >
                  Apply
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

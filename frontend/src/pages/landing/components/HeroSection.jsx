import { Link } from 'react-router-dom';
import { ArrowRight, PlayCircle } from 'lucide-react';
import BrandLockup from '../../../components/brand/BrandLockup';

const candidateRows = [
  { name: 'Amina Rahman', role: 'Senior Recruiter', match: '96%' },
  { name: 'Jonas Weber', role: 'Hiring Manager', match: '91%' },
  { name: 'Leah Chen', role: 'Talent Ops', match: '88%' },
];

const heroStats = [
  { label: 'Open roles', value: '24' },
  { label: 'Shortlist velocity', value: '48h' },
  { label: 'AI confidence', value: '94%' },
];

export default function HeroSection() {
  return (
    <section className="px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
      <div className="mx-auto grid w-full max-w-7xl gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="max-w-2xl lg:pt-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
            <BrandLockup compact subtitle="Enterprise hiring software" className="gap-2 px-0 py-0" />
          </div>

          <h1 className="mt-6 max-w-3xl text-[48px] font-extrabold tracking-[-0.05em] text-slate-950">
            Hiring software that feels calm, credible, and built for serious teams.
          </h1>

          <p className="mt-6 max-w-xl text-[16px] font-medium leading-7 text-slate-600">
            SmartHire AI gives recruiting teams a cleaner way to screen resumes, rank candidates,
            and report hiring progress without the clutter of a generic SaaS template.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex h-12 items-center justify-center rounded-[14px] border border-[#1d4ed8] bg-[#2563eb] px-6 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)] transition duration-150 ease-out hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-transparent"
            >
              Start hiring
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-[14px] border border-slate-200 bg-white px-6 text-[15px] font-semibold text-slate-700 shadow-sm transition duration-150 ease-out hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-transparent"
            >
              <PlayCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              View features
            </a>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-6">
            {heroStats.map((stat, index) => (
              <div
                key={stat.label}
                className={[
                  'rounded-[14px] border border-slate-200 bg-white p-4',
                  index === 0 ? 'sm:col-span-2' : 'sm:col-span-1',
                ].join(' ')}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-3 text-[32px] font-bold tracking-[-0.04em] text-slate-950">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:mt-6">
            <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Product preview
                  </p>
                  <h2 className="mt-2 text-[32px] font-bold tracking-[-0.04em] text-slate-950">
                    Hiring dashboard
                  </h2>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                  Live
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Pipeline', value: '128' },
                  { label: 'Shortlist', value: '32' },
                  { label: 'Reporting', value: 'Power BI' },
                ].map((item) => (
                  <div key={item.label} className="rounded-[14px] border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 overflow-hidden rounded-[16px] border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-950">Top candidates</p>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                    AI match
                  </p>
                </div>
                <div className="divide-y divide-slate-200">
                  {candidateRows.map((row) => (
                    <div key={row.name} className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{row.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{row.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-950">{row.match}</p>
                        <div className="mt-2 h-2 w-24 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#2563eb]"
                            style={{ width: row.match }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

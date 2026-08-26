import {
  BadgeCheck,
  Code2,
  FileUp,
  MessagesSquare,
  PartyPopper,
  ScanSearch,
} from 'lucide-react';
import SectionHeading from './SectionHeading';
import { hiringProcess } from './section-data';

const processIcons = [FileUp, ScanSearch, MessagesSquare, Code2, BadgeCheck, PartyPopper];

export default function HiringProcessSection() {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Hiring Process"
          title="A simple hiring flow."
          description="Clear steps that keep the process calm for candidates and recruiters."
          centered
        />

        <div className="mt-10 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:p-5 lg:p-6">
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {hiringProcess.map((step, index) => {
              const Icon = processIcons[index];

              return (
                <li key={step.title} className="group relative">
                  <div className="flex h-full flex-col rounded-[20px] border border-slate-200 bg-slate-50 p-4 transition duration-200 ease-out group-hover:-translate-y-1 group-hover:border-slate-300 group-hover:bg-white group-hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#eff4ff] text-[#2563eb] ring-1 ring-[#2563eb]/10">
                        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        0{index + 1}
                      </span>
                    </div>

                    <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.03em] text-slate-950">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                  </div>

                  {index < hiringProcess.length - 1 ? (
                    <div className="hidden xl:absolute xl:-right-2 xl:top-1/2 xl:flex xl:h-5 xl:w-5 xl:-translate-y-1/2 xl:items-center xl:justify-center">
                      <div className="h-px w-8 bg-slate-200" />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

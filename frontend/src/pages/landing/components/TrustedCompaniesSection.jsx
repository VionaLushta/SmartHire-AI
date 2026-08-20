import SectionHeading from './SectionHeading';
import { trustedCompanies } from './section-data';

export default function TrustedCompaniesSection() {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="rounded-[16px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
          <SectionHeading
            eyebrow="Trusted by teams"
            title="Quietly adopted by organizations that value clarity."
            description="A compact trust strip that keeps the page grounded without adding visual noise."
          />

          <div className="mt-8 flex flex-wrap gap-3">
            {trustedCompanies.map((company) => (
              <span
                key={company}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600"
              >
                {company}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

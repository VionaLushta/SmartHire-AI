import SectionHeading from './SectionHeading';
import { trustedCompanies } from './section-data';

export default function TrustedCompaniesSection() {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Trusted Companies"
          title="Built for teams that want a sharper hiring experience."
          description="A row of placeholder logos to suggest a polished marketplace-ready product."
        />

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {trustedCompanies.map((company) => (
            <div
              key={company}
              className="flex h-16 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-sm font-semibold text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-900"
            >
              {company}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

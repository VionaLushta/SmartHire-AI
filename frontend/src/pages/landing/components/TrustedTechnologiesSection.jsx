import SectionHeading from './SectionHeading';
import { trustedTechLogos } from './section-data';

export default function TrustedTechnologiesSection() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeading
          eyebrow="Partners"
          title="Trusted Technologies"
          description="Companies and tools that help shape a polished, enterprise-ready experience."
          centered
        />

        <div className="mt-10 rounded-[28px] border border-slate-200 bg-white px-6 py-8 shadow-[0_14px_40px_rgba(15,23,42,0.06)] sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 sm:gap-x-12 lg:gap-x-16">
            {trustedTechLogos.map((logo) => (
              <div
                key={logo.name}
                className="flex items-center justify-center transition duration-300 ease-out hover:scale-105"
              >
                <img
                  src={logo.src}
                  alt={logo.name}
                  className={[
                    logo.className,
                    'w-auto max-w-[140px] object-contain grayscale opacity-50 transition duration-[250ms] ease-out hover:opacity-100 hover:grayscale-0',
                  ].join(' ')}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

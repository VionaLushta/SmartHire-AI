import SectionHeading from '../../pages/landing/components/SectionHeading';
import { trustedTechLogos } from '../../pages/landing/components/section-data';

export default function TrustedPartnersSection() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1200px]">
        <SectionHeading
          eyebrow="Partners"
          title="Trusted Technologies"
          description="Companies and tools that help shape a polished, enterprise-ready experience."
          centered
        />

        <div className="mt-10 w-full rounded-[28px] border border-slate-200 bg-white px-8 py-8 shadow-[0_12px_30px_rgba(15,23,42,0.05)] sm:px-10 lg:px-12">
          <div className="grid grid-cols-2 items-center justify-items-center gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {trustedTechLogos.map((logo) => (
              <div key={logo.name} className="flex min-h-[44px] items-center justify-center">
                <img
                  src={logo.src}
                  alt={logo.name}
                  className="h-10 max-h-[44px] w-auto max-w-[150px] object-contain grayscale opacity-55 transition-[opacity,filter] duration-300 ease-out hover:opacity-100 hover:grayscale-0"
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

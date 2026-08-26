export default function TeamBannerSection() {
  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <img
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1800&q=80"
            alt="A modern software company team with engineers and recruiters collaborating around laptops in a bright glass meeting room"
            className="h-[320px] w-full object-cover sm:h-[350px] lg:h-[380px]"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

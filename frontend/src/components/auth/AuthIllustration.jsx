const highlights = [
  { value: '94%', label: 'match accuracy' },
  { value: '24h', label: 'shortlist turnaround' },
  { value: '3x', label: 'faster screening' },
];

export default function AuthIllustration({ title, description, accent = 'Hiring', subtitle = 'The premium recruiting cockpit' }) {
  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 px-6 py-8 text-white shadow-[0_32px_100px_rgba(15,23,42,0.18)] dark:border-slate-800">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_25%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.14),transparent_24%)]" />
      <div className="relative flex h-full min-h-[28rem] flex-col justify-between gap-8">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-slate-400">
            {subtitle}
          </p>
          <h2 className="max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            {description}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-2xl font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur">
          <svg
            viewBox="0 0 800 320"
            className="absolute inset-0 h-full w-full opacity-80"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="authGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.06" />
              </linearGradient>
            </defs>
            <rect width="800" height="320" fill="url(#authGradient)" rx="28" />
            <circle cx="120" cy="78" r="44" fill="#ffffff" fillOpacity="0.08" />
            <circle cx="240" cy="220" r="78" fill="#38bdf8" fillOpacity="0.14" />
            <circle cx="620" cy="90" r="58" fill="#ffffff" fillOpacity="0.06" />
            <path
              d="M70 220C160 160 235 180 320 130C398 84 480 74 560 112C640 150 688 198 730 110"
              fill="none"
              stroke="#ffffff"
              strokeOpacity="0.4"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M96 250H250L335 178L456 200L560 148L704 178"
              fill="none"
              stroke="#38bdf8"
              strokeOpacity="0.7"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="relative grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{accent}</p>
              <p className="mt-3 text-lg font-semibold text-white">
                Beautifully structured for fast, confident hiring.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Designed to feel premium, measured, and ready for production workflows.
              </p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Live review</p>
                <p className="mt-2 text-xl font-semibold">Candidate pipeline</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Team sync</p>
                <p className="mt-2 text-xl font-semibold">Decision ready</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

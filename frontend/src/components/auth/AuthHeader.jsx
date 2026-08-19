import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function AuthHeader({ title, description, eyebrow = 'SmartHire AI' }) {
  return (
    <div className="space-y-5">
      <Link
        to="/"
        className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:focus:ring-offset-slate-950"
        aria-label="SmartHire AI home"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
            {eyebrow}
          </span>
          <span className="block text-sm font-semibold text-slate-950 dark:text-slate-50">
            Premium hiring workflow
          </span>
        </span>
      </Link>

      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}

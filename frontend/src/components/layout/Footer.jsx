import { Link } from 'react-router-dom';

const footerLinks = [
  { label: 'Privacy', to: '/' },
  { label: 'Terms', to: '/' },
  { label: 'Support', to: '/' },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]">
                SH
              </span>
              <span className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                SmartHire AI
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Premium recruiting software built to help teams hire with more confidence and less
              friction.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <nav aria-label="Product links" className="space-y-3">
              <p className="text-sm font-semibold text-slate-950">Product</p>
              <div className="flex flex-col gap-2 text-sm text-slate-500">
                <Link className="transition hover:text-slate-950" to="/">
                  Features
                </Link>
                <Link className="transition hover:text-slate-950" to="/">
                  Pricing
                </Link>
                <Link className="transition hover:text-slate-950" to="/jobs">
                  Jobs
                </Link>
              </div>
            </nav>

            <nav aria-label="Company links" className="space-y-3">
              <p className="text-sm font-semibold text-slate-950">Company</p>
              <div className="flex flex-col gap-2 text-sm text-slate-500">
                <Link className="transition hover:text-slate-950" to="/">
                  About
                </Link>
                <Link className="transition hover:text-slate-950" to="/">
                  Contact
                </Link>
                <Link className="transition hover:text-slate-950" to="/">
                  Careers
                </Link>
              </div>
            </nav>

            <nav aria-label="Legal links" className="space-y-3">
              <p className="text-sm font-semibold text-slate-950">Legal</p>
              <div className="flex flex-col gap-2 text-sm text-slate-500">
                {footerLinks.map((link) => (
                  <Link
                    key={link.label}
                    to={link.to}
                    className="transition hover:text-slate-950"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright (c) 2026 SmartHire AI. All rights reserved.</p>
          <p>Built for modern hiring teams.</p>
        </div>
      </div>
    </footer>
  );
}

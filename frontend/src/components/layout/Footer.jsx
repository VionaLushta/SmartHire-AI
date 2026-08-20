import { Link } from 'react-router-dom';
import BrandLockup from '../brand/BrandLockup';

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(15,23,42,0.08)] bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="max-w-md space-y-4">
            <BrandLockup linkTo="/" subtitle="Premium hiring software" className="px-0 py-0" />
            <p className="text-sm leading-6 text-slate-500">
              SmartHire AI helps teams screen faster, align sooner, and present a more polished
              hiring experience.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <nav aria-label="Product links" className="space-y-3">
              <p className="text-sm font-semibold text-slate-900">Product</p>
              <div className="flex flex-col gap-2 text-sm text-slate-500">
                <Link className="transition hover:text-slate-900" to="/#features">
                  Features
                </Link>
                <Link className="transition hover:text-slate-900" to="/#pricing">
                  Pricing
                </Link>
                <Link className="transition hover:text-slate-900" to="/jobs">
                  Jobs
                </Link>
              </div>
            </nav>

            <nav aria-label="Company links" className="space-y-3">
              <p className="text-sm font-semibold text-slate-900">Company</p>
              <div className="flex flex-col gap-2 text-sm text-slate-500">
                <a className="transition hover:text-slate-900" href="mailto:hello@smarthire.ai">
                  Contact
                </a>
                <Link className="transition hover:text-slate-900" to="/">
                  Privacy
                </Link>
                <Link className="transition hover:text-slate-900" to="/">
                  About
                </Link>
              </div>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[rgba(15,23,42,0.08)] pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 SmartHire AI</p>
          <p>Enterprise hiring, designed with care.</p>
        </div>
      </div>
    </footer>
  );
}

import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import BrandLockup from '../brand/BrandLockup';
import { ROUTES } from '../../constants/routes';

const OFFICIAL_CONTACT_EMAIL = 'smarthireaii@proton.me';

const productLinks = [
  { label: 'Home', to: ROUTES.home },
  { label: 'Jobs', to: ROUTES.jobs },
  { label: 'About Us', to: ROUTES.about },
  { label: 'Contact', to: ROUTES.contact },
];

const resourceLinks = [
  { label: 'Privacy Policy', href: `mailto:${OFFICIAL_CONTACT_EMAIL}?subject=Privacy%20Policy` },
  { label: 'Terms of Service', href: `mailto:${OFFICIAL_CONTACT_EMAIL}?subject=Terms%20of%20Service` },
  { label: 'Careers', to: ROUTES.careers },
  { label: 'Support', href: `mailto:${OFFICIAL_CONTACT_EMAIL}?subject=Support` },
];

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-[rgba(15,23,42,0.08)] bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr_0.75fr]">
          <div className="space-y-6">
            <BrandLockup
              linkTo="/"
              className="px-0 py-0"
              subtitle="Intelligent Recruitment Platform"
            />

            <p className="max-w-md text-sm leading-7 text-slate-600">
              Helping companies hire faster, smarter, and with confidence.
            </p>

            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span>Prishtina, Kosovo</span>
              </div>
              <a
                href="tel:+38349123456"
                className="flex items-start gap-3 transition hover:text-slate-900"
              >
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span>+383 49 123 456</span>
              </a>
              <a
                href={`mailto:${OFFICIAL_CONTACT_EMAIL}`}
                className="flex items-start gap-3 transition hover:text-slate-900"
              >
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span>
                  {OFFICIAL_CONTACT_EMAIL}
                  <span className="block text-xs text-slate-500">General inquiries</span>
                </span>
              </a>
              <a
                href="mailto:careers@smarthire.ai"
                className="flex items-start gap-3 transition hover:text-slate-900"
              >
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span>
                  careers@smarthire.ai
                  <span className="block text-xs text-slate-500">Job applications</span>
                </span>
              </a>
            </div>
          </div>

          <nav aria-label="Product links" className="space-y-4">
            <p className="text-sm font-semibold text-slate-950">Product</p>
            <div className="flex flex-col gap-3 text-sm text-slate-600">
              {productLinks.map((item) => (
                <Link key={item.label} className="transition hover:text-slate-950" to={item.to}>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <nav aria-label="Resources links" className="space-y-4">
            <p className="text-sm font-semibold text-slate-950">Resources</p>
            <div className="flex flex-col gap-3 text-sm text-slate-600">
              {resourceLinks.map((item) =>
                item.to ? (
                  <Link key={item.label} className="transition hover:text-slate-950" to={item.to}>
                    {item.label}
                  </Link>
                ) : (
                  <a key={item.label} className="transition hover:text-slate-950" href={item.href}>
                    {item.label}
                  </a>
                ),
              )}
            </div>
          </nav>
        </div>

        <div className="mt-10 border-t border-[rgba(15,23,42,0.08)] pt-6 text-sm text-slate-500 sm:flex sm:items-center sm:justify-between">
          <p>© 2026 SmartHire Technologies.</p>
          <p>All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

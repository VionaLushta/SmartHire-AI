import { useState } from 'react';
import { ArrowRight, Menu } from 'lucide-react';
import MobileMenu from './MobileMenu';
import { publicNavigation } from '../../constants/navigation';
import { Link } from 'react-router-dom';
import BrandLockup from '../brand/BrandLockup';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[rgba(15,23,42,0.08)] bg-[rgba(245,247,250,0.94)]">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <BrandLockup linkTo="/" className="px-0 py-0" subtitle="Premium hiring software" />

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Primary">
            {publicNavigation.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="rounded-[14px] px-3 py-2 text-[15px] font-medium text-slate-600 transition duration-150 ease-out hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-[#f5f7fa]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/login"
              className="hidden rounded-[14px] px-4 py-2 text-[15px] font-medium text-slate-600 transition duration-150 ease-out hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-[#f5f7fa] sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              to="/register"
              className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#1d4ed8] bg-[#2563eb] px-4 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(37,99,235,0.18)] transition duration-150 ease-out hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-[#f5f7fa]"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-150 ease-out hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-[#f5f7fa] lg:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Navigation"
        items={publicNavigation}
      />
    </>
  );
}

import { X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import Button from '../ui/Button';

export default function MobileMenu({ open, onClose, items = [], title = 'Menu' }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close mobile menu backdrop"
        className="absolute inset-0 bg-slate-950/40"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute left-0 top-0 flex h-full w-[88%] max-w-sm flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              SmartHire AI
            </p>
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mobile navigation">
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const isHashLink = typeof item.to === 'string' && item.to.includes('#');
              const sharedClasses = [
                'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2',
                'text-slate-700 hover:bg-slate-100 hover:text-slate-950',
              ].join(' ');

              return (
                <li key={item.label}>
                  {isHashLink ? (
                    <a href={item.to} onClick={onClose} className={sharedClasses}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </a>
                  ) : (
                    <NavLink
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        [
                          sharedClasses,
                          isActive ? 'bg-slate-900 text-white shadow-sm' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')
                      }
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </div>
  );
}

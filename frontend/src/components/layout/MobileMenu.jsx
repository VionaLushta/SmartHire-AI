import { X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import Button from '../ui/Button';
import BrandLockup from '../brand/BrandLockup';
import { logoutUser } from '../../redux/slices/authSlice';
import { candidateNavigation } from '../../constants/navigation';

export default function MobileMenu({ open, onClose, items = [], title = 'Menu' }) {
  const dispatch = useDispatch();
  if (!open) {
    return null;
  }

  const handleLogout = async (event) => {
    event.preventDefault();
    await dispatch(logoutUser());
    onClose?.();
    window.location.assign('/candidate/login');
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close mobile menu backdrop"
        className="absolute inset-0 bg-slate-950/35"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute left-0 top-0 flex h-full w-[88%] max-w-sm flex-col border-r border-[rgba(15,23,42,0.08)] bg-white text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
      >
        <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.08)] px-5 py-4 dark:border-slate-800">
          <div>
            <BrandLockup linkTo="/" compact subtitle={title} />
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
              const itemHref = items === candidateNavigation
                ? `/candidate/dashboard${item.to}`
                : item.to;
              const sharedClasses = [
                'flex items-center gap-3 rounded-[14px] px-3 py-3 text-[15px] font-medium transition duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-white',
                'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white',
              ].join(' ');

              return (
                <li key={item.label}>
                  {item.label === 'Logout' ? (
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={sharedClasses}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  ) : isHashLink ? (
                    <a href={itemHref} onClick={onClose} className={sharedClasses}>
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
                          isActive ? 'bg-blue-50 text-blue-700' : '',
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

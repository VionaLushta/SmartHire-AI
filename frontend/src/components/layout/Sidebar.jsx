import { useMemo, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import MobileMenu from './MobileMenu';
import { adminNavigation, candidateNavigation, companyNavigation, dashboardNavigation } from '../../constants/navigation';
import { useSelector } from 'react-redux';

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const navigation = useMemo(() => {
    const roleName = String(user?.role_name || user?.role || '').toLowerCase();
    const candidatePaths = new Set(['/candidate/dashboard', '/profile', '/resume']);
    if (location.pathname.startsWith('/admin') || roleName === 'admin' || roleName === 'administrator') {
      return adminNavigation;
    }
    if (
      location.pathname.startsWith('/candidate') ||
      candidatePaths.has(location.pathname) ||
      roleName === 'candidate'
    ) {
      return candidateNavigation;
    }
    if (location.pathname.startsWith('/company') || roleName === 'company') {
      return companyNavigation;
    }
    return dashboardNavigation;
  }, [location.pathname, user?.role, user?.role_name]);

  const isHashItem = (item) => typeof item.to === 'string' && item.to.startsWith('#');
  const isItemActive = (item) => {
    if (isHashItem(item)) {
      const isCandidate = location.pathname === '/candidate/dashboard';
      const isCompany = location.pathname === '/company/dashboard';
      return (
        (isCandidate || isCompany) &&
        (location.hash === item.to || (!location.hash && item.to === '#dashboard'))
      );
    }
    return false;
  };

  return (
    <>
      <aside
        className={[
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-slate-200/80 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:flex',
          collapsed ? 'w-20' : 'w-72',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(15,23,42,0.18)]">
              SH
            </div>
            {!collapsed ? (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  SmartHire AI
                </p>
                <p className="text-sm font-medium text-slate-950">Dashboard</p>
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Sidebar navigation">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              return (
                isHashItem(item) ? (
                  <a
                    key={item.label}
                    href={item.to}
                    className={[
                      'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2',
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                      collapsed ? 'justify-center' : '',
                    ].join(' ')}
                    aria-label={item.label}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </a>
                ) : (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2',
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                        collapsed ? 'justify-center' : '',
                      ].join(' ')
                    }
                    aria-label={item.label}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </NavLink>
                )
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className={collapsed ? 'flex justify-center' : 'flex items-center gap-3'}>
            <Avatar initials="U" size="md" />
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">Profile avatar</p>
                <p className="truncate text-xs text-slate-500">Ready for later tickets</p>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <MobileMenu
        open={mobileOpen}
        onClose={onMobileClose}
        title="Dashboard navigation"
        items={navigation}
      />
    </>
  );
}

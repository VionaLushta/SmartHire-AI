import { useMemo, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import MobileMenu from './MobileMenu';
import { adminNavigation, candidateNavigation, companyNavigation, dashboardNavigation } from '../../constants/navigation';
import BrandLockup from '../brand/BrandLockup';
import { getDisplayName } from '../../utils/dashboard';
import { logoutUser } from '../../redux/slices/authSlice';

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const displayName = getDisplayName(user || {});
  const roleLabel = String(user?.role_name || user?.role || 'Workspace')
    .replace(/_/g, ' ')
    .replace(/^Company$/, 'Hiring team');

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

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login', { replace: true });
  };

  return (
    <>
      <aside
        className={[
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[rgba(15,23,42,0.08)] bg-white lg:flex',
          collapsed ? 'w-20' : 'w-72',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.08)] px-4 py-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <BrandLockup
              linkTo="/"
              compact={collapsed}
              subtitle="Dashboard"
            />
            {!collapsed ? (
              <div />
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

        {!collapsed ? (
          <div className="px-4 py-4">
            <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Workspace
              </p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                  <p className="mt-1 text-xs text-slate-500">{roleLabel}</p>
                </div>
                <Badge tone="neutral">Live</Badge>
              </div>
            </div>
          </div>
        ) : null}

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Sidebar navigation">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item);
              if (item.label === 'Logout') {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={handleLogout}
                    className={[
                      'group flex w-full items-center gap-3 rounded-[14px] border-l-2 px-3 py-3 text-[15px] font-medium transition duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-white',
                      'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900',
                      collapsed ? 'justify-center' : '',
                    ].join(' ')}
                    aria-label={item.label}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </button>
                );
              }
              return (
                isHashItem(item) ? (
                  <a
                    key={item.label}
                    href={item.to}
                    className={[
                      'group flex items-center gap-3 rounded-[14px] border-l-2 px-3 py-3 text-[15px] font-medium transition duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-white',
                      active
                        ? 'border-blue-600 bg-blue-50 text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
                        : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900',
                      collapsed ? 'justify-center' : '',
                    ].join(' ')}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
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
                        'group flex items-center gap-3 rounded-[14px] border-l-2 px-3 py-3 text-[15px] font-medium transition duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-white',
                        isActive
                          ? 'border-blue-600 bg-blue-50 text-slate-950 shadow-[0_1px_2px_rgba(15,23,42,0.03)]'
                          : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900',
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

        <div className="border-t border-[rgba(15,23,42,0.08)] p-4">
          <div className={collapsed ? 'flex justify-center' : 'flex items-center gap-3 rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-3 py-3'}>
            <Avatar initials="U" size="md" />
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{roleLabel}</p>
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

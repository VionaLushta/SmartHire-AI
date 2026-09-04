import Breadcrumb from './Breadcrumb';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { Link } from 'react-router-dom';
import { Menu, Moon, SunMedium } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getDisplayName, getInitials } from '../../utils/dashboard';

export default function Topbar({
  user,
  title,
  breadcrumbs = [],
  actionLabel = 'Action',
  actionTo,
  onMenuClick,
}) {
  const { theme, setTheme } = useTheme();
  const displayName = getDisplayName(user || {});
  const initials = getInitials(user || {});
  const roleLabel = String(user?.role_name || user?.role || 'Workspace').replace(/_/g, ' ');


  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(15,23,42,0.08)] bg-[rgba(245,247,250,0.96)] dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="flex items-start gap-3">
            {onMenuClick ? (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={onMenuClick}
                aria-label="Open sidebar menu"
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}

            <div className="space-y-2">
              <Breadcrumb items={breadcrumbs} />
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Executive workspace
                </p>
                <h1 className="text-[32px] font-bold tracking-[-0.04em] text-slate-900">
                {title}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <div className="flex items-center gap-2 rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setTheme('light')}
                aria-label="Use light theme"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-[12px] transition duration-150 ease-out ${theme === 'light' ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <SunMedium className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                aria-label="Use dark theme"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-[12px] transition duration-150 ease-out ${theme === 'dark' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              >
                <Moon className="h-4 w-4" />
              </button>
            </div>

            {actionLabel && actionTo ? (
              <Button as={Link} to={actionTo} variant="primary" size="md">
                {actionLabel}
              </Button>
            ) : null}

            <div className="hidden items-center gap-3 rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-700 dark:bg-slate-900 lg:flex">
              <Avatar initials={initials} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
                <Badge tone="neutral" className="mt-1">
                  {roleLabel}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

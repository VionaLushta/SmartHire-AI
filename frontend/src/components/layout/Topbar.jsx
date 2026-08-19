import Breadcrumb from './Breadcrumb';
import Button from '../ui/Button';
import { Link } from 'react-router-dom';
import { Menu, Moon, Search, SunMedium } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Topbar({
  title,
  breadcrumbs = [],
  actionLabel = 'Action',
  actionTo,
  onMenuClick,
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative min-w-0 sm:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Search placeholder"
                aria-label="Search placeholder"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-400"
              />
            </label>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setTheme('light')}
                aria-label="Use light theme"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${theme === 'light' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
              >
                <SunMedium className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                aria-label="Use dark theme"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${theme === 'dark' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
              >
                <Moon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setTheme('system')}
                aria-label="Use system theme"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition ${theme === 'system' ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}
              >
                {resolvedTheme === 'dark' ? 'D' : 'L'}
              </button>
            </div>

            <Button
              as={actionTo ? Link : 'button'}
              {...(actionTo ? { to: actionTo } : {})}
              variant="primary"
              size="md"
            >
              {actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

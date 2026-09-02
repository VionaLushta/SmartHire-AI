import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Breadcrumb({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      <ol className="flex flex-wrap items-center gap-2 rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-2 text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-slate-900">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
              ) : null}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="font-medium text-slate-500 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-white"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`font-medium ${isLast ? 'text-slate-900' : 'text-slate-500'}`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

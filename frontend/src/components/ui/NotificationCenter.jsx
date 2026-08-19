import { X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const toneClasses = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/70 dark:text-emerald-100',
  error: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/70 dark:text-rose-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/70 dark:text-amber-100',
  info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/70 dark:text-sky-100',
};

export default function NotificationCenter() {
  const { notifications, dismiss } = useNotifications();

  if (!notifications.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`pointer-events-auto transform animate-[slideUp_0.2s_ease-out] rounded-2xl border p-4 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-sm ${toneClasses[notification.type] || toneClasses.info}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">{notification.title}</p>
              {notification.message ? (
                <p className="mt-1 text-sm opacity-80">{notification.message}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(notification.id)}
              className="rounded-lg p-1 text-current/80 transition hover:bg-black/5 hover:text-current focus:outline-none focus:ring-2 focus:ring-current/30"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

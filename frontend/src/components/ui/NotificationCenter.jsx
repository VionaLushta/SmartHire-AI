import { X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const toneClasses = {
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-[0_8px_24px_rgba(15,23,42,0.05)]',
  error:
    'border-rose-200 bg-rose-50 text-rose-800 shadow-[0_8px_24px_rgba(15,23,42,0.05)]',
  warning:
    'border-amber-200 bg-amber-50 text-amber-800 shadow-[0_8px_24px_rgba(15,23,42,0.05)]',
  info:
    'border-sky-200 bg-sky-50 text-sky-800 shadow-[0_8px_24px_rgba(15,23,42,0.05)]',
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
          className={`pointer-events-auto transform animate-[slideUp_0.2s_ease-out] rounded-[16px] border p-4 ${toneClasses[notification.type] || toneClasses.info}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-[-0.01em]">{notification.title}</p>
              {notification.message ? (
                <p className="mt-1 text-sm text-current/80">{notification.message}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(notification.id)}
              className="rounded-lg p-1 text-current/70 transition hover:bg-black/5 hover:text-current focus:outline-none focus:ring-2 focus:ring-current/30"
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

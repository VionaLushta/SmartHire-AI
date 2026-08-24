import { Bell, CircleDot, Check } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';

const tones = {
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-rose-50 text-rose-700',
  neutral: 'bg-slate-100 text-slate-700',
};

function toneClass(tone) {
  return tones[tone] || tones.neutral;
}

export default function NotificationList({ items = [], readIds = [], onMarkRead, onMarkAllRead }) {
  const unreadCount = items.filter((item) => !readIds.includes(item.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-slate-500" aria-hidden="true" />
          <h3 className="text-[24px] font-bold tracking-[-0.04em] text-slate-900">Notifications</h3>
          <Badge tone={unreadCount > 0 ? 'warning' : 'neutral'}>{unreadCount} unread</Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onMarkAllRead}
          disabled={!unreadCount}
        >
          Mark all read
        </Button>
      </div>

      <div className="space-y-3">
        {items.length ? (
          items.map((item) => {
            const read = readIds.includes(item.id);
            return (
              <article
                key={item.id}
                className={[
                  'rounded-[16px] border p-4 transition duration-150 ease-out',
                  read
                    ? 'border-[rgba(15,23,42,0.08)] bg-white'
                    : 'border-[rgba(15,23,42,0.12)] bg-slate-50',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={['mt-0.5 flex h-10 w-10 items-center justify-center rounded-[12px]', toneClass(item.tone)].join(' ')}>
                      {read ? <Check className="h-4 w-4" aria-hidden="true" /> : <CircleDot className="h-4 w-4" aria-hidden="true" />}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold tracking-[-0.02em] text-slate-900">{item.title}</h4>
                      <p className="text-sm leading-6 text-slate-600">{item.message}</p>
                      <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">
                        {item.time}
                      </p>
                    </div>
                  </div>
                  {!read ? (
                    <Button type="button" variant="secondary" size="sm" onClick={() => onMarkRead(item.id)}>
                      Mark read
                    </Button>
                  ) : (
                    <Badge tone="neutral">Read</Badge>
                  )}
                </div>
              </article>
            );
          })
        ) : (
          <EmptyState
            title="You are all caught up"
            description="Notifications will appear here when new activity arrives."
            icon={Bell}
          />
        )}
      </div>
    </div>
  );
}

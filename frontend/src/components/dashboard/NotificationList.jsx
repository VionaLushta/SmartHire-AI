import { Bell, CircleDot, Check } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

const tones = {
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  neutral: 'bg-slate-100 text-slate-700',
};

function toneClass(tone) {
  return tones[tone] || tones.neutral;
}

export default function NotificationList({ items = [], readIds = [], onMarkRead, onMarkAllRead }) {
  const unreadCount = items.filter((item) => !readIds.includes(item.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-slate-500" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-slate-950">Notifications</h3>
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
                  'rounded-2xl border p-4 transition',
                  read
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-300 bg-slate-50 shadow-sm',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={['mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl', toneClass(item.tone)].join(' ')}>
                      {read ? <Check className="h-4 w-4" aria-hidden="true" /> : <CircleDot className="h-4 w-4" aria-hidden="true" />}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-slate-950">{item.title}</h4>
                      <p className="text-sm leading-6 text-slate-600">{item.message}</p>
                      <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">
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
          <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
            You are all caught up.
          </p>
        )}
      </div>
    </div>
  );
}

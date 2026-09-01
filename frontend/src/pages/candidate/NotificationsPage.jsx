import { useEffect, useState } from 'react';
import { notificationService } from '../../services/notificationService';
import { unwrapItems } from '../../utils/dashboard';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/jobs/LoadingState';
import Button from '../../components/ui/Button';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    notificationService.list().then((response) => setItems(unwrapItems(response))).finally(() => setLoading(false));
  }, []);
  async function markAll() { await notificationService.markAllRead(); setItems((current) => current.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() }))); }
  async function markRead(item) { if (!item.is_read) { await notificationService.markRead(item.notification_id || item.id); setItems((current) => current.map((entry) => entry === item ? { ...entry, is_read: true } : entry)); } }
  if (loading) return <LoadingState title="Loading notifications..." description="Retrieving your latest account and application updates." />;
  return <div className="mx-auto max-w-5xl space-y-6 pb-10"><section className="flex items-center justify-between rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Candidate Portal</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">Notifications</h1></div><Button variant="secondary" onClick={markAll}>Mark all read</Button></section>{!items.length ? <EmptyState title="No notifications" description="Application and interview updates will appear here." /> : <div className="space-y-3">{items.map((item) => <button type="button" key={item.notification_id || item.id} onClick={() => markRead(item)} className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm"><p className="font-semibold text-slate-950">{item.title || item.subject || 'Notification'}</p><p className="mt-1 text-sm text-slate-600">{item.message || item.body || ''}</p></button>)}</div>}</div>;
}

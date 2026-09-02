import { useEffect, useMemo, useState } from 'react';
import { Check, Mail, MailOpen, RefreshCw } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import EmptyState from '../../components/admin/EmptyState';
import StatusBadge from '../../components/admin/StatusBadge';
import Button from '../../components/ui/Button';
import LoadingState from '../../components/jobs/LoadingState';
import { contactMessageService } from '../../services/contactMessageService';
import { unwrapResponse } from '../../utils/dashboard';

function formatMessageDate(value) {
  if (!value) return 'Recently';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function AdminMessagesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMessages = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await contactMessageService.list();
      setItems(unwrapResponse(response)?.items || []);
    } catch {
      setError('Unable to load contact messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMessages(); }, []);

  const unreadCount = useMemo(() => items.filter((item) => item.status === 'unread').length, [items]);

  const updateStatus = async (item, status) => {
    try {
      const response = await contactMessageService.updateStatus(item.message_id, status);
      const updated = unwrapResponse(response);
      setItems((current) => current.map((entry) => entry.message_id === item.message_id ? updated : entry));
    } catch {
      setError('Unable to update this message.');
    }
  };

  if (loading) return <LoadingState title="Loading messages..." description="Retrieving messages sent through the public contact form." />;

  return (
    <div className="space-y-6 pb-10">
      <AdminCard
        title="Contact messages"
        description="Review questions, partnership requests, and support messages from your public inbox."
        action={<Button type="button" variant="secondary" onClick={loadMessages}><RefreshCw className="h-4 w-4" />Refresh</Button>}
      >
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <Mail className="h-5 w-5" />
          <span><strong>{unreadCount}</strong> unread {unreadCount === 1 ? 'message' : 'messages'}</span>
        </div>
        {error ? <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p> : null}
        {!items.length ? <EmptyState title="No contact messages yet" description="Messages sent from the public Contact page will appear here." /> : (
          <div className="space-y-4">
            {items.map((item) => (
              <article key={item.message_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold tracking-tight text-slate-950">{item.subject}</h2>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-700">{item.full_name} <span className="font-normal text-slate-400">via</span> {item.email}</p>
                    {item.company ? <p className="mt-1 text-sm text-slate-500">{item.company}</p> : null}
                  </div>
                  <p className="shrink-0 text-sm text-slate-500">{formatMessageDate(item.created_at)}</p>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-600">{item.message}</p>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {item.status === 'unread' ? <Button size="sm" type="button" onClick={() => updateStatus(item, 'read')}><MailOpen className="h-4 w-4" />Mark read</Button> : null}
                  {item.status !== 'replied' ? <Button size="sm" variant="primary" type="button" onClick={() => updateStatus(item, 'replied')}><Check className="h-4 w-4" />Mark replied</Button> : null}
                  {item.status !== 'unread' ? <Button size="sm" variant="ghost" type="button" onClick={() => updateStatus(item, 'unread')}><Mail className="h-4 w-4" />Mark unread</Button> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

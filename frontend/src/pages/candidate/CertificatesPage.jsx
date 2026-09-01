import { useEffect, useState } from 'react';
import { certificateService } from '../../services/certificateService';
import { unwrapItems, unwrapResponse } from '../../utils/dashboard';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/jobs/LoadingState';

export default function CertificatesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      setItems(unwrapItems(await certificateService.list()));
      setError('');
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to load certificates.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('title', file.name.replace(/\.[^.]+$/, ''));
    form.append('file', file);
    try {
      await certificateService.create(form);
      await load();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to upload certificate.');
    }
    event.target.value = '';
  }

  async function download(item) {
    const response = await certificateService.download(item.cert_id);
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.file_path?.split(/[\\/]/).pop() || 'certificate';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function remove(item) {
    await certificateService.remove(item.cert_id);
    setItems((current) => current.filter((entry) => entry.cert_id !== item.cert_id));
  }

  if (loading) return <LoadingState title="Loading certificates..." description="Retrieving your uploaded certificates." />;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Documents</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">Certificates</h1></div>
          <label className="inline-flex cursor-pointer items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Upload certificate<input className="hidden" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={upload} /></label>
        </div>
      </section>
      {error ? <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}
      {!items.length ? <EmptyState title="No certificates uploaded" description="Upload certificates to keep your candidate profile complete." /> : (
        <div className="grid gap-4 md:grid-cols-2">{items.map((item) => (
          <article key={item.cert_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{item.issuer || 'Certificate'}{item.issue_date ? ` · ${item.issue_date}` : ''}</p>
            <div className="mt-5 flex gap-2"><Button variant="secondary" size="sm" onClick={() => download(item)}>Download</Button><Button variant="secondary" size="sm" onClick={() => remove(item)}>Delete</Button></div>
          </article>
        ))}</div>
      )}
    </div>
  );
}

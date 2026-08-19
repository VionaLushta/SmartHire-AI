import { Download, Eye, PencilLine, Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function CertificateCard({ items = [], onAdd, onEdit, onDelete }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Certificates</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Professional credentials</h3>
        </div>
        <Button variant="primary" size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add certificate
        </Button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.length ? (
          items.map((item) => (
            <article key={item.cert_id || item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-slate-950">{item.title}</h4>
                  <p className="mt-2 text-sm font-medium text-slate-700">{item.issuer || 'Organization'}</p>
                </div>
                <Badge tone="neutral">{item.issue_date ? new Date(item.issue_date).getFullYear() : 'Recent'}</Badge>
              </div>

              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Issued: {item.issue_date || 'Not set'}</p>
                <p>Expiry: {item.expiry_date || 'No expiry'}</p>
                <p>Credential ID: {item.credential_id || 'Not provided'}</p>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <Download className="h-4 w-4" /> Download
                </button>
                <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  <Eye className="h-4 w-4" /> Preview
                </button>
                <button type="button" aria-label="Edit certificate" onClick={() => onEdit?.(item)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100"><PencilLine className="h-4 w-4" /></button>
                <button type="button" aria-label="Delete certificate" onClick={() => onDelete?.(item)} className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          ))
        ) : (
          <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No certificates added yet.</div>
        )}
      </div>
    </section>
  );
}

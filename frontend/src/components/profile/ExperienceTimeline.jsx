import { BriefcaseBusiness, PencilLine, Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function ExperienceTimeline({ items = [], onAdd, onEdit, onDelete }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Experience</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Career timeline</h3>
        </div>
        <Button variant="primary" size="sm" onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add experience
        </Button>
      </div>

      <div className="mt-6 space-y-5">
        {items.length ? (
          items.map((item) => (
            <article key={item.work_experience_id || item.id} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 pl-5">
              <div className="absolute left-0 top-6 h-10 w-1 rounded-full bg-slate-900" />
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-semibold text-slate-950">{item.title}</h4>
                    {item.current ? <Badge tone="success">Current</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-700">{item.company_name}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.start_date || 'Start'} – {item.current ? 'Present' : item.end_date || 'End'}</p>
                  {item.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Edit experience" onClick={() => onEdit?.(item)} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100"><PencilLine className="h-4 w-4" /></button>
                  <button type="button" aria-label="Delete experience" onClick={() => onDelete?.(item)} className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">No experience records yet.</div>
        )}
      </div>
    </section>
  );
}

import { ExternalLink, Trash2 } from 'lucide-react';
import Button from '../ui/Button';

export default function ResumeHistory({ items = [], onOpen, onDelete }) {
  return (
    <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">History</p>
          <h3 className="mt-2 text-[24px] font-bold tracking-[-0.04em] text-slate-950">
            Previous uploads
          </h3>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
            No resume history yet.
          </div>
        ) : (
          items.map((item) => {
            const fileName = item?.file_path?.split(/[\\/]/).pop() || `Resume ${item?.resume_id}`;
            const dateLabel = item?.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recently';

            return (
              <div
                key={item.resume_id}
                className="flex flex-col gap-3 rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium text-slate-900">{fileName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Version {item.version ?? item.resume_id} - {dateLabel}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => onOpen(item)}>
                    <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Open
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(item.resume_id)}>
                    <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

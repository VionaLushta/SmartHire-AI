import { ArrowUpRight, CalendarDays, FileText, Sparkles } from 'lucide-react';
import Button from '../ui/Button';

export default function ResumeCard({ resume, onOpen, onDelete }) {
  const fileName = resume?.file_path?.split(/[\\/]/).pop() || 'Resume document';

  return (
    <div className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm transition duration-150 ease-out hover:border-slate-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-slate-200 bg-slate-50 text-slate-700">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Latest upload</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">{fileName}</h3>
          </div>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Active
        </span>
      </div>

      <div className="mt-5 flex items-center gap-3 text-sm text-slate-600">
        <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
        <span>{resume?.created_at ? new Date(resume.created_at).toLocaleDateString() : 'Recently uploaded'}</span>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="button" variant="primary" onClick={onOpen}>
          <ArrowUpRight className="mr-2 h-4 w-4" aria-hidden="true" />
          Open
        </Button>
        <Button type="button" variant="secondary" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  );
}

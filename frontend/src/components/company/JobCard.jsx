import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Building2, CalendarClock, PencilLine, Trash2 } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (['active', 'open'].includes(value)) return 'success';
  if (['paused'].includes(value)) return 'warning';
  if (['closed'].includes(value)) return 'neutral';
  return 'slate';
}

export default function JobCard({ job }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge tone={statusTone(job.hiring_status)}>{job.hiring_status || 'open'}</Badge>
          <h3 className="mt-4 text-lg font-semibold text-slate-950">{job.title}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
            {job.department_name}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">AI Match</p>
          <p className="mt-1 text-2xl font-semibold">{job.ai_average_score ?? 0}%</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>{job.applicants_count} applications</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>{job.views != null ? `${job.views} views` : 'Views not tracked'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>{job.department_name}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button as={Link} to={job.detailsHref || '/jobs'} variant="secondary" size="sm">
          Details
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="sm">
          <PencilLine className="mr-2 h-4 w-4" aria-hidden="true" />
          Edit
        </Button>
        <Button type="button" variant="ghost" size="sm">
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Delete
        </Button>
      </div>
    </article>
  );
}

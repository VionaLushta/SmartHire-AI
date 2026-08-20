import { Link } from 'react-router-dom';
import { ArrowRight, Building2, MapPin, DollarSign, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatSalaryRange } from '../../utils/dashboard';

export default function RecommendationCard({ job, matchPercent }) {
  return (
    <article className="group rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm transition duration-150 ease-out hover:border-slate-300">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Badge tone="neutral">Recommended</Badge>
          <h3 className="mt-4 text-lg font-semibold text-slate-950">{job.title}</h3>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
            {job.company_name}
          </p>
        </div>
        <div className="rounded-[14px] bg-slate-950 px-4 py-3 text-right text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Match</p>
          <p className="mt-1 text-2xl font-semibold">
            {matchPercent == null ? 'N/A' : `${matchPercent}%`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>{job.location || 'Remote / flexible'}</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>{formatSalaryRange(job)}</span>
        </div>
        {job.department_name ? (
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span>{job.department_name}</span>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button as={Link} to={`/jobs/${job.job_id}`} variant="primary" className="w-full">
          Apply
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}

import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, BookmarkCheck, Building2, MapPin, DollarSign, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatSalaryRange } from '../../utils/dashboard';

export default function RecommendationCard({ job, matchPercent, saved = false, onSave, onApply }) {
  const skills = [...(job.required_skills || []), ...(job.optional_skills || []), ...(job.skills || [])]
    .filter(Boolean)
    .filter((skill, index, list) => list.indexOf(skill) === index)
    .slice(0, 3);
  const matchingSkills = job.matching_skills || job.matched_skills || [];
  const missingSkills = job.missing_skills || [];

  return (
    <article className="group relative rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm transition duration-150 ease-out hover:border-slate-300">
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

      {job.ai_summary || job.ai_recommendation || matchingSkills.length || missingSkills.length ? (
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm">
          <p className="font-semibold text-blue-950">Why this role is recommended</p>
          <p className="mt-1 leading-6 text-slate-600">{job.ai_recommendation || job.ai_summary || 'This role aligns with your current profile and career direction.'}</p>
          {matchingSkills.length ? <p className="mt-2 text-slate-600"><span className="font-medium text-emerald-700">Matches:</span> {matchingSkills.slice(0, 4).join(', ')}</p> : null}
          {missingSkills.length ? <p className="mt-1 text-slate-600"><span className="font-medium text-amber-700">Consider developing:</span> {missingSkills.slice(0, 3).join(', ')}</p> : null}
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <Button as={Link} to={`/jobs/${job.job_id}`} variant="secondary" className="flex-1">
          View details
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
        <Button type="button" variant="primary" className="flex-1" onClick={() => onApply?.(job.job_id)}>
          Quick apply
        </Button>
      </div>
      {skills.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {skills.map((skill) => <Badge key={skill} tone="neutral">{skill}</Badge>)}
        </div>
      ) : null}
      {onSave ? (
        <button
          type="button"
          onClick={() => onSave(job.job_id)}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          aria-label={saved ? 'Remove saved job' : 'Save job'}
        >
          {saved ? <BookmarkCheck className="h-5 w-5" aria-hidden="true" /> : <Bookmark className="h-5 w-5" aria-hidden="true" />}
        </button>
      ) : null}
    </article>
  );
}

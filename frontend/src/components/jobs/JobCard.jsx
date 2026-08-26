import { Link } from 'react-router-dom';
import { Bookmark, BriefcaseBusiness, Building2, CalendarDays, DollarSign, MapPin, Sparkles, Star, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import SkillBadge from './SkillBadge';
import { formatSalaryRange, formatDateShort, clampPercent } from '../../utils/dashboard';
import { PLATFORM_ORGANIZATION_NAME } from '../../constants/app';

export default function JobCard({ job, onSave, isSaved = false, onApply }) {
  const skills = Array.isArray(job.skills) ? job.skills : Array.isArray(job.required_skills) ? job.required_skills : [];
  const match = clampPercent(job.ai_match ?? job.match_score ?? job.ai_average_score ?? 0);

  return (
    <article className="group flex h-full flex-col rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm transition duration-150 ease-out hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700">
            {job.company_name?.slice(0, 2)?.toUpperCase() || 'CO'}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{job.company_name || PLATFORM_ORGANIZATION_NAME}</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">{job.title}</h3>
          </div>
        </div>

        <div className="rounded-[14px] bg-slate-950 px-3 py-2 text-right text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">AI</p>
          <p className="mt-1 text-lg font-semibold">{match}%</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
          {job.location || 'Remote'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <DollarSign className="h-4 w-4 text-slate-400" aria-hidden="true" />
          {formatSalaryRange(job)}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="neutral">{job.employment_type || 'Full-time'}</Badge>
        <Badge tone="emerald">{job.experience_level || 'Mid level'}</Badge>
        <Badge tone="sky">{job.department_name || 'General'}</Badge>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
          {formatDateShort(job.created_at || job.updated_at || job.deadline)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Star className="h-4 w-4 text-amber-500" aria-hidden="true" />
          {job.skill_count || skills.length || 0} skills
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {skills.slice(0, 4).map((skill) => (
          <SkillBadge key={typeof skill === 'string' ? skill : skill.name || skill.skill_id} tone="neutral">
            {typeof skill === 'string' ? skill : skill.name}
          </SkillBadge>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button type="button" variant="secondary" className="flex-1" onClick={() => onSave?.(job)}>
          <Bookmark className={`mr-2 h-4 w-4 ${isSaved ? 'fill-current' : ''}`} aria-hidden="true" />
          {isSaved ? 'Saved' : 'Save'}
        </Button>
        <Button type="button" variant="primary" className="flex-1" onClick={() => onApply?.(job)}>
          Apply
        </Button>
      </div>

      <Link
        to={`/jobs/${job.job_id}`}
        className="mt-4 inline-flex items-center text-sm font-semibold text-slate-900 hover:text-slate-600"
      >
        View details
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

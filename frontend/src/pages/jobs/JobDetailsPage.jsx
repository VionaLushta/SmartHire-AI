import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Briefcase, Building2, CalendarDays, CheckCircle2, DollarSign, MapPin, Sparkles, Star } from 'lucide-react';
import { fetchJobById, fetchSavedJobs, removeSavedJob, saveJob } from '../../redux/slices/jobSlice';
import Button from '../../components/ui/Button';
import SkillBadge from '../../components/jobs/SkillBadge';
import LoadingState from '../../components/jobs/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { formatDateShort, formatSalaryRange, clampPercent } from '../../utils/dashboard';
import { PLATFORM_ORGANIZATION_NAME } from '../../constants/app';

export default function JobDetailsPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { selectedJob, selectedJobStatus, selectedJobError, savedJobs } = useSelector((state) => state.jobs);

  useEffect(() => {
    if (id) {
      dispatch(fetchJobById(id));
      if (user?.user_id) {
        dispatch(fetchSavedJobs());
      }
    }
  }, [dispatch, id, user?.user_id]);

  const applyPath = useMemo(() => `/jobs/${id}/apply`, [id]);
  const authenticated = Boolean(user);

  const isSaved = useMemo(
    () => savedJobs.some((savedJob) => String(savedJob.job_id ?? savedJob.job?.job_id ?? '') === String(id)),
    [id, savedJobs],
  );

  if (selectedJobStatus === 'loading' || (!selectedJob && !selectedJobError)) {
    return <LoadingState title="Loading job details..." />;
  }

  if (selectedJobError) {
    return (
      <ErrorState
        title="Unable to load job details"
        description={selectedJobError}
        onRetry={() => dispatch(fetchJobById(id))}
      />
    );
  }

  const match = clampPercent(selectedJob.ai_match ?? selectedJob.ai_average_score ?? 0);
  const skills = Array.isArray(selectedJob.required_skills) && selectedJob.required_skills.length
    ? selectedJob.required_skills
    : Array.isArray(selectedJob.skill_names)
      ? selectedJob.skill_names
      : [];
  const optionalSkills = Array.isArray(selectedJob.optional_skills) ? selectedJob.optional_skills : [];

  async function handleSave() {
    if (isSaved) {
      dispatch(removeSavedJob(id));
      return;
    }
    dispatch(saveJob(id));
  }

  async function handleApply() {
    if (!authenticated) {
      navigate(`/candidate/apply-auth?returnTo=${encodeURIComponent(applyPath)}`);
      return;
    }
    navigate(applyPath);
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-8 md:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">{selectedJob.company_name || PLATFORM_ORGANIZATION_NAME}</p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">{selectedJob.title}</h1>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">AI Match</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{match}%</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 md:px-8 lg:grid-cols-[1.5fr_0.7fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />{selectedJob.location || 'Remote'}</span>
              <span className="inline-flex items-center gap-2"><Briefcase className="h-4 w-4 text-slate-400" aria-hidden="true" />{selectedJob.employment_type || 'Full-time'}</span>
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />Deadline {formatDateShort(selectedJob.deadline)}</span>
            </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={handleApply}>Apply now</Button>
            <Button variant="secondary" onClick={handleSave}>{isSaved ? 'Saved' : 'Save job'}</Button>
          </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-700 shadow-sm">
                {selectedJob.company_name?.slice(0, 2)?.toUpperCase() || 'CO'}
              </div>
              <div>
                <p className="font-semibold text-slate-950">{selectedJob.company_name || PLATFORM_ORGANIZATION_NAME}</p>
                <p className="text-sm text-slate-500">{selectedJob.department_name || 'General team'}</p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-4">
                <dt>Salary</dt>
                <dd className="font-medium text-slate-900">{formatSalaryRange(selectedJob)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Experience</dt>
                <dd className="font-medium text-slate-900">{selectedJob.experience_level || 'Mid'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt>Location</dt>
                <dd className="font-medium text-slate-900">{selectedJob.location || 'Remote'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <main className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">Role overview</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">{selectedJob.description || 'No description provided.'}</p>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Responsibilities</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {(selectedJob.responsibilities ? selectedJob.responsibilities.split('\n').filter(Boolean) : []).map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Requirements</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {(selectedJob.requirements ? selectedJob.requirements.split('\n').filter(Boolean) : []).map((item) => (
                <li key={item} className="flex gap-3">
                  <Star className="mt-0.5 h-4 w-4 text-amber-500" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Required skills</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <SkillBadge key={typeof skill === 'string' ? skill : skill.name} tone="emerald">
                  {typeof skill === 'string' ? skill : skill.name}
                </SkillBadge>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Optional skills</h2>
            {optionalSkills.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {optionalSkills.map((skill) => (
                  <SkillBadge key={typeof skill === 'string' ? skill : skill.name} tone="neutral">
                    {typeof skill === 'string' ? skill : skill.name}
                  </SkillBadge>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-slate-600">
                No optional skills are listed for this role yet.
              </p>
            )}
          </section>
        </main>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">AI match panel</h2>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Overall match</p>
              <p className="mt-3 text-4xl font-semibold text-slate-950">{match}%</p>
            </div>

            <div className="mt-5 space-y-4 text-sm text-slate-600">
              <div className="flex items-center justify-between"><span>Matched skills</span><span className="font-semibold text-slate-900">{skills.slice(0, 3).join(', ')}</span></div>
              <div className="flex items-center justify-between"><span>Resume score</span><span className="font-semibold text-slate-900">92%</span></div>
              <div className="flex items-center justify-between"><span>Learning suggestions</span><span className="font-semibold text-slate-900">2 opportunities</span></div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">Role details</h2>
            <dl className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between"><dt>Department</dt><dd className="font-medium text-slate-900">{selectedJob.department_name || 'General'}</dd></div>
              <div className="flex items-center justify-between"><dt>Employment</dt><dd className="font-medium text-slate-900">{selectedJob.employment_type || 'Full-time'}</dd></div>
              <div className="flex items-center justify-between"><dt>Location</dt><dd className="font-medium text-slate-900">{selectedJob.location || 'Remote'}</dd></div>
              <div className="flex items-center justify-between"><dt>Salary</dt><dd className="font-medium text-slate-900">{formatSalaryRange(selectedJob)}</dd></div>
              <div className="flex items-center justify-between"><dt>Deadline</dt><dd className="font-medium text-slate-900">{formatDateShort(selectedJob.deadline)}</dd></div>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

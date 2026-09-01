import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookmarkCheck, BriefcaseBusiness } from 'lucide-react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/jobs/LoadingState';
import { savedJobService } from '../../services/savedJobService';
import { jobService } from '../../services/jobService';
import { unwrapItems, unwrapResponse } from '../../utils/dashboard';
import { PLATFORM_ORGANIZATION_NAME } from '../../constants/app';

export default function SavedJobsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSavedJobs() {
      try {
        const response = await savedJobService.list();
        const savedJobs = unwrapItems(response);

        const enriched = await Promise.all(
          savedJobs.map(async (savedJob) => {
            const detail = savedJob.job_id ? await jobService.detail(savedJob.job_id).catch(() => null) : null;
            return {
              ...savedJob,
              job: detail ? unwrapResponse(detail) : savedJob.job || null,
            };
          }),
        );

        setItems(enriched);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
  }

  async function removeSavedJob(savedJob) {
    try {
      await savedJobService.remove(savedJob.job_id);
      setItems((current) => current.filter((item) => item.job_id !== savedJob.job_id));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to remove this saved job.');
    }
  }
    }

    loadSavedJobs();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Saved roles</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Your shortlist</h1>
          </div>
          <BookmarkCheck className="h-8 w-8 text-slate-900" aria-hidden="true" />
        </div>
      </div>

      <div className="space-y-4">
        {error ? <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : null}
        {loading ? (
          <LoadingState
            title="Loading saved roles..."
            description="Retrieving your bookmarked opportunities."
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="You have not saved any roles yet"
            description="Save jobs from the jobs page to keep a shortlist for later review."
            action={(
              <Button as={Link} to="/jobs" variant="primary">
                Browse jobs
              </Button>
            )}
            icon={BriefcaseBusiness}
          />
        ) : (
          items.map((savedJob) => {
            const job = savedJob.job || {};
            return (
              <div key={savedJob.saved_job_id || savedJob.job_id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{job.company_name || PLATFORM_ORGANIZATION_NAME}</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-950">{job.title || 'Open role'}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button as={Link} to={job.job_id ? `/jobs/${job.job_id}` : '/jobs'} variant="primary">
                      View role
                    </Button>
                    {job.job_id ? <Button as={Link} to={`/jobs/${job.job_id}/apply`} variant="secondary">Apply</Button> : null}
                    <Button variant="secondary" onClick={() => removeSavedJob(savedJob)}>Remove</Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

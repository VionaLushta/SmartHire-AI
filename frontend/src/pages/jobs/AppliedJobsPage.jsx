import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, BriefcaseBusiness } from 'lucide-react';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/jobs/LoadingState';
import { applicationService } from '../../services/applicationService';
import { jobService } from '../../services/jobService';
import { unwrapItems, unwrapResponse } from '../../utils/dashboard';

export default function AppliedJobsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadApplications() {
      try {
        const response = await applicationService.list();
        const applications = unwrapItems(response);

        const enriched = await Promise.all(
          applications.map(async (application) => {
            const detail = application.job_id ? await jobService.detail(application.job_id).catch(() => null) : null;
            return {
              ...application,
              job: detail ? unwrapResponse(detail) : null,
            };
          }),
        );

        setItems(enriched);
      } finally {
        setLoading(false);
      }
    }

    loadApplications();
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Applications</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Your submitted roles</h1>
          </div>
          <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden="true" />
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <LoadingState
            title="Loading applications..."
            description="Retrieving your submitted applications and current statuses."
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="You have not applied to any roles yet"
            description="Apply to a role to see it appear here with status updates."
            action={(
              <Button as={Link} to="/jobs" variant="primary">
                Browse jobs
              </Button>
            )}
            icon={BriefcaseBusiness}
          />
        ) : (
          items.map((application) => {
            const job = application.job || {};
            return (
              <div key={application.application_id || application.id || application.job_id} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{job.company_name || 'Company'}</p>
                    <h2 className="mt-1 text-2xl font-semibold text-slate-950">{job.title || 'Applied role'}</h2>
                    <p className="mt-2 text-sm text-slate-600">Status: {application.status || 'submitted'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button as={Link} to={job.job_id ? `/jobs/${job.job_id}` : '/jobs'} variant="secondary">
                      View job
                    </Button>
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

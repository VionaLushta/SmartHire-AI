import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { formatDateShort, clampPercent } from '../../utils/dashboard';

function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (['accepted', 'shortlisted', 'interviewed'].includes(value)) return 'success';
  if (['rejected'].includes(value)) return 'danger';
  if (['reviewing', 'submitted', 'pending'].includes(value)) return 'warning';
  return 'neutral';
}

export default function ApplicationTable({ applications = [] }) {
  if (!applications.length) {
    return (
      <EmptyState
        title="No applications yet"
        description="Application history appears here once candidate activity is available."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[rgba(15,23,42,0.08)] bg-white">
          <thead className="bg-slate-50/80">
            <tr>
              {['Company', 'Job', 'Status', 'Applied Date', 'AI Score', 'Action'].map((header) => (
                <th
                  key={header}
                  scope="col"
                  className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(15,23,42,0.08)] bg-white">
            {applications.map((application) => (
              <tr key={application.id} className="transition duration-150 ease-out hover:bg-slate-50/70">
                <td className="px-5 py-4 text-sm font-medium text-slate-950">
                  {application.company_name}
                </td>
                <td className="px-5 py-4 text-sm text-slate-600">{application.job_title}</td>
                <td className="px-5 py-4">
                  <Badge tone={statusTone(application.status)}>{application.status || 'submitted'}</Badge>
                </td>
                <td className="px-5 py-4 text-sm text-slate-500">
                  {formatDateShort(application.applied_at)}
                </td>
                <td className="px-5 py-4 text-sm font-semibold text-slate-950">
                  {application.ai_score == null ? 'N/A' : `${clampPercent(application.ai_score)}%`}
                </td>
                <td className="px-5 py-4">
                  <Button as={Link} to={application.jobHref || '/jobs'} variant="secondary" size="sm">
                    View
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

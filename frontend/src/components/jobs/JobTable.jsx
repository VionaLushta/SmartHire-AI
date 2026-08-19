import { Link } from 'react-router-dom';
import { ArrowUpRight, BriefcaseBusiness, MapPin, PencilLine, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { formatSalaryRange, formatDateShort } from '../../utils/dashboard';

export default function JobTable({ jobs = [], onDelete }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50 text-sm text-slate-600">
            <tr>
              <th className="px-5 py-4 font-medium">Role</th>
              <th className="px-5 py-4 font-medium">Company</th>
              <th className="px-5 py-4 font-medium">Location</th>
              <th className="px-5 py-4 font-medium">Salary</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Posted</th>
              <th className="px-5 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                  No jobs found.
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.job_id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div>
                      <p className="font-semibold text-slate-900">{job.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{job.employment_type || 'Full-time'}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4">{job.company_name || 'Hiring team'}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      <span>{job.location || 'Remote'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">{formatSalaryRange(job)}</td>
                  <td className="px-5 py-4">
                    <Badge tone={job.status === 'closed' ? 'neutral' : 'success'}>{job.status || 'open'}</Badge>
                  </td>
                  <td className="px-5 py-4">{formatDateShort(job.created_at || job.updated_at)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Button as={Link} to={`/jobs/${job.job_id}`} variant="secondary" size="sm">
                        <ArrowUpRight className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        View
                      </Button>
                      <Button as={Link} to={`/jobs/${job.job_id}/edit`} variant="ghost" size="sm">
                        <PencilLine className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(job)}>
                        <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

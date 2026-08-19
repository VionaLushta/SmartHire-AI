import { useMemo, useState } from 'react';
import { Archive, Search, Trash2 } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import StatusBadge from '../../components/admin/StatusBadge';
import EmptyState from '../../components/admin/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const jobs = [
  { job_id: 1, title: 'Senior Product Manager', company: 'Northstar Labs', location: 'Remote', status: 'active', applicants: 28 },
  { job_id: 2, title: 'Data Analyst', company: 'BrightPilot', location: 'Berlin', status: 'draft', applicants: 14 },
  { job_id: 3, title: 'Frontend Engineer', company: 'Apex Studio', location: 'London', status: 'archived', applicants: 8 },
];

export default function AdminJobsPage() {
  const [query, setQuery] = useState('');
  const filteredJobs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter((job) => `${job.title} ${job.company} ${job.location}`.toLowerCase().includes(term));
  }, [query]);

  return (
    <AdminCard title="Jobs management" description="Manage the organization’s job inventory and posting lifecycle.">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" aria-label="Search jobs" placeholder="Search jobs" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Button variant="primary" type="button">Create job</Button>
      </div>

      {filteredJobs.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Role</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Company</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredJobs.map((job) => (
                <tr key={job.job_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{job.title}</p>
                      <p className="text-sm text-slate-500">{job.location}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{job.company}</td>
                  <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" type="button">Edit</Button>
                      <Button size="sm" variant="ghost" type="button"><Archive className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" type="button"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No jobs match your search" description="Try another keyword to find a role." />
      )}
    </AdminCard>
  );
}

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import StatusBadge from '../../components/admin/StatusBadge';
import EmptyState from '../../components/admin/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const applications = [
  { application_id: 1, candidate: 'Lena Carter', company: 'Northstar Labs', job: 'Senior Product Manager', ai_score: 92, status: 'interview', interview: 'Scheduled' },
  { application_id: 2, candidate: 'Ibrahim Ali', company: 'BrightPilot', job: 'Data Analyst', ai_score: 87, status: 'accepted', interview: 'Completed' },
  { application_id: 3, candidate: 'Sophia Reed', company: 'Apex Studio', job: 'Frontend Engineer', ai_score: 81, status: 'pending', interview: 'Pending' },
];

export default function AdminApplicationsPage() {
  const [query, setQuery] = useState('');
  const filteredApplications = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return applications;
    return applications.filter((application) => `${application.candidate} ${application.company} ${application.job}`.toLowerCase().includes(term));
  }, [query]);

  return (
    <AdminCard title="Applications management" description="Review application health, AI scoring, and interview status.">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" aria-label="Search applications" placeholder="Search applications" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>

      {filteredApplications.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Candidate</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Company</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Job</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">AI Score</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredApplications.map((application) => (
                <tr key={application.application_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{application.candidate}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{application.company}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{application.job}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{application.ai_score}%</td>
                  <td className="px-4 py-3"><StatusBadge status={application.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" type="button">Interview</Button>
                      <Button size="sm" variant="ghost" type="button">View</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No applications match your search" description="Adjust the filter to find the right candidate pipeline." />
      )}
    </AdminCard>
  );
}

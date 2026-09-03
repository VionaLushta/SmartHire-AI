import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import StatusBadge from '../../components/admin/StatusBadge';
import EmptyState from '../../components/admin/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingState from '../../components/jobs/LoadingState';
import { applicationService } from '../../services/applicationService';
import { unwrapItems } from '../../utils/dashboard';

const statuses = ['pending', 'reviewed', 'interview', 'accepted', 'rejected', 'hired'];

export default function AdminApplicationsPage() {
  const [query, setQuery] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadApplications() {
      try {
        const response = await applicationService.list();
        if (mounted) setApplications(unwrapItems(response));
      } catch (err) {
        if (mounted) setError(err?.response?.data?.detail || 'Unable to load applications.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadApplications();
    const interval = window.setInterval(loadApplications, 15000);
    const onFocus = () => loadApplications();
    window.addEventListener('focus', onFocus);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  async function handleStatusChange(applicationId, nextStatus) {
    try {
      const response = await applicationService.updateStatus(applicationId, nextStatus);
      setApplications((current) => current.map((item) => item.application_id === applicationId ? { ...item, ...response.data } : item));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to update application status.');
    }
  }

  async function handleDelete(applicationId) {
    if (!window.confirm('Delete this application permanently?')) return;
    try {
      await applicationService.remove(applicationId);
      setApplications((current) => current.filter((item) => item.application_id !== applicationId));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to delete application.');
    }
  }
  const filteredApplications = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return applications;
    return applications.filter((application) => `${application.candidate_name} ${application.company_name} ${application.job_title} ${application.department_name}`.toLowerCase().includes(term));
  }, [query]);

  if (loading) return <LoadingState title="Loading applications..." description="Retrieving live candidate applications." />;

  return (
    <AdminCard title="Applications management" description="Review application health, AI scoring, and interview status.">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" aria-label="Search applications" placeholder="Search applications" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>
      {error ? <p className="mb-4 text-sm font-medium text-rose-600">{error}</p> : null}

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
                  <td className="px-4 py-3 font-medium text-slate-900">{application.candidate_name || application.candidate_email}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{application.company_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{application.job_title}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{application.overall_score ?? 0}%</td>
                  <td className="px-4 py-3"><StatusBadge status={application.status || 'pending'} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <select className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm" value={application.status || 'pending'} onChange={(event) => handleStatusChange(application.application_id, event.target.value)}>
                        {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                      <Button as={Link} to={`/admin/candidates/${application.user_id}?application_id=${application.application_id}`} size="sm" variant="ghost">View</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(application.application_id)}>Delete</Button>
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

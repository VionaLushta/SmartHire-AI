import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Mail, FileDown } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import EmptyState from '../../components/admin/EmptyState';
import StatusBadge from '../../components/admin/StatusBadge';
import LoadingState from '../../components/jobs/LoadingState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ErrorState from '../../components/ui/ErrorState';
import Avatar from '../../components/ui/Avatar';
import { analyticsService } from '../../services/analyticsService';
import { unwrapResponse, getInitials, formatDateShort, formatMetricPercent } from '../../utils/dashboard';
import { asArray, buildCandidateRows } from './adminData';

function CandidateName({ candidate }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar initials={getInitials({ first_name: candidate.candidate_name })} size="sm" />
      <div>
        <p className="font-semibold tracking-[-0.02em] text-slate-950">{candidate.candidate_name}</p>
        <p className="mt-1 text-sm text-slate-500">{candidate.email || candidate.candidate_location || 'Profile on file'}</p>
      </div>
    </div>
  );
}

export default function AdminCandidatesPage() {
  const [analytics, setAnalytics] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const response = await analyticsService.overview();
        const data = unwrapResponse(response) || {};
        if (mounted) setAnalytics(data);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.detail || 'Unable to load candidates.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    const interval = window.setInterval(loadData, 15000);
    const onFocus = () => loadData();
    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const rows = useMemo(() => buildCandidateRows(analytics || {}), [analytics]);
  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((candidate) =>
      `${candidate.candidate_name} ${candidate.applied_position} ${candidate.alternative_role} ${candidate.status} ${candidate.email}`
        .toLowerCase()
        .includes(term),
    );
  }, [query, rows]);

  const statusCount = asArray(rows).length;

  if (loading) {
    return <LoadingState title="Loading candidates..." description="Retrieving recruiter-ready candidate data." />;
  }

  if (error && !analytics) {
    return (
      <ErrorState title="Unable to load candidates" description={error} onRetry={() => window.location.reload()} />
    );
  }

  return (
    <AdminCard
      title="Candidates"
      description="Search the current candidate queue and open a candidate detail view for deeper review."
    >
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            aria-label="Search candidates"
            placeholder="Search candidates"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" type="button">Filters</Button>
          <Button variant="secondary" type="button">Export</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="chip">{statusCount} records</span>
        <span className="chip">{formatMetricPercent(analytics?.metrics?.average_ai_match_score)}</span>
      </div>

      {filteredRows.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[rgba(15,23,42,0.08)] text-left">
            <thead className="bg-slate-50/80">
              <tr>
                {['Candidate', 'Applied Position', 'Primary Match', 'Alternative Role', 'Status', 'Applied Date', 'Actions'].map((header) => (
                  <th key={header} className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(15,23,42,0.08)] bg-white">
              {filteredRows.map((candidate) => (
                <tr key={candidate.candidate_id} className="align-top hover:bg-slate-50/80">
                  <td className="px-4 py-4">
                    <CandidateName candidate={candidate} />
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">{candidate.applied_position}</td>
                  <td className="px-4 py-4 text-sm font-semibold text-slate-950">{formatMetricPercent(candidate.primary_match)}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{candidate.alternative_role}</td>
                  <td className="px-4 py-4"><StatusBadge status={candidate.status} /></td>
                  <td className="px-4 py-4 text-sm text-slate-500">{formatDateShort(candidate.applied_date)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Button as={Link} to={`/admin/candidates/${candidate.candidate_id}`} size="sm" variant="secondary">
                        View
                      </Button>
                      <Button type="button" size="sm" variant="secondary">Accept</Button>
                      <Button type="button" size="sm" variant="secondary">Reject</Button>
                      <Button type="button" size="sm" variant="ghost">
                        <FileDown className="h-4 w-4" />
                      </Button>
                      {candidate.email ? (
                        <Button as="a" href={`mailto:${candidate.email}`} size="sm" variant="ghost">
                          <Mail className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No candidates match your search"
          description="Adjust the filter or try a broader search term."
          action={(
            <Button type="button" variant="primary" onClick={() => setQuery('')}>
              Clear search
            </Button>
          )}
        />
      )}
    </AdminCard>
  );
}

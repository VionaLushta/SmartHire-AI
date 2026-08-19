import { useMemo, useState } from 'react';
import { Building2, Search, ShieldCheck, Trash2 } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import StatusBadge from '../../components/admin/StatusBadge';
import EmptyState from '../../components/admin/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const mockCompanies = [
  { company_id: 1, name: 'Northstar Labs', industry: 'SaaS', employees: 180, status: 'verified', jobs: 22 },
  { company_id: 2, name: 'BrightPilot', industry: 'Analytics', employees: 64, status: 'pending', jobs: 9 },
  { company_id: 3, name: 'Apex Studio', industry: 'Design', employees: 42, status: 'suspended', jobs: 5 },
];

export default function AdminCompaniesPage() {
  const [query, setQuery] = useState('');
  const filteredCompanies = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return mockCompanies;
    return mockCompanies.filter((company) => `${company.name} ${company.industry}`.toLowerCase().includes(term));
  }, [query]);

  return (
    <AdminCard title="Companies management" description="Review platform organizations and account health.">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" aria-label="Search companies" placeholder="Search companies" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Button variant="primary" type="button">Add company</Button>
      </div>

      {filteredCompanies.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCompanies.map((company) => (
            <div key={company.company_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <StatusBadge status={company.status} />
              </div>

              <div className="mt-5 space-y-2">
                <h3 className="text-lg font-semibold text-slate-950">{company.name}</h3>
                <p className="text-sm text-slate-600">{company.industry}</p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Employees</span><span className="mt-2 block font-semibold text-slate-950">{company.employees}</span></div>
                <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Jobs</span><span className="mt-2 block font-semibold text-slate-950">{company.jobs}</span></div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" type="button">View</Button>
                <Button variant="secondary" size="sm" type="button"><ShieldCheck className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" type="button"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No companies match your search" description="Try a different company name or industry." />
      )}
    </AdminCard>
  );
}

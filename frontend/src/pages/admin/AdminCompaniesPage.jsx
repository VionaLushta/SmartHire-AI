import { useMemo, useState } from 'react';
import { Building2, Search, ShieldCheck, Trash2 } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import StatusBadge from '../../components/admin/StatusBadge';
import EmptyState from '../../components/admin/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const mockDepartments = [
  { company_id: 1, name: 'Engineering', industry: 'Product delivery', employees: 18, status: 'verified', jobs: 22 },
  { company_id: 2, name: 'Recruiting', industry: 'Talent acquisition', employees: 6, status: 'verified', jobs: 9 },
  { company_id: 3, name: 'Operations', industry: 'Internal support', employees: 4, status: 'active', jobs: 5 },
];

export default function AdminCompaniesPage() {
  const [query, setQuery] = useState('');
  const filteredDepartments = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return mockDepartments;
    return mockDepartments.filter((department) => `${department.name} ${department.industry}`.toLowerCase().includes(term));
  }, [query]);

  return (
    <AdminCard title="Departments management" description="Review the internal teams that support SmartHire Technologies.">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" aria-label="Search departments" placeholder="Search departments" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Button variant="primary" type="button">Add department</Button>
      </div>

      {filteredDepartments.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDepartments.map((department) => (
            <div key={department.company_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <StatusBadge status={department.status} />
              </div>

              <div className="mt-5 space-y-2">
                <h3 className="text-lg font-semibold text-slate-950">{department.name}</h3>
                <p className="text-sm text-slate-600">{department.industry}</p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Employees</span><span className="mt-2 block font-semibold text-slate-950">{department.employees}</span></div>
                <div className="rounded-xl bg-slate-50 p-3"><span className="block text-xs uppercase tracking-[0.16em] text-slate-500">Jobs</span><span className="mt-2 block font-semibold text-slate-950">{department.jobs}</span></div>
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
        <EmptyState title="No departments match your search" description="Try a different department name or area." />
      )}
    </AdminCard>
  );
}

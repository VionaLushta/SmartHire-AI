import { Link } from 'react-router-dom';
import { Building2, Globe, MapPin, Mail, Users, Sparkles } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { getInitials } from '../../utils/dashboard';

export default function CompanyProfileCard({ company, stats = {} }) {
  const initials = getInitials({
    first_name: company?.company_name || company?.name,
    last_name: '',
    email: company?.website || company?.industry,
  });

  const companyName = company?.company_name || company?.name || 'Company';

  return (
    <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Avatar initials={initials} size="lg" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Company Profile
            </p>
            <h3 className="mt-2 text-[24px] font-bold tracking-[-0.04em] text-slate-900">{companyName}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {company?.description || 'Company details are sourced directly from the backend.'}
            </p>
          </div>
        </div>

        <Button as={Link} to="#settings" variant="secondary">
          Edit
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Industry
          </div>
          <p className="mt-2 font-medium text-slate-900">{company?.industry || 'Not provided'}</p>
        </div>
        <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Globe className="h-4 w-4" aria-hidden="true" />
            Website
          </div>
          <p className="mt-2 font-medium text-slate-900">{company?.website || 'Not provided'}</p>
        </div>
        <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Location
          </div>
          <p className="mt-2 font-medium text-slate-900">{company?.location || 'Not provided'}</p>
        </div>
        <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Users className="h-4 w-4" aria-hidden="true" />
            Employees
          </div>
          <p className="mt-2 font-medium text-slate-900">
            {stats.departments_count != null ? `${stats.departments_count} departments` : 'Managed internally'}
          </p>
        </div>
        <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4 sm:col-span-2">
          <div className="flex items-center gap-2 text-slate-500">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Contact
          </div>
          <p className="mt-2 font-medium text-slate-900">
            {company?.contact || company?.email || 'Contact information not exposed yet'}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <Sparkles className="h-4 w-4 text-slate-700" aria-hidden="true" />
        Backed by the company dashboard API response.
      </div>
    </div>
  );
}

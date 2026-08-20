import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Building2, CalendarDays, MapPin, DollarSign } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';

const defaultForm = {
  title: '',
  description: '',
  requirements: '',
  responsibilities: '',
  salary_min: '',
  salary_max: '',
  employment_type: 'Full-time',
  experience_level: 'Mid',
  location: '',
  department_id: '',
  category_ids: '',
  deadline: '',
  status: 'open',
  company_id: '',
};

export default function JobForm({ initialValues, categories = [], departments = [], companyId, onSubmit, onCancel, submitting = false }) {
  const [form, setForm] = useState({ ...defaultForm, ...(initialValues || {}) });

  useEffect(() => {
    setForm({ ...defaultForm, ...(initialValues || {}) });
  }, [initialValues]);

  const normalizedCompanyId = useMemo(() => companyId ?? form.company_id ?? '', [companyId, form.company_id]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const payload = {
      ...form,
      company_id: Number(normalizedCompanyId),
      department_id: form.department_id ? Number(form.department_id) : null,
      category_ids: form.category_ids ? String(form.category_ids).split(',').map((item) => Number(item.trim())).filter(Boolean) : [],
      salary_min: form.salary_min === '' ? null : Number(form.salary_min),
      salary_max: form.salary_max === '' ? null : Number(form.salary_max),
      deadline: form.deadline || null,
      remote_option: form.location?.toLowerCase().includes('remote') || false,
      description: [form.description, form.requirements, form.responsibilities].filter(Boolean).join('\n\n'),
    };

    onSubmit(payload);
  }

  const fieldClassName =
    'h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition duration-150 ease-out placeholder:text-slate-400 hover:border-[rgba(15,23,42,0.12)] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10';

  const textAreaClassName =
    'w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition duration-150 ease-out placeholder:text-slate-400 hover:border-[rgba(15,23,42,0.12)] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <label className="field-label">Job title</label>
          <input
            value={form.title || ''}
            onChange={(event) => updateField('title', event.target.value)}
            className={fieldClassName}
            placeholder="Senior Product Designer"
            required
          />
        </div>

        <div className="lg:col-span-2">
          <label className="field-label">Description</label>
          <textarea
            rows={5}
            value={form.description || ''}
            onChange={(event) => updateField('description', event.target.value)}
            className={textAreaClassName}
            placeholder="Describe the role, mission, and the impact this team is making."
            required
          />
        </div>

        <div>
          <label className="field-label">Responsibilities</label>
          <textarea
            rows={4}
            value={form.responsibilities || ''}
            onChange={(event) => updateField('responsibilities', event.target.value)}
            className={textAreaClassName}
            placeholder="List day-to-day responsibilities"
          />
        </div>

        <div>
          <label className="field-label">Requirements</label>
          <textarea
            rows={4}
            value={form.requirements || ''}
            onChange={(event) => updateField('requirements', event.target.value)}
            className={textAreaClassName}
            placeholder="List required qualifications"
          />
        </div>

        <div>
          <label className="field-label">Department</label>
          <select
            value={form.department_id || ''}
            onChange={(event) => updateField('department_id', event.target.value)}
            className={fieldClassName}
          >
            <option value="">Select department</option>
            {departments.map((department) => (
              <option key={department.department_id} value={department.department_id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">Category IDs</label>
          <input
            value={form.category_ids || ''}
            onChange={(event) => updateField('category_ids', event.target.value)}
            className={fieldClassName}
            placeholder="1, 2, 3"
          />
        </div>

        <div>
          <label className="field-label">Employment type</label>
          <select
            value={form.employment_type || 'Full-time'}
            onChange={(event) => updateField('employment_type', event.target.value)}
            className={fieldClassName}
          >
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>
        </div>

        <div>
          <label className="field-label">Experience level</label>
          <select
            value={form.experience_level || 'Mid'}
            onChange={(event) => updateField('experience_level', event.target.value)}
            className={fieldClassName}
          >
            <option value="Entry">Entry</option>
            <option value="Mid">Mid</option>
            <option value="Senior">Senior</option>
            <option value="Lead">Lead</option>
          </select>
        </div>

        <div>
          <label className="field-label">Location</label>
          <input
            value={form.location || ''}
            onChange={(event) => updateField('location', event.target.value)}
            className={fieldClassName}
            placeholder="New York, NY"
          />
        </div>

        <div>
          <label className="field-label">Status</label>
          <select
            value={form.status || 'open'}
            onChange={(event) => updateField('status', event.target.value)}
            className={fieldClassName}
          >
            <option value="open">Open</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label className="field-label">Minimum salary</label>
          <input
            type="number"
            value={form.salary_min ?? ''}
            onChange={(event) => updateField('salary_min', event.target.value)}
            className={fieldClassName}
            placeholder="120000"
          />
        </div>

        <div>
          <label className="field-label">Maximum salary</label>
          <input
            type="number"
            value={form.salary_max ?? ''}
            onChange={(event) => updateField('salary_max', event.target.value)}
            className={fieldClassName}
            placeholder="150000"
          />
        </div>

        <div className="lg:col-span-2">
          <label className="field-label">Application deadline</label>
          <input
            type="date"
            value={form.deadline || ''}
            onChange={(event) => updateField('deadline', event.target.value)}
            className={fieldClassName}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Saving...' : initialValues ? 'Update job' : 'Create job'}
        </Button>
      </div>
    </form>
  );
}

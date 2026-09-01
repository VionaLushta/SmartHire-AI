import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, CalendarDays, MapPin, DollarSign } from 'lucide-react';
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
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setForm({ ...defaultForm, ...(initialValues || {}) });
    setErrorMessage('');
  }, [initialValues]);

  const normalizedCompanyId = useMemo(() => companyId ?? form.company_id ?? '', [companyId, form.company_id]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    const title = String(form.title || '').trim();
    const description = String(form.description || '').trim();
    const responsibilities = String(form.responsibilities || '').trim();
    const requirements = String(form.requirements || '').trim();
    const employmentType = String(form.employment_type || '').trim();
    const experienceLevel = String(form.experience_level || '').trim();
    const location = String(form.location || '').trim();
    const status = String(form.status || '').trim();
    const departmentId = form.department_id === '' ? null : Number(form.department_id);
    const salaryMin = form.salary_min === '' ? null : Number(form.salary_min);
    const salaryMax = form.salary_max === '' ? null : Number(form.salary_max);
    const categoryIdsRaw = String(form.category_ids || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const categoryIds = categoryIdsRaw.map((item) => Number(item));
    const deadlineValue = form.deadline || null;
    const companyIdValue = Number(normalizedCompanyId);

    if (!title) {
      setErrorMessage('Job title is required.');
      return;
    }
    if (!description) {
      setErrorMessage('Job description is required.');
      return;
    }
    if (!departmentId) {
      setErrorMessage('Please select a department.');
      return;
    }
    if (Number.isNaN(companyIdValue) || companyIdValue <= 0) {
      setErrorMessage('Please select a valid company.');
      return;
    }
    if (!departments.some((department) => String(department.department_id) === String(departmentId))) {
      setErrorMessage('The selected department does not exist.');
      return;
    }
    if (!employmentType) {
      setErrorMessage('Employment type is required.');
      return;
    }
    if (!experienceLevel) {
      setErrorMessage('Experience level is required.');
      return;
    }
    if (!location) {
      setErrorMessage('Location is required.');
      return;
    }
    if (!status) {
      setErrorMessage('Status is required.');
      return;
    }
    if (form.salary_min !== '' && Number.isNaN(salaryMin)) {
      setErrorMessage('Minimum salary must be numeric.');
      return;
    }
    if (form.salary_max !== '' && Number.isNaN(salaryMax)) {
      setErrorMessage('Maximum salary must be numeric.');
      return;
    }
    if (salaryMin != null && salaryMax != null && salaryMax <= salaryMin) {
      setErrorMessage('Maximum salary must be greater than minimum salary.');
      return;
    }
    if (deadlineValue) {
      const deadlineDate = new Date(`${deadlineValue}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(deadlineDate.getTime()) || deadlineDate < today) {
        setErrorMessage('Application deadline cannot be in the past.');
        return;
      }
    }
    if (categoryIds.some((item) => Number.isNaN(item))) {
      setErrorMessage('Category IDs must be numeric.');
      return;
    }
    if (
      categories.length &&
      categoryIds.some(
        (item) => !categories.some((category) => String(category.category_id) === String(item)),
      )
    ) {
      setErrorMessage('One or more category IDs do not exist.');
      return;
    }

    const payload = {
      title,
      description,
      responsibilities: responsibilities || null,
      requirements: requirements || null,
      company_id: companyIdValue,
      department_id: departmentId,
      category_ids: categoryIds,
      salary_min: salaryMin,
      salary_max: salaryMax,
      deadline: deadlineValue,
      remote_option: location.toLowerCase().includes('remote'),
      employment_type: employmentType,
      experience_level: experienceLevel,
      location,
      status,
    };

    onSubmit(payload);
  }

  const fieldClassName =
    'h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition duration-150 ease-out placeholder:text-slate-400 hover:border-[rgba(15,23,42,0.12)] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10';

  const textAreaClassName =
    'w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition duration-150 ease-out placeholder:text-slate-400 hover:border-[rgba(15,23,42,0.12)] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10';

  function SectionCard({ icon: Icon, eyebrow, title, description, children, className = '' }) {
    return (
      <section className={`rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] ${className}`}>
        <div className="mb-5 flex items-start gap-3">
          {Icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 text-slate-600">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
              {eyebrow}
            </p>
            <h3 className="mt-1 text-[20px] font-semibold tracking-[-0.04em] text-slate-950">
              {title}
            </h3>
            {description ? (
              <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
            ) : null}
          </div>
        </div>
        {children}
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-gradient-to-r from-slate-50 via-white to-slate-50 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
              Job publishing workspace
            </p>
            <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-slate-950">
              Create a role in a clean, desktop-friendly layout.
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Fields are grouped to stay readable on desktop while still feeling calm and spacious.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              Backend synced
            </span>
            <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              Live validation
            </span>
            <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
              Responsive
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-6">
          <SectionCard
            icon={BriefcaseBusiness}
            eyebrow="Core details"
            title="Job setup"
            description="A focused column for the information recruiters edit first."
          >
            <div className="space-y-4">
              <div>
                <label className="field-label">Job title</label>
                <input
                  value={form.title || ''}
                  onChange={(event) => updateField('title', event.target.value)}
                  className={fieldClassName}
                  placeholder="Senior Product Designer"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                  <label className="field-label">Application deadline</label>
                  <input
                    type="date"
                    value={form.deadline || ''}
                    onChange={(event) => updateField('deadline', event.target.value)}
                    className={fieldClassName}
                  />
                </div>
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
            </div>
          </SectionCard>

          <SectionCard
            icon={DollarSign}
            eyebrow="Compensation"
            title="Salary band"
            description="Keep the salary range visible without giving it too much visual weight."
          >
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            icon={CalendarDays}
            eyebrow="Role narrative"
            title="Job description"
            description="The longer fields get a wide, calm canvas so they are easy to scan and edit."
          >
            <div className="space-y-5">
              <div>
                <label className="field-label">Description</label>
                <textarea
                  rows={6}
                  value={form.description || ''}
                  onChange={(event) => updateField('description', event.target.value)}
                  className={textAreaClassName}
                  placeholder="Describe the role, mission, and the impact this team is making."
                  required
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <label className="field-label">Responsibilities</label>
                  <textarea
                    rows={8}
                    value={form.responsibilities || ''}
                    onChange={(event) => updateField('responsibilities', event.target.value)}
                    className={textAreaClassName}
                    placeholder="List day-to-day responsibilities"
                  />
                </div>

                <div>
                  <label className="field-label">Requirements</label>
                  <textarea
                    rows={8}
                    value={form.requirements || ''}
                    onChange={(event) => updateField('requirements', event.target.value)}
                    className={textAreaClassName}
                    placeholder="List required qualifications"
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={MapPin}
            eyebrow="Publishing"
            title="Role snapshot"
            description="A light preview card keeps the current values visible before you save."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Location
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {form.location || 'No location added yet'}
                </p>
              </div>
              <div className="rounded-[18px] bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Status
                </p>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {String(form.status || 'open').replace(/^./, (char) => char.toUpperCase())}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
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

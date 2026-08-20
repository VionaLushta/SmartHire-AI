import Button from '../ui/Button';
import { toReadableLabel } from '../../utils/dashboard';

export default function JobFilters({
  filters,
  onChange,
  categories = [],
  departments = [],
  onReset,
}) {
  const filterOptions = [
    { key: 'category', label: 'Category', values: categories },
    { key: 'department', label: 'Department', values: departments },
    { key: 'employment_type', label: 'Employment type', values: ['Full-time', 'Part-time', 'Contract', 'Internship'] },
    { key: 'experience_level', label: 'Experience level', values: ['Entry', 'Mid', 'Senior', 'Lead'] },
    { key: 'remote_option', label: 'Work mode', values: ['Remote', 'Hybrid', 'On-site'] },
    { key: 'salary_band', label: 'Salary range', values: ['0-100000', '100000-150000', '150000+'] },
  ];

  return (
    <aside className="space-y-5 rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-slate-900">Filters</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-slate-500 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-white"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        {filterOptions.map(({ key, label, values }) => (
          <div key={key}>
            <label className="field-label">{label}</label>
            <select
              value={filters[key] ?? ''}
              onChange={(event) => onChange(key, event.target.value)}
              className="h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition duration-150 ease-out hover:border-[rgba(15,23,42,0.12)] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
            >
              <option value="">Any</option>
              {values.map((option) => {
                const labelText = typeof option === 'string' ? option : option.name;
                const valueText = typeof option === 'string' ? option : String(option.category_id ?? option.department_id ?? '');
                return (
                  <option key={valueText} value={valueText}>
                    {labelText}
                  </option>
                );
              })}
            </select>
          </div>
        ))}
      </div>

      <Button type="button" variant="primary" className="w-full" onClick={onReset}>
        Apply filters
      </Button>
    </aside>
  );
}

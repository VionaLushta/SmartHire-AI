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
    <aside className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-950">Filters</h2>
        <button type="button" onClick={onReset} className="text-sm font-medium text-slate-500 hover:text-slate-900">
          Reset
        </button>
      </div>

      <div className="space-y-4">
        {filterOptions.map(({ key, label, values }) => (
          <div key={key}>
            <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
            <select
              value={filters[key] ?? ''}
              onChange={(event) => onChange(key, event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
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

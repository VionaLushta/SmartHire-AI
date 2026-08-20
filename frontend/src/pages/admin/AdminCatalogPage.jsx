import { useMemo, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import EmptyState from '../../components/admin/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const catalog = [
  { id: 1, name: 'Product Management', type: 'Skill', category: 'Operations' },
  { id: 2, name: 'Python', type: 'Skill', category: 'Tech' },
  { id: 3, name: 'Engineering', type: 'Category', category: 'Core' },
  { id: 4, name: 'Marketing', type: 'Category', category: 'Growth' },
  { id: 5, name: 'People Ops', type: 'Category', category: 'HR' },
];

export default function AdminCatalogPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const filteredCatalog = useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalog.filter((item) => {
      const matchesType = filter === 'all' || item.type.toLowerCase() === filter;
      const matchesQuery = !term || `${item.name} ${item.category}`.toLowerCase().includes(term);
      return matchesType && matchesQuery;
    });
  }, [filter, query]);

  return (
    <AdminCard title="Catalog management" description="Manage skills and category taxonomy used across the platform.">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="pl-9" aria-label="Search catalog" placeholder="Search catalog" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="flex gap-2">
          <select aria-label="Filter catalog" value={filter} onChange={(event) => setFilter(event.target.value)} className="h-11 rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-3 text-[15px] text-slate-700 outline-none transition duration-150 ease-out hover:border-[rgba(15,23,42,0.12)] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10">
            <option value="all">All</option>
            <option value="skill">Skills</option>
            <option value="category">Categories</option>
          </select>
          <Button variant="primary" type="button">Create entry</Button>
        </div>
      </div>

      {filteredCatalog.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCatalog.map((item) => (
            <div key={item.id} className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{item.type}</span>
                <Button type="button" variant="ghost" size="sm" aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.category}</p>
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" size="sm" type="button">Edit</Button>
                <Button variant="ghost" size="sm" type="button">View</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No catalog entries match" description="Try a different keyword or type filter." />
      )}
    </AdminCard>
  );
}

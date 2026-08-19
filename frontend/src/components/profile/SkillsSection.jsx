import { Search, Sparkles, Trash2, PencilLine, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';

export default function SkillsSection({ skills = [], onAdd, onEdit, onDelete }) {
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const groups = {};
    skills.forEach((skill) => {
      const key = skill.category || 'General';
      if (!groups[key]) groups[key] = [];
      groups[key].push(skill);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [skills]);

  const filtered = useMemo(() => {
    if (!query.trim()) return grouped;
    const term = query.toLowerCase();
    return grouped
      .map(([category, items]) => [category, items.filter((item) => `${item.name} ${item.level}`.toLowerCase().includes(term))])
      .filter(([, items]) => items.length > 0);
  }, [grouped, query]);

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Skills</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Core capabilities</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              aria-label="Search skills"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search skills"
              className="pl-9"
            />
          </div>
          <Button variant="primary" size="sm" onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" /> Add skill
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {filtered.length ? (
          filtered.map(([category, items]) => (
            <div key={category}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{category}</h4>
                <span className="text-xs text-slate-500">{items.length} items</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {items.map((skill) => (
                  <div key={skill.id || skill.name} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
                    <Badge tone={skill.level === 'Expert' ? 'success' : skill.level === 'Advanced' ? 'warning' : 'neutral'}>{skill.level || 'Intermediate'}</Badge>
                    <span className="text-sm font-medium text-slate-800">{skill.name}</span>
                    <button
                      type="button"
                      aria-label={`Edit ${skill.name}`}
                      className="rounded-full p-1 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
                      onClick={() => onEdit?.(skill)}
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${skill.name}`}
                      className="rounded-full p-1 text-slate-500 transition hover:bg-rose-100 hover:text-rose-700"
                      onClick={() => onDelete?.(skill)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            <Sparkles className="mx-auto mb-2 h-5 w-5 text-slate-400" />
            No skills match your search yet.
          </div>
        )}
      </div>
    </section>
  );
}

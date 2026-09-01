import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Sparkles, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { classNames } from '../../utils/classNames';

function flattenSkillLibrary(library) {
  return library.flatMap((group) =>
    (group.skills || []).map((skill) => ({
      ...skill,
      category: skill.category || group.category || 'General',
    })),
  );
}

export default function SkillLibraryPicker({
  value,
  onChange,
  library = [],
  disabled = false,
}) {
  const containerRef = useRef(null);
  const [query, setQuery] = useState(value?.name || '');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value?.name || '');
  }, [value?.name]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const allSkills = useMemo(() => flattenSkillLibrary(library), [library]);

  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    return library
      .map((group) => {
        const skills = (group.skills || []).filter((skill) => {
          if (!term) return true;
          return (
            skill.name.toLowerCase().includes(term) ||
            (skill.category || group.category || '').toLowerCase().includes(term)
          );
        });
        return {
          ...group,
          skills,
        };
      })
      .filter((group) => group.skills.length);
  }, [library, query]);

  const exactMatch = useMemo(
    () => allSkills.some((skill) => skill.name.toLowerCase() === query.trim().toLowerCase()),
    [allSkills, query],
  );

  function selectSkill(skill) {
    onChange({
      name: skill.name,
      category: skill.category || '',
      source: 'library',
    });
    setQuery(skill.name);
    setOpen(false);
  }

  function createCustomSkill() {
    const name = query.trim();
    if (!name) return;
    onChange({
      name,
      category: '',
      source: 'custom',
    });
    setQuery(name);
    setOpen(false);
  }

  function clearSelection() {
    onChange({
      name: '',
      category: '',
      source: 'library',
    });
    setQuery('');
    setOpen(true);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-2 block text-sm font-medium text-slate-700">Search skill</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search a skill or type to create a custom one"
          disabled={disabled}
          className="pl-9 pr-10"
        />
        <button
          type="button"
          aria-label="Toggle skill suggestions"
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[12px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          onClick={() => setOpen((current) => !current)}
          disabled={disabled}
        >
          <ChevronDown className={classNames('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
          {value?.name ? `Selected: ${value.name}` : 'No skill selected'}
        </span>
        {value?.category ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
            {value.category}
          </span>
        ) : null}
        {value?.source === 'custom' ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
            Custom skill
          </span>
        ) : null}
        {value?.name ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={clearSelection}
            disabled={disabled}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </Button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
          <div className="max-h-72 overflow-y-auto">
            {filteredGroups.length ? (
              filteredGroups.map((group) => (
                <div key={group.category} className="border-b border-slate-100 last:border-b-0">
                  <div className="sticky top-0 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {group.category}
                  </div>
                  <div className="grid gap-1 p-2">
                    {group.skills.map((skill) => {
                      const selected = skill.name.toLowerCase() === value?.name?.toLowerCase();
                      return (
                        <button
                          key={skill.skill_id}
                          type="button"
                          className={classNames(
                            'flex items-center justify-between rounded-[14px] px-3 py-2 text-left text-sm transition hover:bg-slate-50',
                            selected && 'bg-slate-50 text-slate-950',
                          )}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            selectSkill(skill);
                          }}
                        >
                          <span>
                            <span className="block font-medium text-slate-900">{skill.name}</span>
                            <span className="block text-xs text-slate-500">{skill.category || group.category}</span>
                          </span>
                          {selected ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-slate-500">
                No predefined skills match your search.
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 p-3">
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="primary"
                className="w-full justify-center"
                onMouseDown={(event) => {
                  event.preventDefault();
                  createCustomSkill();
                }}
                disabled={disabled || !query.trim() || exactMatch}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Create custom skill
              </Button>
              <p className="text-xs leading-5 text-slate-500">
                Select a predefined skill from the library, or create a custom one if it is missing.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {value?.source === 'custom' ? (
        <div className="mt-4">
          <Input
            label="Custom category"
            value={value.category || ''}
            onChange={(event) =>
              onChange({
                ...value,
                category: event.target.value,
                source: 'custom',
              })
            }
            placeholder="Backend, Operations, Design..."
            disabled={disabled}
            required
          />
        </div>
      ) : value?.category ? (
        <div className="mt-4 rounded-[16px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Category: <span className="font-medium text-slate-950">{value.category}</span>
        </div>
      ) : null}
    </div>
  );
}


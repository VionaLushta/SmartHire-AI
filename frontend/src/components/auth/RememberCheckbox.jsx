export default function RememberCheckbox({ checked, onChange, name = 'rememberMe' }) {
  return (
    <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-900"
      />
      Remember me
    </label>
  );
}

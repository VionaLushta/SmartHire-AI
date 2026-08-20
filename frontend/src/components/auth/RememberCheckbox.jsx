export default function RememberCheckbox({ checked, onChange, name = 'rememberMe' }) {
  return (
    <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-600">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-[rgba(15,23,42,0.12)] bg-white text-[#2563eb] focus:ring-[#2563eb]"
      />
      Remember me
    </label>
  );
}

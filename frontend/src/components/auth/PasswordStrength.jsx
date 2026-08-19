function getStrength(password) {
  if (!password) {
    return { score: 0, label: 'Enter a password', tone: 'slate' };
  }

  let score = 0;

  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, label: 'Weak', tone: 'rose' };
  if (score === 2) return { score, label: 'Fair', tone: 'amber' };
  if (score === 3) return { score, label: 'Good', tone: 'sky' };
  return { score, label: 'Strong', tone: 'emerald' };
}

export default function PasswordStrength({ password }) {
  const strength = getStrength(password);
  const bars = [0, 1, 2, 3];

  const toneClasses = {
    slate: 'bg-slate-200 dark:bg-slate-800',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    sky: 'bg-sky-500',
    emerald: 'bg-emerald-500',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
        <span>Password strength</span>
        <span>{strength.label}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {bars.map((bar) => (
          <span
            key={bar}
            className={[
              'h-2 rounded-full transition',
              bar < strength.score ? toneClasses[strength.tone] : 'bg-slate-200 dark:bg-slate-800',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

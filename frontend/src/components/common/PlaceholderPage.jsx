import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';

export default function PlaceholderPage({
  title,
  subtitle,
  eyebrow = 'SmartHire AI',
  actionLabel = 'Go home',
  actionTo = '/',
}) {
  return (
    <section className="mx-auto flex min-h-[40vh] max-w-2xl flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">{eyebrow}</p>
      <h1 className="mt-3 text-[48px] font-extrabold tracking-[-0.05em] text-slate-950">{title}</h1>
      <p className="mt-3 text-[16px] font-medium leading-7 text-slate-500">{subtitle}</p>
      <Button as={Link} to={actionTo} variant="primary" className="mt-6">
        {actionLabel}
      </Button>
    </section>
  );
}

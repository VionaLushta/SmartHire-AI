import { CircleDashed } from 'lucide-react';
import Card from './Card';

export default function EmptyState({
  title = 'Nothing here yet',
  description = 'Content will appear here later.',
  icon: Icon = CircleDashed,
  action,
  secondaryAction,
}) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 text-slate-700">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-[24px] font-bold tracking-[-0.04em] text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      {action || secondaryAction ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {secondaryAction}
          {action}
        </div>
      ) : null}
    </Card>
  );
}

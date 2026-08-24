import { TriangleAlert } from 'lucide-react';
import Card from './Card';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again later.',
  action,
  retryLabel = 'Try again',
  onRetry,
}) {
  return (
    <Card className="p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] border border-rose-200 bg-rose-50 text-rose-700">
        <TriangleAlert className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-[24px] font-bold tracking-[-0.04em] text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      {action || onRetry ? (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {action}
          {onRetry ? (
            <Button variant="primary" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

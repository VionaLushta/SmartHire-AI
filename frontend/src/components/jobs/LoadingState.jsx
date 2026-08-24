import LoadingSpinner from '../ui/LoadingSpinner';
import Card from '../ui/Card';

export default function LoadingState({
  title = 'Loading',
  description = 'Please wait while the latest data is prepared.',
}) {
  return (
    <Card className="flex min-h-[30vh] items-center justify-center p-8">
      <div className="text-center">
        <LoadingSpinner label={title} />
        <p className="mt-3 text-sm text-slate-500">{description}</p>
      </div>
    </Card>
  );
}

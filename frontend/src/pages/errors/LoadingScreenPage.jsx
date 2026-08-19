import { DashboardSkeleton } from '../../components/ui/Skeleton';

export default function LoadingScreenPage() {
  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950 lg:min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-6xl">
        <DashboardSkeleton />
      </div>
    </div>
  );
}

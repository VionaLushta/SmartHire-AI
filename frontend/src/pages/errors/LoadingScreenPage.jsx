import { DashboardSkeleton } from '../../components/ui/Skeleton';
import BrandLockup from '../../components/brand/BrandLockup';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function LoadingScreenPage() {
  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-transparent px-4 py-8 lg:min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-center">
          <BrandLockup linkTo="/" subtitle="Loading SmartHire AI" className="px-0 py-0" />
        </div>
        <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Preparing workspace</p>
              <p className="mt-2 text-sm text-slate-500">Loading dashboard data, analytics, and navigation state.</p>
            </div>
            <LoadingSpinner label="Loading" size="sm" />
          </div>
          <DashboardSkeleton />
        </div>
      </div>
    </div>
  );
}

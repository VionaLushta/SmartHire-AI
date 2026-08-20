import { DashboardSkeleton } from '../../components/ui/Skeleton';
import BrandLockup from '../../components/brand/BrandLockup';

export default function LoadingScreenPage() {
  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center bg-transparent px-4 py-8 lg:min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-center">
          <BrandLockup linkTo="/" subtitle="Loading SmartHire AI" className="px-0 py-0" />
        </div>
        <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
          <DashboardSkeleton />
        </div>
      </div>
    </div>
  );
}

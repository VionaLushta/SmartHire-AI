import { classNames } from '../../utils/classNames';

function SkeletonLine({ className, width = 'w-full' }) {
  return <div className={classNames('animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-700/80', width, className)} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="space-y-4">
        <SkeletonLine className="h-4 w-24" />
        <SkeletonLine className="h-8 w-2/3" />
        <SkeletonLine className="h-4 w-full" />
        <SkeletonLine className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="grid grid-cols-4 gap-4">
          <SkeletonLine className="h-4 w-20" />
          <SkeletonLine className="h-4 w-24" />
          <SkeletonLine className="h-4 w-20" />
          <SkeletonLine className="h-4 w-20" />
        </div>
      </div>
      <div className="space-y-4 p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid grid-cols-4 gap-4">
            <SkeletonLine className="h-10 w-full" />
            <SkeletonLine className="h-10 w-full" />
            <SkeletonLine className="h-10 w-full" />
            <SkeletonLine className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <SkeletonLine className="mb-6 h-6 w-36" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <SkeletonLine className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <SkeletonLine className="h-4 w-1/2" />
                  <SkeletonLine className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center gap-4">
          <SkeletonLine className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-3">
            <SkeletonLine className="h-6 w-40" />
            <SkeletonLine className="h-4 w-56" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function ResumeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/80">
        <SkeletonLine className="mb-6 h-6 w-40" />
        <div className="space-y-4">
          <SkeletonLine className="h-48 w-full rounded-[1.5rem]" />
          <SkeletonLine className="h-12 w-1/3 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function JobSkeleton() {
  return (
    <div className="space-y-5">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center justify-between gap-4">
            <SkeletonLine className="h-6 w-52" />
            <SkeletonLine className="h-8 w-24 rounded-full" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/80">
          <SkeletonLine className="mb-5 h-6 w-36" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <SkeletonLine className="h-4 w-20" />
                <SkeletonLine className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <CardSkeleton />
      </div>
    </div>
  );
}

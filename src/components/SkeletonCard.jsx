import { Skeleton } from '../ui/Primitives';

export function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl"
    >
      <Skeleton className="aspect-[2/3] rounded-2xl" />
      <div className="mt-4 space-y-2 px-1">
        <Skeleton className="h-4 w-4/5 rounded-full" />
        <Skeleton className="h-3 w-1/2 rounded-full" />
        <Skeleton className="mt-3 h-3 w-2/5 rounded-full" />
      </div>
    </div>
  );
}

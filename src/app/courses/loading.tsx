import { SkeletonCard } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <div className="mb-8 space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-navy-100" />
        <div className="h-8 w-64 animate-pulse rounded bg-navy-100" />
        <div className="h-3 w-full max-w-xl animate-pulse rounded bg-navy-50" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

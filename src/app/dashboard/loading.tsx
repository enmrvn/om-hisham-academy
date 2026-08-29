import { SkeletonCard } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-8 h-9 w-56 animate-pulse rounded bg-navy-100" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

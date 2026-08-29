import Link from "next/link";
import { cn } from "@/components/ui";

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "qudurat", label: "القدرات" },
  { key: "tahsili", label: "التحصيلي" },
  { key: "completed", label: "المكتمل" },
  { key: "incomplete", label: "غير المكتمل" },
] as const;

export default function CourseFilters({
  active,
  counts,
}: {
  active: string;
  counts: Record<string, number>;
}) {
  return (
    <div
      className="thin-scrollbar flex gap-2 overflow-x-auto pb-1"
      role="group"
      aria-label="تصفية الملفات"
    >
      {FILTERS.map((f) => {
        const isActive = active === f.key;
        return (
          <Link
            key={f.key}
            href={f.key === "all" ? "/courses" : `/courses?filter=${f.key}`}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-navy-700 bg-navy-700 text-white"
                : "border-navy-200 bg-white text-navy-600 hover:border-navy-300 hover:bg-navy-50",
            )}
          >
            {f.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs",
                isActive ? "bg-white/20" : "bg-navy-50 text-navy-400",
              )}
            >
              {counts[f.key] ?? 0}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

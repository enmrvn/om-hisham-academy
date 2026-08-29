import Link from "next/link";
import { Badge, LinkButton, ProgressBar, cn } from "@/components/ui";
import { CATEGORY_LABELS, accentOf } from "@/lib/constants";
import type { Course } from "@/lib/types";

export default function CourseCard({
  course,
  progress = 0,
  isAuthed = false,
}: {
  course: Course;
  progress?: number;
  isAuthed?: boolean;
}) {
  const accent = accentOf(course.accent);
  const done = progress >= 100;

  // نمرّر اللون كـ tone وليس className حتى لا تتعارض أدوات Tailwind فيما بينها
  const accentTone = (["navy", "teal", "lavender", "beige"].includes(course.accent)
    ? course.accent
    : "navy") as "navy" | "teal" | "lavender" | "beige";

  return (
    <article
      className={cn(
        "surface-card group flex flex-col overflow-hidden p-0 transition-shadow hover:shadow-md",
        accent.ring,
      )}
    >
      <div aria-hidden className={cn("h-1.5 w-full", accent.bar)} />

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone={accentTone}>{CATEGORY_LABELS[course.category]}</Badge>
          <Badge tone="neutral">٥ محاضرات</Badge>
          {course.page_count && (
            <Badge tone="neutral">{course.page_count} صفحة</Badge>
          )}
          {done && <Badge tone="success">مكتمل</Badge>}
        </div>

        <h3 className="mb-2 text-lg font-bold leading-8 text-navy-900">
          <Link href={`/courses/${course.id}`} className="hover:text-teal-700">
            {course.title}
          </Link>
        </h3>

        <p className="mb-6 line-clamp-3 flex-1 text-sm leading-7 text-navy-500">
          {course.description}
        </p>

        {isAuthed && (
          <div className="mb-5">
            <ProgressBar value={progress} label="تقدّمك في هذا الملف" />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/courses/${course.id}`} size="sm" className="flex-1">
            فتح الملف
          </LinkButton>
          <LinkButton
            href={`/quizzes?course=${course.id}`}
            variant="soft"
            size="sm"
            className="flex-1"
          >
            بدء الاختبار
          </LinkButton>
        </div>
      </div>
    </article>
  );
}

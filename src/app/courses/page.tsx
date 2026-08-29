import type { Metadata } from "next";
import { EmptyState, LinkButton, SectionTitle } from "@/components/ui";
import CourseCard from "@/components/courses/CourseCard";
import CourseFilters from "@/components/courses/CourseFilters";
import { getCourses, getMyProgressMap } from "@/lib/queries";
import { getProfile } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "الملفات والمحاضرات",
  description: "ملفات محاضرات القدرات والتحصيلي مرتبة بتسلسل تعليمي واضح.",
};

type Filter = "all" | "qudurat" | "tahsili" | "completed" | "incomplete";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const filter = (rawFilter ?? "all") as Filter;

  const [courses, progress, profile] = await Promise.all([
    getCourses(),
    getMyProgressMap(),
    getProfile(),
  ]);

  const percentOf = (id: string) => progress[id]?.progress_percent ?? 0;

  const visible = courses.filter((c) => {
    switch (filter) {
      case "qudurat":
        return c.category === "qudurat";
      case "tahsili":
        return c.category === "tahsili";
      case "completed":
        return percentOf(c.id) >= 100;
      case "incomplete":
        return percentOf(c.id) < 100;
      default:
        return true;
    }
  });

  const counts = {
    all: courses.length,
    qudurat: courses.filter((c) => c.category === "qudurat").length,
    tahsili: courses.filter((c) => c.category === "tahsili").length,
    completed: courses.filter((c) => percentOf(c.id) >= 100).length,
    incomplete: courses.filter((c) => percentOf(c.id) < 100).length,
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <SectionTitle
        eyebrow="المحتوى التعليمي"
        title="الملفات والمحاضرات"
        description="كل ملف يحتوي خمس محاضرات متسلسلة. افتح الملف لتقرأ المحاضرات داخل المنصة، أو ابدأ اختبارًا مباشرة لقياس مستواك."
      />

      <div className="mt-8">
        <CourseFilters active={filter} counts={counts} />
      </div>

      {!profile && (
        <p className="mt-6 rounded-xl border border-lavender-200 bg-lavender-50 px-4 py-3 text-sm leading-7 text-navy-700">
          يمكنك تصفّح الملفات الآن.{" "}
          <a href="/signup" className="font-bold text-teal-700 underline">
            أنشئ حسابًا مجانيًا
          </a>{" "}
          لتتابع تقدّمك وتحفظ درجاتك في الاختبارات.
        </p>
      )}

      {visible.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="لا توجد ملفات ضمن هذا التصنيف"
            description={
              filter === "tahsili"
                ? "الملفات المرفوعة حاليًا كلها ضمن قسم القدرات. ستُضاف ملفات التحصيلي قريبًا بإذن الله."
                : filter === "completed"
                  ? "لم تُكمل أي ملف بعد. أكمل محاضرات الملف كاملة ليظهر هنا."
                  : "جرّب تصنيفًا آخر."
            }
            action={
              <LinkButton href="/courses" variant="soft" size="sm">
                عرض كل الملفات
              </LinkButton>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
          {visible.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              progress={percentOf(course.id)}
              isAuthed={!!profile}
            />
          ))}
        </div>
      )}

      {profile?.role === "admin" && (
        <div className="mt-10 rounded-xl border border-dashed border-navy-200 bg-white p-6 text-center">
          <p className="mb-3 text-sm text-navy-500">
            هل تريدين إضافة ملف محاضرات جديد؟ يمكنك رفعه وتسمية محاضراته الخمس من
            لوحة المدربة.
          </p>
          <LinkButton href="/admin/courses" variant="secondary" size="sm">
            إدارة الملفات
          </LinkButton>
        </div>
      )}
    </div>
  );
}

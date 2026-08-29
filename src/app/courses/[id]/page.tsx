import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, LinkButton, ProgressBar, Alert } from "@/components/ui";
import CourseReader from "@/components/courses/CourseReader";
import { CATEGORY_LABELS } from "@/lib/constants";
import {
  getCourse,
  getCourseScores,
  getLectures,
  getMyProgressMap,
  getPublishedQuizzes,
} from "@/lib/queries";
import { getSignedPdfUrl } from "@/lib/storage";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const course = await getCourse(id);
  return {
    title: course?.title ?? "الملف",
    description: course?.description ?? undefined,
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const course = await getCourse(id);
  if (!course) notFound();

  const [lectures, user, quizzes] = await Promise.all([
    getLectures(course.id),
    getCurrentUser(),
    getPublishedQuizzes(course.id),
  ]);

  const [pdfUrl, progressMap, scores] = await Promise.all([
    getSignedPdfUrl(course.pdf_path),
    getMyProgressMap(),
    getCourseScores(course.id),
  ]);

  // المحاضرات التي أتمّها الطالب
  let completedIds: string[] = [];
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("student_progress")
      .select("lecture_id")
      .eq("student_id", user.id)
      .eq("course_id", course.id)
      .eq("is_completed", true);
    completedIds = (data ?? []).map((r) => r.lecture_id as string);
  }

  const percent = progressMap[course.id]?.progress_percent ?? 0;
  const courseQuiz = quizzes.find((q) => !q.lecture_id) ?? quizzes[0] ?? null;

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      {/* مسار التنقّل */}
      <nav aria-label="مسار التنقل" className="mb-6 text-sm text-navy-400">
        <Link href="/courses" className="hover:text-teal-600">
          الملفات
        </Link>
        <span className="mx-2">/</span>
        <span className="text-navy-600">{course.title}</span>
      </nav>

      {/* رأس الصفحة */}
      <header className="surface-card mb-8 p-7">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge tone="navy">{CATEGORY_LABELS[course.category]}</Badge>
          <Badge tone="neutral">{lectures.length} محاضرات</Badge>
          {course.page_count && (
            <Badge tone="neutral">{course.page_count} صفحة</Badge>
          )}
        </div>

        <h1 className="text-2xl font-bold leading-9 text-navy-900 sm:text-3xl">
          {course.title}
        </h1>

        {course.description && (
          <p className="prose-arabic mt-4 max-w-3xl">{course.description}</p>
        )}

        <div className="mt-7 grid gap-5 border-t border-navy-100 pt-6 md:grid-cols-3">
          {/* التقدم */}
          <div>
            <ProgressBar value={percent} label="تقدّمك في الملف" />
            <p className="mt-2 text-xs text-navy-400">
              {user
                ? `${completedIds.length} من ${lectures.length} محاضرة مكتملة`
                : "سجّل الدخول ليُحفظ تقدّمك"}
            </p>
          </div>

          {/* الدرجات */}
          <div className="grid grid-cols-2 gap-3">
            <ScoreTile label="آخر درجة" value={scores.last} />
            <ScoreTile label="أفضل درجة" value={scores.best} tone="teal" />
          </div>

          {/* الأزرار */}
          <div className="flex flex-wrap items-start gap-2 md:justify-end">
            {courseQuiz ? (
              <LinkButton href={`/quizzes/${courseQuiz.id}`} size="sm">
                ابدأ اختبار الملف
              </LinkButton>
            ) : (
              <LinkButton href={`/quizzes?course=${course.id}`} size="sm">
                ابدأ اختبار الملف
              </LinkButton>
            )}
            <LinkButton
              href={`/quizzes?course=${course.id}`}
              variant="soft"
              size="sm"
            >
              اختبر نفسك في محاضرة محددة
            </LinkButton>
          </div>
        </div>
      </header>

      {lectures.length === 0 ? (
        <Alert tone="warning" title="لا توجد محاضرات بعد">
          لم تُضف محاضرات لهذا الملف. يمكن للمدربة إضافتها من لوحة المدربة.
        </Alert>
      ) : (
        <CourseReader
          courseId={course.id}
          lectures={lectures}
          pdfUrl={pdfUrl}
          completedIds={completedIds}
          isAuthed={!!user}
        />
      )}

      {/* اختبارات هذا الملف */}
      {quizzes.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-navy-900">
            اختبارات هذا الملف
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((q) => (
              <Card key={q.id} className="flex flex-col">
                <h3 className="mb-2 font-bold leading-7 text-navy-900">
                  {q.title}
                </h3>
                {q.description && (
                  <p className="mb-4 line-clamp-2 flex-1 text-sm leading-7 text-navy-500">
                    {q.description}
                  </p>
                )}
                <div className="mb-4 flex flex-wrap gap-2">
                  {q.time_limit_minutes && (
                    <Badge tone="beige">{q.time_limit_minutes} دقيقة</Badge>
                  )}
                  {q.source === "ai" && <Badge tone="lavender">مولّد بالذكاء الاصطناعي</Badge>}
                </div>
                <LinkButton href={`/quizzes/${q.id}`} size="sm" variant="secondary">
                  ابدأ الاختبار
                </LinkButton>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ScoreTile({
  label,
  value,
  tone = "navy",
}: {
  label: string;
  value: number | null;
  tone?: "navy" | "teal";
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 ${tone === "teal" ? "bg-teal-50" : "bg-navy-50"}`}
    >
      <p className="text-xs text-navy-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-navy-800">
        {value === null ? "—" : `${Math.round(value)}٪`}
      </p>
    </div>
  );
}

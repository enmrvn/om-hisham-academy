import type { Metadata } from "next";
import Link from "next/link";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  SectionTitle,
  cn,
} from "@/components/ui";
import { DIFFICULTY_LABELS } from "@/lib/constants";
import { getAllLectures, getCourses, getMyAttempts, getPublishedQuizzes } from "@/lib/queries";
import { getProfile } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "الاختبارات",
  description: "اختبارات إلكترونية للقدرات والتحصيلي مع تصحيح فوري وشرح لكل إجابة.",
};

export default async function QuizzesPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; lecture?: string }>;
}) {
  const { course: courseId, lecture: lectureId } = await searchParams;

  const [courses, lectures, quizzes, attempts, profile] = await Promise.all([
    getCourses(),
    getAllLectures(),
    getPublishedQuizzes(courseId),
    getMyAttempts(200),
    getProfile(),
  ]);

  const visible = lectureId
    ? quizzes.filter((q) => q.lecture_id === lectureId)
    : quizzes;

  // أفضل درجة لكل اختبار
  const bestByQuiz = new Map<string, number>();
  for (const a of attempts) {
    const prev = bestByQuiz.get(a.quiz_id) ?? -1;
    if (Number(a.score) > prev) bestByQuiz.set(a.quiz_id, Number(a.score));
  }

  const courseLectures = courseId
    ? lectures.filter((l) => l.course_id === courseId)
    : [];

  const lectureTitle = (id: string | null) =>
    id ? (lectures.find((l) => l.id === id)?.title ?? null) : null;
  const courseTitle = (id: string | null) =>
    id ? (courses.find((c) => c.id === id)?.title ?? null) : null;

  return (
    <div className="mx-auto max-w-6xl px-5 py-14">
      <SectionTitle
        eyebrow="اختبر نفسك"
        title="الاختبارات الإلكترونية"
        description="اختر ملفًا أو محاضرة محددة. كل اختبار يُصحَّح فور تسليمه، ويعرض لك شرحًا مكتوبًا لكل سؤال — صحيحًا كان أم خاطئًا."
      />

      {/* اختيار الملف */}
      <div className="mt-8 space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-navy-700">اختر الملف</p>
          <div className="thin-scrollbar flex gap-2 overflow-x-auto pb-1">
            <FilterPill href="/quizzes" active={!courseId} label="كل الملفات" />
            {courses.map((c) => (
              <FilterPill
                key={c.id}
                href={`/quizzes?course=${c.id}`}
                active={courseId === c.id}
                label={c.title.split("—")[0].trim()}
              />
            ))}
          </div>
        </div>

        {/* اختيار المحاضرة داخل الملف */}
        {courseId && courseLectures.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-navy-700">
              أو حدّد محاضرة بعينها
            </p>
            <div className="thin-scrollbar flex gap-2 overflow-x-auto pb-1">
              <FilterPill
                href={`/quizzes?course=${courseId}`}
                active={!lectureId}
                label="كل المحاضرات"
              />
              {courseLectures.map((l) => (
                <FilterPill
                  key={l.id}
                  href={`/quizzes?course=${courseId}&lecture=${l.id}`}
                  active={lectureId === l.id}
                  label={`${l.lecture_number}. ${l.title}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* النتائج */}
      {visible.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="لا توجد اختبارات منشورة ضمن هذا الاختيار"
            description={
              profile?.role === "admin"
                ? "يمكنك إنشاء اختبار الآن من لوحة المدربة — يدويًا أو بتوليده من ملف الـ PDF عبر «إنشاء اختبار ذكي»."
                : "الاختبارات تُضاف تباعًا. جرّب ملفًا آخر، أو تصفّح المحاضرات وارجع لاحقًا."
            }
            action={
              profile?.role === "admin" ? (
                <LinkButton href="/admin/ai-quiz" variant="secondary" size="sm">
                  إنشاء اختبار ذكي
                </LinkButton>
              ) : (
                <LinkButton href="/courses" variant="soft" size="sm">
                  تصفّح المحاضرات
                </LinkButton>
              )
            }
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((quiz) => {
            const best = bestByQuiz.get(quiz.id);
            return (
              <Card key={quiz.id} className="flex flex-col">
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge tone="navy">{DIFFICULTY_LABELS[quiz.difficulty]}</Badge>
                  {quiz.time_limit_minutes && (
                    <Badge tone="beige">{quiz.time_limit_minutes} دقيقة</Badge>
                  )}
                  {best !== undefined && (
                    <Badge tone="success">أفضل درجة {Math.round(best)}٪</Badge>
                  )}
                </div>

                <h3 className="mb-2 font-bold leading-7 text-navy-900">
                  {quiz.title}
                </h3>

                {quiz.description && (
                  <p className="mb-3 line-clamp-2 flex-1 text-sm leading-7 text-navy-500">
                    {quiz.description}
                  </p>
                )}

                <p className="mb-4 text-xs text-navy-400">
                  {lectureTitle(quiz.lecture_id) ??
                    courseTitle(quiz.course_id) ??
                    "اختبار عام"}
                </p>

                <LinkButton href={`/quizzes/${quiz.id}`} size="sm">
                  {best !== undefined ? "إعادة المحاولة" : "ابدأ الاختبار"}
                </LinkButton>
              </Card>
            );
          })}
        </div>
      )}

      {!profile && (
        <p className="mt-8 rounded-xl border border-lavender-200 bg-lavender-50 px-4 py-3 text-center text-sm leading-7 text-navy-700">
          <Link href="/login" className="font-bold text-teal-700 underline">
            سجّل الدخول
          </Link>{" "}
          لتُحفظ درجاتك وتظهر لك أفضل نتائجك في كل اختبار.
        </p>
      )}
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-navy-700 bg-navy-700 text-white"
          : "border-navy-200 bg-white text-navy-600 hover:border-navy-300 hover:bg-navy-50",
      )}
    >
      {label}
    </Link>
  );
}

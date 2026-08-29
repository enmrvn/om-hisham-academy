import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  LinkButton,
  ProgressBar,
} from "@/components/ui";
import { TUTOR } from "@/lib/constants";
import {
  getCourses,
  getMyAttempts,
  getMyProgressMap,
  getPublishedQuizzes,
  getRecentLectures,
} from "@/lib/queries";
import { getProfile } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "لوحتي" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/dashboard");

  const { error } = await searchParams;

  const [courses, progressMap, attempts, recent, quizzes] = await Promise.all([
    getCourses(),
    getMyProgressMap(),
    getMyAttempts(50),
    getRecentLectures(4),
    getPublishedQuizzes(),
  ]);

  // عناوين الاختبارات للمحاولات الأخيرة
  const quizTitles = new Map<string, string>();
  if (attempts.length > 0) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("quizzes")
      .select("id, title")
      .in("id", [...new Set(attempts.map((a) => a.quiz_id))]);
    for (const q of data ?? []) quizTitles.set(q.id, q.title);
  }

  const lastAttempt = attempts[0] ?? null;
  const bestScore =
    attempts.length > 0 ? Math.max(...attempts.map((a) => Number(a.score))) : null;

  // الملفات التي بدأها الطالب
  const started = courses.filter((c) => (progressMap[c.id]?.progress_percent ?? 0) > 0);

  // التوصية: أول ملف لم يكتمل، وإلا أول اختبار لم يُجرَّب
  const nextCourse =
    courses.find((c) => {
      const p = progressMap[c.id]?.progress_percent ?? 0;
      return p > 0 && p < 100;
    }) ?? courses.find((c) => (progressMap[c.id]?.progress_percent ?? 0) === 0);

  const triedQuizIds = new Set(attempts.map((a) => a.quiz_id));
  const nextQuiz = quizzes.find((q) => !triedQuizIds.has(q.id)) ?? null;

  const firstName = (profile.full_name || "").split(" ")[0] || "بك";

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      {error === "admin-only" && (
        <div className="mb-6">
          <Alert tone="warning" title="صفحة مخصّصة للمدربة">
            لوحة المدربة متاحة لحساب المدربة فقط.
          </Alert>
        </div>
      )}

      {/* ترحيب */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-navy-900 sm:text-3xl">
          أهلًا {firstName} 👋
        </h1>
        <p className="mt-3 max-w-2xl leading-8 text-navy-500">
          {started.length === 0
            ? "لم تبدأ بعد. ابدأ بالملف الأول، وخذ وقتك في كل فكرة — التأسيس أولًا."
            : "هذه صورة سريعة عن تقدّمك. تابع من حيث توقفت، ولا تستعجل."}
        </p>
      </header>

      {/* الأرقام */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-navy-400">آخر درجة</p>
          <p className="mt-1 text-3xl font-bold text-navy-900">
            {lastAttempt ? `${Math.round(Number(lastAttempt.score))}٪` : "—"}
          </p>
          {lastAttempt && (
            <p className="mt-1 truncate text-xs text-navy-400">
              {quizTitles.get(lastAttempt.quiz_id) ?? "اختبار"}
            </p>
          )}
        </Card>

        <Card>
          <p className="text-xs text-navy-400">أفضل درجة</p>
          <p className="mt-1 text-3xl font-bold text-teal-700">
            {bestScore !== null ? `${Math.round(bestScore)}٪` : "—"}
          </p>
          <p className="mt-1 text-xs text-navy-400">
            من {attempts.length} محاولة
          </p>
        </Card>

        <Card>
          <p className="text-xs text-navy-400">ملفات قيد الدراسة</p>
          <p className="mt-1 text-3xl font-bold text-navy-900">{started.length}</p>
          <p className="mt-1 text-xs text-navy-400">
            من أصل {courses.length} ملفات
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* الملفات وتقدّمها */}
          <section>
            <h2 className="mb-4 text-lg font-bold text-navy-900">
              تقدّمك في الملفات
            </h2>

            {courses.length === 0 ? (
              <EmptyState title="لا توجد ملفات متاحة حاليًا" />
            ) : (
              <div className="space-y-3">
                {courses.map((c) => {
                  const p = progressMap[c.id];
                  const percent = p?.progress_percent ?? 0;

                  return (
                    <Card key={c.id}>
                      <div className="mb-3 flex flex-wrap items-start gap-2">
                        <h3 className="min-w-0 flex-1 font-medium leading-7 text-navy-900">
                          <Link
                            href={`/courses/${c.id}`}
                            className="hover:text-teal-700"
                          >
                            {c.title}
                          </Link>
                        </h3>
                        {percent >= 100 && <Badge tone="success">مكتمل</Badge>}
                        {percent === 0 && <Badge tone="neutral">لم يبدأ</Badge>}
                      </div>

                      <ProgressBar
                        value={percent}
                        label={
                          p
                            ? `${p.completed_lectures} من ${p.total_lectures} محاضرة`
                            : "٠ من ٥ محاضرات"
                        }
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        <LinkButton href={`/courses/${c.id}`} size="sm" variant="ghost">
                          {percent > 0 ? "تابع" : "ابدأ"}
                        </LinkButton>
                        <LinkButton
                          href={`/quizzes?course=${c.id}`}
                          size="sm"
                          variant="ghost"
                        >
                          اختبر نفسك
                        </LinkButton>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* آخر المحاولات */}
          <section>
            <h2 className="mb-4 text-lg font-bold text-navy-900">
              آخر اختباراتك
            </h2>

            {attempts.length === 0 ? (
              <EmptyState
                title="لم تخض أي اختبار بعد"
                description="الاختبار ليس حكمًا عليك — هو طريقة لتعرف أين تحتاج مراجعة. ابدأ بأي اختبار وستفهم قصدي."
                action={
                  <LinkButton href="/quizzes" variant="secondary" size="sm">
                    ابدأ أول اختبار
                  </LinkButton>
                }
              />
            ) : (
              <Card padded={false}>
                <ul className="divide-y divide-navy-100">
                  {attempts.slice(0, 6).map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-6 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-navy-800">
                          {quizTitles.get(a.quiz_id) ?? "اختبار"}
                        </p>
                        <p className="text-xs text-navy-400">
                          {a.correct_count} من {a.total_count} إجابة صحيحة ·{" "}
                          {new Date(a.completed_at).toLocaleDateString("ar-SA")}
                        </p>
                      </div>
                      <Badge tone={Number(a.score) >= 60 ? "success" : "danger"}>
                        {Math.round(Number(a.score))}٪
                      </Badge>
                      <LinkButton
                        href={`/quizzes/${a.quiz_id}`}
                        size="sm"
                        variant="ghost"
                      >
                        إعادة
                      </LinkButton>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </div>

        {/* العمود الجانبي */}
        <aside className="space-y-5">
          {/* التوصية */}
          <Card className="bg-navy-700 text-white">
            <p className="mb-1 text-xs text-navy-200">الخطوة التالية المقترحة</p>

            {nextCourse ? (
              <>
                <h3 className="mb-2 font-bold leading-7">{nextCourse.title}</h3>
                <p className="mb-4 text-sm leading-7 text-navy-100">
                  {(progressMap[nextCourse.id]?.progress_percent ?? 0) > 0
                    ? "أكمل ما تبقى من محاضرات هذا الملف قبل الانتقال إلى غيره."
                    : "هذا هو الملف التالي في التسلسل. ابدأ به."}
                </p>
                <LinkButton
                  href={`/courses/${nextCourse.id}`}
                  size="sm"
                  variant="inverse"
                >
                  افتح الملف
                </LinkButton>
              </>
            ) : nextQuiz ? (
              <>
                <h3 className="mb-2 font-bold leading-7">{nextQuiz.title}</h3>
                <p className="mb-4 text-sm leading-7 text-navy-100">
                  أكملت كل الملفات. جرّب هذا الاختبار لتثبيت ما تعلّمته.
                </p>
                <LinkButton
                  href={`/quizzes/${nextQuiz.id}`}
                  size="sm"
                  variant="inverse"
                >
                  ابدأ الاختبار
                </LinkButton>
              </>
            ) : (
              <p className="text-sm leading-7 text-navy-100">
                أنهيت كل المتاح حاليًا. أحسنت — راجع أضعف اختباراتك حتى تُضاف
                ملفات جديدة.
              </p>
            )}
          </Card>

          {/* آخر ما شاهدت */}
          <Card>
            <h3 className="mb-4 font-bold text-navy-900">آخر ما شاهدت</h3>

            {recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-navy-400">
                لم تفتح أي محاضرة بعد.
              </p>
            ) : (
              <ul className="space-y-3">
                {recent.map((r, i) =>
                  r.lecture && r.course ? (
                    <li key={`${r.lecture.id}-${i}`}>
                      <Link
                        href={`/courses/${r.course.id}`}
                        className="group block"
                      >
                        <p className="text-sm font-medium leading-6 text-navy-800 group-hover:text-teal-700">
                          {r.lecture.lecture_number}. {r.lecture.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-navy-400">
                          {r.course.title}
                          {r.is_completed && " · مكتملة"}
                        </p>
                      </Link>
                    </li>
                  ) : null,
                )}
              </ul>
            )}
          </Card>

          {/* التواصل */}
          <Card className="bg-beige-100">
            <h3 className="mb-2 font-bold text-navy-900">استعصى عليك شيء؟</h3>
            <p className="mb-4 text-sm leading-7 text-navy-600">
              لا تبقَ عالقًا في فكرة أكثر من يوم. تواصل معي مباشرة.
            </p>
            <a
              href={TUTOR.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-teal-600 px-5 text-sm font-medium text-white hover:bg-teal-700"
            >
              راسل المدربة
            </a>
            <p className="mt-3 text-xs text-navy-500" dir="ltr">
              {TUTOR.phone}
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { Badge, Card, EmptyState, ProgressBar } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AttemptAnswer } from "@/lib/types";

export const metadata: Metadata = { title: "التحليلات" };

export default async function AnalyticsPage() {
  await requireAdminPage("/admin/analytics");

  const admin = createAdminClient();

  const [
    { data: students },
    { data: courses },
    { data: lectures },
    { data: attempts },
    { data: progress },
    { data: questions },
    { data: quizzes },
  ] = await Promise.all([
    admin.from("profiles").select("id, full_name, email, created_at").eq("role", "student"),
    admin.from("courses").select("id, title, lecture_count"),
    admin.from("lectures").select("id, course_id"),
    admin.from("quiz_attempts").select("id, quiz_id, course_id, student_id, score, answers, completed_at"),
    admin.from("student_progress").select("student_id, course_id, is_completed"),
    admin.from("quiz_questions").select("id, quiz_id, question, related_topic"),
    admin.from("quizzes").select("id, title, course_id"),
  ]);

  const studentList = students ?? [];
  const attemptList = attempts ?? [];

  /* ── متوسط الدرجة لكل ملف ─────────────────────────────────────── */
  const byCourse = new Map<string, { total: number; count: number }>();
  for (const a of attemptList) {
    if (!a.course_id) continue;
    const cur = byCourse.get(a.course_id) ?? { total: 0, count: 0 };
    cur.total += Number(a.score);
    cur.count += 1;
    byCourse.set(a.course_id, cur);
  }

  /* ── نسبة الإكمال لكل ملف ─────────────────────────────────────── */
  const completedByCourse = new Map<string, Set<string>>();
  const startedByCourse = new Map<string, Set<string>>();
  const completedCountByStudentCourse = new Map<string, number>();

  for (const p of progress ?? []) {
    const key = `${p.student_id}::${p.course_id}`;
    if (!startedByCourse.has(p.course_id)) startedByCourse.set(p.course_id, new Set());
    startedByCourse.get(p.course_id)!.add(p.student_id);

    if (p.is_completed) {
      completedCountByStudentCourse.set(
        key,
        (completedCountByStudentCourse.get(key) ?? 0) + 1,
      );
    }
  }

  for (const [key, count] of completedCountByStudentCourse) {
    const [studentId, courseId] = key.split("::");
    const course = (courses ?? []).find((c) => c.id === courseId);
    if (course && count >= course.lecture_count) {
      if (!completedByCourse.has(courseId)) completedByCourse.set(courseId, new Set());
      completedByCourse.get(courseId)!.add(studentId);
    }
  }

  /* ── الأسئلة الأصعب (أعلى نسبة خطأ) ───────────────────────────── */
  const questionStats = new Map<string, { wrong: number; total: number }>();
  for (const a of attemptList) {
    const answers = (a.answers ?? []) as AttemptAnswer[];
    for (const ans of answers) {
      const cur = questionStats.get(ans.question_id) ?? { wrong: 0, total: 0 };
      cur.total += 1;
      if (!ans.is_correct) cur.wrong += 1;
      questionStats.set(ans.question_id, cur);
    }
  }

  const questionMap = new Map(
    (questions ?? []).map((q) => [q.id, q]),
  );
  const quizMap = new Map((quizzes ?? []).map((q) => [q.id, q.title]));

  const hardest = [...questionStats.entries()]
    .filter(([, s]) => s.total >= 2) // نتجاهل الأسئلة التي حُلّت مرة واحدة
    .map(([id, s]) => ({
      id,
      rate: (s.wrong / s.total) * 100,
      wrong: s.wrong,
      total: s.total,
      question: questionMap.get(id),
    }))
    .filter((x) => x.question && x.rate >= 40)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);

  /* ── أفضل الطلاب ──────────────────────────────────────────────── */
  const byStudent = new Map<string, { total: number; count: number; best: number }>();
  for (const a of attemptList) {
    const cur = byStudent.get(a.student_id) ?? { total: 0, count: 0, best: 0 };
    cur.total += Number(a.score);
    cur.count += 1;
    cur.best = Math.max(cur.best, Number(a.score));
    byStudent.set(a.student_id, cur);
  }

  const studentRows = studentList
    .map((s) => {
      const stats = byStudent.get(s.id);
      return {
        ...s,
        attempts: stats?.count ?? 0,
        average: stats && stats.count ? stats.total / stats.count : null,
        best: stats?.best ?? null,
      };
    })
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1));

  const overallAverage =
    attemptList.length > 0
      ? attemptList.reduce((sum, a) => sum + Number(a.score), 0) / attemptList.length
      : null;

  const activeStudents = new Set(attemptList.map((a) => a.student_id)).size;

  return (
    <div className="space-y-8">
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold text-navy-900">التحليلات</h2>
        <p className="mt-3 text-sm leading-7 text-navy-500">
          صورة مختصرة عن أداء الطلاب: من يتقدّم، وأي ملف يحتاج شرحًا إضافيًا،
          وأي الأسئلة يخطئ فيها أكثر الطلاب.
        </p>
      </div>

      {/* أرقام عامة */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="عدد الطلاب المسجّلين" value={String(studentList.length)} />
        <Stat label="طلاب بدؤوا الاختبارات" value={String(activeStudents)} />
        <Stat label="إجمالي المحاولات" value={String(attemptList.length)} />
        <Stat
          label="المتوسط العام للدرجات"
          value={overallAverage === null ? "—" : `${Math.round(overallAverage)}٪`}
        />
      </div>

      {/* أداء الملفات */}
      <Card>
        <h3 className="mb-5 text-lg font-bold text-navy-900">أداء الملفات</h3>

        {(courses ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-navy-400">لا توجد ملفات.</p>
        ) : (
          <div className="space-y-6">
            {(courses ?? []).map((c) => {
              const stats = byCourse.get(c.id);
              const avg = stats && stats.count ? stats.total / stats.count : null;
              const started = startedByCourse.get(c.id)?.size ?? 0;
              const completed = completedByCourse.get(c.id)?.size ?? 0;
              const completionRate =
                started > 0 ? (completed / started) * 100 : 0;

              return (
                <div key={c.id} className="border-b border-navy-100 pb-5 last:border-0 last:pb-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h4 className="font-medium text-navy-800">{c.title}</h4>
                    <div className="mr-auto flex gap-2">
                      <Badge tone="neutral">{started} طالب بدأه</Badge>
                      {avg !== null && (
                        <Badge tone={avg >= 60 ? "success" : "danger"}>
                          متوسط {Math.round(avg)}٪
                        </Badge>
                      )}
                    </div>
                  </div>

                  <ProgressBar
                    value={completionRate}
                    label={`نسبة الإكمال — ${completed} من ${started} أكملوا كل المحاضرات`}
                    tone="lavender"
                  />

                  {stats && (
                    <p className="mt-2 text-xs text-navy-400">
                      {stats.count} محاولة اختبار على هذا الملف.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* الأسئلة الأصعب */}
      <Card>
        <h3 className="mb-1 text-lg font-bold text-navy-900">
          الأسئلة الأكثر صعوبة
        </h3>
        <p className="mb-5 text-sm text-navy-500">
          أسئلة أخطأ فيها ٤٠٪ فأكثر من الطلاب. غالبًا تحتاج شرحًا إضافيًا في
          المحاضرة، أو صياغة أوضح.
        </p>

        {hardest.length === 0 ? (
          <EmptyState
            title="لا توجد بيانات كافية بعد"
            description="ستظهر هنا الأسئلة التي يخطئ فيها الطلاب بعد أن يُحل كل سؤال مرتين على الأقل."
          />
        ) : (
          <ol className="space-y-3">
            {hardest.map((h, i) => (
              <li
                key={h.id}
                className="rounded-xl border border-navy-100 bg-navy-50/40 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
                    {i + 1}
                  </span>
                  <Badge tone="danger">{Math.round(h.rate)}٪ أخطأوا</Badge>
                  <span className="text-xs text-navy-400">
                    {h.wrong} من {h.total} محاولة
                  </span>
                  <span className="mr-auto text-xs text-navy-400">
                    {quizMap.get(h.question!.quiz_id) ?? ""}
                  </span>
                </div>

                <p className="prose-arabic line-clamp-3 text-sm">
                  {h.question!.question}
                </p>

                {h.question!.related_topic && (
                  <p className="mt-2 text-xs text-navy-500">
                    الفكرة: {h.question!.related_topic}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* الطلاب */}
      <Card>
        <h3 className="mb-5 text-lg font-bold text-navy-900">
          الطلاب ({studentRows.length})
        </h3>

        {studentRows.length === 0 ? (
          <EmptyState
            title="لا يوجد طلاب مسجّلون بعد"
            description="عندما ينشئ الطلاب حساباتهم ستظهر أسماؤهم ودرجاتهم هنا."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-xs text-navy-400">
                  <th className="pb-3 font-medium">الطالب</th>
                  <th className="pb-3 font-medium">المحاولات</th>
                  <th className="pb-3 font-medium">المتوسط</th>
                  <th className="pb-3 font-medium">الأفضل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {studentRows.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3">
                      <p className="font-medium text-navy-800">
                        {s.full_name || "بدون اسم"}
                      </p>
                      <p className="text-xs text-navy-400" dir="ltr">
                        {s.email}
                      </p>
                    </td>
                    <td className="py-3 text-navy-600">{s.attempts}</td>
                    <td className="py-3">
                      {s.average === null ? (
                        <span className="text-navy-300">—</span>
                      ) : (
                        <Badge tone={s.average >= 60 ? "success" : "danger"}>
                          {Math.round(s.average)}٪
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 text-navy-600">
                      {s.best === null ? "—" : `${Math.round(s.best)}٪`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs text-navy-400">
        عدد المحاضرات المسجّلة في النظام: {(lectures ?? []).length}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-xs text-navy-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy-900">{value}</p>
    </div>
  );
}

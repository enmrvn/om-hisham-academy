import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { Alert, LinkButton } from "@/components/ui";
import QuizAdminList, {
  type AdminQuizRow,
} from "@/components/admin/QuizAdminList";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Quiz } from "@/lib/types";

export const metadata: Metadata = { title: "الاختبارات" };

export default async function AdminQuizzesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; highlight?: string }>;
}) {
  await requireAdminPage("/admin/quizzes");

  const { saved, highlight } = await searchParams;
  const admin = createAdminClient();

  const [{ data: quizzes }, { data: questions }, { data: attempts }, { data: courses }, { data: lectures }] =
    await Promise.all([
      admin.from("quizzes").select("*").order("created_at", { ascending: false }),
      admin.from("quiz_questions").select("quiz_id"),
      admin.from("quiz_attempts").select("quiz_id, score"),
      admin.from("courses").select("id, title"),
      admin.from("lectures").select("id, title, lecture_number"),
    ]);

  // تجميع الإحصاءات في الذاكرة — الأعداد هنا صغيرة
  const questionCounts = new Map<string, number>();
  for (const q of questions ?? []) {
    questionCounts.set(q.quiz_id, (questionCounts.get(q.quiz_id) ?? 0) + 1);
  }

  const attemptStats = new Map<string, { count: number; total: number }>();
  for (const a of attempts ?? []) {
    const cur = attemptStats.get(a.quiz_id) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(a.score);
    attemptStats.set(a.quiz_id, cur);
  }

  const courseMap = new Map((courses ?? []).map((c) => [c.id, c.title]));
  const lectureMap = new Map(
    (lectures ?? []).map((l) => [l.id, `المحاضرة ${l.lecture_number}: ${l.title}`]),
  );

  const rows: AdminQuizRow[] = ((quizzes ?? []) as Quiz[]).map((q) => {
    const stats = attemptStats.get(q.id);
    return {
      ...q,
      question_count: questionCounts.get(q.id) ?? 0,
      attempt_count: stats?.count ?? 0,
      average_score: stats && stats.count > 0 ? stats.total / stats.count : null,
      course_title: q.course_id ? (courseMap.get(q.course_id) ?? null) : null,
      lecture_title: q.lecture_id ? (lectureMap.get(q.lecture_id) ?? null) : null,
    };
  });

  const drafts = rows.filter((r) => !r.is_published).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="max-w-2xl flex-1">
          <h2 className="text-xl font-bold text-navy-900">الاختبارات</h2>
          <p className="mt-3 text-sm leading-7 text-navy-500">
            راجعي الاختبارات وانشريها أو أخفيها عن الطلاب. الاختبار المسودة لا
            يظهر لأحد سواك.
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/admin/ai-quiz" variant="secondary" size="sm">
            اختبار ذكي
          </LinkButton>
          <LinkButton href="/admin/quizzes/new" variant="soft" size="sm">
            اختبار يدوي
          </LinkButton>
        </div>
      </div>

      {saved && (
        <Alert tone="success" title="تم حفظ الاختبار">
          يمكنك مراجعته أدناه، أو معاينته كما يراه الطالب قبل نشره.
        </Alert>
      )}

      {drafts > 0 && !saved && (
        <Alert tone="info">
          لديك {drafts} اختبارًا في وضع المسودة بانتظار المراجعة والنشر.
        </Alert>
      )}

      <QuizAdminList quizzes={rows} highlightId={highlight ?? saved} />
    </div>
  );
}

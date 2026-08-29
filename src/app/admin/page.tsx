import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { Badge, Card, LinkButton } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "لوحة المدربة" };

export default async function AdminHome() {
  await requireAdminPage("/admin");

  const admin = createAdminClient();

  const [
    { count: studentCount },
    { count: courseCount },
    { count: quizCount },
    { count: publishedCount },
    { data: recentAttempts },
    { data: draftQuizzes },
  ] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    admin.from("courses").select("*", { count: "exact", head: true }),
    admin.from("quizzes").select("*", { count: "exact", head: true }),
    admin.from("quizzes").select("*", { count: "exact", head: true }).eq("is_published", true),
    admin
      .from("quiz_attempts")
      .select("id, score, completed_at, quiz:quizzes(title), student:profiles(full_name)")
      .order("completed_at", { ascending: false })
      .limit(8),
    admin
      .from("quizzes")
      .select("id, title, source, created_at")
      .eq("is_published", false)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const attempts = (recentAttempts ?? []) as unknown as {
    id: string;
    score: number;
    completed_at: string;
    quiz: { title: string } | null;
    student: { full_name: string | null } | null;
  }[];

  const drafts = (draftQuizzes ?? []) as {
    id: string;
    title: string;
    source: string;
    created_at: string;
  }[];

  return (
    <div className="space-y-8">
      {/* الأرقام */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="عدد الطلاب" value={studentCount ?? 0} tone="navy" />
        <Stat label="ملفات المحاضرات" value={courseCount ?? 0} tone="teal" />
        <Stat label="إجمالي الاختبارات" value={quizCount ?? 0} tone="lavender" />
        <Stat label="المنشور منها" value={publishedCount ?? 0} tone="beige" />
      </div>

      {/* إجراءات سريعة */}
      <Card>
        <h2 className="mb-1 text-lg font-bold text-navy-900">ابدئي من هنا</h2>
        <p className="mb-5 text-sm text-navy-500">
          أكثر ثلاث مهام استخدامًا في اللوحة.
        </p>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/admin/ai-quiz" variant="secondary">
            إنشاء اختبار ذكي من ملف PDF
          </LinkButton>
          <LinkButton href="/admin/quizzes/new" variant="soft">
            إنشاء اختبار يدوي
          </LinkButton>
          <LinkButton href="/admin/courses" variant="ghost">
            رفع ملف محاضرات جديد
          </LinkButton>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* مسودات بانتظار النشر */}
        <Card>
          <h2 className="mb-4 text-lg font-bold text-navy-900">
            اختبارات بانتظار المراجعة
          </h2>

          {drafts.length === 0 ? (
            <p className="py-6 text-center text-sm text-navy-400">
              لا توجد مسودات. كل اختباراتك منشورة.
            </p>
          ) : (
            <ul className="space-y-2">
              {drafts.map((q) => (
                <li
                  key={q.id}
                  className="flex items-center gap-3 rounded-xl border border-navy-100 px-4 py-3"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-navy-800">
                    {q.title}
                  </span>
                  {q.source === "ai" && <Badge tone="lavender">ذكي</Badge>}
                  <LinkButton
                    href={`/admin/quizzes?highlight=${q.id}`}
                    size="sm"
                    variant="ghost"
                  >
                    مراجعة
                  </LinkButton>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* آخر المحاولات */}
        <Card>
          <h2 className="mb-4 text-lg font-bold text-navy-900">آخر محاولات الطلاب</h2>

          {attempts.length === 0 ? (
            <p className="py-6 text-center text-sm text-navy-400">
              لم يبدأ أحد أي اختبار بعد.
            </p>
          ) : (
            <ul className="divide-y divide-navy-100">
              {attempts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy-800">
                      {a.student?.full_name || "طالب"}
                    </p>
                    <p className="truncate text-xs text-navy-400">
                      {a.quiz?.title ?? "اختبار محذوف"}
                    </p>
                  </div>
                  <Badge tone={Number(a.score) >= 60 ? "success" : "danger"}>
                    {Math.round(Number(a.score))}٪
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "navy" | "teal" | "lavender" | "beige";
}) {
  const bars = {
    navy: "bg-navy-600",
    teal: "bg-teal-500",
    lavender: "bg-lavender-500",
    beige: "bg-beige-500",
  };

  return (
    <div className="surface-card overflow-hidden p-0">
      <div aria-hidden className={`h-1 w-full ${bars[tone]}`} />
      <div className="p-5">
        <p className="text-xs text-navy-400">{label}</p>
        <p className="mt-1 text-3xl font-bold text-navy-900">{value}</p>
      </div>
    </div>
  );
}

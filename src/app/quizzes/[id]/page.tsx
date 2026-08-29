import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import QuizRunner from "@/components/quiz/QuizRunner";
import { Alert, LinkButton } from "@/components/ui";
import { getQuiz } from "@/lib/queries";
import { loadQuizForStudent } from "@/lib/quiz-service";
import { getCurrentUser, getProfile } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const quiz = await getQuiz(id);
  return { title: quiz?.title ?? "اختبار" };
}

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/quizzes/${id}`)}`);

  const profile = await getProfile();
  const result = await loadQuizForStudent(id, profile?.role === "admin");

  if (!result.ok && result.status === 404) notFound();

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <nav aria-label="مسار التنقل" className="mb-6 text-sm text-navy-400">
        <Link href="/quizzes" className="hover:text-teal-600">
          الاختبارات
        </Link>
        {result.ok && (
          <>
            <span className="mx-2">/</span>
            <span className="text-navy-600">{result.quiz.title}</span>
          </>
        )}
      </nav>

      {!result.ok ? (
        <div className="space-y-4">
          <Alert tone="error" title="تعذّر فتح الاختبار">
            {result.error}
          </Alert>
          <LinkButton href="/quizzes" variant="soft">
            العودة إلى الاختبارات
          </LinkButton>
        </div>
      ) : (
        <>
          {!result.quiz.is_published && profile?.role === "admin" && (
            <div className="mb-5">
              <Alert tone="warning" title="وضع المعاينة">
                هذا الاختبار غير منشور — الطلاب لا يرونه. أنت تعاينينه بصفتك
                المدربة.
              </Alert>
            </div>
          )}

          <QuizRunner quiz={result.quiz} questions={result.questions} />
        </>
      )}
    </div>
  );
}

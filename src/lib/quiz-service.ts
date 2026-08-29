import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";
import type { PublicQuestion, QuizQuestion } from "@/lib/types";

export interface StudentQuizMeta {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  course_id: string | null;
  lecture_id: string | null;
  is_published: boolean;
}

export type LoadQuizResult =
  | { ok: true; quiz: StudentQuizMeta; questions: PublicQuestion[] }
  | { ok: false; status: number; error: string };

/**
 * يحمّل اختبارًا وأسئلته للطالب **بعد حذف الإجابة الصحيحة والشرح**.
 *
 * مشتركة بين المكوّن الخادمي لصفحة الاختبار ومسار الـ API، حتى يبقى التنقيح
 * في مكان واحد ولا يتسرّب حقل `correct_answer` من أحد المسارين.
 *
 * تُقرأ الأسئلة بمفتاح الخدمة لأن سياسات RLS تمنع الطلاب من قراءة جدول
 * quiz_questions مباشرة — وهذا مقصود.
 */
export async function loadQuizForStudent(
  quizId: string,
  isAdminUser: boolean,
): Promise<LoadQuizResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "لم تُضبط إعدادات قاعدة البيانات بعد. راجع ملف README.",
    };
  }

  const admin = createAdminClient();

  const { data: quiz, error: quizError } = await admin
    .from("quizzes")
    .select(
      "id, title, description, time_limit_minutes, course_id, lecture_id, is_published",
    )
    .eq("id", quizId)
    .maybeSingle();

  if (quizError || !quiz) {
    return { ok: false, status: 404, error: "الاختبار غير موجود." };
  }

  // الاختبار غير المنشور تراه المدربة فقط (للمعاينة)
  if (!quiz.is_published && !isAdminUser) {
    return { ok: false, status: 403, error: "هذا الاختبار غير متاح حاليًا." };
  }

  const { data: rows, error } = await admin
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true });

  if (error) {
    return {
      ok: false,
      status: 500,
      error: "تعذّر تحميل الأسئلة. حاول مرة أخرى.",
    };
  }

  const questions: PublicQuestion[] = ((rows ?? []) as QuizQuestion[]).map(
    ({ correct_answer: _answer, explanation: _why, quiz_id: _qid, ...rest }) => ({
      ...rest,
      choices: Array.isArray(rest.choices) ? rest.choices : [],
    }),
  );

  if (questions.length === 0) {
    return {
      ok: false,
      status: 404,
      error: "لا توجد أسئلة في هذا الاختبار بعد.",
    };
  }

  return { ok: true, quiz: quiz as StudentQuizMeta, questions };
}

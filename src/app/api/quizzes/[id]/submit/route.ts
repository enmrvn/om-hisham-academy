import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/server";
import { isAnswerCorrect } from "@/lib/grading";
import type { GradedQuestion, QuizQuestion, QuizResult } from "@/lib/types";

const bodySchema = z.object({
  answers: z.record(z.string(), z.string()),
  duration_seconds: z.number().int().min(0).max(60 * 60 * 6).optional(),
});

/**
 * يستقبل إجابات الطالب، يصحّحها **على الخادم**، يحفظ المحاولة،
 * ثم يعيد النتيجة كاملة مع الإجابات الصحيحة والشروح.
 *
 * التصحيح خادمي عمدًا: لا تُرسل الإجابات الصحيحة إلى المتصفح قبل التسليم.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "انتهت جلستك. سجّل الدخول ثم أعد المحاولة." },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "صيغة الإجابات غير صحيحة." }, { status: 400 });
  }

  const { answers, duration_seconds } = parsed.data;
  const admin = createAdminClient();

  const { data: quiz } = await admin
    .from("quizzes")
    .select("id, course_id, is_published")
    .eq("id", id)
    .maybeSingle();

  if (!quiz) {
    return NextResponse.json({ error: "الاختبار غير موجود." }, { status: 404 });
  }

  const { data: rows, error } = await admin
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", id)
    .order("position", { ascending: true });

  if (error || !rows || rows.length === 0) {
    return NextResponse.json(
      { error: "تعذّر تصحيح الاختبار — لا توجد أسئلة." },
      { status: 500 },
    );
  }

  const questions = rows as QuizQuestion[];

  const graded: GradedQuestion[] = questions.map((q) => {
    const studentAnswer = answers[q.id] ?? "";
    return {
      question_id: q.id,
      question: q.question,
      question_type: q.question_type,
      choices: Array.isArray(q.choices) ? q.choices : [],
      value_one: q.value_one,
      value_two: q.value_two,
      student_answer: studentAnswer,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      related_topic: q.related_topic,
      is_correct: isAnswerCorrect(q.question_type, studentAnswer, q.correct_answer),
    };
  });

  const correctCount = graded.filter((g) => g.is_correct).length;
  const total = graded.length;
  const score = Math.round((correctCount / total) * 10000) / 100;

  // حفظ المحاولة
  const { data: attempt, error: insertError } = await admin
    .from("quiz_attempts")
    .insert({
      quiz_id: id,
      student_id: user.id,
      course_id: quiz.course_id,
      score,
      correct_count: correctCount,
      total_count: total,
      duration_seconds: duration_seconds ?? null,
      answers: graded.map((g) => ({
        question_id: g.question_id,
        answer: g.student_answer,
        is_correct: g.is_correct,
      })),
    })
    .select("id")
    .single();

  if (insertError) {
    // النتيجة تُعرض للطالب حتى لو فشل الحفظ — لا نضيّع عليه محاولته
    console.error("submit: تعذّر حفظ المحاولة:", insertError.message);
  }

  // أفضل نتيجة في هذا الاختبار
  const { data: best } = await admin
    .from("quiz_attempts")
    .select("score")
    .eq("quiz_id", id)
    .eq("student_id", user.id)
    .order("score", { ascending: false })
    .limit(1)
    .maybeSingle();

  const result: QuizResult = {
    attempt_id: attempt?.id ?? null,
    score,
    correct_count: correctCount,
    total_count: total,
    best_score: best ? Number(best.score) : score,
    questions: graded,
  };

  return NextResponse.json(result);
}

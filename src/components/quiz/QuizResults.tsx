"use client";

import Link from "next/link";
import { Badge, Button, LinkButton, cn } from "@/components/ui";
import { QUESTION_TYPE_LABELS } from "@/lib/constants";
import { stripComparisonValues } from "@/lib/grading";
import type { QuizResult } from "@/lib/types";

/** شاشة النتيجة: الدرجة، ثم مراجعة كل سؤال مع الشرح. */
export default function QuizResults({
  result,
  onRetry,
  courseId,
}: {
  result: QuizResult;
  onRetry: () => void;
  courseId?: string | null;
}) {
  const { score, correct_count, total_count, best_score } = result;
  const wrong = total_count - correct_count;

  const tone =
    score >= 80 ? "teal" : score >= 60 ? "beige" : "danger";

  const message =
    score >= 90
      ? "ممتاز. أتقنت هذه الفكرة، انتقل إلى ما بعدها بثقة."
      : score >= 75
        ? "جيد جدًا. راجع الأسئلة التي أخطأت فيها فقط، وستكتمل الصورة."
        : score >= 50
          ? "بداية معقولة. اقرأ شرح كل سؤال أخطأت فيه بتأنٍ، ثم أعد المحاولة."
          : "لا بأس إطلاقًا. هذه إشارة أن الأساس يحتاج مراجعة — عد إلى المحاضرة، ثم عد إلى هنا. الإعادة ليست فشلًا، بل هي الطريقة.";

  return (
    <div className="space-y-6">
      {/* بطاقة الدرجة */}
      <div className="surface-card overflow-hidden p-0 animate-rise">
        <div
          aria-hidden
          className={cn(
            "h-1.5 w-full",
            tone === "teal" ? "bg-teal-500" : tone === "beige" ? "bg-beige-500" : "bg-red-400",
          )}
        />
        <div className="p-8 text-center">
          <p className="text-sm text-navy-500">درجتك في هذا الاختبار</p>
          <p className="my-3 text-5xl font-extrabold text-navy-900">
            {Math.round(score)}
            <span className="text-2xl text-navy-400">٪</span>
          </p>

          <div className="mx-auto mb-6 flex max-w-md flex-wrap items-center justify-center gap-2">
            <Badge tone="success">{correct_count} صحيحة</Badge>
            {wrong > 0 && <Badge tone="danger">{wrong} خاطئة</Badge>}
            {best_score !== null && (
              <Badge tone="navy">أفضل درجة لك: {Math.round(best_score)}٪</Badge>
            )}
          </div>

          <p className="prose-arabic mx-auto max-w-xl text-navy-600">{message}</p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button onClick={onRetry} variant="primary">
              إعادة المحاولة
            </Button>
            {courseId && (
              <LinkButton href={`/courses/${courseId}`} variant="soft">
                العودة إلى المحاضرات
              </LinkButton>
            )}
            <LinkButton href="/dashboard" variant="ghost">
              لوحتي
            </LinkButton>
          </div>
        </div>
      </div>

      {/* مراجعة الأسئلة */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-navy-900">
          مراجعة الإجابات
        </h2>

        <ol className="space-y-4">
          {result.questions.map((q, i) => (
            <li
              key={q.question_id}
              className={cn(
                "surface-card overflow-hidden p-0",
                q.is_correct ? "border-teal-200" : "border-red-200",
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-3 px-6 py-3",
                  q.is_correct ? "bg-teal-50" : "bg-red-50",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white",
                    q.is_correct ? "bg-teal-600" : "bg-red-400",
                  )}
                >
                  {q.is_correct ? "✓" : "✕"}
                </span>
                <span className="text-sm font-medium text-navy-700">
                  السؤال {i + 1}
                </span>
                <span className="mr-auto text-xs text-navy-400">
                  {QUESTION_TYPE_LABELS[q.question_type]}
                </span>
              </div>

              <div className="space-y-4 p-6">
                <p className="prose-arabic whitespace-pre-line font-medium text-navy-900">
                  {stripComparisonValues(q.question)}
                </p>

                {q.value_one && q.value_two && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-navy-50 px-4 py-2 text-center">
                      <span className="text-xs text-navy-400">القيمة الأولى: </span>
                      <span className="math-value text-base">{q.value_one}</span>
                    </div>
                    <div className="rounded-lg bg-navy-50 px-4 py-2 text-center">
                      <span className="text-xs text-navy-400">القيمة الثانية: </span>
                      <span className="math-value text-base">{q.value_two}</span>
                    </div>
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <div
                    className={cn(
                      "rounded-lg border px-4 py-3",
                      q.is_correct
                        ? "border-teal-200 bg-teal-50"
                        : "border-red-200 bg-red-50",
                    )}
                  >
                    <p className="mb-1 text-xs text-navy-400">إجابتك</p>
                    <p className="text-sm font-medium text-navy-800">
                      {q.student_answer.trim() || "— لم تُجب —"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
                    <p className="mb-1 text-xs text-navy-400">الإجابة الصحيحة</p>
                    <p className="text-sm font-bold text-teal-800">
                      {q.correct_answer}
                    </p>
                  </div>
                </div>

                {q.explanation && (
                  <div className="rounded-xl border border-lavender-200 bg-lavender-50 p-5">
                    <p className="mb-2 text-sm font-bold text-navy-800">
                      الشرح
                    </p>
                    <p className="prose-arabic whitespace-pre-line text-[1rem]">
                      {q.explanation}
                    </p>
                  </div>
                )}

                {q.related_topic && (
                  <p className="text-xs text-navy-400">
                    الفكرة المرتبطة: <span className="text-navy-600">{q.related_topic}</span>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-center text-sm text-navy-400">
        احتجت شرحًا إضافيًا؟{" "}
        <Link href="/courses" className="text-teal-700 hover:underline">
          عد إلى المحاضرة المرتبطة
        </Link>
        .
      </p>
    </div>
  );
}

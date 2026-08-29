"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, cn } from "@/components/ui";
import QuestionCard from "@/components/quiz/QuestionCard";
import QuizResults from "@/components/quiz/QuizResults";
import type { PublicQuestion, QuizResult } from "@/lib/types";
import type { StudentQuizMeta } from "@/lib/quiz-service";

type Phase = "running" | "submitting" | "done";

/**
 * محرّك الاختبار: سؤال واحد في كل شاشة، مؤشر تقدّم، مؤقّت اختياري،
 * تنقّل بين الأسئلة، ثم تسليم يُصحَّح على الخادم.
 *
 * الأسئلة تصل جاهزة من المكوّن الخادمي (منقّحة من الإجابات)، فلا يوجد
 * انتظار إضافي في المتصفح ولا حالة تحميل عند فتح الصفحة.
 */
export default function QuizRunner({
  quiz,
  questions,
}: {
  quiz: StudentQuizMeta;
  questions: PublicQuestion[];
}) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("running");
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Date.now() لا يُستدعى أثناء التصيير — يُضبط في تأثير بعد التركيب
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  /* ── التسليم ─────────────────────────────────────────────────── */
  const submit = useCallback(async () => {
    setConfirmOpen(false);
    setPhase("submitting");
    setError(null);

    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          duration_seconds: startedAt.current
            ? Math.round((Date.now() - startedAt.current) / 1000)
            : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "تعذّر تسليم الاختبار.");
        setPhase("running");
        return;
      }

      setResult(data as QuizResult);
      setPhase("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.refresh(); // لتحديث لوحة الطالب ونِسَب التقدّم
    } catch {
      setError(
        "تعذّر الاتصال بالخادم أثناء التسليم. إجاباتك ما زالت موجودة — أعد المحاولة.",
      );
      setPhase("running");
    }
  }, [answers, quiz.id, router]);

  /* ── المؤقّت ─────────────────────────────────────────────────── */
  // نحتفظ بأحدث نسخة من submit في ref حتى لا يُعاد ضبط المؤقّت
  // في كل مرة يغيّر فيها الطالب إجابته (وإلا توقّف العدّ عمليًا).
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  }, [submit]);

  useEffect(() => {
    if (phase !== "running" || secondsLeft === null) return;

    if (secondsLeft <= 0) {
      void submitRef.current();
      return;
    }

    const timer = setTimeout(
      () => setSecondsLeft((s) => (s === null ? null : s - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [phase, secondsLeft]);

  /* ── إعادة المحاولة ──────────────────────────────────────────── */
  function retry() {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setError(null);
    setSecondsLeft(quiz.time_limit_minutes ? quiz.time_limit_minutes * 60 : null);
    startedAt.current = Date.now();
    setPhase("running");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (phase === "done" && result) {
    return (
      <QuizResults result={result} courseId={quiz.course_id} onRetry={retry} />
    );
  }

  const current = questions[index];
  const answered = Object.values(answers).filter((v) => v.trim()).length;
  const percent = (answered / questions.length) * 100;
  const isLast = index === questions.length - 1;
  const unanswered = questions.length - answered;

  function requestSubmit() {
    if (unanswered > 0) setConfirmOpen(true);
    else void submit();
  }

  return (
    <div className="space-y-5">
      {/* رأس: العنوان + المؤقّت */}
      <div className="surface-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-navy-900">
              {quiz.title}
            </h1>
            <p className="mt-0.5 text-xs text-navy-400">
              السؤال {index + 1} من {questions.length} · أجبت عن {answered}
            </p>
          </div>

          {secondsLeft !== null && (
            <div
              className={cn(
                "rounded-xl px-4 py-2 text-center tabular-nums",
                secondsLeft <= 60
                  ? "bg-red-50 text-red-700"
                  : "bg-navy-50 text-navy-700",
              )}
              role="timer"
              aria-live="off"
            >
              <span className="block text-[0.65rem]">الوقت المتبقي</span>
              <span className="text-lg font-bold" dir="ltr">
                {formatTime(secondsLeft)}
              </span>
            </div>
          )}
        </div>

        {/* شريط التقدّم */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
          <div
            className="h-full rounded-full bg-teal-500 transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* نقاط الأسئلة */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {questions.map((q, i) => {
            const isDone = !!answers[q.id]?.trim();
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`الانتقال إلى السؤال ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "h-8 w-8 rounded-lg text-xs font-medium transition-colors",
                  i === index
                    ? "bg-navy-700 text-white"
                    : isDone
                      ? "bg-teal-100 text-teal-700 hover:bg-teal-200"
                      : "bg-navy-50 text-navy-400 hover:bg-navy-100",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {/* السؤال */}
      {current && (
        <div key={current.id} className="surface-card animate-rise p-6 sm:p-8">
          <QuestionCard
            question={current}
            answer={answers[current.id] ?? ""}
            disabled={phase === "submitting"}
            onAnswer={(value) =>
              setAnswers((prev) => ({ ...prev, [current.id]: value }))
            }
          />
        </div>
      )}

      {/* التنقّل */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0 || phase === "submitting"}
        >
          → السابق
        </Button>

        {!isLast ? (
          <Button
            variant="primary"
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            disabled={phase === "submitting"}
          >
            التالي ←
          </Button>
        ) : (
          <Button
            variant="secondary"
            onClick={requestSubmit}
            disabled={phase === "submitting"}
          >
            {phase === "submitting" ? "جارٍ التصحيح…" : "تسليم الاختبار"}
          </Button>
        )}

        <div className="mr-auto">
          {!isLast && (
            <Button
              variant="soft"
              size="sm"
              onClick={requestSubmit}
              disabled={phase === "submitting"}
            >
              تسليم الآن
            </Button>
          )}
        </div>
      </div>

      {/* تأكيد التسليم مع أسئلة غير مجابة */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="surface-card w-full max-w-md p-7">
            <h2 id="confirm-title" className="text-lg font-bold text-navy-900">
              بقي {unanswered} سؤالًا بلا إجابة
            </h2>
            <p className="mt-3 text-sm leading-7 text-navy-500">
              الأسئلة غير المجابة تُحسب خاطئة. هل تريد التسليم الآن، أم تعود
              لتكملها؟
            </p>
            <div className="mt-6 flex gap-2">
              <Button
                variant="secondary"
                onClick={() => void submit()}
                className="flex-1"
              >
                نعم، سلّم
              </Button>
              <Button
                variant="ghost"
                onClick={() => setConfirmOpen(false)}
                className="flex-1"
              >
                أعود لأكملها
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

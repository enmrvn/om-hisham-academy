"use client";

import { Badge, cn } from "@/components/ui";
import { QC_CHOICES, QUESTION_TYPE_LABELS, TRUE_FALSE_CHOICES } from "@/lib/constants";
import { extractComparisonValues, stripComparisonValues } from "@/lib/grading";
import type { PublicQuestion } from "@/lib/types";

/**
 * عرض سؤال واحد بالشكل المناسب لنوعه.
 * أسئلة المقارنة الكمية تُعرض بالقالب المعتمد في اختبار القدرات:
 * القيمة الأولى / القيمة الثانية ثم الخيارات الأربعة الثابتة.
 */
export default function QuestionCard({
  question,
  answer,
  onAnswer,
  disabled = false,
}: {
  question: PublicQuestion;
  answer: string;
  onAnswer: (value: string) => void;
  disabled?: boolean;
}) {
  const isQC = question.question_type === "quantitative_comparison";

  // القيمتان: من العمودين المخزّنين، وإلا نستخرجهما من نص السؤال
  const parsed = isQC ? extractComparisonValues(question.question) : null;
  const valueOne = question.value_one ?? parsed?.one ?? null;
  const valueTwo = question.value_two ?? parsed?.two ?? null;
  const stem = isQC ? stripComparisonValues(question.question) : question.question;

  const choices =
    isQC
      ? [...QC_CHOICES]
      : question.question_type === "true_false"
        ? question.choices.length
          ? question.choices
          : [...TRUE_FALSE_CHOICES]
        : question.choices;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="lavender">{QUESTION_TYPE_LABELS[question.question_type]}</Badge>
        {question.related_topic && (
          <Badge tone="neutral">{question.related_topic}</Badge>
        )}
      </div>

      {/* نص السؤال */}
      <p className="prose-arabic whitespace-pre-line text-[1.15rem] leading-[2.2] text-navy-900">
        {stem}
      </p>

      {/* القيمتان في المقارنة الكمية */}
      {isQC && valueOne && valueTwo && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ValueBox label="القيمة الأولى" value={valueOne} />
          <ValueBox label="القيمة الثانية" value={valueTwo} />
        </div>
      )}

      {/* الخيارات */}
      {question.question_type === "short_answer" ? (
        <div className="mt-6">
          <label
            htmlFor={`answer-${question.id}`}
            className="mb-2 block text-sm font-medium text-navy-700"
          >
            اكتب إجابتك
          </label>
          <input
            id={`answer-${question.id}`}
            value={answer}
            onChange={(e) => onAnswer(e.target.value)}
            disabled={disabled}
            autoComplete="off"
            placeholder="اكتب الإجابة هنا…"
            className="w-full rounded-xl border border-navy-200 bg-white px-4 py-3.5 text-lg text-navy-900 placeholder:text-navy-300 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <p className="mt-2 text-xs text-navy-400">
            لا تقلق من التشكيل أو المسافات — التصحيح يتجاهلها.
          </p>
        </div>
      ) : (
        <fieldset className="mt-6">
          <legend className="sr-only">اختر الإجابة الصحيحة</legend>
          <div className="space-y-2.5">
            {choices.map((choice, i) => {
              const selected = answer === choice;
              return (
                <label
                  key={`${question.id}-${i}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                    disabled && "cursor-not-allowed opacity-60",
                    selected
                      ? "border-teal-500 bg-teal-50 ring-1 ring-teal-200"
                      : "border-navy-200 bg-white hover:border-navy-300 hover:bg-navy-50",
                  )}
                >
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    value={choice}
                    checked={selected}
                    disabled={disabled}
                    onChange={() => onAnswer(choice)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                      selected
                        ? "border-teal-600 bg-teal-600"
                        : "border-navy-300 bg-white",
                    )}
                  >
                    {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="prose-arabic flex-1 text-base leading-8">
                    {choice}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}

function ValueBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-navy-200 bg-navy-50/60 p-5 text-center">
      <p className="mb-2 text-xs font-medium text-navy-500">{label}</p>
      <p className="math-value font-bold text-navy-900">{value}</p>
    </div>
  );
}

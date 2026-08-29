"use client";

import { Badge, Button, Field, Input, Select, Textarea, cn } from "@/components/ui";
import {
  DIFFICULTY_LABELS,
  QC_CHOICES,
  QUESTION_TYPE_LABELS,
  TRUE_FALSE_CHOICES,
} from "@/lib/constants";
import type { EditableQuestion, QuestionType } from "@/lib/types";

/**
 * محرّر سؤال واحد: تعديل النص والخيارات والإجابة والشرح،
 * مع تغيير النوع والمستوى، والحذف وإعادة الترتيب.
 */
export default function QuestionEditor({
  question,
  index,
  total,
  onChange,
  onDelete,
  onMove,
  error,
}: {
  question: EditableQuestion;
  index: number;
  total: number;
  onChange: (next: EditableQuestion) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
  error?: string;
}) {
  const patch = (partial: Partial<EditableQuestion>) =>
    onChange({ ...question, ...partial });

  /** تغيير النوع يعيد ضبط الخيارات لتناسب النوع الجديد. */
  function changeType(type: QuestionType) {
    if (type === "quantitative_comparison") {
      patch({ question_type: type, choices: [...QC_CHOICES], correct_answer: "" });
    } else if (type === "true_false") {
      patch({ question_type: type, choices: [...TRUE_FALSE_CHOICES], correct_answer: "" });
    } else if (type === "short_answer") {
      patch({ question_type: type, choices: [], correct_answer: "" });
    } else {
      const base =
        question.choices.length === 4
          ? question.choices
          : ["أ) ", "ب) ", "ج) ", "د) "];
      patch({ question_type: type, choices: base, correct_answer: "" });
    }
  }

  function setChoice(i: number, value: string) {
    const next = [...question.choices];
    const wasCorrect = question.correct_answer === next[i];
    next[i] = value;
    patch({
      choices: next,
      ...(wasCorrect ? { correct_answer: value } : {}),
    });
  }

  const locked =
    question.question_type === "quantitative_comparison" ||
    question.question_type === "true_false";

  return (
    <div
      className={cn(
        "surface-card overflow-hidden p-0",
        error && "border-red-300",
      )}
    >
      {/* رأس البطاقة */}
      <div className="flex flex-wrap items-center gap-2 border-b border-navy-100 bg-navy-50/60 px-5 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-700 text-xs font-bold text-white">
          {index + 1}
        </span>
        <Badge tone="lavender">{QUESTION_TYPE_LABELS[question.question_type]}</Badge>
        <Badge tone="neutral">{DIFFICULTY_LABELS[question.difficulty]}</Badge>

        <div className="mr-auto flex items-center gap-1">
          <IconButton
            onClick={() => onMove(-1)}
            disabled={index === 0}
            label="تحريك السؤال لأعلى"
          >
            ↑
          </IconButton>
          <IconButton
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            label="تحريك السؤال لأسفل"
          >
            ↓
          </IconButton>
          <Button type="button" variant="danger" size="sm" onClick={onDelete}>
            حذف
          </Button>
        </div>
      </div>

      <div className="space-y-5 p-5">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800">
            {error}
          </p>
        )}

        {/* النوع والمستوى */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="نوع السؤال" htmlFor={`type-${question.key}`}>
            <Select
              id={`type-${question.key}`}
              value={question.question_type}
              onChange={(e) => changeType(e.target.value as QuestionType)}
            >
              {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="المستوى" htmlFor={`diff-${question.key}`}>
            <Select
              id={`diff-${question.key}`}
              value={question.difficulty}
              onChange={(e) =>
                patch({
                  difficulty: e.target.value as EditableQuestion["difficulty"],
                })
              }
            >
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </Select>
          </Field>
        </div>

        {/* نص السؤال */}
        <Field
          label="نص السؤال"
          htmlFor={`q-${question.key}`}
          required
          hint={
            question.question_type === "quantitative_comparison"
              ? "اكتبي المعطيات ثم سطرين: «القيمة الأولى: …» و«القيمة الثانية: …»"
              : undefined
          }
        >
          <Textarea
            id={`q-${question.key}`}
            value={question.question}
            onChange={(e) => patch({ question: e.target.value })}
            rows={question.question_type === "quantitative_comparison" ? 5 : 3}
            className="prose-arabic"
          />
        </Field>

        {/* الخيارات */}
        {question.question_type !== "short_answer" && (
          <div>
            <p className="mb-2 text-sm font-medium text-navy-800">
              الخيارات
              <span className="mr-2 text-xs font-normal text-navy-400">
                (اضغطي الدائرة لتحديد الإجابة الصحيحة)
              </span>
            </p>

            <div className="space-y-2">
              {question.choices.map((choice, i) => {
                const isCorrect = question.correct_answer === choice;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2",
                      isCorrect
                        ? "border-teal-400 bg-teal-50"
                        : "border-navy-200 bg-white",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => patch({ correct_answer: choice })}
                      aria-label={`تحديد الخيار ${i + 1} كإجابة صحيحة`}
                      aria-pressed={isCorrect}
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        isCorrect
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-navy-300 bg-white hover:border-teal-400",
                      )}
                    >
                      {isCorrect && <span className="text-xs">✓</span>}
                    </button>

                    <input
                      value={choice}
                      readOnly={locked}
                      onChange={(e) => setChoice(i, e.target.value)}
                      className={cn(
                        "flex-1 rounded-lg border-0 bg-transparent px-2 py-1.5 text-sm focus:outline-none",
                        locked ? "text-navy-500" : "text-navy-900",
                      )}
                    />

                    {!locked && question.choices.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            choices: question.choices.filter((_, j) => j !== i),
                          })
                        }
                        aria-label={`حذف الخيار ${i + 1}`}
                        className="px-2 text-sm text-navy-300 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {locked ? (
              <p className="mt-2 text-xs text-navy-400">
                خيارات هذا النوع ثابتة ولا تُعدّل — هكذا تظهر في اختبار قياس.
              </p>
            ) : (
              question.choices.length < 6 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => patch({ choices: [...question.choices, ""] })}
                >
                  + إضافة خيار
                </Button>
              )
            )}
          </div>
        )}

        {/* الإجابة القصيرة */}
        {question.question_type === "short_answer" && (
          <Field
            label="الإجابة الصحيحة"
            htmlFor={`ans-${question.key}`}
            required
            hint="اكتبيها مختصرة. التصحيح يتجاهل التشكيل والمسافات وشكل الأرقام."
          >
            <Input
              id={`ans-${question.key}`}
              value={question.correct_answer}
              onChange={(e) => patch({ correct_answer: e.target.value })}
            />
          </Field>
        )}

        {/* الشرح */}
        <Field
          label="الشرح"
          htmlFor={`exp-${question.key}`}
          required
          hint="أهم حقل في السؤال — الطالب يقرؤه بعد التسليم سواء أصاب أم أخطأ."
        >
          <Textarea
            id={`exp-${question.key}`}
            value={question.explanation}
            onChange={(e) => patch({ explanation: e.target.value })}
            rows={4}
            className="prose-arabic"
          />
        </Field>

        {/* الفكرة المرتبطة */}
        <Field label="الدرس أو الفكرة المرتبطة" htmlFor={`topic-${question.key}`}>
          <Input
            id={`topic-${question.key}`}
            value={question.related_topic}
            onChange={(e) => patch({ related_topic: e.target.value })}
            placeholder="مثال: التناسب العكسي"
          />
        </Field>
      </div>
    </div>
  );
}

/** زر صغير مربّع لإعادة الترتيب. */
function IconButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-navy-200 bg-white text-navy-600 transition-colors hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

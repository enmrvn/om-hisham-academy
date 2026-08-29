"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import QuestionEditor from "@/components/admin/QuestionEditor";
import { saveQuizAction } from "@/app/admin/actions";
import { QC_CHOICES, TRUE_FALSE_CHOICES } from "@/lib/constants";
import type {
  Course,
  Difficulty,
  EditableQuestion,
  Lecture,
  QuestionType,
} from "@/lib/types";

let counter = 0;
const nextKey = () => `m-${Date.now()}-${counter++}`;

function blankQuestion(type: QuestionType = "multiple_choice"): EditableQuestion {
  const choices =
    type === "quantitative_comparison"
      ? [...QC_CHOICES]
      : type === "true_false"
        ? [...TRUE_FALSE_CHOICES]
        : type === "short_answer"
          ? []
          : ["أ) ", "ب) ", "ج) ", "د) "];

  return {
    key: nextKey(),
    question:
      type === "quantitative_comparison"
        ? "المعطيات: \nالقيمة الأولى: \nالقيمة الثانية: "
        : "",
    question_type: type,
    choices,
    correct_answer: "",
    explanation: "",
    difficulty: "medium",
    related_topic: "",
  };
}

/** بناء اختبار يدويًا سؤالًا سؤالًا. */
export default function ManualQuizBuilder({
  courses,
  lectures,
}: {
  courses: Course[];
  lectures: Lecture[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [lectureId, setLectureId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [timeLimit, setTimeLimit] = useState("");
  const [questions, setQuestions] = useState<EditableQuestion[]>([blankQuestion()]);

  const [error, setError] = useState<string | null>(null);
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});

  const courseLectures = useMemo(
    () => lectures.filter((l) => l.course_id === courseId),
    [lectures, courseId],
  );

  function validate(): boolean {
    const errs: Record<string, string> = {};

    for (const q of questions) {
      if (q.question.trim().length < 5) errs[q.key] = "نص السؤال ناقص.";
      else if (!q.correct_answer.trim()) errs[q.key] = "حددي الإجابة الصحيحة.";
      else if (
        q.question_type !== "short_answer" &&
        !q.choices.some((c) => c === q.correct_answer)
      )
        errs[q.key] = "الإجابة الصحيحة يجب أن تطابق أحد الخيارات.";
      else if (
        q.question_type !== "short_answer" &&
        q.choices.some((c) => !c.trim())
      )
        errs[q.key] = "يوجد خيار فارغ.";
      else if (!q.explanation.trim()) errs[q.key] = "الشرح مطلوب.";
    }

    setQuestionErrors(errs);

    if (title.trim().length < 4) {
      setError("عنوان الاختبار قصير جدًا.");
      return false;
    }
    if (Object.keys(errs).length > 0) {
      setError(`${Object.keys(errs).length} سؤالًا يحتاج تصحيحًا.`);
      return false;
    }

    setError(null);
    return true;
  }

  function save(publish: boolean) {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    startTransition(async () => {
      const res = await saveQuizAction({
        quiz_id: null,
        course_id: courseId || null,
        lecture_id: lectureId || null,
        title: title.trim(),
        description: description.trim(),
        difficulty,
        time_limit_minutes: timeLimit ? Number(timeLimit) : null,
        is_published: publish,
        source: "manual",
        questions: questions.map((q) => ({
          question: q.question.trim(),
          question_type: q.question_type,
          choices: q.choices,
          correct_answer: q.correct_answer.trim(),
          explanation: q.explanation.trim(),
          difficulty: q.difficulty,
          related_topic: q.related_topic.trim(),
        })),
      });

      if (!res.ok) {
        setError(res.errors?._form ?? "تعذّر الحفظ.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      router.push(`/admin/quizzes?saved=${res.quizId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      <Card>
        <h2 className="mb-5 text-lg font-bold text-navy-900">بيانات الاختبار</h2>

        <div className="space-y-4">
          <Field label="عنوان الاختبار" htmlFor="m-title" required>
            <Input
              id="m-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: تدريب على النسبة المئوية"
            />
          </Field>

          <Field label="وصف مختصر" htmlFor="m-desc">
            <Textarea
              id="m-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="الملف" htmlFor="m-course">
              <Select
                id="m-course"
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setLectureId("");
                }}
              >
                <option value="">— غير مرتبط بملف —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="المحاضرة" htmlFor="m-lecture">
              <Select
                id="m-lecture"
                value={lectureId}
                onChange={(e) => setLectureId(e.target.value)}
                disabled={!courseId}
              >
                <option value="">— كل محاضرات الملف —</option>
                {courseLectures.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lecture_number}. {l.title}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="مستوى الاختبار" htmlFor="m-diff">
              <Select
                id="m-diff"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              >
                <option value="easy">سهل</option>
                <option value="medium">متوسط</option>
                <option value="hard">صعب</option>
                <option value="mixed">متنوع</option>
              </Select>
            </Field>

            <Field
              label="المدة بالدقائق"
              htmlFor="m-time"
              hint="اتركيه فارغًا لاختبار بلا وقت."
            >
              <Input
                id="m-time"
                type="number"
                min={1}
                max={180}
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                placeholder="اختياري"
              />
            </Field>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-navy-900">
          الأسئلة ({questions.length})
        </h2>

        {questions.map((q, i) => (
          <QuestionEditor
            key={q.key}
            question={q}
            index={i}
            total={questions.length}
            error={questionErrors[q.key]}
            onChange={(next) =>
              setQuestions((prev) =>
                prev.map((p) => (p.key === q.key ? next : p)),
              )
            }
            onDelete={() =>
              setQuestions((prev) =>
                prev.length === 1 ? prev : prev.filter((p) => p.key !== q.key),
              )
            }
            onMove={(dir) =>
              setQuestions((prev) => {
                const target = i + dir;
                if (target < 0 || target >= prev.length) return prev;
                const next = [...prev];
                [next[i], next[target]] = [next[target], next[i]];
                return next;
              })
            }
          />
        ))}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setQuestions((p) => [...p, blankQuestion("multiple_choice")])}
          >
            + اختيار من متعدد
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setQuestions((p) => [...p, blankQuestion("quantitative_comparison")])
            }
          >
            + مقارنة كمية
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setQuestions((p) => [...p, blankQuestion("true_false")])}
          >
            + صح أو خطأ
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setQuestions((p) => [...p, blankQuestion("short_answer")])}
          >
            + إجابة قصيرة
          </Button>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 border-t border-navy-100 bg-white/95 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => save(true)} disabled={pending}>
            {pending ? "جارٍ الحفظ…" : "حفظ ونشر"}
          </Button>
          <Button variant="soft" onClick={() => save(false)} disabled={pending}>
            حفظ كمسودة
          </Button>
        </div>
      </div>
    </div>
  );
}

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
  Badge,
  cn,
} from "@/components/ui";
import QuestionEditor from "@/components/admin/QuestionEditor";
import { saveQuizAction } from "@/app/admin/actions";
import { MAX_PAGES_PER_GENERATION, MAX_QUESTIONS_PER_QUIZ } from "@/lib/constants";
import type {
  Course,
  Difficulty,
  EditableQuestion,
  GenerationResult,
  Lecture,
} from "@/lib/types";

type Scope = "whole" | "lecture" | "pages";
type Step = "configure" | "generating" | "review";

let keyCounter = 0;
const nextKey = () => `q-${Date.now()}-${keyCounter++}`;

export default function AiQuizStudio({
  courses,
  lectures,
}: {
  courses: Course[];
  lectures: Lecture[];
}) {
  const router = useRouter();

  /* ── حالة النموذج ─────────────────────────────────────────────── */
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [scope, setScope] = useState<Scope>("lecture");
  const [lectureId, setLectureId] = useState("");
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("20");
  const [count, setCount] = useState("10");
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [questionType, setQuestionType] = useState("mixed");
  const [timeLimit, setTimeLimit] = useState("");
  const [notes, setNotes] = useState("");

  /* ── حالة العملية ─────────────────────────────────────────────── */
  const [step, setStep] = useState<Step>("configure");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /* ── نتيجة التوليد ────────────────────────────────────────────── */
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [meta, setMeta] = useState<GenerationResult["meta"] | null>(null);
  const [questionErrors, setQuestionErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();

  const course = courses.find((c) => c.id === courseId) ?? null;
  const courseLectures = useMemo(
    () => lectures.filter((l) => l.course_id === courseId),
    [lectures, courseId],
  );

  const selectedLecture = courseLectures.find((l) => l.id === lectureId) ?? null;

  /* ── التوليد ──────────────────────────────────────────────────── */
  async function generate() {
    setError(null);
    setNotice(null);

    if (!courseId) {
      setError("اختاري ملفًا أولًا.");
      return;
    }
    if (scope === "lecture" && !lectureId) {
      setError("اختاري المحاضرة المطلوبة.");
      return;
    }
    if (course && !course.pdf_path) {
      setError(
        "هذا الملف لا يحتوي على PDF مرفوع. ارفعيه من «إدارة الملفات» ثم أعيدي المحاولة.",
      );
      return;
    }

    setStep("generating");

    try {
      const res = await fetch("/api/ai/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          scope,
          lecture_id: scope === "lecture" ? lectureId : null,
          start_page: scope === "pages" ? Number(startPage) : null,
          end_page: scope === "pages" ? Number(endPage) : null,
          question_count: Number(count),
          difficulty,
          question_type: questionType,
          time_limit_minutes: timeLimit ? Number(timeLimit) : null,
          notes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "تعذّر توليد الاختبار.");
        setStep("configure");
        return;
      }

      const result = data as GenerationResult;

      setQuizTitle(result.title);
      setQuizDescription(
        `اختبار مولّد من ${result.meta.scope_label}، ${result.questions.length} أسئلة.`,
      );
      setQuestions(result.questions.map((q) => ({ ...q, key: nextKey() })));
      setMeta(result.meta);
      setQuestionErrors({});
      setStep("review");

      if (result.meta.trimmed) {
        setNotice(
          `النطاق المطلوب أكبر من الحد المسموح، فأُخذت عيّنة من الصفحات ${result.meta.pages_from}–${result.meta.pages_to}. لتغطية الملف كاملًا، ولّدي عدة اختبارات بنطاقات متتابعة.`,
        );
      }
      if (result.questions.length < result.meta.requested_count) {
        setNotice(
          (prev) =>
            `${prev ? prev + " " : ""}أعاد النموذج ${result.questions.length} سؤالًا بدل ${result.meta.requested_count} — غالبًا لأن الصفحات المختارة لا تحتمل أكثر من ذلك.`,
        );
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("تعذّر الاتصال بالخادم. تحقّقي من الإنترنت ثم أعيدي المحاولة.");
      setStep("configure");
    }
  }

  /* ── تحرير الأسئلة ────────────────────────────────────────────── */
  function updateQuestion(key: string, next: EditableQuestion) {
    setQuestions((prev) => prev.map((q) => (q.key === key ? next : q)));
  }

  function deleteQuestion(key: string) {
    setQuestions((prev) => prev.filter((q) => q.key !== key));
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setQuestions((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addBlankQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        key: nextKey(),
        question: "",
        question_type: "multiple_choice",
        choices: ["أ) ", "ب) ", "ج) ", "د) "],
        correct_answer: "",
        explanation: "",
        difficulty: "medium",
        related_topic: "",
      },
    ]);
  }

  /* ── التحقق قبل الحفظ ─────────────────────────────────────────── */
  function validate(): boolean {
    const errs: Record<string, string> = {};

    for (const q of questions) {
      if (q.question.trim().length < 5) {
        errs[q.key] = "نص السؤال ناقص.";
        continue;
      }
      if (!q.correct_answer.trim()) {
        errs[q.key] = "لم تُحدَّد الإجابة الصحيحة.";
        continue;
      }
      if (
        q.question_type !== "short_answer" &&
        !q.choices.some((c) => c === q.correct_answer)
      ) {
        errs[q.key] = "الإجابة الصحيحة يجب أن تطابق أحد الخيارات المكتوبة.";
        continue;
      }
      if (
        q.question_type !== "short_answer" &&
        q.choices.some((c) => !c.trim())
      ) {
        errs[q.key] = "يوجد خيار فارغ.";
        continue;
      }
      if (!q.explanation.trim()) {
        errs[q.key] = "الشرح مطلوب.";
      }
    }

    setQuestionErrors(errs);

    if (Object.keys(errs).length > 0) {
      setError(
        `${Object.keys(errs).length} سؤالًا يحتاج تصحيحًا قبل الحفظ — راجعي البطاقات المحدّدة بالأحمر.`,
      );
      return false;
    }
    if (questions.length === 0) {
      setError("لا توجد أسئلة لحفظها.");
      return false;
    }
    if (quizTitle.trim().length < 4) {
      setError("عنوان الاختبار قصير جدًا.");
      return false;
    }

    setError(null);
    return true;
  }

  /* ── الحفظ ────────────────────────────────────────────────────── */
  function save(publish: boolean) {
    if (!validate()) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    startSaving(async () => {
      const res = await saveQuizAction({
        quiz_id: null,
        course_id: meta?.course_id ?? courseId,
        lecture_id: meta?.lecture_id ?? null,
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        difficulty,
        time_limit_minutes: timeLimit ? Number(timeLimit) : null,
        is_published: publish,
        source: "ai",
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
        setError(res.errors?._form ?? "تعذّر حفظ الاختبار.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      router.push(`/admin/quizzes?saved=${res.quizId}`);
      router.refresh();
    });
  }

  /* ═════════════════ شاشة التوليد ═════════════════ */
  if (step === "generating") {
    return (
      <Card className="py-16 text-center">
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-navy-100 border-t-teal-500" />
        <h2 className="text-lg font-bold text-navy-900">
          Claude يقرأ الصفحات الآن…
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-navy-500">
          يُرسَل إلى النموذج نطاق الصفحات المحدد فقط، ويُطلب منه تأليف أسئلة
          أصلية من مفاهيمها لا نسخها. ملفاتك صور ممسوحة ضوئيًا، لذلك يقرؤها
          بصريًا — وقد يستغرق ذلك من ٣٠ ثانية إلى دقيقتين.
        </p>
      </Card>
    );
  }

  /* ═════════════════ شاشة المراجعة والتحرير ═════════════════ */
  if (step === "review") {
    return (
      <div className="space-y-6">
        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="warning">{notice}</Alert>}

        <Alert tone="success" title="تم توليد الأسئلة">
          راجعي كل سؤال قبل النشر. تستطيعين تعديل النص والخيارات والإجابة
          والشرح، وحذف أي سؤال أو تغيير ترتيبه. لا شيء يصل إلى الطلاب قبل أن
          تعتمديه.
        </Alert>

        {/* بيانات الاختبار */}
        <Card>
          <h2 className="mb-5 text-lg font-bold text-navy-900">بيانات الاختبار</h2>

          <div className="space-y-4">
            <Field label="عنوان الاختبار" htmlFor="quiz-title" required>
              <Input
                id="quiz-title"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
              />
            </Field>

            <Field label="وصف مختصر" htmlFor="quiz-desc">
              <Textarea
                id="quiz-desc"
                rows={2}
                value={quizDescription}
                onChange={(e) => setQuizDescription(e.target.value)}
              />
            </Field>
          </div>

          {meta && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-navy-100 pt-4">
              <Badge tone="navy">{meta.scope_label}</Badge>
              <Badge tone="neutral">{meta.pages_sent} صفحة أُرسلت</Badge>
              <Badge tone="lavender">{meta.model}</Badge>
              <Badge tone="teal">{questions.length} سؤالًا</Badge>
              {meta.time_limit_minutes && (
                <Badge tone="beige">{meta.time_limit_minutes} دقيقة</Badge>
              )}
            </div>
          )}
        </Card>

        {/* الأسئلة */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold text-navy-900">
              الأسئلة ({questions.length})
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addBlankQuestion}
              className="mr-auto"
            >
              + إضافة سؤال يدوي
            </Button>
          </div>

          {questions.map((q, i) => (
            <QuestionEditor
              key={q.key}
              question={q}
              index={i}
              total={questions.length}
              error={questionErrors[q.key]}
              onChange={(next) => updateQuestion(q.key, next)}
              onDelete={() => deleteQuestion(q.key)}
              onMove={(dir) => moveQuestion(i, dir)}
            />
          ))}
        </div>

        {/* شريط الحفظ */}
        <div className="sticky bottom-0 -mx-5 border-t border-navy-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => save(true)}
              disabled={saving}
            >
              {saving ? "جارٍ الحفظ…" : "اعتماد ونشر للطلاب"}
            </Button>
            <Button
              type="button"
              variant="soft"
              onClick={() => save(false)}
              disabled={saving}
            >
              حفظ كمسودة
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("configure");
                setError(null);
                setNotice(null);
              }}
              disabled={saving}
              className="mr-auto"
            >
              → رجوع وتوليد جديد
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ═════════════════ شاشة الإعداد ═════════════════ */
  return (
    <div className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      {courses.length === 0 ? (
        <Alert tone="warning" title="لا توجد ملفات">
          أضيفي ملفًا ورفعي ملف الـ PDF الخاص به أولًا من «إدارة الملفات».
        </Alert>
      ) : (
        <>
          <Card>
            <h2 className="mb-1 text-lg font-bold text-navy-900">
              ١) اختاري المصدر
            </h2>
            <p className="mb-5 text-sm text-navy-500">
              كلما ضاق النطاق، صارت الأسئلة أدق وأقرب لما تشرحينه فعلًا.
            </p>

            <div className="space-y-5">
              <Field label="الملف" htmlFor="course" required>
                <Select
                  id="course"
                  value={courseId}
                  onChange={(e) => {
                    setCourseId(e.target.value);
                    setLectureId("");
                  }}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                      {c.pdf_path ? "" : " — (لا يوجد PDF مرفوع)"}
                    </option>
                  ))}
                </Select>
              </Field>

              {course && !course.pdf_path && (
                <Alert tone="warning">
                  هذا الملف لا يحتوي على PDF مرفوع بعد. ارفعيه من «إدارة الملفات»
                  قبل التوليد.
                </Alert>
              )}

              {/* النطاق */}
              <div>
                <p className="mb-2 text-sm font-medium text-navy-800">النطاق</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <ScopeOption
                    active={scope === "whole"}
                    onClick={() => setScope("whole")}
                    title="الملف كامل"
                    body={`عيّنة موزّعة، حتى ${MAX_PAGES_PER_GENERATION} صفحة`}
                  />
                  <ScopeOption
                    active={scope === "lecture"}
                    onClick={() => setScope("lecture")}
                    title="محاضرة محددة"
                    body="الأدق — يستخدم نطاق صفحات المحاضرة"
                  />
                  <ScopeOption
                    active={scope === "pages"}
                    onClick={() => setScope("pages")}
                    title="نطاق صفحات"
                    body="تحدّدينه بنفسك"
                  />
                </div>
              </div>

              {scope === "lecture" && (
                <Field label="المحاضرة" htmlFor="lecture" required>
                  <Select
                    id="lecture"
                    value={lectureId}
                    onChange={(e) => setLectureId(e.target.value)}
                  >
                    <option value="">— اختاري محاضرة —</option>
                    {courseLectures.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lecture_number}. {l.title}
                        {l.start_page && l.end_page
                          ? ` (ص ${l.start_page}–${l.end_page})`
                          : " — لم تُحدَّد صفحاتها"}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {selectedLecture && !selectedLecture.start_page && (
                <Alert tone="warning">
                  لم تُحدَّد صفحات هذه المحاضرة. حدّديها من «إدارة الملفات ▸
                  تعديل» ليعرف النموذج أي صفحات يقرأ.
                </Alert>
              )}

              {scope === "pages" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="من صفحة" htmlFor="start-page" required>
                    <Input
                      id="start-page"
                      type="number"
                      min={1}
                      max={course?.page_count ?? undefined}
                      value={startPage}
                      onChange={(e) => setStartPage(e.target.value)}
                    />
                  </Field>
                  <Field
                    label="إلى صفحة"
                    htmlFor="end-page"
                    required
                    hint={
                      course?.page_count
                        ? `الملف يحتوي ${course.page_count} صفحة. أقصى نطاق ${MAX_PAGES_PER_GENERATION} صفحة في المرة.`
                        : undefined
                    }
                  >
                    <Input
                      id="end-page"
                      type="number"
                      min={1}
                      max={course?.page_count ?? undefined}
                      value={endPage}
                      onChange={(e) => setEndPage(e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="mb-5 text-lg font-bold text-navy-900">
              ٢) اضبطي شكل الاختبار
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="عدد الأسئلة"
                htmlFor="count"
                required
                hint={`من ٣ إلى ${MAX_QUESTIONS_PER_QUIZ}`}
              >
                <Input
                  id="count"
                  type="number"
                  min={3}
                  max={MAX_QUESTIONS_PER_QUIZ}
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                />
              </Field>

              <Field label="مستوى الصعوبة" htmlFor="difficulty" required>
                <Select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                >
                  <option value="easy">سهل</option>
                  <option value="medium">متوسط</option>
                  <option value="hard">صعب</option>
                  <option value="mixed">متنوع</option>
                </Select>
              </Field>

              <Field label="نوع الأسئلة" htmlFor="qtype" required>
                <Select
                  id="qtype"
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                >
                  <option value="multiple_choice">اختيار من متعدد</option>
                  <option value="quantitative_comparison">مقارنة كمية</option>
                  <option value="true_false">صح أو خطأ</option>
                  <option value="short_answer">إجابة قصيرة</option>
                  <option value="mixed">متنوع</option>
                </Select>
              </Field>

              <Field
                label="مدة الاختبار بالدقائق"
                htmlFor="time-limit"
                hint="اتركيه فارغًا لاختبار بلا وقت محدد."
              >
                <Input
                  id="time-limit"
                  type="number"
                  min={1}
                  max={180}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value)}
                  placeholder="اختياري"
                />
              </Field>
            </div>

            <div className="mt-5">
              <Field
                label="ملاحظات للنموذج"
                htmlFor="notes"
                hint="اختياري — مثال: «ركّزي على مسائل السرعة» أو «تجنّبي الأسئلة التي تحتاج آلة حاسبة»."
              >
                <Textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتبي أي توجيه إضافي…"
                />
              </Field>
            </div>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={() => void generate()}>
              إنشاء الاختبار
            </Button>
            <p className="text-xs text-navy-400">
              لن يُحفظ شيء قبل مراجعتك واعتمادك.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function ScopeOption({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-xl border p-4 text-right transition-colors",
        active
          ? "border-teal-500 bg-teal-50 ring-1 ring-teal-200"
          : "border-navy-200 bg-white hover:border-navy-300 hover:bg-navy-50",
      )}
    >
      <span className="block text-sm font-bold text-navy-900">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-navy-400">{body}</span>
    </button>
  );
}

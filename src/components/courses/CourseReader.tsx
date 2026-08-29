"use client";

import { useState, useTransition } from "react";
import { Alert, Badge, Button, LinkButton, cn } from "@/components/ui";
import PdfViewer from "@/components/courses/PdfViewer";
import { toggleLectureComplete } from "@/app/courses/actions";
import type { Lecture } from "@/lib/types";

/**
 * القارئ الكامل لملف المحاضرات:
 * قائمة المحاضرات على اليمين + عارض PDF ينتقل إلى صفحة بداية كل محاضرة.
 */
export default function CourseReader({
  courseId,
  lectures,
  pdfUrl,
  completedIds,
  isAuthed,
}: {
  courseId: string;
  lectures: Lecture[];
  pdfUrl: string | null;
  completedIds: string[];
  isAuthed: boolean;
}) {
  const [activeId, setActiveId] = useState<string | null>(lectures[0]?.id ?? null);
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedIds));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const active = lectures.find((l) => l.id === activeId) ?? lectures[0] ?? null;

  function onToggle(lecture: Lecture) {
    if (!isAuthed) return;
    const next = !completed.has(lecture.id);

    // تحديث متفائل للواجهة، ثم مزامنة مع الخادم
    setCompleted((prev) => {
      const s = new Set(prev);
      if (next) s.add(lecture.id);
      else s.delete(lecture.id);
      return s;
    });
    setError(null);

    startTransition(async () => {
      const res = await toggleLectureComplete(courseId, lecture.id, next);
      if (!res.ok) {
        setError(res.error ?? "تعذّر حفظ التقدّم. حاول مرة أخرى.");
        setCompleted((prev) => {
          const s = new Set(prev);
          if (next) s.delete(lecture.id);
          else s.add(lecture.id);
          return s;
        });
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* ── قائمة المحاضرات ─────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="surface-card p-4">
          <h2 className="mb-3 px-2 text-sm font-bold text-navy-800">
            محاضرات الملف ({lectures.length})
          </h2>

          <ol className="space-y-1">
            {lectures.map((lecture) => {
              const isActive = lecture.id === active?.id;
              const isDone = completed.has(lecture.id);

              return (
                <li key={lecture.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(lecture.id)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-right transition-colors",
                      isActive
                        ? "bg-navy-700 text-white"
                        : "text-navy-700 hover:bg-navy-50",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        isActive
                          ? "bg-white/20 text-white"
                          : isDone
                            ? "bg-teal-100 text-teal-700"
                            : "bg-navy-100 text-navy-500",
                      )}
                    >
                      {isDone && !isActive ? "✓" : lecture.lecture_number}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-6">
                        {lecture.title}
                      </span>
                      {lecture.start_page && lecture.end_page && (
                        <span
                          className={cn(
                            "mt-0.5 block text-[0.7rem]",
                            isActive ? "text-navy-200" : "text-navy-400",
                          )}
                        >
                          الصفحات {lecture.start_page}–{lecture.end_page}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {isAuthed && (
            <p className="mt-3 border-t border-navy-100 px-2 pt-3 text-xs text-navy-400">
              أتممت {completed.size} من {lectures.length} محاضرة.
            </p>
          )}
        </div>
      </aside>

      {/* ── المحتوى ─────────────────────────────────────────────────── */}
      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}

        {active && (
          <div className="surface-card p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone="navy">المحاضرة {active.lecture_number}</Badge>
              {completed.has(active.id) && <Badge tone="success">مكتملة</Badge>}
            </div>

            <h2 className="text-xl font-bold text-navy-900">{active.title}</h2>

            {active.summary && (
              <p className="prose-arabic mt-3">{active.summary}</p>
            )}

            <div className="mt-6 flex flex-wrap gap-2 border-t border-navy-100 pt-5">
              {isAuthed ? (
                <Button
                  variant={completed.has(active.id) ? "ghost" : "secondary"}
                  size="sm"
                  disabled={pending}
                  onClick={() => onToggle(active)}
                >
                  {completed.has(active.id)
                    ? "إلغاء علامة الإتمام"
                    : "أتممت هذه المحاضرة"}
                </Button>
              ) : (
                <LinkButton href="/login" variant="ghost" size="sm">
                  سجّل الدخول لحفظ تقدّمك
                </LinkButton>
              )}

              <LinkButton
                href={`/quizzes?course=${courseId}&lecture=${active.id}`}
                variant="soft"
                size="sm"
              >
                اختبر نفسك في هذه المحاضرة
              </LinkButton>
            </div>
          </div>
        )}

        {/* عارض الـ PDF */}
        <PdfViewer
          key={active?.id ?? "none"}
          url={pdfUrl}
          startPage={active?.start_page ?? 1}
          endPage={active?.end_page ?? null}
          title={active?.title ?? "ملف المحاضرات"}
        />

        {/* التنقل بين المحاضرات */}
        <nav
          className="flex items-center justify-between gap-3"
          aria-label="التنقل بين المحاضرات"
        >
          <PrevNext
            lectures={lectures}
            activeId={active?.id ?? null}
            onSelect={setActiveId}
          />
        </nav>
      </div>
    </div>
  );
}

function PrevNext({
  lectures,
  activeId,
  onSelect,
}: {
  lectures: Lecture[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const index = lectures.findIndex((l) => l.id === activeId);
  const prev = index > 0 ? lectures[index - 1] : null;
  const next = index >= 0 && index < lectures.length - 1 ? lectures[index + 1] : null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={!prev}
        onClick={() => prev && onSelect(prev.id)}
      >
        → المحاضرة السابقة
      </Button>

      <span className="text-xs text-navy-400">
        {index + 1} من {lectures.length}
      </span>

      <Button
        variant="ghost"
        size="sm"
        disabled={!next}
        onClick={() => next && onSelect(next.id)}
      >
        المحاضرة التالية ←
      </Button>
    </>
  );
}


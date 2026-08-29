"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, LinkButton, cn } from "@/components/ui";
import { deleteQuizAction, toggleQuizPublishAction } from "@/app/admin/actions";
import { DIFFICULTY_LABELS } from "@/lib/constants";
import type { Quiz } from "@/lib/types";

export interface AdminQuizRow extends Quiz {
  question_count: number;
  attempt_count: number;
  average_score: number | null;
  course_title: string | null;
  lecture_title: string | null;
}

export default function QuizAdminList({
  quizzes,
  highlightId,
}: {
  quizzes: AdminQuizRow[];
  highlightId?: string;
}) {
  const [banner, setBanner] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  if (quizzes.length === 0) {
    return (
      <Card className="py-14 text-center">
        <h3 className="mb-2 font-bold text-navy-800">لا توجد اختبارات بعد</h3>
        <p className="mx-auto mb-5 max-w-md text-sm leading-7 text-navy-500">
          يمكنك توليد اختبار من ملف PDF بضغطة واحدة، أو كتابته يدويًا سؤالًا
          سؤالًا.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <LinkButton href="/admin/ai-quiz" variant="secondary" size="sm">
            إنشاء اختبار ذكي
          </LinkButton>
          <LinkButton href="/admin/quizzes/new" variant="soft" size="sm">
            اختبار يدوي
          </LinkButton>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      {quizzes.map((quiz) => (
        <QuizRow
          key={quiz.id}
          quiz={quiz}
          highlighted={quiz.id === highlightId}
          onMessage={(tone, text) => setBanner({ tone, text })}
        />
      ))}
    </div>
  );
}

function QuizRow({
  quiz,
  highlighted,
  onMessage,
}: {
  quiz: AdminQuizRow;
  highlighted: boolean;
  onMessage: (tone: "success" | "error", text: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function togglePublish() {
    startTransition(async () => {
      const res = await toggleQuizPublishAction(quiz.id, !quiz.is_published);
      onMessage(res.ok ? "success" : "error", res.message ?? "تم.");
      if (res.ok) router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteQuizAction(quiz.id);
      onMessage(res.ok ? "success" : "error", res.message ?? "تم.");
      setConfirmDelete(false);
      if (res.ok) router.refresh();
    });
  }

  return (
    <Card className={cn(highlighted && "border-teal-400 ring-2 ring-teal-100")}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            {quiz.is_published ? (
              <Badge tone="success">منشور</Badge>
            ) : (
              <Badge tone="beige">مسودة</Badge>
            )}
            {quiz.source === "ai" && <Badge tone="lavender">مولّد بالذكاء الاصطناعي</Badge>}
            <Badge tone="navy">{DIFFICULTY_LABELS[quiz.difficulty]}</Badge>
            <Badge tone="neutral">{quiz.question_count} سؤالًا</Badge>
            {quiz.time_limit_minutes && (
              <Badge tone="neutral">{quiz.time_limit_minutes} دقيقة</Badge>
            )}
          </div>

          <h3 className="font-bold text-navy-900">{quiz.title}</h3>

          <p className="mt-1 text-xs text-navy-400">
            {quiz.lecture_title ?? quiz.course_title ?? "غير مرتبط بملف"}
          </p>

          {quiz.attempt_count > 0 && (
            <p className="mt-2 text-xs text-navy-500">
              {quiz.attempt_count} محاولة · متوسط الدرجات{" "}
              <span className="font-bold text-navy-700">
                {Math.round(quiz.average_score ?? 0)}٪
              </span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <LinkButton href={`/quizzes/${quiz.id}`} variant="ghost" size="sm">
            معاينة
          </LinkButton>
          <Button
            variant={quiz.is_published ? "ghost" : "secondary"}
            size="sm"
            onClick={togglePublish}
            disabled={pending}
          >
            {quiz.is_published ? "إخفاء" : "نشر للطلاب"}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
          >
            حذف
          </Button>
        </div>
      </div>

      {confirmDelete && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900">
            سيُحذف الاختبار وأسئلته و{quiz.attempt_count} محاولة للطلاب. لا يمكن
            التراجع.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
              {pending ? "جارٍ الحذف…" : "نعم، احذفيه"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              disabled={pending}
            >
              تراجع
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import {
  deleteCourseAction,
  saveCourseAction,
  uploadCoursePdfAction,
} from "@/app/admin/actions";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { Course, CourseCategory, Lecture } from "@/lib/types";

interface LectureDraft {
  title: string;
  summary: string;
  start_page: string;
  end_page: string;
}

const EMPTY_LECTURES: LectureDraft[] = Array.from({ length: 5 }, () => ({
  title: "",
  summary: "",
  start_page: "",
  end_page: "",
}));

export default function CourseManager({
  courses,
  lectures,
}: {
  courses: Course[];
  lectures: Lecture[];
}) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );

  return (
    <div className="space-y-6">
      {banner && <Alert tone={banner.tone}>{banner.text}</Alert>}

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold text-navy-900">
          ملفات المحاضرات ({courses.length})
        </h2>
        <Button
          variant="secondary"
          size="sm"
          className="mr-auto"
          onClick={() => setEditing(editing === "new" ? null : "new")}
        >
          {editing === "new" ? "إلغاء" : "+ ملف جديد"}
        </Button>
      </div>

      {editing === "new" && (
        <CourseForm
          course={null}
          lectures={[]}
          onDone={(msg) => {
            setEditing(null);
            setBanner({ tone: "success", text: msg });
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {courses.length === 0 && editing !== "new" && (
        <Card className="py-12 text-center">
          <p className="text-sm text-navy-500">
            لا توجد ملفات بعد. اضغطي «+ ملف جديد» لإضافة أول ملف.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {courses.map((course) => {
          const courseLectures = lectures
            .filter((l) => l.course_id === course.id)
            .sort((a, b) => a.lecture_number - b.lecture_number);

          return editing === course.id ? (
            <CourseForm
              key={course.id}
              course={course}
              lectures={courseLectures}
              onDone={(msg) => {
                setEditing(null);
                setBanner({ tone: "success", text: msg });
              }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <CourseRow
              key={course.id}
              course={course}
              lectures={courseLectures}
              onEdit={() => setEditing(course.id)}
              onMessage={(tone, text) => setBanner({ tone, text })}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════ بطاقة الملف ═══════════════════════════ */

function CourseRow({
  course,
  lectures,
  onEdit,
  onMessage,
}: {
  course: Course;
  lectures: Lecture[];
  onEdit: () => void;
  onMessage: (tone: "success" | "error", text: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.set("course_id", course.id);
    fd.set("file", file);

    const res = await uploadCoursePdfAction(fd);
    setUploading(false);
    onMessage(res.ok ? "success" : "error", res.message ?? "تم.");
    if (res.ok) router.refresh();
    if (fileRef.current) fileRef.current.value = "";
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteCourseAction(course.id);
      onMessage(res.ok ? "success" : "error", res.message ?? "تم.");
      setConfirmDelete(false);
      if (res.ok) router.refresh();
    });
  }

  const missingPages = lectures.filter((l) => !l.start_page || !l.end_page).length;

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge tone="navy">{CATEGORY_LABELS[course.category]}</Badge>
            {course.pdf_path ? (
              <Badge tone="success">
                PDF مرفوع{course.page_count ? ` · ${course.page_count} صفحة` : ""}
              </Badge>
            ) : (
              <Badge tone="danger">لا يوجد PDF</Badge>
            )}
            {!course.is_published && <Badge tone="neutral">مخفي</Badge>}
            {missingPages > 0 && (
              <Badge tone="beige">{missingPages} محاضرة بلا نطاق صفحات</Badge>
            )}
          </div>

          <h3 className="font-bold text-navy-900">{course.title}</h3>
          {course.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-7 text-navy-500">
              {course.description}
            </p>
          )}

          <ol className="mt-3 space-y-1">
            {lectures.map((l) => (
              <li key={l.id} className="text-xs text-navy-400">
                <span className="font-medium text-navy-600">
                  {l.lecture_number}.
                </span>{" "}
                {l.title}
                {l.start_page && l.end_page && (
                  <span className="text-navy-300">
                    {" "}
                    — ص {l.start_page}–{l.end_page}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            تعديل
          </Button>

          <Button
            variant="soft"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "جارٍ الرفع…" : course.pdf_path ? "استبدال PDF" : "رفع PDF"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />

          <Button
            variant="danger"
            size="sm"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
          >
            حذف
          </Button>
        </div>
      </div>

      {uploading && (
        <p className="mt-4 rounded-lg bg-lavender-50 px-4 py-3 text-xs leading-6 text-navy-600">
          يُرفع الملف الآن إلى Supabase Storage ويُقرأ عدد صفحاته. الملفات الكبيرة
          (٥٠ ميجابايت فأكثر) قد تستغرق دقيقة أو أكثر — لا تغلقي الصفحة.
        </p>
      )}

      {confirmDelete && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-900">
            حذف «{course.title}» سيحذف معه محاضراته واختباراته ومحاولات الطلاب
            عليها، وملف الـ PDF من التخزين. لا يمكن التراجع.
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

/* ═══════════════════════════ نموذج التحرير ═══════════════════════════ */

function CourseForm({
  course,
  lectures,
  onDone,
  onCancel,
}: {
  course: Course | null;
  lectures: Lecture[];
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [category, setCategory] = useState<CourseCategory>(
    course?.category ?? "qudurat",
  );
  const [accent, setAccent] = useState(course?.accent ?? "navy");
  const [isPublished, setIsPublished] = useState(course?.is_published ?? true);

  const [drafts, setDrafts] = useState<LectureDraft[]>(() => {
    if (lectures.length === 0) return EMPTY_LECTURES;
    return Array.from({ length: 5 }, (_, i) => {
      const l = lectures[i];
      return {
        title: l?.title ?? "",
        summary: l?.summary ?? "",
        start_page: l?.start_page ? String(l.start_page) : "",
        end_page: l?.end_page ? String(l.end_page) : "",
      };
    });
  });

  function patchDraft(i: number, partial: Partial<LectureDraft>) {
    setDrafts((prev) => prev.map((d, j) => (j === i ? { ...d, ...partial } : d)));
  }

  function submit() {
    setError(null);

    startTransition(async () => {
      const res = await saveCourseAction(course?.id ?? null, {
        title,
        description,
        category,
        accent,
        is_published: isPublished,
        lectures: drafts.map((d) => ({
          title: d.title,
          summary: d.summary,
          start_page: d.start_page ? Number(d.start_page) : null,
          end_page: d.end_page ? Number(d.end_page) : null,
        })),
      });

      if (!res.ok) {
        setError(
          res.errors?._form ??
            Object.values(res.errors ?? {})[0] ??
            "تعذّر الحفظ.",
        );
        return;
      }

      router.refresh();
      onDone(res.message ?? "تم الحفظ.");
    });
  }

  return (
    <Card className="border-teal-300">
      <h3 className="mb-5 text-lg font-bold text-navy-900">
        {course ? `تعديل: ${course.title}` : "ملف جديد"}
      </h3>

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="space-y-5">
        <Field label="عنوان الملف" htmlFor="c-title" required>
          <Input
            id="c-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: المحاضرات من ٢١ إلى ٢٥ — التحليل اللفظي"
          />
        </Field>

        <Field label="الوصف" htmlFor="c-desc">
          <Textarea
            id="c-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="اشرحي في سطرين ما الذي يتعلمه الطالب في هذا الملف."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="التصنيف" htmlFor="c-cat" required>
            <Select
              id="c-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as CourseCategory)}
            >
              <option value="qudurat">القدرات</option>
              <option value="tahsili">التحصيلي</option>
            </Select>
          </Field>

          <Field label="لون البطاقة" htmlFor="c-accent">
            <Select
              id="c-accent"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
            >
              <option value="navy">كحلي</option>
              <option value="teal">تركوازي</option>
              <option value="lavender">لافندر</option>
              <option value="beige">بيج</option>
            </Select>
          </Field>

          <Field label="الظهور للطلاب" htmlFor="c-pub">
            <Select
              id="c-pub"
              value={isPublished ? "1" : "0"}
              onChange={(e) => setIsPublished(e.target.value === "1")}
            >
              <option value="1">ظاهر</option>
              <option value="0">مخفي</option>
            </Select>
          </Field>
        </div>

        {/* المحاضرات الخمس */}
        <div className="rounded-xl border border-navy-100 bg-navy-50/40 p-5">
          <h4 className="mb-1 text-sm font-bold text-navy-800">
            المحاضرات الخمس
          </h4>
          <p className="mb-4 text-xs leading-6 text-navy-500">
            نطاق الصفحات مهم: هو ما يحدد الصفحات التي تُرسل إلى Claude عند
            «إنشاء اختبار ذكي»، وما ينتقل إليه العارض عند فتح المحاضرة.
          </p>

          <div className="space-y-4">
            {drafts.map((d, i) => (
              <div
                key={i}
                className="rounded-xl border border-navy-200 bg-white p-4"
              >
                <p className="mb-3 text-xs font-bold text-navy-500">
                  المحاضرة {i + 1}
                </p>

                <div className="space-y-3">
                  <Input
                    value={d.title}
                    onChange={(e) => patchDraft(i, { title: e.target.value })}
                    placeholder="عنوان المحاضرة"
                    aria-label={`عنوان المحاضرة ${i + 1}`}
                  />
                  <Input
                    value={d.summary}
                    onChange={(e) => patchDraft(i, { summary: e.target.value })}
                    placeholder="وصف مختصر (اختياري)"
                    aria-label={`وصف المحاضرة ${i + 1}`}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      min={1}
                      value={d.start_page}
                      onChange={(e) => patchDraft(i, { start_page: e.target.value })}
                      placeholder="من صفحة"
                      aria-label={`صفحة بداية المحاضرة ${i + 1}`}
                    />
                    <Input
                      type="number"
                      min={1}
                      value={d.end_page}
                      onChange={(e) => patchDraft(i, { end_page: e.target.value })}
                      placeholder="إلى صفحة"
                      aria-label={`صفحة نهاية المحاضرة ${i + 1}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={submit} disabled={pending}>
            {pending ? "جارٍ الحفظ…" : "حفظ"}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>
            إلغاء
          </Button>
        </div>
      </div>
    </Card>
  );
}


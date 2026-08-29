"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, STORAGE_BUCKET } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/supabase/server";
import { getPageCount } from "@/lib/pdf";
import { extractComparisonValues } from "@/lib/grading";
import { courseSchema, fieldErrors, saveQuizSchema } from "@/lib/validation";
import type { Difficulty } from "@/lib/types";

export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  quizId?: string;
};

/**
 * كل إجراء هنا يتحقق من الصلاحية بنفسه.
 * لا نعتمد على proxy.ts وحده — التحقق المزدوج مقصود.
 */
async function requireAdmin() {
  const profile = await getProfile();
  if (!profile) throw new Error("يجب تسجيل الدخول.");
  if (profile.role !== "admin") throw new Error("هذه الصفحة للمدربة فقط.");
  return profile;
}

/* ═══════════════════════════════════════════════════════════════════════════
   الاختبارات
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * يحفظ اختبارًا كاملًا مع أسئلته (إنشاء أو تحديث).
 * الأسئلة تُستبدل بالكامل عند التحديث — أبسط وأضمن من المزامنة الجزئية.
 */
export async function saveQuizAction(input: unknown): Promise<ActionState> {
  let profile;
  try {
    profile = await requireAdmin();
  } catch (e) {
    return { ok: false, errors: { _form: (e as Error).message } };
  }

  const parsed = saveQuizSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error) };
  }

  const data = parsed.data;
  const admin = createAdminClient();

  const quizRow = {
    course_id: data.course_id,
    lecture_id: data.lecture_id,
    title: data.title,
    description: data.description || null,
    difficulty: data.difficulty as Difficulty,
    time_limit_minutes: data.time_limit_minutes,
    is_published: data.is_published,
    source: data.source,
    created_by: profile.id,
  };

  let quizId = data.quiz_id ?? null;

  if (quizId) {
    const { error } = await admin.from("quizzes").update(quizRow).eq("id", quizId);
    if (error) return { ok: false, errors: { _form: error.message } };

    await admin.from("quiz_questions").delete().eq("quiz_id", quizId);
  } else {
    const { data: created, error } = await admin
      .from("quizzes")
      .insert(quizRow)
      .select("id")
      .single();

    if (error || !created) {
      return { ok: false, errors: { _form: error?.message ?? "تعذّر إنشاء الاختبار." } };
    }
    quizId = created.id;
  }

  const rows = data.questions.map((q, i) => {
    const values =
      q.question_type === "quantitative_comparison"
        ? extractComparisonValues(q.question)
        : null;

    return {
      quiz_id: quizId,
      position: i + 1,
      question: q.question,
      question_type: q.question_type,
      choices: q.choices,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      related_topic: q.related_topic || null,
      value_one: values?.one ?? null,
      value_two: values?.two ?? null,
    };
  });

  const { error: qError } = await admin.from("quiz_questions").insert(rows);
  if (qError) return { ok: false, errors: { _form: qError.message } };

  revalidatePath("/admin/quizzes");
  revalidatePath("/quizzes");
  if (data.course_id) revalidatePath(`/courses/${data.course_id}`);

  return {
    ok: true,
    quizId: quizId!,
    message: data.is_published
      ? "تم حفظ الاختبار ونشره للطلاب."
      : "تم حفظ الاختبار كمسودة. انشريه متى شئت.",
  };
}

export async function toggleQuizPublishAction(
  quizId: string,
  publish: boolean,
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("quizzes")
    .update({ is_published: publish })
    .eq("id", quizId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/quizzes");
  revalidatePath("/quizzes");
  return {
    ok: true,
    message: publish ? "تم نشر الاختبار." : "تم إخفاء الاختبار عن الطلاب.",
  };
}

export async function deleteQuizAction(quizId: string): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("quizzes").delete().eq("id", quizId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/quizzes");
  revalidatePath("/quizzes");
  return { ok: true, message: "تم حذف الاختبار ومحاولاته." };
}

/* ═══════════════════════════════════════════════════════════════════════════
   الملفات والمحاضرات
   ═══════════════════════════════════════════════════════════════════════════ */

function slugify(title: string) {
  return (
    title
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}-]/gu, "")
      .slice(0, 60)
      .toLowerCase() || `course-${Date.now()}`
  );
}

/** ينشئ ملفًا جديدًا أو يحدّث ملفًا قائمًا مع محاضراته الخمس. */
export async function saveCourseAction(
  courseId: string | null,
  input: unknown,
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, errors: { _form: (e as Error).message } };
  }

  const parsed = courseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const data = parsed.data;
  const admin = createAdminClient();

  const row = {
    title: data.title,
    description: data.description || null,
    category: data.category,
    accent: data.accent,
    is_published: data.is_published,
    lecture_count: data.lectures.length,
  };

  let id = courseId;

  if (id) {
    const { error } = await admin.from("courses").update(row).eq("id", id);
    if (error) return { ok: false, errors: { _form: error.message } };
  } else {
    const { data: maxRow } = await admin
      .from("courses")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: created, error } = await admin
      .from("courses")
      .insert({
        ...row,
        slug: slugify(data.title),
        sort_order: (maxRow?.sort_order ?? 0) + 1,
      })
      .select("id")
      .single();

    if (error || !created) {
      return { ok: false, errors: { _form: error?.message ?? "تعذّر إنشاء الملف." } };
    }
    id = created.id;
  }

  // المحاضرات الخمس
  for (let i = 0; i < data.lectures.length; i++) {
    const l = data.lectures[i];
    const { error } = await admin.from("lectures").upsert(
      {
        course_id: id,
        lecture_number: i + 1,
        title: l.title,
        summary: l.summary || null,
        start_page: l.start_page ?? null,
        end_page: l.end_page ?? null,
      },
      { onConflict: "course_id,lecture_number" },
    );
    if (error) return { ok: false, errors: { _form: error.message } };
  }

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  revalidatePath(`/courses/${id}`);

  return { ok: true, message: "تم حفظ الملف ومحاضراته." };
}

/** يرفع ملف PDF جديد ويربطه بمقرر. */
export async function uploadCoursePdfAction(
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const courseId = String(formData.get("course_id") ?? "");
  const file = formData.get("file");

  if (!courseId) return { ok: false, message: "اختاري الملف المراد ربطه." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "اختاري ملف PDF أولًا." };
  }
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return { ok: false, message: "الملف يجب أن يكون بصيغة PDF." };
  }
  if (file.size > 60 * 1024 * 1024) {
    return { ok: false, message: "حجم الملف يتجاوز ٦٠ ميجابايت." };
  }

  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  // عدد الصفحات — يُستخدم في نطاقات المحاضرات وفي التوليد
  let pageCount: number | null = null;
  try {
    pageCount = await getPageCount(buffer);
  } catch {
    return {
      ok: false,
      message: "تعذّرت قراءة الملف — تأكدي أنه PDF سليم وغير محمي بكلمة مرور.",
    };
  }

  const path = `courses/${courseId}/${Date.now()}.pdf`;

  const { error: uploadError } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    return { ok: false, message: `تعذّر الرفع: ${uploadError.message}` };
  }

  // احذفي الملف القديم إن وُجد
  const { data: existing } = await admin
    .from("courses")
    .select("pdf_path")
    .eq("id", courseId)
    .maybeSingle();

  if (existing?.pdf_path && existing.pdf_path !== path) {
    await admin.storage.from(STORAGE_BUCKET).remove([existing.pdf_path]);
  }

  const { error } = await admin
    .from("courses")
    .update({ pdf_path: path, page_count: pageCount })
    .eq("id", courseId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/courses");
  revalidatePath(`/courses/${courseId}`);

  return {
    ok: true,
    message: `تم رفع الملف بنجاح (${pageCount} صفحة).`,
  };
}

export async function deleteCourseAction(courseId: string): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const admin = createAdminClient();

  const { data: course } = await admin
    .from("courses")
    .select("pdf_path")
    .eq("id", courseId)
    .maybeSingle();

  if (course?.pdf_path) {
    await admin.storage.from(STORAGE_BUCKET).remove([course.pdf_path]);
  }

  const { error } = await admin.from("courses").delete().eq("id", courseId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  return { ok: true, message: "تم حذف الملف ومحاضراته واختباراته." };
}

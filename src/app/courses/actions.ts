"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

/**
 * يسجّل أن الطالب فتح محاضرة معيّنة (يستخدم في «آخر ما شاهدت»).
 * لا يغيّر حالة الإكمال إن كانت محفوظة مسبقًا.
 */
export async function markLectureViewed(courseId: string, lectureId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول أولًا." };

  const supabase = await createClient();

  // نحافظ على حالة الإكمال إن كانت محفوظة مسبقًا
  const { data: existing } = await supabase
    .from("student_progress")
    .select("is_completed")
    .eq("student_id", user.id)
    .eq("lecture_id", lectureId)
    .maybeSingle();

  const { error } = await supabase.from("student_progress").upsert(
    {
      student_id: user.id,
      course_id: courseId,
      lecture_id: lectureId,
      is_completed: existing?.is_completed ?? false,
      last_viewed_at: new Date().toISOString(),
    },
    { onConflict: "student_id,lecture_id" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/courses/${courseId}`);
  return { ok: true };
}

/** يبدّل حالة «أتممت هذه المحاضرة». */
export async function toggleLectureComplete(
  courseId: string,
  lectureId: string,
  completed: boolean,
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "يجب تسجيل الدخول أولًا." };

  const supabase = await createClient();

  const { error } = await supabase.from("student_progress").upsert(
    {
      student_id: user.id,
      course_id: courseId,
      lecture_id: lectureId,
      is_completed: completed,
      last_viewed_at: new Date().toISOString(),
    },
    { onConflict: "student_id,lecture_id" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/dashboard");
  revalidatePath("/courses");
  return { ok: true };
}

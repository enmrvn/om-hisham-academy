import "server-only";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import type {
  Course,
  CourseProgress,
  Lecture,
  Quiz,
  QuizAttempt,
} from "@/lib/types";

/* ---------------------------------------------------------------------------
   استعلامات القراءة المشتركة بين الصفحات الخادمية.
   كلها تمر عبر RLS (مفتاح المستخدم) وليس مفتاح الخدمة.
--------------------------------------------------------------------------- */

export async function getCourses(): Promise<Course[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getCourses:", error.message);
    return [];
  }
  return (data ?? []) as Course[];
}

export async function getCourse(id: string): Promise<Course | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Course | null) ?? null;
}

export async function getLectures(courseId: string): Promise<Lecture[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("lectures")
    .select("*")
    .eq("course_id", courseId)
    .order("lecture_number", { ascending: true });
  return (data ?? []) as Lecture[];
}

/** كل المحاضرات مجمّعة حسب الملف — تستخدم في نماذج المدربة. */
export async function getAllLectures(): Promise<Lecture[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("lectures")
    .select("*")
    .order("lecture_number", { ascending: true });
  return (data ?? []) as Lecture[];
}

/** تقدّم الطالب الحالي في كل الملفات، على شكل خريطة course_id ← نسبة. */
export async function getMyProgressMap(): Promise<Record<string, CourseProgress>> {
  const user = await getCurrentUser();
  if (!user) return {};

  const supabase = await createClient();
  const { data } = await supabase
    .from("course_progress_view")
    .select("*")
    .eq("student_id", user.id);

  const map: Record<string, CourseProgress> = {};
  for (const row of (data ?? []) as CourseProgress[]) {
    map[row.course_id] = row;
  }
  return map;
}

/** الاختبارات المنشورة، مع إمكانية التصفية حسب الملف. */
export async function getPublishedQuizzes(courseId?: string): Promise<Quiz[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  let query = supabase
    .from("quizzes")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (courseId) query = query.eq("course_id", courseId);

  const { data } = await query;
  return (data ?? []) as Quiz[];
}

export async function getQuiz(id: string): Promise<Quiz | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Quiz | null) ?? null;
}

/** محاولات الطالب الحالي، الأحدث أولًا. */
export async function getMyAttempts(limit = 20): Promise<QuizAttempt[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("student_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as QuizAttempt[];
}

/** أفضل نتيجة وآخر نتيجة للطالب في ملف معيّن. */
export async function getCourseScores(courseId: string): Promise<{
  best: number | null;
  last: number | null;
  attempts: number;
}> {
  const user = await getCurrentUser();
  if (!user) return { best: null, last: null, attempts: 0 };

  const supabase = await createClient();
  const { data } = await supabase
    .from("quiz_attempts")
    .select("score, completed_at")
    .eq("student_id", user.id)
    .eq("course_id", courseId)
    .order("completed_at", { ascending: false });

  const rows = (data ?? []) as { score: number; completed_at: string }[];
  if (rows.length === 0) return { best: null, last: null, attempts: 0 };

  return {
    best: Math.max(...rows.map((r) => Number(r.score))),
    last: Number(rows[0].score),
    attempts: rows.length,
  };
}

/** آخر المحاضرات التي شاهدها الطالب. */
export async function getRecentLectures(limit = 5) {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("student_progress")
    .select(
      "last_viewed_at, is_completed, lecture:lectures(id, title, lecture_number, course_id), course:courses(id, title, slug)",
    )
    .eq("student_id", user.id)
    .order("last_viewed_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as unknown as {
    last_viewed_at: string;
    is_completed: boolean;
    lecture: { id: string; title: string; lecture_number: number; course_id: string } | null;
    course: { id: string; title: string; slug: string } | null;
  }[];
}

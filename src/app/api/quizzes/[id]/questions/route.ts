import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, getProfile } from "@/lib/supabase/server";
import { loadQuizForStudent } from "@/lib/quiz-service";

/**
 * يعيد أسئلة الاختبار للطالب بعد حذف الإجابة الصحيحة والشرح.
 *
 * صفحة الاختبار تحمّل الأسئلة على الخادم مباشرة، لكن هذا المسار يظل متاحًا
 * لأي عميل آخر (تطبيق جوال مستقبلًا مثلًا) وينقّح البيانات بالمنطق نفسه.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "يجب تسجيل الدخول لبدء الاختبار." },
      { status: 401 },
    );
  }

  const profile = await getProfile();
  const result = await loadQuizForStudent(id, profile?.role === "admin");

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ quiz: result.quiz, questions: result.questions });
}

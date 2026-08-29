import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import AiQuizStudio from "@/components/admin/AiQuizStudio";
import { getAllLectures, getCourses } from "@/lib/queries";

export const metadata: Metadata = { title: "إنشاء اختبار ذكي" };

export default async function AiQuizPage() {
  await requireAdminPage("/admin/ai-quiz");

  const [courses, lectures] = await Promise.all([
    getCourses(),
    getAllLectures(),
  ]);

  return (
    <div>
      <div className="mb-8 max-w-2xl">
        <h2 className="text-xl font-bold text-navy-900">إنشاء اختبار ذكي</h2>
        <p className="mt-3 text-sm leading-7 text-navy-500">
          اختاري ملفًا ونطاقًا من صفحاته، وسيقرأ Claude تلك الصفحات وحدها ثم
          يؤلّف أسئلة عربية أصلية مبنية على مفاهيمها — لا منسوخة منها. تصلك
          الأسئلة للمراجعة والتعديل، ولا يراها أي طالب قبل أن تعتمديها.
        </p>
      </div>

      <AiQuizStudio courses={courses} lectures={lectures} />
    </div>
  );
}

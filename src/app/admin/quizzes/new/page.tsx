import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import ManualQuizBuilder from "@/components/admin/ManualQuizBuilder";
import { getAllLectures, getCourses } from "@/lib/queries";

export const metadata: Metadata = { title: "اختبار يدوي جديد" };

export default async function NewQuizPage() {
  await requireAdminPage("/admin/quizzes/new");

  const [courses, lectures] = await Promise.all([
    getCourses(),
    getAllLectures(),
  ]);

  return (
    <div>
      <div className="mb-8 max-w-2xl">
        <h2 className="text-xl font-bold text-navy-900">إنشاء اختبار يدوي</h2>
        <p className="mt-3 text-sm leading-7 text-navy-500">
          اكتبي الأسئلة بنفسك سؤالًا سؤالًا. يمكنك خلط الأنواع الأربعة في اختبار
          واحد، ولا تنسي كتابة شرح واضح لكل سؤال — هو أهم ما يقرؤه الطالب بعد
          التسليم.
        </p>
      </div>

      <ManualQuizBuilder courses={courses} lectures={lectures} />
    </div>
  );
}

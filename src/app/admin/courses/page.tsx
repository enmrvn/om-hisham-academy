import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { Alert } from "@/components/ui";
import CourseManager from "@/components/admin/CourseManager";
import { getAllLectures, getCourses } from "@/lib/queries";

export const metadata: Metadata = { title: "إدارة الملفات" };

export default async function AdminCoursesPage() {
  await requireAdminPage("/admin/courses");

  const [courses, lectures] = await Promise.all([
    getCourses(),
    getAllLectures(),
  ]);

  const missingPdf = courses.filter((c) => !c.pdf_path).length;

  return (
    <div className="space-y-6">
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold text-navy-900">إدارة الملفات</h2>
        <p className="mt-3 text-sm leading-7 text-navy-500">
          كل ملف PDF يمثّل مقررًا يحتوي خمس محاضرات. أضيفي عنوانًا ووصفًا
          وتصنيفًا لكل ملف، وسمّي محاضراته الخمس، وحدّدي نطاق صفحات كل محاضرة.
        </p>
      </div>

      {missingPdf > 0 && (
        <Alert tone="warning" title={`${missingPdf} ملف بلا PDF مرفوع`}>
          ملفات المحاضرات موجودة في قاعدة البيانات لكن ملفات الـ PDF نفسها لم
          تُرفع بعد. ارفعي كل ملف بزر «رفع PDF» أدناه، أو ارفعي الأربعة دفعة
          واحدة بأمر{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">
            npm run upload:pdfs
          </code>{" "}
          الموضّح في ملف README.
        </Alert>
      )}

      <CourseManager courses={courses} lectures={lectures} />
    </div>
  );
}

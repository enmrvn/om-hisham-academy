import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-24 text-center">
      <p className="text-6xl font-extrabold text-navy-200">٤٠٤</p>
      <h1 className="mt-4 text-2xl font-bold text-navy-900">
        الصفحة التي تبحث عنها غير موجودة
      </h1>
      <p className="mt-3 leading-8 text-navy-500">
        ربما حُذف المحتوى أو تغيّر رابطه. عد إلى الصفحة الرئيسية أو تصفّح
        الملفات.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton href="/">الصفحة الرئيسية</LinkButton>
        <LinkButton href="/courses" variant="soft">
          الملفات
        </LinkButton>
      </div>
    </div>
  );
}

import Link from "next/link";
import { TUTOR } from "@/lib/constants";

/** تذييل ثابت يظهر في كل صفحات المنصة. */
export default function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-navy-100 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <p className="text-lg font-bold text-navy-900">{TUTOR.name}</p>
            <p className="mt-2 max-w-sm text-sm leading-7 text-navy-500">
              أكثر من عشرين عامًا في تأسيس طلاب القدرات والتحصيلي. نبدأ من الفكرة،
              ثم نصل إلى الحل.
            </p>
          </div>

          <nav aria-label="روابط سريعة">
            <p className="mb-3 text-sm font-bold text-navy-800">روابط سريعة</p>
            <ul className="space-y-2 text-sm text-navy-500">
              <li><Link className="hover:text-teal-600" href="/courses">الملفات والمحاضرات</Link></li>
              <li><Link className="hover:text-teal-600" href="/quizzes">الاختبارات</Link></li>
              <li><Link className="hover:text-teal-600" href="/dashboard">لوحة الطالب</Link></li>
            </ul>
          </nav>

          <div>
            <p className="mb-3 text-sm font-bold text-navy-800">للتواصل</p>
            <a
              href={`tel:${TUTOR.phone}`}
              className="inline-flex items-center gap-2 text-sm text-navy-600 hover:text-teal-600"
              dir="ltr"
            >
              {TUTOR.phone}
            </a>
            <a
              href={TUTOR.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-sm text-navy-500 hover:text-teal-600"
            >
              التواصل عبر واتساب
            </a>
          </div>
        </div>

        {/* السطر المطلوب في تذييل كل صفحة */}
        <div className="mt-10 border-t border-navy-100 pt-6 text-center">
          <p className="text-sm font-medium text-navy-700">
            {TUTOR.name} | <span dir="ltr">{TUTOR.phone}</span>
          </p>
          <p className="mt-2 text-xs text-navy-400">
            جميع الحقوق محفوظة © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Alert, Button } from "@/components/ui";

/**
 * عارض PDF مدمج.
 *
 * يعتمد على عارض المتصفح المدمج عبر <iframe> مع مُعرّف الصفحة (#page=N)،
 * وهي الطريقة الأخف والأكثر توافقًا مع الملفات الكبيرة (بعض ملفاتنا يتجاوز
 * ٥٠٠ صفحة و٥٠ ميجابايت)، ولا تحتاج إلى تحميل مكتبة رسم في المتصفح.
 *
 * ملاحظة: متصفحات الجوال قد تتجاهل #page — لذلك نوفّر زر «فتح في نافذة جديدة».
 */
export default function PdfViewer({
  url,
  startPage,
  endPage,
  title,
}: {
  url: string | null;
  startPage: number | null;
  endPage: number | null;
  title: string;
}) {
  // ملاحظة: عند تغيير المحاضرة يعيد الأب تركيب هذا المكوّن عبر `key`،
  // فتُعاد تهيئة الصفحة تلقائيًا دون الحاجة إلى مزامنة الحالة في تأثير.
  const initial = startPage ?? 1;
  const [page, setPage] = useState(initial);
  const [input, setInput] = useState(String(initial));
  const [loading, setLoading] = useState(true);

  const src = useMemo(() => {
    if (!url) return null;
    // toolbar=1 يبقي أدوات العارض، view=FitH يضبط العرض على عرض الصفحة
    return `${url}#page=${page}&view=FitH&toolbar=1`;
  }, [url, page]);

  function go(next: number) {
    const clamped = Math.max(1, next);
    setPage(clamped);
    setInput(String(clamped));
  }

  if (!url) {
    return (
      <Alert tone="warning" title="ملف الـ PDF غير مرفوع بعد">
        لم يُربط ملف PDF بهذا المقرر حتى الآن. يمكن للمدربة رفعه من
        «لوحة المدربة ▸ إدارة الملفات»، أو تشغيل أمر الرفع{" "}
        <code className="rounded bg-white px-1 py-0.5 text-xs">npm run upload:pdfs</code>{" "}
        الموضّح في ملف README.
      </Alert>
    );
  }

  return (
    <div className="surface-card overflow-hidden p-0">
      {/* شريط أدوات */}
      <div className="flex flex-wrap items-center gap-2 border-b border-navy-100 bg-navy-50/60 px-4 py-3">
        <span className="ml-auto truncate text-sm font-medium text-navy-700">
          {title}
        </span>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => go(page - 1)}
            disabled={page <= 1}
            aria-label="الصفحة السابقة"
          >
            ›
          </Button>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(input, 10);
              if (!Number.isNaN(n)) go(n);
            }}
            className="flex items-center gap-1"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              inputMode="numeric"
              aria-label="رقم الصفحة"
              className="h-9 w-16 rounded-lg border border-navy-200 bg-white text-center text-sm text-navy-900 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            {endPage && (
              <span className="text-xs text-navy-400">/ {endPage}</span>
            )}
          </form>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => go(page + 1)}
            disabled={!!endPage && page >= endPage}
            aria-label="الصفحة التالية"
          >
            ‹
          </Button>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-navy-200 bg-white px-3 py-1.5 text-xs font-medium text-navy-600 hover:bg-navy-50"
        >
          فتح في نافذة جديدة
        </a>
      </div>

      {/* الإطار */}
      <div className="relative bg-navy-50">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center gap-3 text-sm text-navy-500">
            <span
              aria-hidden
              className="h-5 w-5 animate-spin rounded-full border-2 border-navy-200 border-t-teal-500"
            />
            جارٍ تحميل الملف… قد يستغرق لحظات لأن الملف كبير.
          </div>
        )}

        <iframe
          key={src}
          src={src ?? undefined}
          title={`عارض ملف: ${title}`}
          onLoad={() => setLoading(false)}
          className="h-[65vh] min-h-[420px] w-full border-0 sm:h-[78vh]"
        />
      </div>

      <p className="border-t border-navy-100 px-4 py-2.5 text-xs text-navy-400">
        إن لم يظهر الملف على جوالك، اضغط «فتح في نافذة جديدة».
      </p>
    </div>
  );
}

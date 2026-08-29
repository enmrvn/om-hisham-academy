"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui";
import { TUTOR } from "@/lib/constants";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isConfig = /SUPABASE|ANTHROPIC|env/i.test(error.message);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-24 text-center">
      <div
        aria-hidden
        className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-beige-200 text-2xl"
      >
        ⚠
      </div>

      <h1 className="text-2xl font-bold text-navy-900">
        حدث خطأ غير متوقع
      </h1>

      <p className="mt-3 leading-8 text-navy-500">
        {isConfig
          ? "يبدو أن إعدادات الاتصال بقاعدة البيانات غير مكتملة. تأكد من ملف ‎.env.local‎ ثم أعد تشغيل الخادم."
          : "اعتذر عن هذا. جرّب إعادة تحميل الصفحة، وإن تكرر الخطأ فتواصل مع المدربة."}
      </p>

      {error.digest && (
        <p className="mt-3 text-xs text-navy-300" dir="ltr">
          رمز الخطأ: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>إعادة المحاولة</Button>
        <LinkButton href="/" variant="soft">
          الصفحة الرئيسية
        </LinkButton>
      </div>

      <p className="mt-10 text-xs text-navy-400">
        {TUTOR.name} | <span dir="ltr">{TUTOR.phone}</span>
      </p>
    </div>
  );
}

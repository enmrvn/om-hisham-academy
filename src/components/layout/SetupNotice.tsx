import {
  isAnthropicConfigured,
  isServiceRoleConfigured,
  isSupabaseConfigured,
} from "@/lib/env";

/**
 * شريط إعداد يظهر قبل اكتمال المفاتيح **الأساسية**.
 *
 * مفتاح Claude اختياري: المنصة تعمل كاملة بدونه (المحاضرات، العارض،
 * الاختبارات اليدوية، التصحيح، التقدّم)، وصفحة «إنشاء اختبار ذكي» وحدها
 * تعرض رسالة واضحة عند غيابه. لذلك لا نُبقي شريطًا يوحي بأن الموقع ناقص.
 */
export default function SetupNotice() {
  const supabase = isSupabaseConfigured();
  const serviceRole = isServiceRoleConfigured();
  const anthropic = isAnthropicConfigured();

  // الأساسي فقط هو ما يمنع الموقع من العمل
  if (supabase && serviceRole) return null;

  const steps = [
    {
      done: supabase,
      label: "مفاتيح Supabase العامة",
      hint: "NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY — بدونهما لا تظهر الملفات ولا يعمل تسجيل الدخول.",
    },
    {
      done: serviceRole,
      label: "مفتاح الخدمة",
      hint: "SUPABASE_SERVICE_ROLE_KEY — لازم لتصحيح الاختبارات ورفع الملفات.",
    },
    {
      done: anthropic,
      label: "مفتاح Claude (اختياري)",
      hint: "ANTHROPIC_API_KEY — لميزة «إنشاء اختبار ذكي» فقط. بقية المنصة تعمل بدونه.",
    },
  ];

  return (
    <div className="border-b border-beige-300 bg-beige-100">
      <div className="mx-auto max-w-6xl px-5 py-5">
        <p className="mb-1 text-sm font-bold text-navy-900">
          الموقع يعمل، لكن الإعداد لم يكتمل بعد
        </p>
        <p className="mb-4 text-sm leading-7 text-navy-600">
          أنشئ ملف{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">.env.local</code>{" "}
          في جذر المشروع (انسخه من{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">.env.example</code>)
          واملأ القيم، ثم أعد تشغيل الخادم. التفاصيل الكاملة في ملف{" "}
          <code className="rounded bg-white px-1.5 py-0.5 text-xs">README.md</code>.
        </p>

        <ul className="space-y-2">
          {steps.map((s) => (
            <li key={s.label} className="flex items-start gap-2.5 text-sm">
              <span
                aria-hidden
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  s.done
                    ? "bg-teal-600 text-white"
                    : "bg-beige-300 text-beige-900"
                }`}
              >
                {s.done ? "✓" : "!"}
              </span>
              <span>
                <span className="font-medium text-navy-800">{s.label}</span>
                <span className="mr-2 text-navy-500">{s.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

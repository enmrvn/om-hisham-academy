import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * عميل بمفتاح الخدمة (service_role) — يتجاوز RLS.
 *
 * 🔒 خادمي فقط. استيراد "server-only" يجعل البناء يفشل إن تسرّب هذا الملف
 * إلى أي مكوّن يعمل في المتصفح.
 *
 * يستخدم في ثلاث حالات فقط:
 *   1. جلب أسئلة الاختبار للطالب بعد حذف الإجابة الصحيحة والشرح.
 *   2. تصحيح المحاولة على الخادم ثم حفظها.
 *   3. إنشاء روابط موقّعة لملفات الـ PDF وقراءتها لتوليد الاختبارات.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "المتغيران NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY مطلوبان. راجع ملف .env.local",
    );
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || "course-files";

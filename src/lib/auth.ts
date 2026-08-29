import "server-only";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * حارس صلاحية المدربة لصفحات /admin.
 *
 * ⚠️ لماذا يوجد هذا رغم وجود التحقق في admin/layout.tsx؟
 *    لأن Next.js يُصيّر التخطيط (layout) والصفحة (page) على التوازي، فلا يضمن
 *    أن redirect داخل التخطيط يوقف تنفيذ جسم الصفحة. وبما أن بعض صفحات اللوحة
 *    تنشئ عميل مفتاح الخدمة (الذي يتجاوز RLS)، فلا بد أن تتحقق كل صفحة بنفسها
 *    **قبل** أي وصول إلى البيانات.
 *
 * يُستدعى كأول سطر في كل صفحة داخل /admin.
 */
export async function requireAdminPage(next = "/admin"): Promise<Profile> {
  const profile = await getProfile();

  if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (profile.role !== "admin") redirect("/dashboard?error=admin-only");

  return profile;
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import AdminNav from "@/components/admin/AdminNav";

/**
 * تخطيط لوحة المدربة — طبقة حماية ثانية بعد proxy.ts.
 * كل صفحة داخل /admin تمر من هنا.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  if (!profile) redirect("/login?next=/admin");
  if (profile.role !== "admin") redirect("/dashboard?error=admin-only");

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <header className="mb-8">
        <p className="text-sm text-navy-400">لوحة المدربة</p>
        <h1 className="mt-1 text-2xl font-bold text-navy-900">
          أهلًا {profile.full_name || "أم هشام"}
        </h1>
        <p className="mt-2 text-sm text-navy-500">
          من هنا تُدير المحتوى والاختبارات وتتابعين مستويات الطالبات والطلاب.{" "}
          <Link href="/" className="text-teal-700 hover:underline">
            عرض الموقع كما يراه الطالب
          </Link>
        </p>
      </header>

      <AdminNav />

      <div className="mt-8">{children}</div>
    </div>
  );
}

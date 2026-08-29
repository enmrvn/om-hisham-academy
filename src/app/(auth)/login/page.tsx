import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/layout/LoginForm";
import { getCurrentUser } from "@/lib/supabase/server";
import { TUTOR } from "@/lib/constants";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const { next } = await searchParams;

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-5 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-navy-900">أهلًا بعودتك</h1>
        <p className="mt-2 text-sm leading-7 text-navy-500">
          سجّل الدخول لتتابع محاضراتك ودرجاتك من حيث توقفت.
        </p>
      </div>

      <div className="surface-card p-7">
        <LoginForm next={next ?? "/dashboard"} />
      </div>

      <p className="mt-6 text-center text-sm text-navy-500">
        ليس لديك حساب؟{" "}
        <Link href="/signup" className="font-bold text-teal-700 hover:underline">
          أنشئ حسابًا الآن
        </Link>
      </p>

      <p className="mt-8 text-center text-xs text-navy-400">
        {TUTOR.name} | <span dir="ltr">{TUTOR.phone}</span>
      </p>
    </div>
  );
}

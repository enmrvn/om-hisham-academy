import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SignUpForm from "@/components/layout/SignUpForm";
import { getCurrentUser } from "@/lib/supabase/server";
import { TUTOR } from "@/lib/constants";

export const metadata: Metadata = { title: "إنشاء حساب" };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-5 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-navy-900">أنشئ حسابك</h1>
        <p className="mt-2 text-sm leading-7 text-navy-500">
          الحساب مجاني، ويحفظ لك تقدّمك في المحاضرات ودرجاتك في كل اختبار.
        </p>
      </div>

      <div className="surface-card p-7">
        <SignUpForm />
      </div>

      <p className="mt-6 text-center text-sm text-navy-500">
        لديك حساب بالفعل؟{" "}
        <Link href="/login" className="font-bold text-teal-700 hover:underline">
          سجّل الدخول
        </Link>
      </p>

      <p className="mt-8 text-center text-xs text-navy-400">
        {TUTOR.name} | <span dir="ltr">{TUTOR.phone}</span>
      </p>
    </div>
  );
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, signInSchema, signUpSchema } from "@/lib/validation";

export type AuthState = {
  errors?: Record<string, string>;
  message?: string;
  success?: boolean;
};

/** ترجمة رسائل Supabase الإنجليزية إلى العربية. */
function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (m.includes("email not confirmed"))
    return "لم يتم تفعيل البريد بعد. افتح رسالة التفعيل في بريدك ثم عد إلى هنا.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "هذا البريد مسجّل مسبقًا. جرّب تسجيل الدخول بدلًا من إنشاء حساب.";
  if (m.includes("password should be at least"))
    return "كلمة المرور قصيرة جدًا.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "محاولات كثيرة خلال وقت قصير. انتظر دقيقة ثم أعد المحاولة.";
  return "حدث خطأ غير متوقع. حاول مرة أخرى، وإن تكرّر فتواصل مع المدربة.";
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { full_name, email, phone, password } = parsed.data;
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, phone },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) return { errors: { _form: translate(error.message) } };

  // إن كان تأكيد البريد مفعّلًا، لا توجد جلسة بعد
  if (!data.session) {
    return {
      success: true,
      message:
        "تم إنشاء حسابك. أرسلنا رسالة تفعيل إلى بريدك — افتحها ثم سجّل الدخول.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { errors: { _form: translate(error.message) } };

  const next = String(formData.get("next") || "/dashboard");
  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/dashboard");
}

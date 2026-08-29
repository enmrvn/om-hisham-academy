import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import type { Profile } from "@/lib/types";

/**
 * عميل Supabase للمكوّنات الخادمية ومسارات الـ API.
 * يقرأ ويكتب الجلسة في ملفات تعريف الارتباط (cookies).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // استدعاء من مكوّن خادمي: التحديث يتم في proxy.ts، تجاهل بأمان.
          }
        },
      },
    },
  );
}

/** المستخدم الحالي أو null. مُخزّن ضمن الطلب الواحد. */
export const getCurrentUser = cache(async () => {
  // نلمس الكوكيز أولًا وبلا شرط، حتى تبقى الصفحات المعتمدة على الجلسة
  // ديناميكية دائمًا ولا يتغيّر تصنيفها بتغيّر وجود المفاتيح.
  await cookies();

  // قبل ضبط مفاتيح Supabase نعيد null بدل رمي خطأ يُسقط الصفحة كاملة
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** ملف تعريف المستخدم الحالي (يتضمن الدور) أو null. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
});

/** true إذا كان المستخدم الحالي هو المدربة. */
export async function isAdmin(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "admin";
}

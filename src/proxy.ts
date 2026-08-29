import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * في Next.js 16 استُبدل اسم `middleware` بـ `proxy` (نفس الوظيفة تمامًا).
 *
 * مهمته هنا شيئان:
 *   1. تحديث جلسة Supabase في الكوكيز قبل وصول الطلب إلى الصفحة.
 *   2. حماية المسارات: /dashboard و /admin لا تُفتح بدون تسجيل دخول،
 *      و /admin يتطلب دور المدربة.
 *
 * ⚠️ الحماية هنا طبقة أولى فقط. كل صفحة وكل Server Action تتحقق من
 *    الصلاحية مرة أخرى بنفسها، وسياسات RLS هي خط الدفاع الأخير.
 */

const PROTECTED = ["/dashboard", "/admin"];
const ADMIN_ONLY = ["/admin"];

export async function proxy(request: NextRequest) {
  // قبل ضبط مفاتيح Supabase نمرّر الطلب كما هو، ليظهر دليل الإعداد
  // بدل صفحة خطأ في الخادم.
  if (!isSupabaseConfigured()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED.some((p) => path.startsWith(p));

  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && ADMIN_ONLY.some((p) => path.startsWith(p))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.set("error", "admin-only");
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // كل المسارات ما عدا الملفات الثابتة والصور
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

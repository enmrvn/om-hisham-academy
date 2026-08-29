import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * نقطة العودة بعد تفعيل البريد الإلكتروني.
 * Supabase يعيد التوجيه إلى هنا حاملًا `code`، فنبدّله بجلسة ثم ننقل الطالب
 * إلى لوحته.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("تعذّر تفعيل الحساب. جرّب رابط التفعيل مرة أخرى.")}`,
  );
}

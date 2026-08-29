/**
 * فحص جاهزية الإعدادات.
 *
 * قبل أن تُضاف مفاتيح Supabase إلى ملف .env.local، لا ينبغي أن ينهار الموقع
 * برسالة خطأ مبهمة. بدل ذلك نعرض «حالة إعداد» واضحة تشرح الخطوة الناقصة.
 */

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith("http"));
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

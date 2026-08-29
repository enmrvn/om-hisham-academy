import "server-only";
import { createAdminClient, STORAGE_BUCKET } from "@/lib/supabase/admin";

/**
 * ينشئ رابطًا موقّتًا لملف PDF داخل التخزين الخاص.
 * الرابط صالح لمدة ساعة افتراضيًا ثم ينتهي — لا يمكن مشاركته للأبد.
 */
export async function getSignedPdfUrl(
  path: string | null,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!path) return null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, expiresInSeconds);

    if (error) {
      console.error("getSignedPdfUrl:", error.message);
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (err) {
    console.error("getSignedPdfUrl:", (err as Error).message);
    return null;
  }
}

/** يحمّل ملف PDF كاملًا كـ Buffer (يستخدم في توليد الاختبارات). */
export async function downloadPdf(path: string): Promise<Buffer> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .download(path);

  if (error || !data) {
    throw new Error(`تعذّر تحميل الملف من التخزين: ${error?.message ?? "غير معروف"}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

import "server-only";
import { PDFDocument } from "pdf-lib";

/**
 * قص نطاق صفحات من ملف PDF إلى ملف جديد أصغر.
 *
 * لماذا نقصّ؟
 *   ملفات المحاضرات كبيرة (٣٠٠–٥٤٠ صفحة، حتى ٥٥ ميجابايت)، وحدّ الطلب الواحد
 *   في Claude API هو ٣٢ ميجابايت. القص يضمن أن ما نُرسله هو **الصفحات المحددة
 *   فقط** — وهذا أيضًا ما يجعل الأسئلة المولّدة مرتبطة بالمحاضرة المطلوبة
 *   لا بالملف كله.
 *
 * الصفحات مرقّمة ابتداءً من ١ (كما يراها المستخدم في العارض).
 */
export async function slicePdf(
  source: Buffer | Uint8Array,
  startPage: number,
  endPage: number,
): Promise<{ bytes: Uint8Array; pageCount: number; totalPages: number }> {
  const src = await PDFDocument.load(source, { ignoreEncryption: true });
  const totalPages = src.getPageCount();

  const from = Math.max(1, Math.min(startPage, totalPages));
  const to = Math.max(from, Math.min(endPage, totalPages));

  const indices: number[] = [];
  for (let i = from - 1; i <= to - 1; i++) indices.push(i);

  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  copied.forEach((page) => out.addPage(page));

  const bytes = await out.save({ useObjectStreams: true });
  return { bytes, pageCount: indices.length, totalPages };
}

/** عدد صفحات ملف PDF. */
export async function getPageCount(source: Buffer | Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(source, { ignoreEncryption: true });
  return doc.getPageCount();
}

/**
 * يوزّع نطاق صفحات على شرائح لا تتجاوز كل واحدة `maxPages`.
 * يُستخدم عندما يطلب المستخدم «الملف كله» فنأخذ عيّنة موزّعة بدل ٥٠٠ صفحة.
 */
export function sampleRange(
  start: number,
  end: number,
  maxPages: number,
): { from: number; to: number } {
  const span = end - start + 1;
  if (span <= maxPages) return { from: start, to: end };

  // نأخذ نافذة من منتصف النطاق: عادةً أغنى بالمحتوى من المقدمة أو الفهرس
  const center = Math.floor((start + end) / 2);
  const half = Math.floor(maxPages / 2);
  const from = Math.max(start, center - half);
  const to = Math.min(end, from + maxPages - 1);
  return { from, to };
}

import type { QuestionType } from "@/lib/types";

/* ---------------------------------------------------------------------------
   تطبيع النص العربي ومقارنة الإجابات.
   التصحيح يتم على الخادم فقط — لا يصل إلى المتصفح أي مفتاح للإجابات.
--------------------------------------------------------------------------- */

const ARABIC_DIACRITICS = /[ً-ْٓ-ٰٕـ]/g;

/** أرقام هندية ← أرقام لاتينية، ليتساوى «٣» و«3». */
const DIGIT_MAP: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

/**
 * يوحّد شكل النص العربي قبل المقارنة:
 * يحذف التشكيل والتطويل، ويوحّد الألف والياء والتاء المربوطة والهمزات،
 * ويحوّل الأرقام الهندية، ويزيل علامات الترقيم والمسافات الزائدة.
 */
export function normalizeArabic(input: string): string {
  return input
    .trim()
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[٠-٩۰-۹]/g, (d) => DIGIT_MAP[d] ?? d)
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[،.؛:!؟?"'`«»()[\]{}]/g, " ")
    .replace(/[-–—_]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

/**
 * يجرّد بادئة الخيار («أ)» أو «ب-» أو «1.») ليقارن المضمون لا الترقيم،
 * حتى لو اختلفت صيغة الحفظ عن صيغة العرض.
 */
export function stripChoicePrefix(input: string): string {
  return input
    .trim()
    .replace(/^\s*[(\[]?\s*[أabجدcdهـ١٢٣٤1-4]\s*[)\].،:-]\s*/iu, "")
    .trim();
}

/** هل إجابة الطالب صحيحة؟ */
export function isAnswerCorrect(
  type: QuestionType,
  studentAnswer: string,
  correctAnswer: string,
): boolean {
  const student = studentAnswer ?? "";
  if (!student.trim()) return false;

  const a = normalizeArabic(student);
  const b = normalizeArabic(correctAnswer);
  if (a === b) return true;

  // مقارنة بعد تجريد بادئة الخيار — تلتقط «أ) القيمة الأولى أكبر» مقابل «القيمة الأولى أكبر»
  const aStripped = normalizeArabic(stripChoicePrefix(student));
  const bStripped = normalizeArabic(stripChoicePrefix(correctAnswer));
  if (aStripped && aStripped === bStripped) return true;

  if (type === "true_false") {
    const truthy = new Set(["صح", "صحيح", "true", "نعم"]);
    const falsy = new Set(["خطا", "خطأ", "غير صحيح", "false", "لا"]);
    const sa = truthy.has(a) ? "t" : falsy.has(a) ? "f" : null;
    const ca = truthy.has(b) ? "t" : falsy.has(b) ? "f" : null;
    return sa !== null && sa === ca;
  }

  if (type === "short_answer") {
    // تسامح بسيط: تجاهل المسافات تمامًا في الإجابات الرقمية أو الرمزية القصيرة
    const compact = (s: string) => s.replace(/\s/g, "");
    if (compact(a).length <= 24 && compact(a) === compact(b)) return true;
  }

  return false;
}

/**
 * يستخرج «القيمة الأولى» و«القيمة الثانية» من نص سؤال مقارنة كمية،
 * إن كتبهما النموذج بالصيغة المتفق عليها.
 * يعيد null إن لم يعثر عليهما، فيُعرض السؤال كنص عادي.
 */
export function extractComparisonValues(
  question: string,
): { one: string; two: string } | null {
  const one = question.match(/القيمة\s+الأولى\s*[:：]?\s*(.+)/u);
  const two = question.match(/القيمة\s+الثانية\s*[:：]?\s*(.+)/u);

  if (!one || !two) return null;

  const clean = (s: string) => s.split("\n")[0].trim();
  const v1 = clean(one[1]);
  const v2 = clean(two[1]);

  return v1 && v2 ? { one: v1, two: v2 } : null;
}

/** يحذف سطري القيمتين من نص السؤال ليبقى نص المقدمة فقط. */
export function stripComparisonValues(question: string): string {
  return question
    .split("\n")
    .filter(
      (line) =>
        !/^\s*القيمة\s+الأولى\s*[:：]/u.test(line) &&
        !/^\s*القيمة\s+الثانية\s*[:：]/u.test(line),
    )
    .join("\n")
    .trim();
}
